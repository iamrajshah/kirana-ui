import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReceiptOutputService } from './outputService';
import { renderReceiptPdf } from './pdfRenderer';
import type { ReceiptViewModel } from './types';

vi.mock('./pdfRenderer', () => ({ renderReceiptPdf: vi.fn() }));

const receipt = { invoiceNumber: 'INV-42', title: 'Receipt' } as ReceiptViewModel;
const pdf = new Blob(['pdf'], { type: 'application/pdf' });

describe('default receipt PDF adapter', () => {
  beforeEach(() => {
    vi.mocked(renderReceiptPdf).mockReset().mockResolvedValue(pdf);
  });

  it.each(['58mm', '80mm'] as const)(
    'forwards %s through the real default adapter instead of replacing it in the test',
    async (width) => {
      const print = vi.fn();
      const output = createReceiptOutputService({ print });

      await output.run('print', receipt, width);

      expect(renderReceiptPdf).toHaveBeenCalledWith(receipt, width);
      expect(print).toHaveBeenCalledWith(pdf, width);
      expect(output.getState()).toMatchObject({ phase: 'completed', action: 'print' });
    }
  );

  it('keeps the ordinary PDF download on the default A4 renderer', async () => {
    const download = vi.fn();
    const output = createReceiptOutputService({ download });

    await output.run('pdf', receipt, '58mm');

    expect(vi.mocked(renderReceiptPdf).mock.calls[0]?.[0]).toBe(receipt);
    expect(vi.mocked(renderReceiptPdf).mock.calls[0]?.[1]).toBeUndefined();
    expect(download).toHaveBeenCalledWith(pdf, 'INV-42.pdf');
  });
});
