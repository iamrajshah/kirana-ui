// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createReceiptOutputService } from './outputService';
import type { ReceiptViewModel } from './types';

const receipt = {
  invoiceId: '42',
  invoiceNumber: 'INV-42',
  title: 'Receipt',
  supplier: { name: 'Rajesh Kirana' },
} as ReceiptViewModel;
const pdf = new Blob(['pdf'], { type: 'application/pdf' });

describe('receipt output service', () => {
  it('prints an isolated generated PDF instead of the Ionic application page', async () => {
    const createPdf = vi.fn().mockResolvedValue(pdf);
    const print = vi.fn().mockResolvedValue(undefined);
    const service = createReceiptOutputService({ createPdf, print });

    await service.run('print', receipt, '58mm');

    expect(createPdf).toHaveBeenCalledWith(receipt, '58mm');
    expect(print).toHaveBeenCalledWith(pdf, '58mm');
    expect(service.getState()).toMatchObject({ phase: 'completed', action: 'print' });
  });

  it('loads the generated PDF in a dedicated print frame and cleans it after printing', async () => {
    const createObjectUrl = vi.fn().mockReturnValue('blob:receipt-pdf');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    const service = createReceiptOutputService({
      createPdf: vi.fn().mockResolvedValue(pdf),
    });

    const output = service.run('print', receipt, '80mm');
    let frame: HTMLIFrameElement | null = null;
    await vi.waitFor(() => {
      frame = document.querySelector<HTMLIFrameElement>('iframe[title="Receipt print preview"]');
      expect(frame).not.toBeNull();
    });
    expect(frame!.src).toContain('blob:receipt-pdf');
    expect(frame!.dataset.receiptPaper).toBe('80mm');
    vi.spyOn(frame!.contentWindow!, 'focus').mockImplementation(() => undefined);
    const print = vi.spyOn(frame!.contentWindow!, 'print').mockImplementation(() => undefined);

    frame!.dispatchEvent(new Event('load'));
    await output;

    expect(print).toHaveBeenCalledOnce();
    frame!.contentWindow!.dispatchEvent(new Event('afterprint'));
    expect(document.querySelector('iframe[title="Receipt print preview"]')).toBeNull();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:receipt-pdf');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('shares one PDF file when web file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const download = vi.fn();
    const service = createReceiptOutputService({
      createPdf: vi.fn().mockResolvedValue(pdf),
      download,
      webShare: { canShare: () => true, share },
      isNative: () => false,
    });

    await service.run('share', receipt);

    expect(service.getState()).toMatchObject({ phase: 'completed' });
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files).toHaveLength(1);
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
    expect(download).not.toHaveBeenCalled();
    expect(service.getState()).toMatchObject({ phase: 'completed', action: 'share' });
  });

  it.each(['unsupported', 'cancelled'] as const)(
    'downloads the generated PDF when sharing is %s without reporting a sale failure',
    async (caseName) => {
      const share = vi.fn();
      if (caseName === 'cancelled') {
        share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
      }
      const download = vi.fn();
      const service = createReceiptOutputService({
        createPdf: vi.fn().mockResolvedValue(pdf),
        download,
        webShare: { canShare: () => caseName !== 'unsupported', share },
        isNative: () => false,
      });

      await service.run('share', receipt);

      expect(download).toHaveBeenCalledWith(pdf, 'INV-42.pdf');
      expect(service.getState()).toMatchObject({
        phase: caseName === 'cancelled' ? 'cancelled' : 'completed',
        action: 'share',
        fallbackDownloaded: true,
      });
    }
  );

  it('blocks duplicate activation while PDF generation is pending', async () => {
    let finish!: (value: Blob) => void;
    const createPdf = vi.fn(() => new Promise<Blob>((resolve) => (finish = resolve)));
    const service = createReceiptOutputService({
      createPdf,
      download: vi.fn(),
      webShare: { canShare: () => false, share: vi.fn() },
      isNative: () => false,
    });

    const first = service.run('pdf', receipt);
    const second = service.run('pdf', receipt);

    expect(service.getState()).toMatchObject({ phase: 'generating', action: 'pdf' });
    expect(createPdf).toHaveBeenCalledOnce();
    await expect(second).resolves.toMatchObject({ phase: 'generating' });
    finish(pdf);
    await first;
    expect(service.getState()).toMatchObject({ phase: 'completed', action: 'pdf' });
  });

  it('resets completed feedback but refuses to reset active output', async () => {
    let finish!: (value: Blob) => void;
    const service = createReceiptOutputService({
      createPdf: () => new Promise<Blob>((resolve) => (finish = resolve)),
      download: vi.fn(),
      webShare: { canShare: () => false, share: vi.fn() },
      isNative: () => false,
    });

    const output = service.run('pdf', receipt);
    expect(service.reset()).toBe(false);
    finish(pdf);
    await output;
    expect(service.reset()).toBe(true);
    expect(service.getState()).toEqual({ phase: 'idle', action: null });
  });
});
