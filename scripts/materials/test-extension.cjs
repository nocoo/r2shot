// Reuse the regular Chrome suite against the exact material archive extraction.
const path = require('node:path');
const {output, version, executablePath} = require('./paths.cjs');

process.env.EXTENSION_PATH = path.join(output, 'unpacked');
process.env.E2E_OUTPUT_DIR = path.join(output, 'verification');
process.env.E2E_PACKAGE_PATH = path.join(output, `r2shot-${version}.zip`);
if (executablePath) process.env.PUPPETEER_EXECUTABLE_PATH = executablePath;
require('../../tests/e2e/extension.e2e.cjs');
