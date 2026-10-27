import { apiSlice } from './apiSlice';
import type { AuthResponse, ApiResponse, SessionMembership } from '../types';
export type { SessionMembership } from '../types';

export interface GoogleExchangeResponse {
  success: boolean;
  data: {
    outcome:
      | 'AUTHENTICATED'
      | 'PROVISIONING_REQUIRED'
      | 'MEMBERSHIP_SELECTION_REQUIRED'
      | 'LINK_REQUIRED';
    auth?: AuthResponse['data'];
    memberships?: SessionMembership[];
    provisioning?: { state: string; demoDays?: number };
  };
  message: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, { email?: string; phone?: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    googleExchange: builder.mutation<
      GoogleExchangeResponse,
      { credential: string; source: 'web' | 'android'; requestedUserId?: string }
    >({
      query: (body) => ({ url: '/auth/google/exchange', method: 'POST', body }),
    }),
    linkGoogle: builder.mutation<
      { success: boolean; data: { auth: AuthResponse['data'] } },
      { credential: string; source: 'web' | 'android' }
    >({
      query: (body) => ({ url: '/auth/google/link', method: 'POST', body }),
    }),
    selectMembership: builder.mutation<
      GoogleExchangeResponse,
      { credential: string; source: 'web' | 'android'; userId: string }
    >({
      query: ({ userId, ...body }) => ({
        url: '/auth/google/exchange',
        method: 'POST',
        body: { ...body, requestedUserId: userId },
      }),
    }),
    refreshToken: builder.mutation<AuthResponse, { refresh_token: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleExchangeMutation,
  useLinkGoogleMutation,
  useSelectMembershipMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;
