// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderBarcodeLabelPdf } from './barcodeLabelPdf';
import { createLabelQr } from './barcodeLabelQr';
import type { BarcodeLabelProps } from './ProductBarcodeLabelModal';

const label: BarcodeLabelProps = {
  barcode: '2001173897723',
  productName: 'चहा · ચોખા · Rice',
  shopName: 'QA Shop',
  options: { showPrice: true, showShopName: true, showBarcodeNumber: true },
  sellingPriceLabel: '₹100',
  mrpPriceLabel: '₹120',
  showMrp: true,
  variantLabel: '1 kg',
  details: ['SKU: QA', 'Packed: 22/11/2026'],
  storePackedItemLabel: 'Store packed item',
  mrpLabel: 'MRP',
  barcodeAriaLabel: 'QA barcode',
  demoMarker: 'DEMO — NOT A VALID BUSINESS DOCUMENT',
};
const bytes = async (blob: Blob) => {
  const data =
    typeof blob.arrayBuffer === 'function'
      ? await blob.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Cannot read PDF'));
          reader.readAsArrayBuffer(blob);
        });
  return Array.from(new Uint8Array(data), (value) => String.fromCharCode(value)).join('');
};
describe('native barcode label PDF', () => {
  it.each([
    ['standard', 22],
    ['extended', 16],
    ['qr', 13],
  ] as const)(
    'preserves A4 pagination for %s labels with real multilingual PDF rendering',
    async (format, copies) => {
      const source = await bytes(
        await renderBarcodeLabelPdf(
          {
            ...label,
            format,
            qr: format === 'qr' ? createLabelQr('https://kirana-customer.pages.dev/shop/qa') : null,
          },
          copies
        )
      );
      expect(source.startsWith('%PDF-')).toBe(true);
      expect(source.match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
      const box = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
      expect(Number(box?.[1])).toBeCloseTo(595.28, 1);
      expect(Number(box?.[2])).toBeCloseTo(841.89, 1);
    },
    30_000
  );
  it('refuses invalid barcode data or an unbounded native print job', async () => {
    await expect(
      renderBarcodeLabelPdf({ ...label, barcode: 'not-a-barcode' }, 1)
    ).rejects.toThrow();
    await expect(renderBarcodeLabelPdf(label, 1001)).rejects.toThrow();
    await expect(renderBarcodeLabelPdf(label, 0)).rejects.toThrow();
  });
});
