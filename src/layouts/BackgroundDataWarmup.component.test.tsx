import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundDataWarmup } from './BackgroundDataWarmup';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  prefetch: vi.fn(() => ({ type: 'catalog-prefetch' })),
  schedule: vi.fn((task: () => void) => {
    task();
    return vi.fn();
  }),
}));

vi.mock('@core/hooks', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@core/api/productApi', () => ({
  productApi: { util: { prefetch: mocks.prefetch } },
}));
vi.mock('./backgroundDataWarmupScheduler', () => ({
  scheduleBackgroundDataWarmup: mocks.schedule,
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('BackgroundDataWarmup', () => {
  it('warms only the compact billing catalog', () => {
    render(<BackgroundDataWarmup enabled />);

    expect(mocks.prefetch).toHaveBeenCalledWith(
      'getBillingCatalog',
      { suppressErrorToast: true },
      { ifOlderThan: 60 }
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'catalog-prefetch' });
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
  });

  it('does not schedule warmup for users without billing access', () => {
    render(<BackgroundDataWarmup enabled={false} />);
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
