import { Capacitor, registerPlugin } from '@capacitor/core';

const documents = registerPlugin<{
  printHtml(options: { html: string; jobName: string }): Promise<{ completed: boolean }>;
}>('KiranaDocuments');

export const reportPrintHtml = (title: string, text: string): string => {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
        character
    );
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:12px -apple-system,Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>${escape(title)}</h1><pre>${escape(text)}</pre></body></html>`;
};

export const printReport = async (title: string, text: string): Promise<void> => {
  if (Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()) {
    await documents.printHtml({ html: reportPrintHtml(title, text), jobName: title });
  } else {
    window.print();
  }
};
