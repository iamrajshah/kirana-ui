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
      // Try to refresh token
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh-token',
            method: 'POST',
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const data = refreshResult.data as {
            data?: { accessToken?: string; refreshToken?: string };
          };
          if (!data.data?.accessToken || !data.data.refreshToken) {
            api.dispatch(logout());
            return result;
          }
          api.dispatch(
            updateTokens({
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            })
          );
          // Retry original query
          result = await baseQuery(requestArgs, api, extraOptions);
        } else {
          // Refresh failed - logout
          notificationService.error('Session expired. Please login again.');
          api.dispatch(logout());
        }
      } else {
        notificationService.error('Session expired. Please login again.');
        api.dispatch(logout());
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
  ],
  endpoints: () => ({}),
});
