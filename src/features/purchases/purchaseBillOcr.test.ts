import { describe, expect, it, vi } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { attemptPurchaseBillImageOcr, normalizeTesseractConfidence } from './purchaseBillOcr';

const image = () => new File(['image'], 'bill.jpg', { type: 'image/jpeg' });

describe('purchase bill client OCR fallback', () => {
  it('uses only self-hosted v7 core assets and contains no CDN dependency', async () => {
    const assets = (await readdir(path.join(process.cwd(), 'public', 'ocr', 'core'))).sort();
    expect(assets).toEqual(
      [
        'tesseract-core-lstm.wasm.js',
        'tesseract-core-relaxedsimd-lstm.wasm.js',
        'tesseract-core-simd-lstm.wasm.js',
      ].sort()
    );
    const source = await readFile(
      path.join(process.cwd(), 'src', 'features', 'purchases', 'purchaseBillOcr.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/https?:\/\//);
  });
  it('normalizes the Tesseract 0-100 contract to the API 0-1 contract', () => {
    expect(normalizeTesseractConfidence(88)).toBe(0.88);
    expect(normalizeTesseractConfidence(140)).toBe(1);
    expect(normalizeTesseractConfidence(-1)).toBe(0);
  });

  it('returns extracted text and confidence when recognition succeeds', async () => {
    const recognize = vi.fn().mockResolvedValue({
      text: 'Supplier invoice 42 Sugar 2 120.00',
      confidence: 0.88,
    });

    await expect(attemptPurchaseBillImageOcr(image(), {}, recognize)).resolves.toEqual({
      status: 'TEXT',
      text: 'Supplier invoice 42 Sugar 2 120.00',
      confidence: 0.88,
    });
  });

  it('falls back to manual review when too little text is recognised', async () => {
    const recognize = vi.fn().mockResolvedValue({ text: 'Bill', confidence: 0.22 });

    await expect(attemptPurchaseBillImageOcr(image(), {}, recognize)).resolves.toEqual({
      status: 'NO_TEXT',
    });
  });

  it('falls back to manual review when the local engine is unavailable', async () => {
    const recognize = vi.fn().mockRejectedValue(new Error('WASM unavailable'));

    await expect(attemptPurchaseBillImageOcr(image(), {}, recognize)).resolves.toEqual({
      status: 'UNAVAILABLE',
    });
  });

  it('distinguishes an explicit cancellation from an unavailable engine', async () => {
    const controller = new AbortController();
    controller.abort();
    const recognize = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));

    await expect(
      attemptPurchaseBillImageOcr(image(), { signal: controller.signal }, recognize)
    ).resolves.toEqual({ status: 'CANCELLED' });
  });
});
