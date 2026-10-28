import { apiSlice } from './apiSlice';
import type { AuthResponse, ApiResponse, SessionMembership } from '../types';
import type { DeviceDescriptor } from '../auth/deviceIdentity';
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
    provisioningToken?: string;
  };
  message: string;
}

export interface ActiveDevice {
  id: string;
  name: string;
  platform: 'WEB' | 'ANDROID';
  lastSeenAt: string;
  current?: boolean;
  userId?: string;
}

export interface DeviceLimitDetails {
  limit: number;
  devices: ActiveDevice[];
}

type SessionDeviceRequest = { device: DeviceDescriptor; replaceDeviceId?: string };

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      AuthResponse,
      ({ email?: string; phone?: string; password: string } & SessionDeviceRequest)
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    googleExchange: builder.mutation<
      GoogleExchangeResponse,
      {
        credential: string;
        source: 'web' | 'android';
        requestedUserId?: string;
        device: DeviceDescriptor;
        replaceDeviceId?: string;
        consents?: Array<{ consentType: 'PRIVACY' | 'TERMS'; documentVersion: string }>;
      }
    >({
      query: (body) => ({ url: '/auth/google/exchange', method: 'POST', body }),
    }),
    linkGoogle: builder.mutation<
      { success: boolean; data: { auth: AuthResponse['data'] } },
      { credential: string; source: 'web' | 'android'; device: DeviceDescriptor }
    >({
      query: (body) => ({ url: '/auth/google/link', method: 'POST', body }),
    }),
    selectMembership: builder.mutation<
      GoogleExchangeResponse,
      {
        credential: string;
        source: 'web' | 'android';
        userId: string;
        device: DeviceDescriptor;
        replaceDeviceId?: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: '/auth/google/exchange',
        method: 'POST',
        body: { ...body, requestedUserId: userId },
      }),
    }),
    refreshToken: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { refresh_token: string; device: DeviceDescriptor }
    >({
      query: (body) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<
      ApiResponse<null>,
      { scope: 'current' | 'all'; refresh_token?: string }
    >({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body,
      }),
    }),
    getDevices: builder.query<ApiResponse<ActiveDevice[]>, { userId?: string } | void>({
      query: (params) => ({ url: '/auth/devices', params: params || {} }),
      providesTags: ['User'],
    }),
    revokeDevice: builder.mutation<ApiResponse<null>, string>({
      query: (deviceId) => ({ url: `/auth/devices/${deviceId}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
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
  useGetDevicesQuery,
  useRevokeDeviceMutation,
} = authApi;
