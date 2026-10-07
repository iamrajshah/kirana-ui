import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { logout, setCredentials } from '../auth/authSlice';
import { notificationService } from '../services/notificationService';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

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
          const data = refreshResult.data as any;
          // Store new tokens
          api.dispatch(setCredentials(data.data));
          // Retry original query
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed - logout
          notificationService.error('Session expired. Please login again.');
          api.dispatch(logout());
        }
      } else {
        notificationService.error('Session expired. Please login again.');
        api.dispatch(logout());
      }
    } else if (result.error.status === 'FETCH_ERROR') {
      // CORS or network errors
      notificationService.error('Network error. Please check your connection and server configuration.');
    } else if (result.error.status === 'PARSING_ERROR') {
      notificationService.error('Server response error. Please try again.');
    } else if (result.error.status === 403) {
      notificationService.error('Access denied. You do not have permission.');
    } else if (result.error.status === 404) {
      notificationService.error('Resource not found.');
    } else if (result.error.status === 500) {
      notificationService.error('Server error. Please try again later.');
    } else {
      // Generic error - show message from server if available
      const errorData = result.error.data as any;
      if (errorData?.message) {
        notificationService.error(errorData.message);
      } else {
        notificationService.error('An error occurred. Please try again.');
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Customer', 'Product', 'Inventory', 'Invoice', 'Payment', 'Dashboard', 'Category', 'Import', 'Supplier', 'Purchase'],
  endpoints: () => ({}),
});
