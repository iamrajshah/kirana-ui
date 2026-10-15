import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export type ImportType = 'CUSTOMER' | 'PRODUCT' | 'INVENTORY' | 'CATEGORY';
export type ExportType =
  | 'customers'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'invoices'
  | 'ledger';
export type ExportFormat = 'CSV' | 'EXCEL';

export const createImportFormData = (file: File, type: ImportType): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  return formData;
};

export interface ImportJob {
  id: string;
  file_name?: string;
  file_path?: string;
  type: string;
  import_type?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  file_url: string | null;
  created_at: string | null;
  row_counts: {
    total: number;
    pending: number;
    valid: number;
    invalid: number;
    imported: number;
  };
  error_details?: unknown;
  updated_at?: string;
}

export interface ImportJobDetails extends ImportJob {
  preview_data?: Record<string, unknown>[];
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export const importExportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Import endpoints
    uploadImportFile: builder.mutation<ApiResponse<ImportJob>, { file: File; type: ImportType }>({
      query: ({ file, type }) => ({
        url: '/import/upload',
        method: 'POST',
        body: createImportFormData(file, type),
      }),
      invalidatesTags: ['Import'],
    }),

    getImportJobs: builder.query<ApiResponse<ImportJob[]>, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/import',
        params,
      }),
      providesTags: ['Import'],
    }),

    getImportJob: builder.query<ApiResponse<ImportJobDetails>, string>({
      query: (jobId) => `/import/${jobId}`,
      providesTags: ['Import'],
    }),

    commitImportJob: builder.mutation<ApiResponse<ImportJob>, string>({
      query: (jobId) => ({
        url: `/import/${jobId}/commit`,
        method: 'POST',
      }),
      invalidatesTags: ['Import', 'Product', 'Customer', 'Inventory'],
    }),

    exportData: builder.mutation<string, { type: ExportType; format?: ExportFormat }>({
      query: ({ type, format = 'CSV' }) => ({
        url: `/import/export/${type}`,
        params: { format },
        responseHandler: async (response) =>
          response.ok ? URL.createObjectURL(await response.blob()) : response.text(),
      }),
    }),
  }),
});

export const {
  useUploadImportFileMutation,
  useGetImportJobsQuery,
  useGetImportJobQuery,
  useCommitImportJobMutation,
  useExportDataMutation,
} = importExportApi;
