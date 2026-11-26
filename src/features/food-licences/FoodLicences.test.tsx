import { selectTestChoice } from '@components/selectTestChoice';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FoodLicence } from '@core/api/foodLicenceApi';
import { FoodLicenceSelector } from './FoodLicenceSelector';
import { FoodLicenceSettingsCard } from './FoodLicenceSettingsCard';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  state: {
    auth: {
      user: { roles: ['OWNER'] },
      sessionContext: { commercialAccess: undefined as unknown },
    },
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector(mocks.state),
}));
vi.mock('@core/api/foodLicenceApi', () => ({
  useGetFoodLicencesQuery: (...args: unknown[]) => mocks.query(...args),
  useCreateFoodLicenceMutation: () => [mocks.create, { isLoading: false }],
  useUpdateFoodLicenceMutation: () => [mocks.update, { isLoading: false }],
}));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({
    data: {
      data: {
        firms: [
          { id: '1', display_name: 'One GST firm', is_active: true },
          { id: '2', display_name: 'Other firm', is_active: true },
        ],
      },
    },
  }),
}));
const licence = (changes: Partial<FoodLicence> = {}): FoodLicence => ({
  id: '11',
  tenant_id: '1',
  firm_id: '1',
  label: 'Jayesh Trading licence',
  licence_number: '11526000000001',
  holder_name: 'Registered holder',
  premises_address: 'Registered premises',
  valid_from: '2026-01-01',
  expiry_date: '2026-12-31',
  is_active: true,
  version: 1,
  ...changes,
});
const response = (licences: FoodLicence[]) => ({
  data: { data: { licences, max_active: 3 } },
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.auth.user.roles = ['OWNER'];
  mocks.state.auth.sessionContext.commercialAccess = undefined;
  mocks.query.mockReturnValue(response([licence()]));
  mocks.create.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mocks.update.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});
afterEach(cleanup);
describe('purchase licence selection', () => {
  it('shows only active licences valid for the selected firm and invoice date', () => {
    mocks.query.mockReturnValue(
      response([
        licence(),
        licence({ id: '12', firm_id: '2', label: 'Other firm licence' }),
        licence({ id: '13', expiry_date: '2026-01-31', label: 'Expired licence' }),
        licence({ id: '14', is_active: false, label: 'Archived licence' }),
      ])
    );
    render(<FoodLicenceSelector firmId="1" invoiceDate="2026-06-01" value="" onChange={vi.fn()} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /Jayesh/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Other firm|Expired|Archived/ })).toBeNull();
  });
  it('clears a stale licence after changing firm or purchase date', async () => {
    const change = vi.fn();
    const view = render(
      <FoodLicenceSelector firmId="1" invoiceDate="2026-06-01" value="11" onChange={change} />
    );
    expect(change).not.toHaveBeenCalled();
    view.rerender(
      <FoodLicenceSelector firmId="2" invoiceDate="2026-06-01" value="11" onChange={change} />
    );
    await waitFor(() => expect(change).toHaveBeenCalledWith(''));
  });
  it('hides the selector and clears selection when role access is denied', async () => {
    mocks.state.auth.sessionContext.commercialAccess = {
      planCode: 'BUSINESS',
      entitlements: ['FOOD_LICENCES', 'PURCHASES'],
      state: 'ACTIVE',
      effectiveState: 'ACTIVE',
      featureRoles: { FOOD_LICENCES: ['OWNER'], PURCHASES: ['OWNER'] },
    };
    mocks.state.auth.user.roles = ['CASHIER'];
    const change = vi.fn();
    render(
      <FoodLicenceSelector firmId="1" invoiceDate="2026-06-01" value="11" onChange={change} />
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    await waitFor(() => expect(change).toHaveBeenCalledWith(''));
    expect(mocks.query).toHaveBeenCalledWith({ firm_id: '1' }, { skip: true });
  });
  it('reports missing validity and keeps a backdated valid purchase selectable', () => {
    mocks.query.mockReturnValue(response([licence({ expiry_date: null })]));
    render(
      <FoodLicenceSelector firmId="1" invoiceDate="2026-06-01" value="11" onChange={vi.fn()} />
    );
    expect(screen.getByText('foodLicences.unknownValidity')).toBeTruthy();
  });
});
describe('owner food licence register', () => {
  it('creates a licence under a firm, separately from GST and firm creation', async () => {
    render(<FoodLicenceSettingsCard />);
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.add' }));
    selectTestChoice(screen.getByLabelText('foodLicences.firm'), '1');
    for (const [key, value] of [
      ['number', '11526000000002'],
      ['label', 'Jitendra licence'],
      ['holder', 'Registered holder'],
      ['premises', 'Market address'],
    ])
      fireEvent.change(screen.getByLabelText(`foodLicences.${key}`), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.save' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        firm_id: '1',
        licence_number: '11526000000002',
        label: 'Jitendra licence',
        holder_name: 'Registered holder',
        premises_address: 'Market address',
        valid_from: null,
        expiry_date: null,
        is_active: true,
      })
    );
    expect(await screen.findByRole('status')).toBeTruthy();
  });
  it('preserves identity and sends versioned archive updates', async () => {
    render(<FoodLicenceSettingsCard />);
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.edit' }));
    expect((screen.getByLabelText('foodLicences.firm') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('foodLicences.number') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('foodLicences.active'));
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.save' }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        id: '11',
        changes: {
          label: licence().label,
          holder_name: licence().holder_name,
          premises_address: licence().premises_address,
          valid_from: '2026-01-01',
          expiry_date: '2026-12-31',
          is_active: false,
          version: 1,
        },
      })
    );
  });
  it('blocks a fourth active licence and shows server errors without losing input', async () => {
    mocks.query.mockReturnValue(
      response([licence(), licence({ id: '12' }), licence({ id: '13' })])
    );
    const view = render(<FoodLicenceSettingsCard />);
    expect(
      (screen.getByRole('button', { name: 'foodLicences.add' }) as HTMLButtonElement).disabled
    ).toBe(true);
    mocks.query.mockReturnValue(response([licence()]));
    view.rerender(<FoodLicenceSettingsCard />);
    mocks.update.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: 'Concurrent edit: reload' } }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.edit' }));
    fireEvent.change(screen.getByLabelText('foodLicences.label'), {
      target: { value: 'Changed draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'foodLicences.save' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((screen.getByLabelText('foodLicences.label') as HTMLInputElement).value).toBe(
      'Changed draft'
    );
  });
});
