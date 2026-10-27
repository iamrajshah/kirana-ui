import type { CommercialAccessSummary } from '@core/commercial';
import { setCommercialAccess } from '@core/auth/authSlice';
import { apiSlice } from './apiSlice';

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
  }),
});

export const { useGetCommercialAccessQuery } = subscriptionApi;
