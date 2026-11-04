import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export type ExpiryBatchState = 'EXPIRED' | 'NEAR_EXPIRY' | 'SAFE';

export interface ExpiryInventoryBatch {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  brand?: string | null;
  size?: string | null;
  batchNumber?: string | null;
  quantity: number;
  expiryDate: string;
  daysToExpiry: number;
  state: ExpiryBatchState;
}

export interface ExpiryAlertsData {
  windowDays: number;
  summary: {
    expiredBatches: number;
    nearExpiryBatches: number;
    affectedUnits: number;
    affectedValue?: number;
    valuationEstimated?: boolean;
  };
  batches: ExpiryInventoryBatch[];
}

export interface AdjustExpiryBatchInput {
  batchId: string;
  quantity: number;
  reason: string;
  disposition: 'EXPIRED' | 'DAMAGED' | 'OTHER';
  idempotencyKey: string;
}

export interface AdjustExpiryBatchResult {
  batchId: string;
  variantId: string;
  removedQuantity: number;
  remainingQuantity: number;
  aggregateQuantity: number;
  disposition: 'EXPIRED' | 'DAMAGED' | 'OTHER';
  reason: string;
  replayed: boolean;
}

export const expiryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpiryAlerts: builder.query<ApiResponse<ExpiryAlertsData>, { windowDays?: number } | void>({
      query: (params) => ({
        url: '/inventory/expiry-alerts',
        params: params || {},
        suppressErrorToast: true,
      }),
      providesTags: ['Inventory'],
    }),
    adjustExpiryBatch: builder.mutation<
      ApiResponse<AdjustExpiryBatchResult>,
      AdjustExpiryBatchInput
    >({
      query: ({ batchId, idempotencyKey, ...body }) => ({
        url: `/inventory/batches/${batchId}/adjust`,
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      invalidatesTags: ['Inventory', 'Product', 'Dashboard', 'Report'],
    }),
  }),
});

export const { useGetExpiryAlertsQuery, useAdjustExpiryBatchMutation } = expiryApi;
