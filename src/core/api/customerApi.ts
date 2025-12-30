import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Customer } from '../types';

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<
      PaginatedApiResponse<Customer>,
      { skip?: number; take?: number; search?: string } | void
    >({
      query: (params = {}) => ({
        url: '/customers',
        params,
      }),
      providesTags: ['Customer'],
    }),
    getCustomerById: builder.query<ApiResponse<Customer>, string>({
      query: (id) => `/customers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),
    createCustomer: builder.mutation<
      ApiResponse<Customer>,
      { name: string; phone: string; email?: string; opening_balance?: number }
    >({
      query: (body) => ({
        url: '/customers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: builder.mutation<
      ApiResponse<Customer>,
      { id: string; name?: string; phone?: string; email?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Customer', id }],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} = customerApi;
