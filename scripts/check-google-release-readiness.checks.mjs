import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  inspectGoogleBuildConfig,
  loadGoogleReleaseEnvironment,
  probeGoogleServerReadiness,
} from './check-google-release-readiness.mjs';

const webClientId = '123456789-kirana.apps.googleusercontent.com';

test('keeps a normal password-only build valid while Google is disabled', () => {
  assert.deepEqual(inspectGoogleBuildConfig({ VITE_GOOGLE_ENTRY_ENABLED: 'false' }).blockers, []);
});

test('fails a Google-enabled build without a valid public client ID', () => {
  assert.deepEqual(inspectGoogleBuildConfig({ VITE_GOOGLE_ENTRY_ENABLED: 'true' }).blockers, [
    'VITE_GOOGLE_WEB_CLIENT_ID_MISSING',
  ]);
  assert.deepEqual(
    inspectGoogleBuildConfig({
      VITE_GOOGLE_ENTRY_ENABLED: 'true',
      VITE_GOOGLE_WEB_CLIENT_ID: 'not-a-google-client-id',
    }).blockers,
    ['VITE_GOOGLE_WEB_CLIENT_ID_INVALID']
  );
});

test('requires every deployment input when a Google release is requested', () => {
  assert.deepEqual(inspectGoogleBuildConfig({}, { required: true, probeApi: true }).blockers, [
    'VITE_GOOGLE_ENTRY_ENABLED_NOT_TRUE',
    'VITE_API_BASE_URL_MISSING',
  ]);
});

test('checks the same production env files that Vite loads for a release build', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'kirana-google-release-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, '.env.production'),
    `VITE_GOOGLE_ENTRY_ENABLED=true\nVITE_GOOGLE_WEB_CLIENT_ID=${webClientId}\n`
  );

  const environment = loadGoogleReleaseEnvironment(directory, {});
  assert.deepEqual(inspectGoogleBuildConfig(environment).blockers, []);
  assert.equal(environment.VITE_GOOGLE_ENTRY_ENABLED, 'true');
});

test('accepts an enabled client only when the server verifier is ready', async () => {
  const ready = await probeGoogleServerReadiness('https://api.example/api/v1', async () =>
    Response.json({ data: { googleKnownIdentity: { enabled: true, blockers: [] } } })
  );
  assert.deepEqual(ready, { ready: true, blockers: [] });

  const blocked = await probeGoogleServerReadiness(
    'https://api.example/api/v1',
    async () =>
      Response.json({
        data: {
          googleKnownIdentity: {
            enabled: false,
            blockers: ['GOOGLE_AUTH_DISABLED', 'GOOGLE_AUDIENCE_MISSING'],
          },
        },
      })
  );
  assert.deepEqual(blocked, {
    ready: false,
    blockers: ['GOOGLE_AUTH_DISABLED', 'GOOGLE_AUDIENCE_MISSING'],
  });
});
