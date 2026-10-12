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
