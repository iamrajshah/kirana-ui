// @vitest-environment node
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  approvedProductionApi,
  verifyProductionBundle,
} from '../../../scripts/verify-production-bundle.mjs';

describe('production bundle verification', () => {
  it('accepts production API assets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirana-bundle-'));
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets', 'app.js'), approvedProductionApi);
    await expect(verifyProductionBundle(directory)).resolves.toBeUndefined();
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
});
