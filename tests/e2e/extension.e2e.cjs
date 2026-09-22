// Real Chrome extension tests. Only R2 responses and clipboard access are stubbed.
const puppeteer = require("puppeteer");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const os = require("node:os");
const root = path.resolve(__dirname, "../..");
const { version } = require(path.join(root, "package.json"));
const extensionPath = path.resolve(
  process.env.EXTENSION_PATH || path.join(root, "dist"),
);
const output = path.resolve(
  process.env.E2E_OUTPUT_DIR || path.join(root, "dist/verification"),
);
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const config = {
  endpoint: "https://demo.r2.cloudflarestorage.com",
  accessKeyId: "EXAMPLE_KEY_FOR_DEMO",
  secretAccessKey: "EXAMPLE_SECRET_FOR_DEMO",
  bucketName: "screenshots",
  customDomain: "images.example.com",
  jpgQuality: 90,
  maxScreens: 5,
};
const fixture =
  '<!doctype html><html><head><title>Designing a calmer workflow</title><style>body{margin:0;background:#f5f4ee;color:#293b34;font:17px/1.7 system-ui}main{max-width:850px;margin:0 auto;padding:50px}h1{font-size:64px;letter-spacing:-3px;line-height:1.1}header{font-size:12px;letter-spacing:2px}section{height:560px;border-top:1px solid #cad9cf;padding-top:30px}h2{font-size:35px}.block{height:220px;background:#dce8dc;border-radius:12px;padding:30px;margin-top:25px}</style></head><body><main><header>FIELD NOTES / 014</header><h1>Designing a calmer<br>workflow.</h1><p>Good tools give your attention back.</p><section><h2>01 / Keep the useful parts.</h2><p>Save a page, share an idea, keep moving.</p><div class="block">One browser. A few thoughtful tools.</div></section><section><h2>02 / Make room for focus.</h2><p>Less switching. More doing.</p><div class="block">A small action can take an idea further.</div></section><section><h2>03 / Connect the next step.</h2><p>Bring the work to the places you already use.</p></section></main></body></html>';
const checks = [],
  errors = [],
  uploads = [];
let browser,
  control,
  extensionId,
  content,
  testExtensionPath,
  nextStatus = 200;
const record = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const watch = (page) => {
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
};
const fill = (page, selector, value) =>
  page.$eval(
    selector,
    (element, value) => {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    String(value),
  );
async function popup() {
  await content.bringToFront();
  const { targetInfos } = await control.send("Target.getTargets", {
    filter: [{ type: "tab" }],
  });
  const tab = targetInfos.find((target) => target.url === content.url());
  assert(tab, "The fixture tab must exist before invoking the toolbar action");
  await control.send("Extensions.triggerAction", {
    id: extensionId,
    targetId: tab.targetId,
  });
  const target = await browser.waitForTarget(
    (target) => target.url() === `chrome-extension://${extensionId}/popup.html`,
    { timeout: 15000 },
  );
  const page = watch(await target.asPage());
  await page.waitForSelector("#capture:not([disabled])");
  return page;
}
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let position = 2; position < bytes.length; ) {
    if (bytes[position++] !== 0xff) continue;
    const marker = bytes[position++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(position);
    if ([0xc0, 0xc1, 0xc2].includes(marker))
      return {
        width: bytes.readUInt16BE(position + 5),
        height: bytes.readUInt16BE(position + 3),
      };
    position += length;
  }
  throw new Error("Missing JPEG dimensions");
}
async function captureEvidence(page, name, selector = "body") {
  await page.bringToFront();
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$(selector)).screenshot({
    path: path.join(output, `${name}.png`),
  });
}
async function imagePixels(page, bytes, points) {
  return page.evaluate(
    async ({ base64, points }) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${base64}`;
      await image.decode();
      const canvas = new OffscreenCanvas(
        image.naturalWidth,
        image.naturalHeight,
      );
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return points.map(({ x, y }) =>
        Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3),
      );
    },
    { base64: bytes.toString("base64"), points },
  );
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  for (const name of [
    "chrome-extension.json",
    "captured-visible.jpg",
    "captured-full-page.jpg",
    "captured-scroll-container.jpg",
    "captured-scroll-container-limit.jpg",
    "captured-large-page.jpg",
    "captured-tall-page.jpg",
    "r2shot-settings-light.png",
    "r2shot-popup-light.png",
    "r2shot-result-dark.png",
  ])
    await fs.rm(path.join(output, name), { force: true });
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(fixture);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let report;
  try {
    const manifest = JSON.parse(
      await fs.readFile(path.join(extensionPath, "manifest.json"), "utf8"),
    );
    assert.equal(
      manifest.version,
      version,
      "Build the current version before running Chrome tests",
    );
    assert.equal(
      require(path.join(root, "public/manifest.json")).version,
      version,
      "Manifest/package versions must match",
    );
    assert.equal(manifest.background.service_worker, "background.js");
    testExtensionPath = await fs.mkdtemp(path.join(os.tmpdir(), "r2shot-e2e-"));
    // Install an isolated, unmodified copy of the production files. No worker driver is needed:
    // Extensions.triggerAction exercises the shipped popup and its real MV3 message listener.
    await fs.cp(extensionPath, testExtensionPath, {
      recursive: true,
      filter: (source) =>
        !/^(verification|unpacked|icons\/dev)(\/|$)|\.zip$/.test(
          path.relative(extensionPath, source),
        ),
    });
    const runtimeHashes = {};
    for (const name of (
      await fs.readdir(testExtensionPath, { recursive: true })
    ).sort()) {
      const file = path.join(testExtensionPath, name);
      if ((await fs.stat(file)).isFile())
        runtimeHashes[name] = crypto
          .createHash("sha256")
          .update(await fs.readFile(file))
          .digest("hex");
    }
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      pipe: true,
      enableExtensions: true,
      args: [
        "--lang=en-US",
        "--no-first-run",
        "--enable-unsafe-extension-debugging",
        ...(process.env.CI ? ["--no-sandbox"] : []),
      ],
      defaultViewport: { width: 1280, height: 800 },
    });
    console.log(`Browser: ${await browser.version()}`);
    control = await browser.target().createCDPSession();
    extensionId = await browser.installExtension(testExtensionPath);
    const settings = watch(await browser.newPage());
    await settings.goto(`chrome-extension://${extensionId}/settings.html`);
    await settings.waitForSelector("#save:not([disabled])");
    assert.equal(
      await settings.evaluate(() => chrome.runtime.getManifest().version),
      version,
    );
    const worker = await browser.waitForTarget(
      (target) =>
        target.type() === "service_worker" &&
        target.url().includes(extensionId),
    );
    const session = await worker.createCDPSession();
    session.on("Runtime.exceptionThrown", (event) =>
      errors.push(
        event.exceptionDetails.exception?.description ||
          event.exceptionDetails.text,
      ),
    );
    await session.send("Runtime.enable");
    await session.send("Fetch.enable", {
      patterns: [
        {
          urlPattern: "https://*.r2.cloudflarestorage.com/*",
          requestStage: "Request",
        },
      ],
    });
    session.on("Fetch.requestPaused", (event) => {
      void (async () => {
        assert.equal(new URL(event.request.url).origin, config.endpoint);
        uploads.push({
          ...event.request,
          body: Buffer.concat(
            (event.request.postDataEntries || []).map((part) =>
              Buffer.from(part.bytes || "", "base64"),
            ),
          ),
        });
        const responseCode = nextStatus;
        nextStatus = 200;
        await session.send("Fetch.fulfillRequest", {
          requestId: event.requestId,
          responseCode,
          body: "",
        });
      })().catch((error) => errors.push(error.message));
    });
    await fill(
      settings,
      "#endpoint",
      `${config.endpoint}/${config.bucketName}`,
    );
    assert.equal(
      await settings.$eval("#bucketName", (element) => element.value),
      config.bucketName,
    );
    for (const key of ["accessKeyId", "secretAccessKey", "customDomain"])
      await fill(settings, `#${key}`, config[key]);
    await settings.click("#test-connection");
    await settings.waitForFunction(() =>
      document
        .getElementById("connection-status")
        .textContent.includes("successful"),
    );
    assert.equal(
      await settings.evaluate(
        async () => (await chrome.storage.local.get("r2config")).r2config,
      ),
      undefined,
    );
    assert.equal(uploads.at(-1).method, "HEAD");
    assert.match(
      uploads.at(-1).headers.authorization,
      /^AWS4-HMAC-SHA256 Credential=EXAMPLE_KEY_FOR_DEMO\//,
    );
    await fill(settings, "#jpgQuality", 101);
    await settings.click("#save");
    assert.equal(
      await settings.evaluate(
        async () => (await chrome.storage.local.get("r2config")).r2config,
      ),
      undefined,
    );
    await fill(settings, "#jpgQuality", 90);
    await settings.click("#save");
    await settings.waitForFunction(() =>
      document.getElementById("save-status").textContent.includes("saved"),
    );
    assert.deepEqual(
      await settings.evaluate(
        async () => (await chrome.storage.local.get("r2config")).r2config,
      ),
      config,
    );
    await settings.select("#theme", "light");
    record(
      "Packaged settings: version, endpoint parsing, unsaved connection test, validation and storage",
    );
    content = watch(await browser.newPage());
    await content.goto(`${origin}/field-notes`);
    let page = await popup();
    await page.click("#capture");
    await page.waitForFunction(
      () =>
        document.getElementById("capture-status").dataset.state === "success",
      { timeout: 15000 },
    );
    let upload = uploads.at(-1);
    assert.equal(upload.method, "PUT");
    assert.equal(
      upload.headers["x-amz-content-sha256"],
      crypto.createHash("sha256").update(upload.body).digest("hex"),
    );
    assert.deepEqual(jpegSize(upload.body), { width: 1280, height: 800 });
    assert.equal(
      uploads.length,
      2,
      "One connection test and one visible upload",
    );
    assert.equal(
      await page.$eval("#result-url", (element) => element.value),
      "https://" +
        config.customDomain +
        new URL(upload.url).pathname.slice(config.bucketName.length + 1),
    );
    await fs.writeFile(path.join(output, "captured-visible.jpg"), upload.body);
    record("Real visible-tab capture, JPEG dimensions and signed upload bytes");
    await page.close();
    await content.bringToFront();
    await content.evaluate(() => window.scrollTo(0, 180));
    const dimensions = await content.evaluate(() => ({
      width: innerWidth,
      height: document.documentElement.scrollHeight,
      scrollY,
    }));
    page = await popup();
    await page.click('.scope label:has([value="full"])');
    await page.click("#capture");
    await page.waitForFunction(
      () =>
        ["success", "error"].includes(
          document.getElementById("capture-status").dataset.state,
        ),
      { timeout: 20000 },
    );
    assert.equal(
      await page.$eval("#capture-status", (element) => element.dataset.state),
      "success",
    );
    upload = uploads.at(-1);
    assert.deepEqual(jpegSize(upload.body), {
      width: dimensions.width,
      height: dimensions.height,
    });
    assert.equal(await content.evaluate(() => scrollY), dimensions.scrollY);
    assert.equal(uploads.length, 3, "Full-page capture uploads exactly once");
    assert.equal(
      upload.headers["x-amz-content-sha256"],
      crypto.createHash("sha256").update(upload.body).digest("hex"),
    );
    await fs.writeFile(
      path.join(output, "captured-full-page.jpg"),
      upload.body,
    );
    record(
      "Full-page stitching, output dimensions and restored scroll position",
    );
    nextStatus = 403;
    await page.click("#new");
    await page.$eval('[value="visible"]', (element) => element.click());
    await page.click("#capture");
    await page.waitForFunction(
      () => document.getElementById("capture-status").dataset.state === "error",
    );
    assert.equal(
      await page.$eval("#result", (element) => element.hidden),
      true,
    );
    await page.click("#capture");
    await page.waitForFunction(
      () =>
        document.getElementById("capture-status").dataset.state === "success",
    );
    record("Failed upload, hidden result and successful retry");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.copiedValue = value;
          },
        },
      });
    });
    await page.click("#copy");
    await page.waitForFunction(
      () => document.getElementById("copy").textContent === "Copied!",
    );
    assert.equal(
      await page.evaluate(() => window.copiedValue),
      await page.$eval("#result-url", (element) => element.value),
    );
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw new Error("denied");
      };
    });
    await page.click("#copy");
    await page.waitForFunction(
      () => document.getElementById("capture-status").dataset.state === "error",
    );
    record("Clipboard success and denial with isolated stubs");
    await page.close();
    const colors = [
      [35, 160, 90],
      [240, 170, 55],
      [80, 130, 200],
      [180, 80, 165],
      [50, 170, 185],
    ];
    await content.evaluate((colors) => {
      const block = (height, color, text) => {
        const element = document.createElement("div");
        element.style.cssText = `height:${height}px;background:rgb(${color});`;
        element.textContent = text;
        return element;
      };
      const scroller = document.createElement("div");
      scroller.id = "page-scroll";
      scroller.style.cssText = "height:calc(100vh - 100px);overflow-y:auto";
      colors.forEach((color, index) => {
        scroller.append(block(431, color, `Section ${index + 1}`));
      });
      document.body.replaceChildren(
        block(60, [181, 38, 60], "Header appears once"),
        scroller,
        block(40, [45, 75, 181], "Footer appears once"),
      );
      // Inactive app panels must not be mistaken for the visible content scroller.
      for (const hiddenStyle of ["left:200vw", "left:0;visibility:hidden"]) {
        const panel = document.createElement("div");
        panel.style.cssText = `position:fixed;top:0;width:100vw;height:100vh;overflow:auto;${hiddenStyle}`;
        panel.append(block(4000, [0, 0, 0], "Hidden panel"));
        document.body.append(panel);
      }
      document.documentElement.style.overflow = "hidden";
      scroller.scrollTop = 180;
    }, colors);
    for (const [scale, maxScreens, name] of [
      [1, 5, "captured-scroll-container"],
      [2, 2, "captured-scroll-container-limit"],
    ]) {
      await content.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: scale,
      });
      await settings.evaluate(
        (config) => chrome.storage.local.set({ r2config: config }),
        { ...config, maxScreens },
      );
      const uploadCount = uploads.length;
      page = await popup();
      await page.click('.scope label:has([value="full"])');
      await page.click("#capture");
      await page.waitForFunction(
        () =>
          ["success", "error"].includes(
            document.getElementById("capture-status").dataset.state,
          ),
        { timeout: 20000 },
      );
      assert.equal(
        await page.$eval("#capture-status", (element) => element.dataset.state),
        "success",
        await page.$eval("#capture-status", (element) => element.textContent),
      );
      assert.equal(uploads.length, uploadCount + 1);
      upload = uploads.at(-1);
      await fs.writeFile(path.join(output, `${name}.jpg`), upload.body);
      const height = Math.min(431 * colors.length + 100, 800 * maxScreens);
      assert.deepEqual(jpegSize(upload.body), {
        width: 1280 * scale,
        height: height * scale,
      });
      const samples = [{ y: 30, color: [181, 38, 60] }];
      for (let y = 15; y < height - 100; y += 37) {
        // Stay clear of JPEG color blending at the boundaries between bands.
        if (y % 431 < 8 || y % 431 > 423) continue;
        samples.push({ y: y + 60, color: colors[Math.floor(y / 431)] });
      }
      samples.push({ y: height - 20, color: [45, 75, 181] });
      const pixels = await imagePixels(
        content,
        upload.body,
        samples.map(({ y }) => ({ x: 960 * scale, y: y * scale })),
      );
      samples.forEach(({ y, color }, index) => {
        assert(
          pixels[index].every(
            (value, channel) => Math.abs(value - color[channel]) <= 8,
          ),
          `Incorrect content at row ${y}: ${pixels[index]} instead of ${color}`,
        );
      });
      assert.equal(
        await content.$eval("#page-scroll", (element) => element.scrollTop),
        180,
      );
      record(
        `Inner scrolling content, header/footer pixels, scroll restoration: DPR ${scale}, limit ${maxScreens}`,
      );
      await page.close();
    }
    for (const { viewport, bandHeight, maxScreens, name } of [
      {
        viewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
        bandHeight: 1001,
        maxScreens: 5,
        name: "captured-large-page",
      },
      {
        viewport: { width: 800, height: 4000, deviceScaleFactor: 1 },
        bandHeight: 8001,
        maxScreens: 100,
        name: "captured-tall-page",
      },
    ]) {
      await content.setViewport(viewport);
      await content.evaluate(
        ({ colors, bandHeight }) => {
          document.documentElement.style.removeProperty("overflow");
          document.body.replaceChildren();
          colors.forEach((color, index) => {
            const band = document.createElement("div");
            band.style.cssText = `height:${bandHeight}px;background:rgb(${color});`;
            band.textContent = `Section ${index + 1}`;
            document.body.append(band);
          });
          window.scrollTo(0, 180);
        },
        { colors, bandHeight },
      );
      await settings.evaluate(
        (config) => chrome.storage.local.set({ r2config: config }),
        { ...config, maxScreens },
      );
      const uploadCount = uploads.length;
      page = await popup();
      await page.click('.scope label:has([value="full"])');
      await page.click("#capture");
      await page.waitForFunction(
        () =>
          ["success", "error"].includes(
            document.getElementById("capture-status").dataset.state,
          ),
        { timeout: 30000 },
      );
      assert.equal(
        await page.$eval("#capture-status", (element) => element.dataset.state),
        "success",
        await page.$eval("#capture-status", (element) => element.textContent),
      );
      assert.equal(uploads.length, uploadCount + 1);
      upload = uploads.at(-1);
      const size = jpegSize(upload.body);
      assert(size.width > 0 && size.width <= 32767);
      assert(size.height > 0 && size.height <= 32767);
      assert(size.width * size.height <= 32_000_000);
      const fullHeight = colors.length * bandHeight;
      assert(
        Math.abs(size.width / viewport.width - size.height / fullHeight) <=
          1 / viewport.width + 1 / fullHeight,
      );
      const samples = colors.flatMap((color, index) =>
        [0.1, 0.5, 0.99].map((fraction) => ({
          x: Math.floor(size.width * 0.75),
          y: Math.floor(
            ((index + fraction) * bandHeight * size.height) / fullHeight,
          ),
          color,
        })),
      );
      const pixels = await imagePixels(content, upload.body, samples);
      samples.forEach(({ color, y }, index) => {
        assert(
          pixels[index].every(
            (value, channel) => Math.abs(value - color[channel]) <= 8,
          ),
          `Missing or incorrect content in ${name} at row ${y}`,
        );
      });
      assert.equal(await content.evaluate(() => scrollY), 180);
      await fs.writeFile(path.join(output, `${name}.jpg`), upload.body);
      record(
        `Oversized page preserved from top to bottom: ${name}, ${size.width} × ${size.height}`,
      );
      await page.close();
    }
    await content.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    });
    await settings.evaluate(
      (config) => chrome.storage.local.set({ r2config: config }),
      config,
    );
    for (const width of [1280, 860, 390]) {
      await settings.setViewport({ width, height: 900 });
      assert(
        await settings.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    record("Settings fit 390, 860 and 1280px widths");
    await content.setRequestInterception(true);
    content.on("request", (request) =>
      request.respond({ status: 200, contentType: "text/html", body: fixture }),
    );
    await content.goto("https://notes.example.com/field-notes");
    await settings.setViewport({ width: 1280, height: 800 });
    await captureEvidence(
      settings,
      "r2shot-settings-light",
      ".settings-layout",
    );
    page = await popup();
    await captureEvidence(page, "r2shot-popup-light");
    await page.close();
    await settings.select("#theme", "dark");
    page = await popup();
    await page.$eval('[value="full"]', (element) => element.click());
    await page.click("#capture");
    await page.waitForFunction(
      () =>
        document.getElementById("capture-status").dataset.state === "success",
      { timeout: 20000 },
    );
    await captureEvidence(page, "r2shot-result-dark");
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    record("Light/dark UI and result screenshots from the installed extension");
    assert.deepEqual(errors, []);
    report = {
      version,
      browser: await browser.version(),
      runtime_sha256: runtimeHashes,
      checks,
      console_errors: errors,
      network:
        "Actual Chrome capture/stitching/signing; R2 HTTP responses intercepted with synthetic credentials. No live bucket/CDN. Clipboard stubbed.",
    };
    if (process.env.E2E_PACKAGE_PATH)
      report.package_sha256 = crypto
        .createHash("sha256")
        .update(await fs.readFile(process.env.E2E_PACKAGE_PATH))
        .digest("hex");
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (testExtensionPath)
        await fs.rm(testExtensionPath, { recursive: true, force: true });
    }
  }
  await fs.writeFile(
    path.join(output, "chrome-extension.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`PASS ${checks.length} Chrome extension scenarios`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
