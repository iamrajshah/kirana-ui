import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export interface TenantBackupPreview {
  tenantName: string;
  createdAt: string;
  counts: Record<string, number>;
  totalRecords: number;
  excludes: string[];
  warnings: string[];
}

export interface TenantRestoreResult {
  restoredAt: string;
  backupCreatedAt: string;
  counts: Record<string, number>;
  totalRecords: number;
}

export const createBackupFormData = (file: File, confirmation?: string): FormData => {
  const body = new FormData();
  body.append('file', file);
  if (confirmation !== undefined) body.append('confirmation', confirmation);
  return body;
};

export const tenantBackupApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    downloadTenantBackup: builder.mutation<string, void>({
      query: () => ({
        url: '/tenant-backup/export',
        responseHandler: async (response) =>
          response.ok ? URL.createObjectURL(await response.blob()) : response.text(),
      }),
    }),
    previewTenantBackup: builder.mutation<ApiResponse<TenantBackupPreview>, File>({
      query: (file) => ({
        url: '/tenant-backup/preview',
        method: 'POST',
        body: createBackupFormData(file),
      }),
    }),
    restoreTenantBackup: builder.mutation<
      ApiResponse<TenantRestoreResult>,
      { file: File; confirmation: string }
    >({
      query: ({ file, confirmation }) => ({
        url: '/tenant-backup/restore',
        method: 'POST',
        body: createBackupFormData(file, confirmation),
      }),
      invalidatesTags: [
        'Customer',
        'Product',
        'Inventory',
        'Invoice',
        'Payment',
        'Dashboard',
        'Category',
        'Supplier',
        'Purchase',
      ],
    }),
  }),
});

export const {
  useDownloadTenantBackupMutation,
  usePreviewTenantBackupMutation,
  useRestoreTenantBackupMutation,
} = tenantBackupApi;
