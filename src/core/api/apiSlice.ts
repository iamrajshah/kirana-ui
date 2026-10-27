import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import {
  logout,
  setCommercialAccessForSession,
  setSessionContextForSession,
  updateTokens,
} from '../auth/authSlice';
import { notificationService } from '../services/notificationService';
import {
  commercialDenialMessage,
  isCommercialDenial,
  type CommercialAccessSummary,
} from '@core/commercial';
import type { SessionContext } from '@core/types';

export type ApiRequestArgs =
  | string
  | (FetchArgs & {
      suppressErrorToast?: boolean;
    });

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const auth = (
      getState() as {
        auth?: { accessToken?: string | null; sessionContext?: SessionContext | null };
      }
    ).auth;
    const token = auth?.accessToken ?? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    const commercial = auth?.sessionContext?.commercialAccess;
    if (commercial && 'accessStateVersion' in commercial) {
      headers.set('x-access-state-version', commercial.accessStateVersion);
    }
    return headers;
  },
});

type QueryApi = Parameters<typeof baseQuery>[1];
type QueryExtraOptions = Parameters<typeof baseQuery>[2];

interface AuthSnapshot {
  sessionVersion: number;
  userId: string;
  refreshToken: string;
}

const SESSION_SENSITIVE_TAGS = [
  'User',
  'Customer',
  'Product',
  'Inventory',
  'Invoice',
  'Payment',
  'Dashboard',
  'Category',
  'Import',
  'Supplier',
  'Purchase',
  'TenantSettings',
  'Firm',
  'Report',
] as const;

const readAuthSnapshot = (api: QueryApi): AuthSnapshot | null => {
  const auth = (
    api.getState() as {
      auth?: {
        user?: { id?: string } | null;
        refreshToken?: string | null;
        sessionVersion?: number;
      };
    }
  ).auth;
  const refreshToken = auth?.refreshToken ?? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!auth?.user?.id || typeof auth.sessionVersion !== 'number' || !refreshToken) return null;
  return { userId: auth.user.id, sessionVersion: auth.sessionVersion, refreshToken };
};

const isCurrentSession = (api: QueryApi, expected: AuthSnapshot): boolean => {
  const current = readAuthSnapshot(api);
  return Boolean(
    current &&
    current.userId === expected.userId &&
    current.sessionVersion === expected.sessionVersion &&
    current.refreshToken === expected.refreshToken &&
    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) === expected.refreshToken
  );
};

const contextRefreshes = new Map<string, Promise<void>>();
const CONTEXT_REFRESH_TIMEOUT_MS = 5_000;

const withTimeout = async <T>(request: Promise<T>): Promise<T | null> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), CONTEXT_REFRESH_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const synchronizeSessionState = (
  api: QueryApi,
  extraOptions: QueryExtraOptions,
  expected: AuthSnapshot,
  observedAccessVersion?: string
): Promise<void> => {
  const key = `${expected.sessionVersion}:${expected.userId}:${expected.refreshToken}:${observedAccessVersion ?? 'refresh'}`;
  const existing = contextRefreshes.get(key);
  if (existing) return existing;

  const synchronization = (async () => {
    if (!isCurrentSession(api, expected)) return;
    const previousVersion = (
      (api.getState() as { auth?: { sessionContext?: SessionContext | null } }).auth?.sessionContext
        ?.commercialAccess as CommercialAccessSummary | undefined
    )?.accessStateVersion;
    const [sessionResult, accessResult] = await Promise.all([
      withTimeout(Promise.resolve(baseQuery('/auth/session-context', api, extraOptions))),
      withTimeout(Promise.resolve(baseQuery('/subscription/access', api, extraOptions))),
    ]);
    if (!isCurrentSession(api, expected)) return;

    const session = (sessionResult?.data as { data?: unknown } | undefined)?.data;
    if (session && typeof session === 'object' && 'identity' in session) {
      api.dispatch(
        setSessionContextForSession({
          ...expected,
          sessionContext: session as SessionContext,
        })
      );
    }
    const access = (accessResult?.data as { data?: unknown } | undefined)?.data;
    if (access && typeof access === 'object' && 'planCode' in access) {
      const commercialAccess = access as CommercialAccessSummary;
      api.dispatch(
        setCommercialAccessForSession({
          ...expected,
          commercialAccess,
        })
      );
      if (previousVersion && previousVersion !== commercialAccess.accessStateVersion) {
        api.dispatch(apiSlice.util.invalidateTags([...SESSION_SENSITIVE_TAGS]));
      }
    }
  })().finally(() => {
    if (contextRefreshes.get(key) === synchronization) contextRefreshes.delete(key);
  });
  contextRefreshes.set(key, synchronization);
  return synchronization;
};

let refreshInFlight: { snapshot: AuthSnapshot; promise: Promise<boolean> } | null = null;

const refreshSession = (api: QueryApi, extraOptions: QueryExtraOptions): Promise<boolean> => {
  const snapshot = readAuthSnapshot(api);
  if (!snapshot) {
    notificationService.error('Session expired. Please login again.');
    api.dispatch(logout());
    return Promise.resolve(false);
  }
  if (
    refreshInFlight &&
    refreshInFlight.snapshot.sessionVersion === snapshot.sessionVersion &&
    refreshInFlight.snapshot.userId === snapshot.userId &&
    refreshInFlight.snapshot.refreshToken === snapshot.refreshToken
  ) {
    return refreshInFlight.promise;
  }

  const promise = (async () => {
    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refresh_token: snapshot.refreshToken },
      },
      api,
      extraOptions
    );
    const payload = refreshResult.data as
      | { data?: { accessToken?: string; refreshToken?: string } }
      | undefined;
    if (!payload?.data?.accessToken || !payload.data.refreshToken) {
      if (isCurrentSession(api, snapshot)) {
        notificationService.error('Session expired. Please login again.');
        api.dispatch(logout());
      }
      return false;
    }
    if (!isCurrentSession(api, snapshot)) return false;

    api.dispatch(
      updateTokens({
        ...snapshot,
        accessToken: payload.data.accessToken,
        nextRefreshToken: payload.data.refreshToken,
      })
    );
    const refreshedSession = { ...snapshot, refreshToken: payload.data.refreshToken };
    if (!isCurrentSession(api, refreshedSession)) return false;
    void synchronizeSessionState(api, extraOptions, refreshedSession);
    return true;
  })();
  const entry = { snapshot, promise };
  refreshInFlight = entry;
  void promise.finally(() => {
    if (refreshInFlight === entry) refreshInFlight = null;
  });
  return promise;
};

const notifyApiError = (error: FetchBaseQueryError): void => {
  const data = error.data;
  if (
    data &&
    typeof data === 'object' &&
    'commercial' in data &&
    isCommercialDenial(data.commercial)
  ) {
    notificationService.error(commercialDenialMessage(data.commercial));
    return;
  }
  if (error.status === 'FETCH_ERROR') {
    notificationService.error(
      'Network error. Please check your connection and server configuration.'
    );
  } else if (error.status === 'PARSING_ERROR') {
    notificationService.error('Server response error. Please try again.');
  } else if (error.status === 403) {
    notificationService.error('Access denied. You do not have permission.');
  } else if (error.status === 404) {
    notificationService.error('Resource not found.');
  } else if (error.status === 500) {
    notificationService.error('Server error. Please try again later.');
  } else {
    const errorData = error.data;
    if (
      errorData &&
      typeof errorData === 'object' &&
      'message' in errorData &&
      typeof errorData.message === 'string' &&
      errorData.message
    ) {
      notificationService.error(errorData.message);
    } else {
      notificationService.error('An error occurred. Please try again.');
    }
  }
};

const baseQueryWithReauth: BaseQueryFn<ApiRequestArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const requestsSilentInitialFailure = typeof args === 'object' && args.suppressErrorToast === true;
  const suppressErrorToast = requestsSilentInitialFailure && api.forced !== true;
  const hasRequestPolicy = typeof args === 'object' && 'suppressErrorToast' in args;
  const requestArgs = hasRequestPolicy ? { ...args } : args;
  if (hasRequestPolicy && typeof requestArgs === 'object') {
    delete requestArgs.suppressErrorToast;
  }
  let result = await baseQuery(requestArgs, api, extraOptions);

  if (result.error) {
    const errorData = result.error.data;
    const commercialDenial =
      errorData && typeof errorData === 'object' && 'commercial' in errorData
        ? errorData.commercial
        : null;
    if (isCommercialDenial(commercialDenial)) {
      const snapshot = readAuthSnapshot(api);
      const previousVersion = (
        (api.getState() as { auth?: { sessionContext?: SessionContext } }).auth?.sessionContext
          ?.commercialAccess as CommercialAccessSummary | undefined
      )?.accessStateVersion;
      if (
        snapshot &&
        (!commercialDenial.accessStateVersion ||
          commercialDenial.accessStateVersion !== previousVersion)
      ) {
        void synchronizeSessionState(
          api,
          extraOptions,
          snapshot,
          commercialDenial.accessStateVersion
        );
      }
    }
    // Handle different error types
    if (result.error.status === 401) {
      if (await refreshSession(api, extraOptions)) {
        result = await baseQuery(requestArgs, api, extraOptions);
      }
    } else if (!suppressErrorToast) {
      notifyApiError(result.error);
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Customer',
    'Product',
    'Inventory',
    'Invoice',
    'Payment',
    'Dashboard',
    'Category',
    'Import',
    'Supplier',
    'Purchase',
    'TenantSettings',
    'Firm',
    'Report',
    'Account',
    'Renewal',
  ],
  endpoints: () => ({}),
});
