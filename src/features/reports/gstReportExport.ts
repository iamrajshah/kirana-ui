import { Capacitor } from '@capacitor/core';

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
