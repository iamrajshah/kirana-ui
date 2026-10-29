import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Payment, PaymentMode } from '../types';

export interface SplitPaymentTender {
  payment_mode: Exclude<PaymentMode, 'ADJUSTMENT'>;
  amount: number;
  reference_note?: string;
}

export interface SplitPaymentResult {
  invoice_id: string;
  total_amount: string;
  tenders: Array<SplitPaymentTender & { id: string }>;
  replayed: boolean;
}

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<
      PaginatedApiResponse<Payment>,
      { skip?: number; take?: number } | void
    >({
      query: (params = {}) => ({
        url: '/payments',
        params: params || {},
      }),
      providesTags: ['Payment'],
    }),
    createPayment: builder.mutation<
      ApiResponse<Payment>,
      {
        customer_id?: string;
        amount: number;
        payment_mode: PaymentMode;
        invoice_id?: string;
        reference_note?: string;
        idempotency_key?: string;
        invoice_allocations?: Array<{ invoice_id: string; amount: number }>; // Multi-invoice support
      }
    >({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body,
        headers: body.idempotency_key ? { 'idempotency-key': body.idempotency_key } : {},
      }),
      invalidatesTags: (result, error, body) => [
        'Payment',
        'Invoice',
        'Dashboard',
        'Report',
        ...(body.customer_id ? (['Customer'] as const) : []),
      ],
    }),
    createSplitPayment: builder.mutation<
      ApiResponse<SplitPaymentResult>,
      {
        customer_id?: string;
        invoice_id: string;
        tenders: SplitPaymentTender[];
        idempotency_key: string;
      }
    >({
      query: (body) => ({
        url: '/payments/split',
        method: 'POST',
        body,
        headers: { 'idempotency-key': body.idempotency_key },
      }),
      invalidatesTags: (result, error, body) => [
        'Payment',
        'Invoice',
        'Dashboard',
        'Report',
        ...(body.customer_id ? (['Customer'] as const) : []),
      ],
    }),
  }),
});

export const { useGetPaymentsQuery, useCreatePaymentMutation, useCreateSplitPaymentMutation } =
  paymentApi;
