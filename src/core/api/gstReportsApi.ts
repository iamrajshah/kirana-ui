import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';
export interface GstReportParams {
  from: string;
  to: string;
  firmId?: string;
}

export interface GstFirm {
  id: string;
  legalName: string;
  displayName: string;
  gstin?: string | null;
  stateCode?: string | null;
}

export interface GstOutputTaxTotals {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstSummaryData {
  report: 'GST_TAX_LIABILITY_SUMMARY';
  firm: GstFirm;
  period: { from: string; to: string };
  outward: GstOutputTaxTotals;
  inward: { taxableValue: number; invoiceValue: number };
  inputTaxCredit: { cgst: number; sgst: number; igst: number; total: number };
  estimatedNetLiability: { cgst: number; sgst: number; igst: number; total: number };
  warnings: string[];
  disclaimer: string;
}

export interface GstSalesRegisterRow {
  invoiceDate: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  placeOfSupplyCode: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoiceValue: number;
  status: string;
}

export interface GstPurchaseRegisterRow {
  invoiceDate: string;
  invoiceNumber: string;
  supplierName: string;
  supplierGstin: string;
  taxableValue: number;
  inputCgst: number;
  inputSgst: number;
  inputIgst: number;
  invoiceValue: number;
  status: string;
  taxSnapshotComplete: boolean;
}

export interface GstRegisterData<Row> {
  report: string;
  firm: GstFirm;
  period: { from: string; to: string };
  summary?: Record<string, number>;
  warnings?: string[];
  disclaimer: string;
  rows: Row[];
}

export interface GstHsnOutwardRow {
  supplyCategory: 'B2B' | 'B2C' | 'UNCLASSIFIED';
  hsnCode: string;
  uqcCode: string;
  gstRate: number;
  totalQuantity: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstHsnPurchaseAnalysisRow {
  hsnCode: string;
  uqcCode: string;
  gstRate: number;
  totalQuantity: number;
  taxableValue: number;
  inputCgst: number;
  inputSgst: number;
  inputIgst: number;
  eligibleInputTax: number;
  ineligibleInputTax: number;
}

export interface GstHsnSummaryData extends GstRegisterData<GstHsnOutwardRow> {
  report: 'GST_HSN_SUMMARY';
  purchaseAnalysis: GstHsnPurchaseAnalysisRow[];
  caReady?: boolean;
}

export type GstDownloadReport = 'summary' | 'sales-register' | 'purchase-register' | 'hsn-summary';

export const gstReportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGstSummary: builder.query<ApiResponse<GstSummaryData>, GstReportParams>({
      query: (params) => ({ url: '/reports/gst/summary', params }),
      providesTags: ['Report'],
    }),
    getGstSalesRegister: builder.query<
      ApiResponse<GstRegisterData<GstSalesRegisterRow>>,
      GstReportParams
    >({
      query: (params) => ({ url: '/reports/gst/sales-register', params }),
      providesTags: ['Report'],
    }),
    getGstPurchaseRegister: builder.query<
      ApiResponse<GstRegisterData<GstPurchaseRegisterRow>>,
      GstReportParams
    >({
      query: (params) => ({ url: '/reports/gst/purchase-register', params }),
      providesTags: ['Report'],
    }),
    getGstHsnSummary: builder.query<ApiResponse<GstHsnSummaryData>, GstReportParams>({
      query: (params) => ({ url: '/reports/gst/hsn-summary', params }),
      providesTags: ['Report'],
    }),
    downloadGstReport: builder.mutation<
      Blob,
      { report: GstDownloadReport; params: GstReportParams }
    >({
      query: ({ report, params }) => ({
        url: `/reports/gst/${report}`,
        params: { ...params, format: 'csv' },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetGstSummaryQuery,
  useGetGstSalesRegisterQuery,
  useGetGstPurchaseRegisterQuery,
  useGetGstHsnSummaryQuery,
  useDownloadGstReportMutation,
} = gstReportsApi;

export const gstReportExportUrl = (report: GstDownloadReport, params: GstReportParams): string => {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    format: 'csv',
  });
  if (params.firmId) query.set('firmId', params.firmId);
  return `/reports/gst/${report}?${query.toString()}`;
};
