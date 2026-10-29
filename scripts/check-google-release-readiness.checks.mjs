import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  checkGoogleRelease,
  fingerprintGoogleAudience,
  inspectGoogleBuildConfig,
  loadGoogleReleaseEnvironment,
  probeGoogleServerReadiness,
} from './check-google-release-readiness.mjs';

const webClientId = '123456789-kirana.apps.googleusercontent.com';
const otherWebClientId = '222222222-other.apps.googleusercontent.com';
const androidClientId = '333333333-android.apps.googleusercontent.com';

test('keeps a normal password-only build valid while Google is disabled', () => {
  const config = inspectGoogleBuildConfig({ VITE_GOOGLE_ENTRY_ENABLED: 'false' });
  assert.deepEqual(config.blockers, []);
  assert.equal(config.shouldProbe, false);
});

test('fails a Google-enabled build without a valid public client ID', () => {
  assert.deepEqual(
    inspectGoogleBuildConfig({
      VITE_GOOGLE_ENTRY_ENABLED: 'true',
      VITE_API_BASE_URL: 'https://api.example/api/v1',
    }).blockers,
    ['VITE_GOOGLE_WEB_CLIENT_ID_MISSING']
  );
  assert.deepEqual(
    inspectGoogleBuildConfig({
      VITE_GOOGLE_ENTRY_ENABLED: 'true',
      VITE_GOOGLE_WEB_CLIENT_ID: 'not-a-google-client-id',
      VITE_API_BASE_URL: 'https://api.example/api/v1',
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
    `VITE_GOOGLE_ENTRY_ENABLED=true\nVITE_GOOGLE_WEB_CLIENT_ID=${webClientId}\nVITE_API_BASE_URL=https://api.example/api/v1\n`
  );

  const environment = loadGoogleReleaseEnvironment(directory, {});
  assert.deepEqual(inspectGoogleBuildConfig(environment).blockers, []);
  assert.equal(environment.VITE_GOOGLE_ENTRY_ENABLED, 'true');
});

test('accepts an enabled web client only when its exact fingerprint is allow-listed', async () => {
  const ready = await probeGoogleServerReadiness(
    'https://api.example/api/v1',
    fingerprintGoogleAudience(webClientId),
    async () =>
      Response.json({
        data: {
          googleKnownIdentity: {
            enabled: true,
            blockers: [],
            audienceFingerprints: {
              web: [fingerprintGoogleAudience(webClientId)],
              android: [fingerprintGoogleAudience(androidClientId)],
            },
          },
        },
      })
  );
  assert.deepEqual(ready, { ready: true, blockers: [] });
});

test('rejects a mismatched web client even when Google and Android audiences are ready', async () => {
  const mismatch = await probeGoogleServerReadiness(
    'https://api.example/api/v1',
    fingerprintGoogleAudience(webClientId),
    async () =>
      Response.json({
        data: {
          googleKnownIdentity: {
            enabled: true,
            blockers: [],
            audienceFingerprints: {
              web: [fingerprintGoogleAudience(otherWebClientId)],
              android: [fingerprintGoogleAudience(webClientId)],
            },
          },
        },
      })
  );
  assert.deepEqual(mismatch, {
    ready: false,
    blockers: ['SERVER_WEB_CLIENT_ID_MISMATCH'],
  });
});

test('retains bounded server blockers when Google verification is disabled', async () => {
  const blocked = await probeGoogleServerReadiness(
    'https://api.example/api/v1',
    fingerprintGoogleAudience(webClientId),
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

test('an enabled production build probes automatically while password-only builds stay offline', async () => {
  let requests = 0;
  const fetcher = async () => {
    requests += 1;
    return Response.json({
      data: {
        googleKnownIdentity: {
          enabled: true,
          blockers: [],
          audienceFingerprints: {
            web: [fingerprintGoogleAudience(webClientId)],
            android: [],
          },
        },
      },
    });
  };

  const disabled = await checkGoogleRelease({ VITE_GOOGLE_ENTRY_ENABLED: 'false' }, {}, fetcher);
  assert.deepEqual(disabled, {
    googleSignIn: 'disabled',
    clientIdConfigured: false,
    serverProbe: 'not-requested',
    blockers: [],
  });
  assert.equal(requests, 0);

  const enabled = await checkGoogleRelease(
    {
      VITE_GOOGLE_ENTRY_ENABLED: 'true',
      VITE_GOOGLE_WEB_CLIENT_ID: webClientId,
      VITE_API_BASE_URL: 'https://api.example/api/v1',
    },
    {},
    fetcher
  );
  assert.equal(requests, 1);
  assert.deepEqual(enabled, {
    googleSignIn: 'enabled',
    clientIdConfigured: true,
    serverProbe: 'passed',
    blockers: [],
  });
});
