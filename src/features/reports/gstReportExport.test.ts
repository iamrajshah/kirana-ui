import { describe, expect, it, vi } from 'vitest';
import { buildGstReportFilename, exportGstCsv } from './gstReportExport';

describe('GST CSV output', () => {
  it('makes multi-firm and consolidated exports distinguishable with safe filenames', () => {
    expect(
      buildGstReportFilename({
        report: 'sales-register',
        from: '2026-10-01',
        to: '2026-10-31',
        firm: { displayName: 'Jayesh Trading / Mumbai', code: 'JT-01' },
      })
    ).toBe('kirana-gst-jayesh-trading-mumbai-jt-01-sales-register-2026-10-01-to-2026-10-31.csv');

    expect(
      buildGstReportFilename({
        report: 'summary',
        from: '2026-10-01',
        to: '2026-10-31',
        firm: null,
      })
    ).toBe('kirana-gst-consolidated-summary-2026-10-01-to-2026-10-31.csv');
  });

  it('downloads a typed CSV on web and tablet browsers', async () => {
    const downloadWeb = vi.fn();
    const shareNative = vi.fn();

    await expect(
      exportGstCsv(new Blob(['invoice,total\nKJS-1,118']), 'gst-sales.csv', 'GST sales', {
        isNative: () => false,
        downloadWeb,
        shareNative,
      })
    ).resolves.toBe('downloaded');

    expect(downloadWeb).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/csv;charset=utf-8' }),
      'gst-sales.csv'
    );
    expect(shareNative).not.toHaveBeenCalled();
  });

  it('writes and shares the CSV through the native adapter on Android', async () => {
    const downloadWeb = vi.fn();
    const shareNative = vi.fn().mockResolvedValue(undefined);

    await expect(
      exportGstCsv(new Blob(['hsn,total\n1512,100']), 'gst-hsn.csv', 'GST HSN summary', {
        isNative: () => true,
        downloadWeb,
        shareNative,
      })
    ).resolves.toBe('shared');

    expect(shareNative).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/csv;charset=utf-8' }),
      'gst-hsn.csv',
      'GST HSN summary'
    );
    expect(downloadWeb).not.toHaveBeenCalled();
  });
});
