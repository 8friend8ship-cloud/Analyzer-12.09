import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const assetsDir = path.resolve('dist/assets');
const maxBytes = 500 * 1024;
const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js'));

if (files.length === 0) {
  throw new Error('BUNDLE_BUDGET_NO_JS: no production JavaScript assets were generated.');
}

const results = await Promise.all(
  files.map(async (file) => ({
    file,
    bytes: (await stat(path.join(assetsDir, file))).size,
  })),
);

const oversized = results.filter(({ bytes }) => bytes > maxBytes);
const largest = [...results].sort((a, b) => b.bytes - a.bytes)[0];

console.log(`BUNDLE_BUDGET largest=${largest.file} bytes=${largest.bytes} limit=${maxBytes} chunks=${results.length}`);

if (oversized.length > 0) {
  const details = oversized.map(({ file, bytes }) => `${file}=${bytes}`).join(', ');
  throw new Error(`BUNDLE_BUDGET_EXCEEDED: ${details}; limit=${maxBytes}`);
}
