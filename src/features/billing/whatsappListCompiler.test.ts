import { describe, expect, it } from 'vitest';
import type { BillingSearchVariant } from '@core/api/productApi';
import { compileWhatsAppList } from './whatsappListCompiler';

const product = (id: string, name: string, details: Partial<BillingSearchVariant> = {}) => ({
  id,
  product_id: id,
  product_name: name,
  price: 40,
  sku: `SKU-${id}`,
  available_quantity: 20,
  low_stock_threshold: 2,
  ...details,
});

describe('WhatsApp list compiler', () => {
  it('extracts an explicit quantity and confidently matches a catalogue product', () => {
    const [line] = compileWhatsAppList('2 x Tata Salt', [product('1', 'Tata Salt')]);
    expect(line).toMatchObject({ quantity: 2, selectedVariantId: '1' });
  });

  it('uses brand and size to match a shopkeeper-style line', () => {
    const [line] = compileWhatsAppList('Gemini oil 1L', [
      product('1', 'Oil', { brand: 'Gemini', size: '1L' }),
    ]);
    expect(line.selectedVariantId).toBe('1');
  });

  it('requires staff review when two alternatives score equally', () => {
    const [line] = compileWhatsAppList('Sugar', [
      product('1', 'Sugar', { size: '1 kg' }),
      product('2', 'Sugar', { size: '5 kg' }),
    ]);
    expect(line.selectedVariantId).toBeNull();
    expect(line.alternatives).toHaveLength(2);
  });

  it('keeps unknown lines unresolved instead of inventing a product', () => {
    const [line] = compileWhatsAppList('special festival item', [product('1', 'Sugar')]);
    expect(line.selectedVariantId).toBeNull();
    expect(line.alternatives).toEqual([]);
  });
});
