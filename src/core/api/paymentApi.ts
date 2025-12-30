import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Payment, PaymentMode } from '../types';

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<
      PaginatedApiResponse<Payment>,
      { skip?: number; take?: number } | void
    >({
      query: (params = {}) => ({
        url: '/payments',
        params,
      }),
      providesTags: ['Payment'],
    }),
    createPayment: builder.mutation<
      ApiResponse<Payment>,
      {
        customer_id: string;
        amount: number;
        payment_mode: PaymentMode;
        invoice_id?: string;
        reference_note?: string;
        idempotency_key?: string;
      }
    >({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body,
        headers: body.idempotency_key
          ? { 'idempotency-key': body.idempotency_key }
          : {},
      }),
      invalidatesTags: ['Payment', 'Invoice', 'Dashboard', 'Customer'],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useCreatePaymentMutation,
} = paymentApi;
