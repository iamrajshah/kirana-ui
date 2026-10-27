import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { logout, setCommercialAccess, setSessionContext, updateTokens } from '../auth/authSlice';
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

let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = (
  api: Parameters<typeof baseQuery>[1],
  extraOptions: Parameters<typeof baseQuery>[2]
): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const state = api.getState() as { auth?: { refreshToken?: string | null } };
    const refreshToken =
      state.auth?.refreshToken ?? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      notificationService.error('Session expired. Please login again.');
      api.dispatch(logout());
      return false;
    }

    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refresh_token: refreshToken },
      },
      api,
      extraOptions
    );
    const payload = refreshResult.data as
      | { data?: { accessToken?: string; refreshToken?: string } }
      | undefined;
    if (!payload?.data?.accessToken || !payload.data.refreshToken) {
      notificationService.error('Session expired. Please login again.');
      api.dispatch(logout());
      return false;
    }

    api.dispatch(updateTokens(payload.data as { accessToken: string; refreshToken: string }));

    // Refreshing a rotating session also revalidates server-owned lifecycle state. The
    // shape guards keep older deployments backward compatible during a rolling release.
    const [sessionResult, accessResult] = await Promise.all([
      baseQuery('/auth/session-context', api, extraOptions),
      baseQuery('/subscription/access', api, extraOptions),
    ]);
    const session = (sessionResult.data as { data?: unknown } | undefined)?.data;
    if (session && typeof session === 'object' && 'identity' in session) {
      api.dispatch(setSessionContext(session as SessionContext));
    }
    const access = (accessResult.data as { data?: unknown } | undefined)?.data;
    if (access && typeof access === 'object' && 'planCode' in access) {
      api.dispatch(setCommercialAccess(access as CommercialAccessSummary));
    }
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
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
      const previousVersion = (
        (api.getState() as { auth?: { sessionContext?: SessionContext | null } }).auth
          ?.sessionContext?.commercialAccess as CommercialAccessSummary | undefined
      )?.accessStateVersion;
      if (
        !commercialDenial.accessStateVersion ||
        commercialDenial.accessStateVersion !== previousVersion
      ) {
        const [sessionResult, accessResult] = await Promise.all([
          baseQuery('/auth/session-context', api, extraOptions),
          baseQuery('/subscription/access', api, extraOptions),
        ]);
        const sessionData = sessionResult.data as { data?: SessionContext } | undefined;
        if (sessionData?.data) api.dispatch(setSessionContext(sessionData.data));
        const accessData = accessResult.data as { data?: CommercialAccessSummary } | undefined;
        if (accessData?.data) {
          api.dispatch(setCommercialAccess(accessData.data));
          if (previousVersion && previousVersion !== accessData.data.accessStateVersion) {
            api.dispatch(
              apiSlice.util.invalidateTags([
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
              ])
            );
          }
        }
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
  ],
  endpoints: () => ({}),
});
