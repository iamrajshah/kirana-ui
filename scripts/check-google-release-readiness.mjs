import { createHash } from 'node:crypto';
import { loadEnv } from 'vite';

const clientIdPattern = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;

export const fingerprintGoogleAudience = (audience) =>
  createHash('sha256').update(audience.trim()).digest('hex');

export const loadGoogleReleaseEnvironment = (
  directory = process.cwd(),
  processEnvironment = process.env
) => ({
  ...loadEnv('production', directory, ''),
  ...processEnvironment,
});

export const inspectGoogleBuildConfig = (environment = process.env, options = {}) => {
  const enabled = environment.VITE_GOOGLE_ENTRY_ENABLED === 'true';
  const required = options.required === true;
  const clientId = environment.VITE_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';
  const shouldProbe = enabled || options.probeApi === true;
  const blockers = [];

  if (required && !enabled) blockers.push('VITE_GOOGLE_ENTRY_ENABLED_NOT_TRUE');
  if (enabled && !clientId) blockers.push('VITE_GOOGLE_WEB_CLIENT_ID_MISSING');
  if (enabled && clientId && !clientIdPattern.test(clientId)) {
    blockers.push('VITE_GOOGLE_WEB_CLIENT_ID_INVALID');
  }
  if (shouldProbe && !apiBaseUrl) blockers.push('VITE_API_BASE_URL_MISSING');

  return {
    enabled,
    clientIdConfigured: Boolean(clientId),
    clientIdFingerprint: clientId ? fingerprintGoogleAudience(clientId) : '',
    apiBaseUrl,
    shouldProbe,
    blockers,
  };
};

export const probeGoogleServerReadiness = async (
  apiBaseUrl,
  expectedWebAudienceFingerprint,
  fetcher = fetch
) => {
  let response;
  try {
    response = await fetcher(`${apiBaseUrl}/readiness`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ready: false, blockers: ['READINESS_REQUEST_FAILED'] };
  }

  if (!response.ok) return { ready: false, blockers: [`READINESS_HTTP_${response.status}`] };

  let body;
  try {
    body = await response.json();
  } catch {
    return { ready: false, blockers: ['READINESS_RESPONSE_INVALID'] };
  }

  const google = body?.data?.googleKnownIdentity;
  if (google?.enabled !== true) {
    const blockers = Array.isArray(google?.blockers)
      ? google.blockers.filter((value) => typeof value === 'string')
      : [];
    return {
      ready: false,
      blockers: blockers.length > 0 ? blockers : ['SERVER_GOOGLE_AUTH_NOT_READY'],
    };
  }

  const webFingerprints = google?.audienceFingerprints?.web;
  if (!Array.isArray(webFingerprints)) {
    return { ready: false, blockers: ['SERVER_WEB_AUDIENCE_FINGERPRINTS_MISSING'] };
  }
  if (!webFingerprints.includes(expectedWebAudienceFingerprint)) {
    return { ready: false, blockers: ['SERVER_WEB_CLIENT_ID_MISMATCH'] };
  }
  return { ready: true, blockers: [] };
};

export const checkGoogleRelease = async (environment, options = {}, fetcher = fetch) => {
  const config = inspectGoogleBuildConfig(environment, options);
  const blockers = [...config.blockers];
  let serverProbe = 'not-requested';

  if (config.shouldProbe && blockers.length === 0) {
    const server = await probeGoogleServerReadiness(
      config.apiBaseUrl,
      config.clientIdFingerprint,
      fetcher
    );
    blockers.push(...server.blockers);
    serverProbe = server.ready ? 'passed' : 'failed';
  }

  return {
    googleSignIn: config.enabled ? 'enabled' : 'disabled',
    clientIdConfigured: config.clientIdConfigured,
    serverProbe,
    blockers,
  };
};

const run = async () => {
  const explicitProbe = process.argv.includes('--probe-api');
  const result = await checkGoogleRelease(loadGoogleReleaseEnvironment(), {
    required: explicitProbe,
    probeApi: explicitProbe,
  });

  if (result.blockers.length > 0) {
    throw new Error(`Google release is not ready: ${result.blockers.join(', ')}`);
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Google release check failed'}\n`
    );
    process.exitCode = 1;
  });
}
