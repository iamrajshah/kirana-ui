import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export type ImportType = 'CUSTOMER' | 'PRODUCT' | 'INVENTORY' | 'CATEGORY' | 'SUPPLIER';
export type ExportType =
  | 'customers'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'invoices'
  | 'ledger';
export type SellingPriceBasis = 'UNKNOWN' | 'EXCLUSIVE' | 'INCLUSIVE';
export type ExportFormat = 'CSV' | 'EXCEL';

export const createImportFormData = (
  file: File,
  type: ImportType,
  autoCreateCategories = false,
  sellingPriceBasis: SellingPriceBasis = 'UNKNOWN'
): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('autoCreateCategories', String(autoCreateCategories));
  formData.append('sellingPriceBasis', sellingPriceBasis);
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
  rows: Array<{
    row_no: number;
    status: string;
    error_message: string | null;
    data: Record<string, unknown> & {
      _import?: { format: string; warnings: string[]; source: Record<string, unknown> };
    };
  }>;
  error_summary: Array<{ row_no: number; error: string }>;
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
    uploadImportFile: builder.mutation<
      ApiResponse<ImportJob>,
      {
        file: File;
        type: ImportType;
        autoCreateCategories?: boolean;
        sellingPriceBasis?: SellingPriceBasis;
      }
    >({
      query: ({ file, type, autoCreateCategories, sellingPriceBasis }) => ({
        url: '/import/upload',
        method: 'POST',
        body: createImportFormData(file, type, autoCreateCategories, sellingPriceBasis),
      }),
      invalidatesTags: ['Import'],
    }),

    getImportJobs: builder.query<
      ApiResponse<ImportJob[]>,
      { page?: number; limit?: number; type?: ImportType }
    >({
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

    commitImportJob: builder.mutation<
      ApiResponse<{
        imported: number;
        failed: number;
        remaining: number;
        errors: Array<{ row_no: number; error: string }>;
      }>,
      string
    >({
      query: (jobId) => ({
        url: `/import/${jobId}/commit`,
        body: { batchSize: 50 },
        method: 'POST',
      }),
      invalidatesTags: (_result, error) => [
        'Import',
        'Product',
        'Customer',
        'Inventory',
        'Category',
        'Supplier',
        ...(error ? [] : (['Dashboard'] as const)),
      ],
    }),

    downloadImportTemplate: builder.mutation<
      string,
      { type: ImportType; profile: 'KIRANA' | 'MARGBOOKS'; format: ExportFormat }
    >({
      query: ({ type, profile, format }) => ({
        url: `/import/templates/${type}`,
        params: { profile, format },
        responseHandler: async (response) =>
          response.ok ? URL.createObjectURL(await response.blob()) : response.text(),
      }),
    }),
    downloadImportReview: builder.mutation<string, string>({
      query: (jobId) => ({
        url: `/import/${jobId}/review`,
        responseHandler: async (response) =>
          response.ok ? URL.createObjectURL(await response.blob()) : response.text(),
      }),
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
  useDownloadImportTemplateMutation,
  useDownloadImportReviewMutation,
} = importExportApi;
