import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProductTaxWorkspace from './ProductTaxWorkspace';
const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  preview: vi.fn(),
  apply: vi.fn(),
  refetch: vi.fn(),
  failed: false,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/productTaxApi', () => ({
  useGetProductTaxQuery: () => ({
    currentData: { data: { rows: state.rows, total: 80 } },
    isFetching: false,
    isError: state.failed,
    refetch: state.refetch,
  }),
  usePreviewProductTaxMutation: () => [state.preview, { isLoading: false }],
  useApplyProductTaxMutation: () => [state.apply, { isLoading: false }],
}));
const values = {
  hsnCode: '1006',
  gstPercent: null,
  uqcCode: 'KGS',
  unitLabel: 'kg',
  uqcQuantityFactor: 1,
};
const row = (id: string, product = '2') => ({
  variantId: id,
  productId: product,
  productName: 'Rice',
  sku: `RICE-${id}`,
  brand: null,
  size: null,
  values: { ...values },
  missing: ['GST_RATE'],
});
beforeEach(() => {
  vi.clearAllMocks();
  state.failed = false;
  state.rows = [row('10'), row('11'), row('12', '3')];
  state.preview.mockImplementation((input) => ({
    unwrap: () =>
      Promise.resolve({
        data: {
          changedCount: input.rows.length,
          changes: input.rows.map(
            (line: { variantId: string; expected: unknown; values: unknown }) => ({
              variantId: line.variantId,
              productId: '2',
              productName: 'Rice',
              before: line.expected,
              after: line.values,
              changed: true,
              missing: [],
            })
          ),
        },
      }),
  }));
  state.apply.mockReturnValue({ unwrap: () => Promise.resolve({ data: {} }) });
});
afterEach(cleanup);
it('renders missing tax facts and differentiates a saved 0% from an unset rate', () => {
  state.rows = [{ ...row('10'), values: { ...values, gstPercent: 0 }, missing: [] }, row('11')];
  render(<ProductTaxWorkspace onClose={vi.fn()} />);
  expect((screen.getByLabelText('taxWorkspace.gstPercent RICE-10') as HTMLInputElement).value).toBe(
    '0'
  );
  expect((screen.getByLabelText('taxWorkspace.gstPercent RICE-11') as HTMLInputElement).value).toBe(
    ''
  );
  expect(screen.getByText('taxWorkspace.missing.GST_RATE')).toBeTruthy();
});
it('propagates product HSN to sibling variants and requires a preview before saving', async () => {
  render(<ProductTaxWorkspace onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('taxWorkspace.hsnCode RICE-10'), {
    target: { value: '100630' },
  });
  expect((screen.getByLabelText('taxWorkspace.hsnCode RICE-11') as HTMLInputElement).value).toBe(
    '100630'
  );
  expect((screen.getByLabelText('taxWorkspace.hsnCode RICE-12') as HTMLInputElement).value).toBe(
    '1006'
  );
  expect(state.apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('taxWorkspace.preview'));
  await screen.findByText('taxWorkspace.confirm');
  expect(state.preview.mock.calls[0][0].rows).toHaveLength(2);
  fireEvent.click(screen.getByText('taxWorkspace.confirm'));
  await screen.findByText('taxWorkspace.saved');
  expect(state.apply.mock.calls[0][0]).toEqual(state.preview.mock.calls[0][0]);
});
it('retains the original expected facts across a background refetch', async () => {
  const view = render(<ProductTaxWorkspace onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('taxWorkspace.gstPercent RICE-10'), {
    target: { value: '0' },
  });
  state.rows = [{ ...row('10'), values: { ...values, gstPercent: 5 } }, row('11')];
  view.rerender(<ProductTaxWorkspace onClose={vi.fn()} />);
  fireEvent.click(screen.getByText('taxWorkspace.preview'));
  await screen.findByText('taxWorkspace.confirm');
  expect(state.preview.mock.calls[0][0].rows[0]).toMatchObject({
    expected: { gstPercent: null },
    values: { gstPercent: 0 },
  });
});
it('rejects invalid values locally before sending a review or mutation', () => {
  render(<ProductTaxWorkspace onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('taxWorkspace.gstPercent RICE-10'), {
    target: { value: '300' },
  });
  fireEvent.click(screen.getByText('taxWorkspace.preview'));
  expect(screen.getByRole('alert').textContent).toContain('taxWorkspace.invalid');
  expect(state.preview).not.toHaveBeenCalled();
  expect(state.apply).not.toHaveBeenCalled();
});
it('preserves edits after a failed save and permits a fresh review', async () => {
  state.apply.mockReturnValue({ unwrap: () => Promise.reject(new Error('unavailable')) });
  render(<ProductTaxWorkspace onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('taxWorkspace.gstPercent RICE-10'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByText('taxWorkspace.preview'));
  await screen.findByText('taxWorkspace.confirm');
  fireEvent.click(screen.getByText('taxWorkspace.confirm'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect((screen.getByLabelText('taxWorkspace.gstPercent RICE-10') as HTMLInputElement).value).toBe(
    '5'
  );
  expect(screen.getByText('taxWorkspace.preview')).toBeTruthy();
});
it('blocks pagination/search while dirty and asks before discarding on close', async () => {
  const close = vi.fn();
  render(<ProductTaxWorkspace onClose={close} />);
  fireEvent.change(screen.getByLabelText('taxWorkspace.gstPercent RICE-10'), {
    target: { value: '0' },
  });
  expect((screen.getByText('taxWorkspace.next') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText('common.close'));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText('taxWorkspace.discardPrompt')).toBeTruthy();
  fireEvent.click(screen.getByText('common.cancel'));
  expect(close).not.toHaveBeenCalled();
});
