// @vitest-environment node
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  approvedProductionApi,
  findInitialAssetReferences,
  measureProductionBundle,
  verifyProductionBundle,
  verifyProductionBundleBudgets,
} from '../../../scripts/verify-production-bundle.mjs';

describe('production bundle verification', () => {
  it('accepts production API assets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
    await mkdir(join(directory, 'assets'));
    await writeFile(
      join(directory, 'index.html'),
      '<script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css">'
    );
    await writeFile(join(directory, 'assets', 'app.js'), approvedProductionApi);
    await writeFile(join(directory, 'assets', 'app.css'), 'body{color:#123}');
    await expect(verifyProductionBundle(directory)).resolves.toMatchObject({
      entryJavaScriptGzipBytes: expect.any(Number),
      entryCssGzipBytes: expect.any(Number),
    });
  });

  it('rejects a bundle that does not use the approved production API', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
    await writeFile(join(directory, 'index.html'), 'https://api.example.com/api/v1');
    await expect(verifyProductionBundle(directory)).rejects.toThrow('approved API address');
  });

  it.each(['http://localhost:3000/api/v1', 'https://127.0.0.1:3000/api/v1', 'http://[::1]:3000/api']) (
    'rejects local API reference %s',
    async (address) => {
      const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
      await writeFile(join(directory, 'index.html'), `<script>window.api='${address}'</script>`);
      await expect(verifyProductionBundle(directory)).rejects.toThrow('local API address');
    }
  );

  it('deduplicates direct scripts, stylesheets and module preloads', () => {
    expect(
      findInitialAssetReferences(`
        <script type="module" src="/assets/app.js"></script>
        <script type="module" src="/assets/app.js"></script>
        <link rel="stylesheet" href="/assets/app.css">
        <link href="/assets/vendor.js" rel="modulepreload">
      `)
    ).toEqual(['/assets/app.js', '/assets/app.css', '/assets/vendor.js']);
  });

  it('measures direct entry assets once and keeps lazy JavaScript separate', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
    await mkdir(join(directory, 'assets'));
    const entry = 'console.log("entry")';
    const lazy = 'console.log("lazy".repeat(1000))';
    await writeFile(
      join(directory, 'index.html'),
      '<script type="module" src="/assets/app.js"></script><script type="module" src="/assets/app.js"></script>'
    );
    await writeFile(join(directory, 'assets', 'app.js'), entry);
    await writeFile(join(directory, 'assets', 'lazy.js'), lazy);

    await expect(measureProductionBundle(directory)).resolves.toMatchObject({
      entryJavaScriptGzipBytes: gzipSync(entry, { level: 9 }).byteLength,
      initialTotalGzipBytes: gzipSync(entry, { level: 9 }).byteLength,
      largestLazyJavaScriptGzipBytes: gzipSync(lazy, { level: 9 }).byteLength,
    });
  });

  it('rejects a deterministic entry asset that exceeds its gzip budget', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
    await mkdir(join(directory, 'assets'));
    await writeFile(
      join(directory, 'index.html'),
      '<script type="module" src="/assets/app.js"></script>'
    );
    await writeFile(
      join(directory, 'assets', 'app.js'),
      Array.from({ length: 1024 }, (_, index) => String.fromCharCode(32 + ((index * 73) % 90))).join('')
    );

    await expect(
      verifyProductionBundleBudgets(directory, {
        entryJavaScriptGzipBytes: 20,
        entryCssGzipBytes: 1000,
        initialTotalGzipBytes: 20,
        largestLazyJavaScriptGzipBytes: 1000,
      })
    ).rejects.toThrow('exceeds its size budget');
  });
});
