import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentModal } from './PaymentModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('ionicons/icons', () => ({ close: 'close' }));

vi.mock('@ionic/react', () => ({
  IonModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonToolbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  IonContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonButton: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  IonButtons: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonIcon: () => <span />,
  IonLabel: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  IonSegment: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IonSegmentButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  ),
  Select: ({
    label,
    value,
    onChange,
    options,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    disabled?: boolean;
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

afterEach(cleanup);

describe('PaymentModal completion', () => {
  it('shows previous khata without collecting it as part of the current invoice', async () => {
    const onPayment = vi.fn().mockResolvedValue(undefined);

    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={onPayment}
        invoiceAmount={125}
        previousBalance={2500}
        allowPartial={false}
      />
    );

    expect(screen.getByText('billing.previousKhata')).toBeTruthy();
    expect(screen.getByText('billing.totalCustomerDue')).toBeTruthy();
    expect(screen.getByText('₹2,625')).toBeTruthy();
    expect(screen.getByText('billing.currentBillPaymentOnly')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'payment.collectPayment' }));

    await waitFor(() => expect(onPayment).toHaveBeenCalledWith(125, 'CASH', undefined));
  });

  it('shows a customer advance without silently treating it as outstanding khata', () => {
    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={vi.fn()}
        invoiceAmount={400}
        previousBalance={-500}
        allowPartial={false}
      />
    );

    expect(screen.getByText('billing.customerAdvance')).toBeTruthy();
    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('billing.advanceNotApplied')).toBeTruthy();
    expect(screen.queryByText('billing.totalCustomerDue')).toBeNull();
  });

  it('does not treat a successful payment as a cancellation request', async () => {
    const onPayment = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <PaymentModal
        isOpen
        onClose={onClose}
        onPayment={onPayment}
        invoiceAmount={125}
        allowPartial={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'payment.collectPayment' }));

    await waitFor(() => expect(onPayment).toHaveBeenCalledWith(125, 'CASH', undefined));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits a complete split as one callback instead of separate payments', async () => {
    const onPayment = vi.fn();
    const onSplitPayment = vi.fn().mockResolvedValue(undefined);
    const tenders = [
      { payment_mode: 'CASH' as const, amount: 75 },
      { payment_mode: 'UPI' as const, amount: 50, reference_note: 'upi-50' },
    ];

    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={onPayment}
        onSplitPayment={onSplitPayment}
        initialSplitTenders={tenders}
        invoiceAmount={125}
        allowPartial={false}
      />
    );

    expect(screen.getByText('payment.splitRetryHint')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'payment.collectPayment' }));

    await waitFor(() => expect(onSplitPayment).toHaveBeenCalledWith(tenders));
    expect(onPayment).not.toHaveBeenCalled();
  });

  it('lets the cashier balance two tender amounts before submitting', async () => {
    const onSplitPayment = vi.fn().mockResolvedValue(undefined);
    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={vi.fn()}
        onSplitPayment={onSplitPayment}
        invoiceAmount={125}
        allowPartial={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'payment.splitPayment' }));
    const amounts = screen.getAllByLabelText('payment.tenderAmount');
    fireEvent.change(amounts[0], { target: { value: '75' } });
    fireEvent.change(amounts[1], { target: { value: '50' } });

    expect(screen.getByText('₹0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'payment.collectPayment' }));
    await waitFor(() =>
      expect(onSplitPayment).toHaveBeenCalledWith([
        { payment_mode: 'CASH', amount: 75 },
        { payment_mode: 'UPI', amount: 50 },
      ])
    );
  });

  it('keeps an uncertain split payload available for an identical retry', async () => {
    const onSplitPayment = vi
      .fn()
      .mockResolvedValueOnce('uncertain')
      .mockResolvedValueOnce(undefined);
    const tenders = [
      { payment_mode: 'CASH' as const, amount: 75 },
      { payment_mode: 'CARD' as const, amount: 50, reference_note: 'approval-7' },
    ];

    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={vi.fn()}
        onSplitPayment={onSplitPayment}
        initialSplitTenders={tenders}
        invoiceAmount={125}
      />
    );

    const collect = screen.getByRole('button', { name: 'payment.collectPayment' });
    fireEvent.click(collect);
    await waitFor(() => expect(onSplitPayment).toHaveBeenCalledTimes(1));
    expect(screen.getAllByLabelText('payment.tenderAmount')[0]).toHaveProperty('disabled', true);
    fireEvent.click(collect);
    await waitFor(() => expect(onSplitPayment).toHaveBeenCalledTimes(2));
    expect(onSplitPayment.mock.calls[1][0]).toEqual(onSplitPayment.mock.calls[0][0]);
  });

  it('unlocks a definitely rejected split so the cashier can correct and resubmit it', async () => {
    const onSplitPayment = vi
      .fn()
      .mockResolvedValueOnce('rejected')
      .mockResolvedValueOnce('completed');
    const tenders = [
      { payment_mode: 'CASH' as const, amount: 75 },
      { payment_mode: 'UPI' as const, amount: 50 },
    ];

    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={vi.fn()}
        onSplitPayment={onSplitPayment}
        initialSplitTenders={tenders}
        invoiceAmount={125}
      />
    );

    const collect = screen.getByRole('button', { name: 'payment.collectPayment' });
    fireEvent.click(collect);
    await waitFor(() =>
      expect(screen.getAllByLabelText('payment.tenderAmount')[0]).toHaveProperty('disabled', false)
    );

    const amounts = screen.getAllByLabelText('payment.tenderAmount');
    fireEvent.change(amounts[0], { target: { value: '80' } });
    fireEvent.change(amounts[1], { target: { value: '45' } });
    fireEvent.click(collect);

    await waitFor(() => expect(onSplitPayment).toHaveBeenCalledTimes(2));
    expect(onSplitPayment.mock.calls[1][0]).toEqual([
      { payment_mode: 'CASH', amount: 80 },
      { payment_mode: 'UPI', amount: 45 },
    ]);
  });

  it('uses application theme tokens for split cards and status in light and dark themes', () => {
    render(
      <PaymentModal
        isOpen
        onClose={vi.fn()}
        onPayment={vi.fn()}
        onSplitPayment={vi.fn()}
        initialSplitTenders={[
          { payment_mode: 'CASH', amount: 75 },
          { payment_mode: 'UPI', amount: 50 },
        ]}
        invoiceAmount={125}
      />
    );

    expect(screen.getByTestId('split-tender-card-0').getAttribute('style')).toContain(
      'var(--ion-card-background)'
    );
    expect(screen.getByRole('status').getAttribute('style')).toContain(
      'var(--kirana-surface-accent-strong)'
    );
    expect(screen.getByRole('status').getAttribute('style')).toContain('var(--ion-text-color)');
    expect(screen.getByTestId('split-payment-hint').getAttribute('style')).toContain(
      'var(--ion-text-color-secondary)'
    );
  });
});
