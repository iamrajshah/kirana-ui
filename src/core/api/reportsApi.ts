import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse } from '../types';

export interface SalesReport {
  date: string;
  total_sales: number;
  total_invoices: number;
  average_invoice_value: number;
}

export interface OutstandingCustomer {
  customer_id: string;
  customer_name: string;
  phone: string;
  total_outstanding: number;
  credit_balance: number;
}

export interface InventorySummaryItem {
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  stock_value: number;
}

export interface DailyCashbook {
  date: string;
  cash: number;
  upi: number;
  card: number;
  bank_transfer: number;
  total: number;
}

export interface ProfitLoss {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
}

export interface TopSellingProduct {
  variant_id: string;
  product_name: string;
  sku: string;
  total_quantity_sold: number;
  total_revenue: number;
}

export interface SupplierOutstanding {
  id: string;
  name: string;
  phone: string;
  email: string;
  outstanding_balance: number;
  total_invoices: number;
  last_transaction_date: string;
}

export interface PurchaseRegister {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  supplier_name: string;
  supplier_phone: string;
  item_count: number;
  created_at: string;
}

export interface TopPayable {
  id: string;
  name: string;
  phone: string;
  email: string;
  outstanding_amount: number;
  unpaid_invoices: number;
  latest_invoice_date: string;
  last_transaction_date: string;
}

export interface SupplierLedgerSummary {
  supplier_id: string;
  supplier_name: string;
  supplier_phone: string;
  total_purchases: number;
  total_payments: number;
  balance: number;
  transaction_count: number;
}

export interface PurchaseTrendMonth {
  month: string;
  year: number;
  purchase_count: number;
  total_amount: number;
  avg_purchase_value: number;
}

export interface SupplierPaymentHistory {
  id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number;
  invoice_number: string;
  balance_after: number;
  notes: string;
}

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSalesReport: builder.query<
      ApiResponse<SalesReport[]>,
      { from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' } | void
    >({
      query: (params) => ({
        url: '/reports/sales',
        params: params || {},
      }),
    }),
    getOutstandingCustomers: builder.query<ApiResponse<OutstandingCustomer[]>, void>({
      query: () => '/reports/outstanding-customers',
    }),
    getInventorySummary: builder.query<ApiResponse<InventorySummaryItem[]>, void>({
      query: () => '/reports/inventory-summary',
    }),
    getDailyCashbook: builder.query<ApiResponse<DailyCashbook>, { date?: string } | void>({
      query: (params) => ({
        url: '/reports/daily-cashbook',
        params: params || {},
      }),
    }),
    getProfitLoss: builder.query<
      ApiResponse<ProfitLoss>,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({
        url: '/reports/profit-loss',
        params: params || {},
      }),
    }),
    getTopSelling: builder.query<ApiResponse<TopSellingProduct[]>, { limit?: number } | void>({
      query: (params) => ({
        url: '/reports/top-selling',
        params: params || {},
      }),
    }),
    // Supplier & Purchase Reports
    getSupplierOutstanding: builder.query<
      ApiResponse<SupplierOutstanding[]>,
      { page?: number; limit?: number; minAmount?: number } | void
    >({
      query: (params) => ({
        url: '/reports/supplier-outstanding',
        params: params || {},
      }),
    }),
    getPurchaseRegister: builder.query<
      ApiResponse<PurchaseRegister[]>,
      { page?: number; limit?: number; from?: string; to?: string; supplierId?: string; status?: string } | void
    >({
      query: (params) => ({
        url: '/reports/purchase-register',
        params: params || {},
      }),
    }),
    getTopPayables: builder.query<ApiResponse<TopPayable[]>, { limit?: number } | void>({
      query: (params) => ({
        url: '/reports/top-payables',
        params: params || {},
      }),
    }),
    getSupplierLedgerSummary: builder.query<
      PaginatedApiResponse<SupplierLedgerSummary>,
      { page?: number; limit?: number; from?: string; to?: string; supplierId?: string } | void
    >({
      query: (params) => ({
        url: '/reports/supplier-ledger-summary',
        params: params || {},
      }),
    }),
    getPurchaseTrend: builder.query<
      ApiResponse<PurchaseTrendMonth[]>,
      { months?: number } | void
    >({
      query: (params) => ({
        url: '/reports/purchase-trend',
        params: params || {},
      }),
    }),
    getSupplierPaymentHistory: builder.query<
      ApiResponse<SupplierPaymentHistory[]>,
      { supplierId: string; page?: number; limit?: number; from?: string; to?: string }
    >({
      query: ({ supplierId, ...params }) => ({
        url: `/reports/supplier/${supplierId}/payment-history`,
        params,
      }),
    }),
  }),
});

export const {
  useGetSalesReportQuery,
  useGetOutstandingCustomersQuery,
  useGetInventorySummaryQuery,
  useGetDailyCashbookQuery,
  useGetProfitLossQuery,
  useGetTopSellingQuery,
  useGetSupplierOutstandingQuery,
  useGetPurchaseRegisterQuery,
  useGetTopPayablesQuery,
  useGetSupplierLedgerSummaryQuery,
  useGetPurchaseTrendQuery,
  useGetSupplierPaymentHistoryQuery,
} = reportsApi;
