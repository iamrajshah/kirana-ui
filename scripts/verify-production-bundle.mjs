import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const checkedExtensions = new Set(['.html', '.js', '.css', '.json']);
const localApiPattern = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/api(?:\/v\d+)?)?/gi;
export const approvedProductionApi =
  'https://appealing-youthfulness-production-a6ab.up.railway.app/api/v1';
export const productionBundleBudgets = Object.freeze({
  entryJavaScriptGzipBytes: 420 * 1024,
  entryCssGzipBytes: 15 * 1024,
  initialTotalGzipBytes: 440 * 1024,
  largestLazyJavaScriptGzipBytes: 500 * 1024,
});

const assetFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? assetFiles(path) : checkedExtensions.has(extname(entry.name)) ? [path] : [];
    })
  );
  return files.flat();
};

const attributesForTag = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ])
  );

export const findInitialAssetReferences = (html) => {
  const references = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const attributes = attributesForTag(tag);
    if (tag.toLowerCase().startsWith('<script')) {
      if (attributes.src) references.add(attributes.src);
      continue;
    }

    const relations = (attributes.rel || '').toLowerCase().split(/\s+/);
    if (
      attributes.href &&
      (relations.includes('stylesheet') || relations.includes('modulepreload'))
    ) {
      references.add(attributes.href);
    }
  }
  return [...references];
};

const resolveBundleAsset = (directory, reference) => {
  if (/^(?:[a-z]+:)?\/\//i.test(reference) || reference.startsWith('data:')) return null;
  const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]).replace(/^\/+/, '');
  if (!cleanReference) return null;
  const root = resolve(directory);
  const assetPath = resolve(root, cleanReference);
  const pathFromRoot = relative(root, assetPath);
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error(`Production bundle entry references a file outside dist: ${reference}`);
  }
  return assetPath;
};

const gzipBytes = async (file) => gzipSync(await readFile(file), { level: 9 }).byteLength;

export const measureProductionBundle = async (directory) => {
  const indexPath = join(directory, 'index.html');
  const initialReferences = findInitialAssetReferences(await readFile(indexPath, 'utf8'));
  const initialFiles = [
    ...new Set(
      initialReferences
        .map((reference) => resolveBundleAsset(directory, reference))
        .filter(Boolean)
    ),
  ];
  const initialMeasurements = await Promise.all(
    initialFiles.map(async (file) => ({ file, gzipBytes: await gzipBytes(file) }))
  );
  const entryJavaScriptGzipBytes = initialMeasurements
    .filter(({ file }) => extname(file) === '.js')
    .reduce((total, measurement) => total + measurement.gzipBytes, 0);
  const entryCssGzipBytes = initialMeasurements
    .filter(({ file }) => extname(file) === '.css')
    .reduce((total, measurement) => total + measurement.gzipBytes, 0);
  const initialTotalGzipBytes = initialMeasurements.reduce(
    (total, measurement) => total + measurement.gzipBytes,
    0
  );
  const initialFileSet = new Set(initialFiles);
  const lazyJavaScriptMeasurements = await Promise.all(
    (await assetFiles(directory))
      .filter((file) => extname(file) === '.js' && !initialFileSet.has(file))
      .map(async (file) => ({ file, gzipBytes: await gzipBytes(file) }))
  );
  const largestLazyJavaScript = lazyJavaScriptMeasurements.reduce(
    (largest, measurement) =>
      measurement.gzipBytes > largest.gzipBytes ? measurement : largest,
    { file: null, gzipBytes: 0 }
  );

  return {
    entryJavaScriptGzipBytes,
    entryCssGzipBytes,
    initialTotalGzipBytes,
    largestLazyJavaScriptGzipBytes: largestLazyJavaScript.gzipBytes,
    largestLazyJavaScriptFile: largestLazyJavaScript.file,
  };
};

export const verifyProductionBundleBudgets = async (
  directory,
  budgets = productionBundleBudgets
) => {
  const measurements = await measureProductionBundle(directory);
  const failures = [
    ['entry JavaScript', measurements.entryJavaScriptGzipBytes, budgets.entryJavaScriptGzipBytes],
    ['entry CSS', measurements.entryCssGzipBytes, budgets.entryCssGzipBytes],
    ['initial total', measurements.initialTotalGzipBytes, budgets.initialTotalGzipBytes],
    [
      'largest lazy JavaScript',
      measurements.largestLazyJavaScriptGzipBytes,
      budgets.largestLazyJavaScriptGzipBytes,
    ],
  ].filter(([, actual, budget]) => actual > budget);

  if (failures.length > 0) {
    const details = failures
      .map(([label, actual, budget]) => `${label}: ${actual} bytes gzip exceeds ${budget} bytes`)
      .join('\n');
    throw new Error(`Production bundle exceeds its size budget:\n${details}`);
  }

  return measurements;
};

export const findLocalApiReferences = async (directory) => {
  const findings = [];
  for (const file of await assetFiles(directory)) {
    const content = await readFile(file, 'utf8');
    const matches = [...content.matchAll(localApiPattern)].map((match) => match[0]);
    if (matches.length > 0) findings.push({ file, matches: [...new Set(matches)] });
  }
  return findings;
};

export const verifyProductionBundle = async (directory) => {
  const files = await assetFiles(directory);
  const findings = await findLocalApiReferences(directory);
  if (findings.length > 0) {
    const details = findings.map(({ file, matches }) => `${file}: ${matches.join(', ')}`).join('\n');
    throw new Error(`Production bundle contains a local API address:\n${details}`);
  }

  const usesApprovedApi = await Promise.all(
    files.map(async (file) => (await readFile(file, 'utf8')).includes(approvedProductionApi))
  );
  if (!usesApprovedApi.some(Boolean)) {
    throw new Error(`Production bundle does not contain the approved API address: ${approvedProductionApi}`);
  }

  return verifyProductionBundleBudgets(directory);
};

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  const directory = resolve(process.argv[2] || 'dist');
  verifyProductionBundle(directory)
    .then(() => console.log(`Verified production bundle: ${directory}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
