import { loadEnv } from 'vite';

const clientIdPattern = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;

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
  const blockers = [];

  if (required && !enabled) blockers.push('VITE_GOOGLE_ENTRY_ENABLED_NOT_TRUE');
  if (enabled && !clientId) blockers.push('VITE_GOOGLE_WEB_CLIENT_ID_MISSING');
  if (enabled && clientId && !clientIdPattern.test(clientId)) {
    blockers.push('VITE_GOOGLE_WEB_CLIENT_ID_INVALID');
  }
  if (options.probeApi && !apiBaseUrl) blockers.push('VITE_API_BASE_URL_MISSING');

  return { enabled, clientIdConfigured: Boolean(clientId), apiBaseUrl, blockers };
};

export const probeGoogleServerReadiness = async (apiBaseUrl, fetcher = fetch) => {
  let response;
  try {
    response = await fetcher(`${apiBaseUrl}/readiness`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'UNKNOWN';
    return { ready: false, blockers: [`READINESS_REQUEST_FAILED:${reason}`] };
  }

  if (!response.ok) return { ready: false, blockers: [`READINESS_HTTP_${response.status}`] };

  let body;
  try {
    body = await response.json();
  } catch {
    return { ready: false, blockers: ['READINESS_RESPONSE_INVALID'] };
  }

  const google = body?.data?.googleKnownIdentity;
  if (google?.enabled === true) return { ready: true, blockers: [] };
  const blockers = Array.isArray(google?.blockers)
    ? google.blockers.filter((value) => typeof value === 'string')
    : [];
  return {
    ready: false,
    blockers: blockers.length > 0 ? blockers : ['SERVER_GOOGLE_AUTH_NOT_READY'],
  };
};

const run = async () => {
  const probeApi = process.argv.includes('--probe-api');
  const config = inspectGoogleBuildConfig(loadGoogleReleaseEnvironment(), {
    required: probeApi,
    probeApi,
  });
  const blockers = [...config.blockers];

  if (probeApi && blockers.length === 0) {
    const server = await probeGoogleServerReadiness(config.apiBaseUrl);
    blockers.push(...server.blockers);
  }

  if (blockers.length > 0) {
    throw new Error(`Google release is not ready: ${blockers.join(', ')}`);
  }

  process.stdout.write(
    `${JSON.stringify({
      googleSignIn: config.enabled ? 'enabled' : 'disabled',
      clientIdConfigured: config.clientIdConfigured,
      serverProbe: probeApi ? 'passed' : 'not-requested',
    })}\n`
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Google release check failed'}\n`);
    process.exitCode = 1;
  });
}
