import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

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
  }),
});

export const {
  useGetSalesReportQuery,
  useGetOutstandingCustomersQuery,
  useGetInventorySummaryQuery,
  useGetDailyCashbookQuery,
  useGetProfitLossQuery,
  useGetTopSellingQuery,
} = reportsApi;
