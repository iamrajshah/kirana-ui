import { apiSlice } from './apiSlice';
import type {
  ApiResponse,
  TenantDocumentSettings,
  UpdateTenantDocumentSettings,
} from '../types';

export const tenantSettingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTenantSettings: builder.query<ApiResponse<TenantDocumentSettings>, void>({
      query: () => '/tenant-settings',
      providesTags: ['TenantSettings'],
    }),
    updateTenantSettings: builder.mutation<
      ApiResponse<TenantDocumentSettings>,
      UpdateTenantDocumentSettings
    >({
      query: (body) => ({ url: '/tenant-settings', method: 'PATCH', body }),
      invalidatesTags: ['TenantSettings'],
    }),
  }),
});

export const { useGetTenantSettingsQuery, useUpdateTenantSettingsMutation } = tenantSettingsApi;
