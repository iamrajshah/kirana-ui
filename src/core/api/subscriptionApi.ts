import type { CommercialAccessSummary } from '@core/commercial';
import { setCommercialAccess } from '@core/auth/authSlice';
import { apiSlice } from './apiSlice';

export interface RenewalRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  plan: { code: string; name: string; version: number };
  billingCycle: 'MONTHLY' | 'YEARLY';
  provider: string;
  transactionReference: string;
  amountPaise: number;
  currency: string;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  proof: null | { id: string; status: string; mimeType: string; byteSize: number };
}

export const subscriptionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCommercialAccess: builder.query<CommercialAccessSummary, void>({
      query: () => '/subscription/access',
      transformResponse: (response: { data: CommercialAccessSummary }) => response.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCommercialAccess(data));
      },
    }),
    listRenewals: builder.query<RenewalRequest[], void>({
      query: () => '/subscription/renewals',
      transformResponse: (response: { data: RenewalRequest[] }) => response.data,
      providesTags: ['Renewal'],
    }),
    submitRenewal: builder.mutation<
      RenewalRequest,
      {
        planCode: 'STARTER' | 'PRO' | 'BUSINESS';
        billingCycle: 'MONTHLY' | 'YEARLY';
        provider: string;
        transactionReference: string;
        amountPaise: number;
      }
    >({
      query: (body) => ({ url: '/subscription/renewals', method: 'POST', body }),
      transformResponse: (response: { data: RenewalRequest }) => response.data,
      invalidatesTags: ['Renewal'],
    }),
    uploadRenewalProof: builder.mutation<unknown, { requestId: string; file: File }>({
      query: ({ requestId, file }) => {
        const body = new FormData();
        body.append('proof', file);
        return { url: `/subscription/renewals/${requestId}/proof`, method: 'POST', body };
      },
      invalidatesTags: ['Renewal'],
    }),
  }),
});

export const {
  useGetCommercialAccessQuery,
  useListRenewalsQuery,
  useSubmitRenewalMutation,
  useUploadRenewalProofMutation,
} = subscriptionApi;
