import { describe, expect, it } from 'vitest';
import { normalizeInventoryListResponse } from './inventoryApi';

const inventory = [{ variant_id: 'variant-1' }] as never[];

describe('normalizeInventoryListResponse', () => {
  it('keeps the current meta response contract', () => {
    expect(
      normalizeInventoryListResponse({
        success: true,
        data: inventory,
        meta: { total: 75, page: 2, limit: 50 },
      })
    ).toEqual({
      success: true,
      data: inventory,
      meta: { total: 75, page: 2, limit: 50 },
    });
  });

  it('normalizes the deployed pagination response contract', () => {
    expect(
      normalizeInventoryListResponse({
        success: true,
        data: inventory,
        pagination: { total: 75, skip: 50, take: 50 },
      })
    ).toEqual({
      success: true,
      data: inventory,
      meta: { total: 75, limit: 50 },
    });
  });
});
