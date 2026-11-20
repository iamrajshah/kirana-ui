import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export interface FoodLicence {
  id: string;
  tenant_id: string;
  firm_id: string;
  label: string;
  licence_number: string;
  holder_name: string;
  premises_address: string;
  valid_from: string | null;
  expiry_date: string | null;
  is_active: boolean;
  version: number;
}
export type FoodLicenceInput = Pick<
  FoodLicence,
  | 'firm_id'
  | 'label'
  | 'licence_number'
  | 'holder_name'
  | 'premises_address'
  | 'valid_from'
  | 'expiry_date'
  | 'is_active'
>;
export type FoodLicenceUpdate = Omit<FoodLicenceInput, 'firm_id' | 'licence_number'> & {
  version: number;
};
export const foodLicenceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFoodLicences: builder.query<
      ApiResponse<{ licences: FoodLicence[]; max_active: number }>,
      { firm_id?: string } | void
    >({
      query: (params) => ({ url: '/food-licences', params: params || {} }),
      providesTags: ['FoodLicence'],
    }),
    createFoodLicence: builder.mutation<ApiResponse<FoodLicence>, FoodLicenceInput>({
      query: (body) => ({ url: '/food-licences', method: 'POST', body }),
      invalidatesTags: ['FoodLicence'],
    }),
    updateFoodLicence: builder.mutation<
      ApiResponse<FoodLicence>,
      { id: string; changes: FoodLicenceUpdate }
    >({
      query: ({ id, changes }) => ({ url: `/food-licences/${id}`, method: 'PATCH', body: changes }),
      invalidatesTags: ['FoodLicence'],
    }),
  }),
});
export const {
  useGetFoodLicencesQuery,
  useCreateFoodLicenceMutation,
  useUpdateFoodLicenceMutation,
} = foodLicenceApi;
