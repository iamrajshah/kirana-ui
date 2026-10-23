import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { logout, setCredentials } from '../auth/authSlice';
import { notificationService } from '../services/notificationService';
import type { AuthResponse } from '../types';

export type ApiRequestArgs =
  | string
  | (FetchArgs & {
      suppressErrorToast?: boolean;
    });

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const notifyApiError = (error: FetchBaseQueryError): void => {
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
  const requestsSilentInitialFailure =
    typeof args === 'object' && args.suppressErrorToast === true;
  const suppressErrorToast = requestsSilentInitialFailure && api.forced !== true;
  const hasRequestPolicy = typeof args === 'object' && 'suppressErrorToast' in args;
  const requestArgs = hasRequestPolicy ? { ...args } : args;
  if (hasRequestPolicy && typeof requestArgs === 'object') {
    delete requestArgs.suppressErrorToast;
  }
  let result = await baseQuery(requestArgs, api, extraOptions);

  if (result.error) {
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
          const data = refreshResult.data as AuthResponse;
          // Store new tokens
          api.dispatch(setCredentials(data.data));
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
    'Report',
  ],
  endpoints: () => ({}),
});
