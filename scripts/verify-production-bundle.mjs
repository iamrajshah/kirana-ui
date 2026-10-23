import { readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const checkedExtensions = new Set(['.html', '.js', '.css', '.json']);
const localApiPattern = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/api(?:\/v\d+)?)?/gi;
export const approvedProductionApi =
  'https://appealing-youthfulness-production-a6ab.up.railway.app/api/v1';

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
