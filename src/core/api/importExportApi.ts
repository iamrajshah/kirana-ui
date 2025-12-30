import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export interface ImportJob {
  id: string;
  file_name: string;
  file_path: string;
  import_type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_details?: any;
  created_at: string;
  updated_at: string;
}

export interface ImportJobDetails extends ImportJob {
  preview_data?: any[];
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export const importExportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Import endpoints
    uploadImportFile: builder.mutation<ApiResponse<ImportJob>, { file: File; importType: string }>({
      query: ({ file, importType }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);
        
        return {
          url: '/import/upload',
          method: 'POST',
          body: formData,
        };
      },
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
    
    // Export endpoints - return blob data, let component handle download
    exportCustomers: builder.query<Blob, { format?: 'CSV' | 'EXCEL' }>({
      query: ({ format = 'CSV' }) => ({
        url: '/import/export/customers',
        params: { format },
        responseHandler: async (response) => response.blob(),
      }),
    }),
    
    exportProducts: builder.query<Blob, { format?: 'CSV' | 'EXCEL' }>({
      query: ({ format = 'CSV' }) => ({
        url: '/import/export/products',
        params: { format },
        responseHandler: async (response) => response.blob(),
      }),
    }),
    
    exportInventory: builder.query<Blob, { format?: 'CSV' | 'EXCEL' }>({
      query: ({ format = 'CSV' }) => ({
        url: '/import/export/inventory',
        params: { format },
        responseHandler: async (response) => response.blob(),
      }),
    }),
    
    exportInvoices: builder.query<Blob, { format?: 'CSV' | 'EXCEL' }>({
      query: ({ format = 'CSV' }) => ({
        url: '/import/export/invoices',
        params: { format },
        responseHandler: async (response) => response.blob(),
      }),
    }),
    
    exportLedger: builder.query<Blob, { format?: 'CSV' | 'EXCEL' }>({
      query: ({ format = 'CSV' }) => ({
        url: '/import/export/ledger',
        params: { format },
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useUploadImportFileMutation,
  useGetImportJobsQuery,
  useGetImportJobQuery,
  useCommitImportJobMutation,
  useLazyExportCustomersQuery,
  useLazyExportProductsQuery,
  useLazyExportInventoryQuery,
  useLazyExportInvoicesQuery,
  useLazyExportLedgerQuery,
} = importExportApi;
