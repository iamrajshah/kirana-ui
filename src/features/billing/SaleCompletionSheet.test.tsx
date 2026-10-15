import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaleCompletionSheet } from './SaleCompletionSheet';
import type { ReceiptViewModel } from '../invoices/receipt';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../invoices/receipt', async (importOriginal) => {
  const original = await importOriginal<typeof import('../invoices/receipt')>();
  return { ...original, ReceiptDocument: () => <div data-testid="print-receipt" /> };
});

const receipt = {
  invoiceId: '42',
  invoiceNumber: 'KIR-42',
  title: 'Receipt',
  payment: {
    status: 'PARTIALLY_PAID',
    statusLabel: 'Partially paid',
    paid: '40.00',
    remaining: '60.00',
    modes: ['CASH'],
  },
  totals: { total: '100.00' },
  customer: { kind: 'named', name: 'Anita' },
} as ReceiptViewModel;

afterEach(cleanup);

describe('SaleCompletionSheet', () => {
  it('shows the authoritative payment position and keeps every handoff action available', () => {
    const onOutput = vi.fn();
    render(
      <SaleCompletionSheet
        invoiceId="42"
        receipt={receipt}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onViewBill={vi.fn()}
        onNewSale={vi.fn()}
        onOutput={onOutput}
      />
    );

    expect(screen.getByRole('status').textContent).toContain('Partially paid');
    expect(screen.getByRole('status').textContent).toContain('₹40');
    expect(screen.getByRole('status').textContent).toContain('₹60');
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.print' }));
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.share' }));
    expect(onOutput.mock.calls.map(([action]) => action)).toEqual(['print', 'pdf', 'share']);
    expect(screen.getByTestId('print-receipt')).toBeTruthy();
  });

  it('makes a saved sale recoverable when the document read fails', () => {
    const onRetry = vi.fn();
    const onViewBill = vi.fn();
    const onNewSale = vi.fn();
    render(
      <SaleCompletionSheet
        invoiceId="42"
        receipt={null}
        isLoading={false}
        isError
        onRetry={onRetry}
        onViewBill={onViewBill}
        onNewSale={onNewSale}
        onOutput={vi.fn()}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'billing.completion.temporarilyUnavailable'
    );
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.retryBill' }));
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.viewBill' }));
    fireEvent.click(screen.getByRole('button', { name: 'billing.completion.newSale' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onViewBill).toHaveBeenCalledOnce();
    expect(onNewSale).toHaveBeenCalledOnce();
  });
});
