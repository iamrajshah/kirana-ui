import type { CommercialAccessSummary } from '@core/commercial';
import type { SessionContext } from '@core/types';
import { setCredentials, setSessionContext } from '@core/auth/authSlice';
import { apiSlice } from './apiSlice';

export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  version: number;
  currency: string;
  monthlyPricePaise: number;
  yearlyPricePaise: number;
  staffLimit: number | null;
  firmLimit: number | null;
  entitlements: string[];
}

export interface PublicProductInformation {
  plans: PublicPlan[];
  billing: { periods: readonly ['MONTHLY', 'YEARLY']; yearlyRecommended: boolean };
  legal: { privacyVersion: string; termsVersion: string };
  support: { email: string };
  accountDeletionUrl: string;
}

export interface AccountSummary {
  consents: Array<{
    id: string;
    type: string;
    version: string;
    status: string;
    capturedAt: string;
    revokedAt: string | null;
  }>;
  deletionRequest: null | {
    id: string;
    status: string;
    requestedAt: string;
    resolvedAt: string | null;
    notes: string | null;
  };
}

export const lifecycleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicProduct: builder.query<PublicProductInformation, void>({
      query: () => '/public/product',
      transformResponse: (response: { data: PublicProductInformation }) => response.data,
    }),
    getAccountSummary: builder.query<AccountSummary, void>({
      query: () => '/account',
      transformResponse: (response: { data: AccountSummary }) => response.data,
    }),
    requestAccountDeletion: builder.mutation<
      { id: string; status: string; mode: 'ASSISTED_PAID_OWNER' | 'PROSPECT_REVIEW' },
      { reason: string }
    >({
      query: (body) => ({ url: '/account/deletion-request', method: 'POST', body }),
      transformResponse: (response: {
        data: { id: string; status: string; mode: 'ASSISTED_PAID_OWNER' | 'PROSPECT_REVIEW' };
      }) => response.data,
      invalidatesTags: ['Account'],
    }),
    createSupportRequest: builder.mutation<
      { id: string; status: string },
      { subject: string; message: string }
    >({
      query: (body) => ({ url: '/account/support', method: 'POST', body }),
      transformResponse: (response: { data: { id: string; status: string } }) => response.data,
    }),
    getSessionContext: builder.query<SessionContext, void>({
      query: () => '/auth/session-context',
      transformResponse: (response: { data: SessionContext }) => response.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(setSessionContext((await queryFulfilled).data));
      },
    }),
    selectAccountMembership: builder.mutation<
      { data: Parameters<typeof setCredentials>[0] },
      { userId: string }
    >({
      query: (body) => ({ url: '/auth/membership/select', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(setCredentials((await queryFulfilled).data.data));
      },
    }),
  }),
});

export const {
  useGetPublicProductQuery,
  useGetAccountSummaryQuery,
  useRequestAccountDeletionMutation,
  useCreateSupportRequestMutation,
  useGetSessionContextQuery,
  useSelectAccountMembershipMutation,
} = lifecycleApi;

export const commercialFromSession = (session: SessionContext | null | undefined) =>
  session?.commercialAccess as CommercialAccessSummary | null | undefined;
