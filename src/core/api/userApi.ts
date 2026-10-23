import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';
import {
  beginCurrentUserProfileUpdate,
  finishCurrentUserProfileUpdate,
  updateCurrentUser,
} from '../auth/authSlice';
import type { RootState } from '../store';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'MANAGER' | 'CASHIER';
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

type ProfileUser = Pick<User, 'id' | 'name' | 'phone' | 'email'>;

const transformProfileResponse = (response: ApiResponse<User>): ApiResponse<ProfileUser> => {
  const profile = response?.data;
  if (
    !profile ||
    typeof profile.id !== 'string' ||
    typeof profile.name !== 'string' ||
    typeof profile.phone !== 'string' ||
    (profile.email !== undefined && profile.email !== null && typeof profile.email !== 'string')
  ) {
    throw new Error('Invalid profile update response');
  }

  return {
    ...response,
    data: {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
    },
  };
};

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserStatusRequest {
  is_active: boolean;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<ApiResponse<User[]>, { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/users',
        params: params || {},
      }),
      providesTags: ['User'],
    }),
    createUser: builder.mutation<ApiResponse<User>, CreateUserRequest>({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updateUserStatus: builder.mutation<ApiResponse<User>, { id: string; is_active: boolean }>({
      query: ({ id, ...data }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updateProfile: builder.mutation<ApiResponse<ProfileUser>, UpdateProfileRequest>({
      query: (data) => ({
        url: '/users/me/profile',
        method: 'PATCH',
        body: data,
      }),
      transformResponse: transformProfileResponse,
      async onQueryStarted(_request, { dispatch, getState, queryFulfilled, requestId }) {
        const { user, sessionVersion } = (getState() as RootState).auth;
        if (!user) return;

        const request = { requestId, userId: user.id, sessionVersion };
        dispatch(beginCurrentUserProfileUpdate(request));
        try {
          const { data } = await queryFulfilled;
          const { id, name, phone, email } = data.data;
          dispatch(updateCurrentUser({ id, name, phone, email, sessionVersion, requestId }));
        } catch {
          // The mutation error is surfaced to the calling screen.
          dispatch(finishCurrentUserProfileUpdate(request));
        }
      },
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation<ApiResponse<void>, ChangePasswordRequest>({
      query: (data) => ({
        url: '/users/me/password',
        method: 'PATCH',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserStatusMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = userApi;
