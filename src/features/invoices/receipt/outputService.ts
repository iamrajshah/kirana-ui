import { Capacitor } from '@capacitor/core';
import type { ReceiptPaperWidth, ReceiptViewModel } from './types';

export type ReceiptOutputAction = 'print' | 'pdf' | 'share';
export type ReceiptOutputState =
  | { phase: 'idle'; action: null }
  | { phase: 'generating' | 'handing-off'; action: ReceiptOutputAction }
  | { phase: 'completed'; action: ReceiptOutputAction; fallbackDownloaded?: boolean }
  | { phase: 'cancelled'; action: ReceiptOutputAction; fallbackDownloaded: boolean }
  | { phase: 'recoverable-error'; action: ReceiptOutputAction; message: string };
export type ReceiptOutputFeedback = 'working' | 'downloaded' | 'error' | null;

interface SharePayload {
  title: string;
  text: string;
  files: File[];
}

interface OutputDependencies {
  createPdf: (receipt: ReceiptViewModel, paperWidth?: ReceiptPaperWidth) => Promise<Blob>;
  download: (blob: Blob, fileName: string) => void;
  print: (blob: Blob, paperWidth: ReceiptPaperWidth) => Promise<void> | void;
  webShare: {
    canShare: (payload: SharePayload) => boolean;
    share: (payload: SharePayload) => Promise<void>;
  };
  isNative: () => boolean;
  nativeShare: (blob: Blob, fileName: string, title: string) => Promise<void>;
}

const safeFileName = (invoiceNumber: string) =>
  `${invoiceNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'receipt'}.pdf`;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const printReceipt = (blob: Blob, paperWidth: ReceiptPaperWidth) =>
  new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.title = 'Receipt print preview';
    frame.dataset.receiptPaper = paperWidth;
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';

    let cleaned = false;
    let cleanupTimer: number | undefined;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
      frame.remove();
      URL.revokeObjectURL(url);
    };
    const fail = () => {
      cleanup();
      reject(new Error('Unable to prepare the receipt for printing'));
    };

    frame.addEventListener('error', fail, { once: true });
    frame.addEventListener(
      'load',
      () => {
        const target = frame.contentWindow;
        if (!target) {
          fail();
          return;
        }
        target.addEventListener('afterprint', cleanup, { once: true });
        try {
          target.focus();
          target.print();
          resolve();
          cleanupTimer = window.setTimeout(cleanup, 60_000);
        } catch {
          fail();
        }
      },
      { once: true }
    );
    frame.src = url;
    document.body.appendChild(frame);
  });

const defaultDependencies: OutputDependencies = {
  createPdf: async (receipt, paperWidth) =>
    (await import('./pdfRenderer')).renderReceiptPdf(receipt, paperWidth),
  download: downloadBlob,
  print: printReceipt,
  webShare: {
    canShare: (payload) => typeof navigator.canShare === 'function' && navigator.canShare(payload),
    share: (payload) => navigator.share(payload),
  },
  isNative: () => Capacitor.isNativePlatform(),
  nativeShare: async (blob, fileName, title) =>
    (await import('./nativeShareAdapter')).shareNativePdf(blob, fileName, title),
};

const isCancellation = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

export const getReceiptOutputFeedback = (state: ReceiptOutputState): ReceiptOutputFeedback => {
  if (state.phase === 'generating' || state.phase === 'handing-off') return 'working';
  if (state.phase === 'cancelled' || (state.phase === 'completed' && state.fallbackDownloaded)) {
    return 'downloaded';
  }
  if (state.phase === 'recoverable-error') return 'error';
  return null;
};

export const createReceiptOutputService = (overrides: Partial<OutputDependencies> = {}) => {
  const dependencies: OutputDependencies = {
    ...defaultDependencies,
    ...overrides,
    webShare: { ...defaultDependencies.webShare, ...overrides.webShare },
  };
  let state: ReceiptOutputState = { phase: 'idle', action: null };
  const listeners = new Set<(state: ReceiptOutputState) => void>();
  const setState = (next: ReceiptOutputState) => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };
  const downloadShareFallback = (
    blob: Blob,
    fileName: string,
    action: ReceiptOutputAction,
    error?: unknown
  ) => {
    dependencies.download(blob, fileName);
    setState(
      error && isCancellation(error)
        ? { phase: 'cancelled', action, fallbackDownloaded: true }
        : { phase: 'completed', action, fallbackDownloaded: true }
    );
  };

  const run = async (
    action: ReceiptOutputAction,
    receipt: ReceiptViewModel,
    paperWidth: ReceiptPaperWidth = '80mm'
  ): Promise<ReceiptOutputState> => {
    if (state.phase === 'generating' || state.phase === 'handing-off') return state;
    setState({ phase: action === 'print' ? 'handing-off' : 'generating', action });

    try {
      if (action === 'print') {
        const blob = await dependencies.createPdf(receipt, paperWidth);
        await dependencies.print(blob, paperWidth);
        setState({ phase: 'completed', action });
        return state;
      }

      const blob = await dependencies.createPdf(receipt);
      const fileName = safeFileName(receipt.invoiceNumber);
      if (action === 'pdf') {
        dependencies.download(blob, fileName);
        setState({ phase: 'completed', action });
        return state;
      }

      setState({ phase: 'handing-off', action });
      if (dependencies.isNative()) {
        try {
          await dependencies.nativeShare(
            blob,
            fileName,
            `${receipt.title} ${receipt.invoiceNumber}`
          );
          setState({ phase: 'completed', action });
        } catch (error) {
          downloadShareFallback(blob, fileName, action, error);
        }
        return state;
      }

      const file = new File([blob], fileName, { type: 'application/pdf' });
      const payload: SharePayload = {
        title: `${receipt.title} ${receipt.invoiceNumber}`,
        text: `${receipt.supplier.name} · ${receipt.invoiceNumber}`,
        files: [file],
      };
      if (!dependencies.webShare.canShare(payload)) {
        downloadShareFallback(blob, fileName, action);
        return state;
      }

      try {
        await dependencies.webShare.share(payload);
        setState({ phase: 'completed', action });
      } catch (error) {
        downloadShareFallback(blob, fileName, action, error);
      }
      return state;
    } catch (error) {
      setState({
        phase: 'recoverable-error',
        action,
        message: error instanceof Error ? error.message : 'Unable to prepare receipt output',
      });
      return state;
    }
  };

  const reset = () => {
    if (state.phase === 'generating' || state.phase === 'handing-off') return false;
    setState({ phase: 'idle', action: null });
    return true;
  };

  return {
    run,
    reset,
    getState: () => state,
    subscribe: (listener: (state: ReceiptOutputState) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type ReceiptOutputService = ReturnType<typeof createReceiptOutputService>;
export const receiptOutputService = createReceiptOutputService();
