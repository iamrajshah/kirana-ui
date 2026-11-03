import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GstReportsPage from './GstReportsPage';
import { currentLocalMonthRange } from './gstReportDates';

const state = vi.hoisted(() => ({
  summary: vi.fn(),
  sales: vi.fn(),
  purchases: vi.fn(),
  hsn: vi.fn(),
  download: vi.fn(),
  firmsQuery: vi.fn(),
  webDownload: vi.fn(),
}));

const base = {
  firm: { id: '3', legalName: 'Jitendra Trading', displayName: 'Jitendra Trading' },
  period: { from: '2026-11-01', to: '2026-11-04' },
  disclaimer: 'Preparation aid only — CA review is required.',
  warnings: ['Purchase tax snapshots are incomplete.'],
};

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: (params?: unknown) => {
    state.firmsQuery(params);
    return {
    data: {
      data: {
        firms: [
          {
            id: '3',
            code: 'JT',
            display_name: 'Jitendra Trading',
            is_active: true,
            is_default_sales: true,
          },
          {
            id: '4',
            code: 'JAY',
            display_name: 'Jayesh Trading',
            is_active: false,
            is_default_sales: false,
          },
        ],
      },
    },
    };
  },
}));
vi.mock('@core/api/gstReportsApi', () => ({
  useGetGstSummaryQuery: (params: unknown, options: unknown) => state.summary(params, options),
  useGetGstSalesRegisterQuery: (params: unknown, options: unknown) => state.sales(params, options),
  useGetGstPurchaseRegisterQuery: (params: unknown, options: unknown) =>
    state.purchases(params, options),
  useGetGstHsnSummaryQuery: (params: unknown, options: unknown) => state.hsn(params, options),
  useDownloadGstReportMutation: () => [state.download, { isLoading: false }],
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonIcon: Container,
    IonSpinner: Container,
    IonButton: ({
      children,
      onClick,
      disabled,
    }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    IonSelect: ({
      children,
      value,
      onIonChange,
    }: PropsWithChildren<{
      value?: string;
      onIonChange?: (event: { detail: { value: string } }) => void;
    }>) => (
      <select
        aria-label="gstReports.firm"
        value={value}
        onChange={(event) => onIonChange?.({ detail: { value: event.target.value } })}
      >
        {children}
      </select>
    ),
    IonSelectOption: ({ children, value }: PropsWithChildren<{ value?: string }>) => (
      <option value={value}>{children}</option>
    ),
  };
});

const query = (data: unknown) => ({
  data: { data },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    state.webDownload(this.download);
  });
  state.summary.mockImplementation(() =>
    query({
      ...base,
      report: 'GST_TAX_LIABILITY_SUMMARY',
      outward: { taxableValue: 100, cgst: 9, sgst: 9, igst: 0, totalTax: 18 },
      inward: { taxableValue: 40, invoiceValue: 47.2 },
      inputTaxCredit: { cgst: 3.6, sgst: 3.6, igst: 0, total: 7.2 },
      estimatedNetLiability: { cgst: 5.4, sgst: 5.4, igst: 0, total: 10.8 },
    })
  );
  state.sales.mockImplementation(() =>
    query({
      ...base,
      rows: [
        {
          invoiceDate: '2026-11-03',
          invoiceNumber: 'KJS-1',
          customerName: 'Walk-in customer',
          customerGstin: '',
          placeOfSupplyCode: '27',
          taxableValue: 100,
          cgst: 9,
          sgst: 9,
          igst: 0,
          invoiceValue: 118,
          status: 'PAID',
        },
      ],
    })
  );
  state.purchases.mockImplementation(() =>
    query({
      ...base,
      rows: [
        {
          invoiceDate: '2026-11-02',
          invoiceNumber: 'SUP-1',
          supplierName: 'Gemini Oils',
          supplierGstin: '',
          taxableValue: 40,
          inputCgst: 3.6,
          inputSgst: 3.6,
          inputIgst: 0,
          invoiceValue: 47.2,
          status: 'PAID',
          taxSnapshotComplete: false,
        },
      ],
    })
  );
  state.hsn.mockImplementation(() =>
    query({
      ...base,
      rows: [
        {
          hsnCode: '1512',
          gstRate: 5,
          saleQuantity: 2,
          saleTaxableValue: 100,
          outputTax: 5,
          purchaseQuantity: 1,
          purchaseTaxableValue: 40,
          inputTax: 2,
          ineligibleInputTax: 0.5,
        },
      ],
    })
  );
  state.download.mockReturnValue({ unwrap: () => Promise.resolve(new Blob(['csv'])) });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:gst'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.values(state).forEach((mock) => mock.mockReset());
});

describe('GST / CA report route', () => {
  it('uses local calendar dates without UTC day shifts', () => {
    expect(currentLocalMonthRange(new Date(2026, 10, 4, 0, 5))).toEqual({
      from: '2026-11-01',
      to: '2026-11-04',
    });
  });

  it('loads the default firm summary and prominently marks CA review warnings', async () => {
    render(<GstReportsPage />);

    expect(state.firmsQuery).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole('option', { name: 'Jayesh Trading (common.inactive)' })).toBeTruthy();
    expect((await screen.findAllByText('gstReports.needsCaReview')).length).toBeGreaterThan(0);
    expect(screen.getByText('gstReports.notFiled')).toBeTruthy();
    expect(screen.getByText('Purchase tax snapshots are incomplete.')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
    await waitFor(() =>
      expect(state.summary).toHaveBeenLastCalledWith(
        expect.objectContaining({ firmId: '3' }),
        expect.anything()
      )
    );
  });

  it('switches firms and consumes each register rows envelope', async () => {
    render(<GstReportsPage />);
    fireEvent.change(await screen.findByLabelText('gstReports.firm'), {
      target: { value: '4' },
    });
    await waitFor(() =>
      expect(state.summary).toHaveBeenLastCalledWith(
        expect.objectContaining({ firmId: '4' }),
        expect.anything()
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'gstReports.tabs.SALES' }));
    expect(await screen.findByText('KJS-1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'gstReports.tabs.PURCHASES' }));
    expect(await screen.findByText('SUP-1')).toBeTruthy();
    expect(screen.getByText('gstReports.taxSnapshotIncomplete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'gstReports.tabs.HSN' }));
    expect(await screen.findByText('1512')).toBeTruthy();
    expect(screen.getByText('gstReports.ineligibleInputTax')).toBeTruthy();
  });

  it('downloads the active CA handoff through the authenticated mutation', async () => {
    render(<GstReportsPage />);
    await screen.findByText('gstReports.notFiled');
    fireEvent.click(screen.getByRole('button', { name: 'gstReports.downloadCsv' }));
    await waitFor(() =>
      expect(state.download).toHaveBeenCalledWith({
        report: 'summary',
        params: expect.objectContaining({ firmId: '3' }),
      })
    );
    expect(state.webDownload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^kirana-gst-jitendra-trading-jt-summary-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/
      )
    );
  });
});
