import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export interface User {
  id: string;
  name: string;
  email?: string;
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
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserStatusRequest {
  is_active: boolean;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<ApiResponse<User[]>, void>({
      query: () => '/users',
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
    updateProfile: builder.mutation<ApiResponse<User>, UpdateProfileRequest>({
      query: (data) => ({
        url: '/users/me/profile',
        method: 'PATCH',
        body: data,
      }),
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
