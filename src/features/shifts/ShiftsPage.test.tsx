import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShiftsPage from './ShiftsPage';

const mocks = vi.hoisted(() => ({
  currentQuery: vi.fn(),
  historyQuery: vi.fn(),
  openShift: vi.fn(),
  adjustShift: vi.fn(),
  closeShift: vi.fn(),
  openUnwrap: vi.fn(),
  adjustUnwrap: vi.fn(),
  closeUnwrap: vi.fn(),
  refetchCurrent: vi.fn(),
  refetchHistory: vi.fn(),
}));

vi.mock('@core/api/shiftApi', () => ({
  useGetCurrentShiftQuery: () => mocks.currentQuery(),
  useGetShiftsQuery: () => mocks.historyQuery(),
  useOpenShiftMutation: () => [mocks.openShift, { isLoading: false }],
  useAddShiftAdjustmentMutation: () => [mocks.adjustShift, { isLoading: false }],
  useCloseShiftMutation: () => [mocks.closeShift, { isLoading: false }],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
  Select: () => <div />,
}));

vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Button = ({
    children,
    disabled,
    onClick,
  }: PropsWithChildren & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
  return {
    IonBadge: Container,
    IonButton: Button,
    IonCard: Container,
    IonCardContent: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonContent: Container,
    IonHeader: Container,
    IonPage: Container,
    IonSpinner: () => null,
    IonTitle: Container,
    IonToolbar: Container,
  };
});

const activeShift = {
  id: '12',
  status: 'OPEN',
  opening_cash: '1000.00',
  cash_sales: '0.00',
  cash_in: '0.00',
  cash_out: '0.00',
  expected_cash: '1000.00',
  opened_at: '2026-10-30T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.refetchCurrent.mockResolvedValue(undefined);
  mocks.refetchHistory.mockResolvedValue(undefined);
  mocks.openUnwrap.mockResolvedValue(undefined);
  mocks.adjustUnwrap.mockResolvedValue(undefined);
  mocks.closeUnwrap.mockResolvedValue(undefined);
  mocks.openShift.mockReturnValue({ unwrap: mocks.openUnwrap });
  mocks.adjustShift.mockReturnValue({ unwrap: mocks.adjustUnwrap });
  mocks.closeShift.mockReturnValue({ unwrap: mocks.closeUnwrap });
  mocks.historyQuery.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    refetch: mocks.refetchHistory,
  });
});

afterEach(cleanup);

describe('ShiftsPage amount validation', () => {
  it('never opens a shift with a non-finite or negative amount', async () => {
    mocks.currentQuery.mockReturnValue({
      data: { data: null },
      isLoading: false,
      refetch: mocks.refetchCurrent,
    });
    render(<ShiftsPage />);

    const openingCash = screen.getByLabelText('shifts.openingCash');
    const submit = screen.getByRole('button', { name: 'shifts.openShift' });
    for (const invalid of ['NaN', 'Infinity', '-1']) {
      fireEvent.change(openingCash, { target: { value: invalid } });
      expect(submit).toHaveProperty('disabled', true);
      fireEvent.click(submit);
    }
    expect(mocks.openShift).not.toHaveBeenCalled();

    fireEvent.change(openingCash, { target: { value: '0' } });
    expect(submit).toHaveProperty('disabled', false);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.openShift).toHaveBeenCalledWith({ opening_cash: 0 }));
  });

  it('never adjusts or closes a shift with an invalid amount', async () => {
    mocks.currentQuery.mockReturnValue({
      data: { data: activeShift },
      isLoading: false,
      refetch: mocks.refetchCurrent,
    });
    render(<ShiftsPage />);

    const adjustmentAmount = screen.getByLabelText('common.amount');
    const adjustmentNote = screen.getByLabelText('shifts.reason');
    const saveMovement = screen.getByRole('button', { name: 'shifts.saveMovement' });
    fireEvent.change(adjustmentNote, { target: { value: 'Petty cash' } });
    for (const invalid of ['NaN', 'Infinity', '-1', '0']) {
      fireEvent.change(adjustmentAmount, { target: { value: invalid } });
      expect(saveMovement).toHaveProperty('disabled', true);
      fireEvent.click(saveMovement);
    }
    expect(mocks.adjustShift).not.toHaveBeenCalled();

    fireEvent.change(adjustmentAmount, { target: { value: '50' } });
    fireEvent.click(saveMovement);
    await waitFor(() =>
      expect(mocks.adjustShift).toHaveBeenCalledWith({
        id: '12',
        type: 'CASH_OUT',
        amount: 50,
        note: 'Petty cash',
      })
    );

    const countedCash = screen.getByLabelText('shifts.countedCash');
    const closeShift = screen.getByRole('button', { name: 'shifts.closeShift' });
    for (const invalid of ['NaN', 'Infinity', '-1']) {
      fireEvent.change(countedCash, { target: { value: invalid } });
      expect(closeShift).toHaveProperty('disabled', true);
      fireEvent.click(closeShift);
    }
    expect(mocks.closeShift).not.toHaveBeenCalled();

    fireEvent.change(countedCash, { target: { value: '1000' } });
    fireEvent.click(closeShift);
    await waitFor(() =>
      expect(mocks.closeShift).toHaveBeenCalledWith({ id: '12', counted_cash: 1000 })
    );
  });
});
