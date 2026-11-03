import { Capacitor } from '@capacitor/core';
import type { GstDownloadReport } from '@core/api/gstReportsApi';

interface GstReportExportDependencies {
  isNative: () => boolean;
  downloadWeb: (blob: Blob, filename: string) => void;
  shareNative: (blob: Blob, filename: string, title: string) => Promise<void>;
}

const downloadWeb = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const defaultDependencies: GstReportExportDependencies = {
  isNative: () => Capacitor.isNativePlatform(),
  downloadWeb,
  shareNative: async (blob, filename, title) =>
    (await import('../invoices/receipt/nativeShareAdapter')).shareNativeFile(
      blob,
      filename,
      title,
      'kirana-gst-reports'
    ),
};

const asCsv = (blob: Blob): Blob =>
  blob.type.toLowerCase().includes('text/csv')
    ? blob
    : new Blob([blob], { type: 'text/csv;charset=utf-8' });

const safeFilePart = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const buildGstReportFilename = ({
  report,
  from,
  to,
  firm,
}: {
  report: GstDownloadReport;
  from: string;
  to: string;
  firm?: { displayName?: string; code?: string; gstin?: string | null } | null;
}): string => {
  const firmIdentity = firm
    ? [firm.displayName, firm.gstin || firm.code].filter(Boolean).join('-')
    : 'consolidated';
  const safeFirmIdentity = safeFilePart(firmIdentity) || 'consolidated';
  return `kirana-gst-${safeFirmIdentity}-${report}-${from}-to-${to}.csv`;
};

export const exportGstCsv = async (
  blob: Blob,
  filename: string,
  title: string,
  overrides: Partial<GstReportExportDependencies> = {}
): Promise<'downloaded' | 'shared'> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const csv = asCsv(blob);
  if (dependencies.isNative()) {
    await dependencies.shareNative(csv, filename, title);
    return 'shared';
  }
  dependencies.downloadWeb(csv, filename);
  return 'downloaded';
};
