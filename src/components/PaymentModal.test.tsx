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
  IonSegmentButton: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@components', () => ({
  Input: () => <input />,
  Select: () => <select />,
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
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
});
