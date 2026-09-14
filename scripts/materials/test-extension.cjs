// Real Chrome capture against this repository's extracted ZIP. R2 responses are intercepted.
const puppeteer = require('puppeteer');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {output, version, executablePath} = require('./paths.cjs');
const config = {endpoint:'https://demo.r2.cloudflarestorage.com', accessKeyId:'EXAMPLE_KEY_FOR_DEMO', secretAccessKey:'EXAMPLE_SECRET_FOR_DEMO', bucketName:'screenshots', customDomain:'images.example.com', jpgQuality:90, maxScreens:5};
const fixture = '<!doctype html><html><head><title>Designing a calmer workflow</title><style>body{margin:0;background:#f5f4ee;color:#293b34;font:17px/1.7 system-ui}main{max-width:850px;margin:0 auto;padding:50px}h1{font-size:64px;letter-spacing:-3px;line-height:1.1}header{font-size:12px;letter-spacing:2px}section{height:560px;border-top:1px solid #cad9cf;padding-top:30px}h2{font-size:35px}.block{height:220px;background:#dce8dc;border-radius:12px;padding:30px;margin-top:25px}</style></head><body><main><header>FIELD NOTES / 014</header><h1>Designing a calmer<br>workflow.</h1><p>Good tools give your attention back.</p><section><h2>01 / Keep the useful parts.</h2><p>Save a page, share an idea, keep moving.</p><div class="block">One browser. A few thoughtful tools.</div></section><section><h2>02 / Make room for focus.</h2><p>Less switching. More doing.</p><div class="block">A small action can take an idea further.</div></section><section><h2>03 / Connect the next step.</h2><p>Bring the work to the places you already use.</p></section></main></body></html>';
const checks = [], errors = [], uploads = [];
let browser, control, extensionId, content, nextStatus = 200;
const record = name => {checks.push(name); console.log('PASS ' + name);};
const watch = page => {page.on('pageerror', error => errors.push(error.message)); return page;};
const fill = (page, selector, value) => page.$eval(selector, (element, value) => {element.value = value; element.dispatchEvent(new Event('input', {bubbles:true})); element.dispatchEvent(new Event('change', {bubbles:true}));}, String(value));
async function popup() {
  await content.bringToFront();
  const {targetInfos} = await control.send('Target.getTargets', {filter:[{type:'tab'}]});
  await control.send('Extensions.triggerAction', {id:extensionId, targetId:targetInfos.find(target => target.url === content.url()).targetId});
  const target = await browser.waitForTarget(target => target.url() === `chrome-extension://${extensionId}/popup.html`, {timeout:15000});
  const page = watch(await target.asPage());
  await page.waitForSelector('#capture:not([disabled])');
  return page;
}
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let position = 2; position < bytes.length;) {
    if (bytes[position++] !== 0xff) continue;
    const marker = bytes[position++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(position);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return {width:bytes.readUInt16BE(position + 5), height:bytes.readUInt16BE(position + 3)};
    position += length;
  }
  throw new Error('Missing JPEG dimensions');
}
async function captureEvidence(page, name, selector = 'body') {
  await page.bringToFront();
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$(selector)).screenshot({path:path.join(output, 'verification', name + '.png')});
}
(async () => {
  const server = http.createServer((request, response) => {response.writeHead(200, {'Content-Type':'text/html'}); response.end(fixture);});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await puppeteer.launch({executablePath, headless:true, pipe:true, enableExtensions:true, args:['--lang=en-US', '--no-first-run', '--enable-unsafe-extension-debugging'], defaultViewport:{width:1280, height:800}});
    control = await browser.target().createCDPSession();
    extensionId = await browser.installExtension(path.join(output, 'unpacked'), {enabledInIncognito:true});
    const settings = watch(await browser.newPage());
    await settings.goto(`chrome-extension://${extensionId}/settings.html`);
    await settings.waitForSelector('#save:not([disabled])');
    assert.equal(await settings.evaluate(() => chrome.runtime.getManifest().version), version);
    const worker = await browser.waitForTarget(target => target.type() === 'service_worker' && target.url().includes(extensionId));
    const session = await worker.createCDPSession();
    await session.send('Fetch.enable', {patterns:[{urlPattern:'https://*.r2.cloudflarestorage.com/*', requestStage:'Request'}]});
    session.on('Fetch.requestPaused', async event => {
      uploads.push({...event.request, body:Buffer.concat((event.request.postDataEntries || []).map(part => Buffer.from(part.bytes || '', 'base64')))});
      const responseCode = nextStatus; nextStatus = 200;
      await session.send('Fetch.fulfillRequest', {requestId:event.requestId, responseCode, body:''}).catch(error => errors.push(error.message));
    });
    await fill(settings, '#endpoint', config.endpoint + '/' + config.bucketName);
    assert.equal(await settings.$eval('#bucketName', element => element.value), config.bucketName);
    for (const key of ['accessKeyId', 'secretAccessKey', 'customDomain']) await fill(settings, '#' + key, config[key]);
    await settings.click('#test-connection');
    await settings.waitForFunction(() => document.getElementById('connection-status').textContent.includes('successful'));
    assert.equal(await settings.evaluate(async () => (await chrome.storage.local.get('r2config')).r2config), undefined);
    assert.equal(uploads.at(-1).method, 'HEAD');
    await fill(settings, '#jpgQuality', 101); await settings.click('#save');
    assert.equal(await settings.evaluate(async () => (await chrome.storage.local.get('r2config')).r2config), undefined);
    await fill(settings, '#jpgQuality', 90); await settings.click('#save');
    await settings.waitForFunction(() => document.getElementById('save-status').textContent.includes('saved'));
    assert.deepEqual(await settings.evaluate(async () => (await chrome.storage.local.get('r2config')).r2config), config);
    await settings.select('#theme', 'light');
    record('Packaged settings: version, endpoint parsing, unsaved connection test, validation and storage');
    content = watch(await browser.newPage()); await content.goto(origin + '/field-notes');
    let page = await popup(); await page.click('#capture');
    await page.waitForFunction(() => document.getElementById('capture-status').dataset.state === 'success', {timeout:15000});
    let upload = uploads.at(-1);
    assert.equal(upload.method, 'PUT');
    assert.equal(upload.headers['x-amz-content-sha256'], crypto.createHash('sha256').update(upload.body).digest('hex'));
    assert.deepEqual(jpegSize(upload.body), {width:1280, height:800});
    await fs.writeFile(path.join(output, 'verification/captured-visible.jpg'), upload.body);
    record('Real visible-tab capture, JPEG dimensions and signed upload bytes');
    await page.close(); await content.bringToFront(); await content.evaluate(() => window.scrollTo(0, 180));
    const dimensions = await content.evaluate(() => ({width:innerWidth, height:document.documentElement.scrollHeight, scrollY}));
    page = await popup(); await page.$eval('[name="scope"][value="full"]', element => element.click()); await page.click('#capture');
    await page.waitForFunction(() => ['success', 'error'].includes(document.getElementById('capture-status').dataset.state), {timeout:20000});
    assert.equal(await page.$eval('#capture-status', element => element.dataset.state), 'success');
    upload = uploads.at(-1);
    assert.deepEqual(jpegSize(upload.body), {width:dimensions.width, height:dimensions.height});
    assert.equal(await content.evaluate(() => scrollY), dimensions.scrollY);
    await fs.writeFile(path.join(output, 'verification/captured-full-page.jpg'), upload.body);
    record('Full-page stitching, output dimensions and restored scroll position');
    nextStatus = 403; await page.click('#new'); await page.$eval('[value="visible"]', element => element.click()); await page.click('#capture');
    await page.waitForFunction(() => document.getElementById('capture-status').dataset.state === 'error');
    assert.equal(await page.$eval('#result', element => element.hidden), true);
    await page.click('#capture'); await page.waitForFunction(() => document.getElementById('capture-status').dataset.state === 'success');
    record('Failed upload, hidden result and successful retry');
    await page.evaluate(() => {Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async value => {window.copiedValue = value;}}});});
    await page.click('#copy'); await page.waitForFunction(() => document.getElementById('copy').textContent === 'Copied!');
    assert.equal(await page.evaluate(() => window.copiedValue), await page.$eval('#result-url', element => element.value));
    await page.evaluate(() => {navigator.clipboard.writeText = async () => {throw new Error('denied');};});
    await page.click('#copy'); await page.waitForFunction(() => document.getElementById('capture-status').dataset.state === 'error');
    record('Clipboard success and denial with isolated stubs');
    await page.close();
    for (const width of [1280, 860, 390]) {
      await settings.setViewport({width, height:900});
      assert(await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    record('Settings fit 390, 860 and 1280px widths');
    await content.setRequestInterception(true);
    content.on('request', request => request.respond({status:200, contentType:'text/html', body:fixture}));
    await content.goto('https://notes.example.com/field-notes');
    await settings.setViewport({width:1280, height:800});
    await captureEvidence(settings, 'r2shot-settings-light', '.settings-layout');
    page = await popup(); await captureEvidence(page, 'r2shot-popup-light'); await page.close();
    await settings.select('#theme', 'dark');
    page = await popup(); await page.$eval('[value="full"]', element => element.click()); await page.click('#capture');
    await page.waitForFunction(() => document.getElementById('capture-status').dataset.state === 'success', {timeout:20000});
    await captureEvidence(page, 'r2shot-result-dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    record('Light/dark UI and result screenshots from the installed ZIP');
    assert.deepEqual(errors, []);
    const report = {version, browser:await browser.version(), package_sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(output, `r2shot-${version}.zip`))).digest('hex'), checks, console_errors:errors, network:'Actual Chrome capture/stitching/signing; R2 HTTP responses intercepted with synthetic credentials. No live bucket/CDN. Clipboard stubbed.'};
    await fs.writeFile(path.join(output, 'verification/chrome-extension.json'), JSON.stringify(report, null, 2) + '\n');
  } finally {if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
