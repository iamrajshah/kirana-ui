import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const environmentRevision =
  process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || process.env.COMMIT_SHA;
let revision = environmentRevision?.trim();

if (!revision) {
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    revision = 'unknown';
  }
}

const manifest = {
  application: packageJson.name,
  version: packageJson.version,
  revision,
  builtAt: new Date().toISOString(),
};

const outputDirectory = resolve(root, 'dist');
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Wrote release manifest for ${manifest.application}@${manifest.revision}\n`);

