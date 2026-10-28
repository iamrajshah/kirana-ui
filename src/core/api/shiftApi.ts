import { apiSlice } from './apiSlice';
import type { ApiResponse, ShiftSession } from '../types';

export const shiftApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentShift: builder.query<ApiResponse<ShiftSession | null>, void>({
      query: () => '/shifts/current',
      providesTags: ['Shift'],
    }),
    getShifts: builder.query<ApiResponse<ShiftSession[]>, void>({
      query: () => '/shifts',
      providesTags: ['Shift'],
    }),
    openShift: builder.mutation<ApiResponse<ShiftSession>, { opening_cash: number; counter_label?: string; opening_note?: string }>({
      query: (body) => ({ url: '/shifts', method: 'POST', body }),
      invalidatesTags: ['Shift'],
    }),
    addShiftAdjustment: builder.mutation<ApiResponse<ShiftSession>, { id: string; type: 'CASH_IN' | 'CASH_OUT'; amount: number; note: string }>({
      query: ({ id, ...body }) => ({ url: `/shifts/${id}/adjustments`, method: 'POST', body }),
      invalidatesTags: ['Shift'],
    }),
    closeShift: builder.mutation<ApiResponse<ShiftSession>, { id: string; counted_cash: number; closing_note?: string }>({
      query: ({ id, ...body }) => ({ url: `/shifts/${id}/close`, method: 'POST', body }),
      invalidatesTags: ['Shift', 'Dashboard'],
    }),
  }),
});

export const {
  useGetCurrentShiftQuery,
  useGetShiftsQuery,
  useOpenShiftMutation,
  useAddShiftAdjustmentMutation,
  useCloseShiftMutation,
} = shiftApi;
