import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'public', 'ocr');
const coreOutput = path.join(output, 'core');
const langOutput = path.join(output, 'lang');

await rm(output, { recursive: true, force: true });
await Promise.all([
  mkdir(output, { recursive: true }),
  mkdir(coreOutput, { recursive: true }),
  mkdir(langOutput, { recursive: true }),
]);

await copyFile(
  path.join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
  path.join(output, 'worker.min.js')
);

const coreSource = path.join(root, 'node_modules', 'tesseract.js-core');
// OEM.LSTM_ONLY can select one of these three v7 Emscripten variants after it
// detects the browser's SIMD support. Other core variants and the raw WASM or
// wrapper files are dead weight for this purchase-bill OCR path.
const coreFiles = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];
const availableCoreFiles = new Set(await readdir(coreSource));
const missingCoreFiles = coreFiles.filter((name) => !availableCoreFiles.has(name));
if (missingCoreFiles.length > 0) {
  throw new Error(`Missing local Tesseract LSTM assets: ${missingCoreFiles.join(', ')}`);
}
await Promise.all(
  coreFiles.map((name) => copyFile(path.join(coreSource, name), path.join(coreOutput, name)))
);

await copyFile(
  path.join(
    root,
    'node_modules',
    '@tesseract.js-data',
    'eng',
    '4.0.0_best_int',
    'eng.traineddata.gz'
  ),
  path.join(langOutput, 'eng.traineddata.gz')
);

console.log(`Prepared local OCR worker, core and language assets in ${output}`);
