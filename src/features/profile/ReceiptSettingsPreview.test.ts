import { describe, expect, it } from 'vitest';
import { sampleReceipt } from './receiptSettingsPreview.logic';
import type { ReceiptTemplate } from '@core/types';

describe('sample receipt safety', () => {
  it.each<ReceiptTemplate>([
    'CLASSIC',
    'MODERN',
    'COMPACT',
    'LOGO_LEFT',
    'BRAND_CENTRE',
    'DETAILED',
  ])('previews %s without changing sales facts', (receipt_template) => {
    const form = {
      receipt_template,
      supplier_name: 'My shop',
      logo_url: 'https://example.com/shop.png',
      footer: 'Thank you',
    };
    const sample = sampleReceipt(form, 30, 'Sample product', 'Sample customer', 'PREVIEW ONLY');
    expect(sample.branding.template).toBe(receipt_template);
    expect(sample.branding.logoUrl).toBe(form.logo_url);
    expect(sample.supplier.name).toBe('My shop');
    expect(sample.items).toHaveLength(30);
    expect(sample.totals.total).toBe('6000.00');
    expect(sample.totals.mrpSavings).toBe('1500.00');
    expect(sample.demoMarker).toBe('PREVIEW ONLY');
    expect(sample.invoiceNumber).toBe('PREVIEW');
    expect(sample).not.toHaveProperty('margin_preview');
    expect(form).not.toHaveProperty('invoiceId');
  });
  it('does not load unsafe logos or invalid live-edit colours', () => {
    const sample = sampleReceipt(
      { logo_url: 'javascript:alert(1)', brand_color: 'invalid' },
      2,
      'Product',
      'Customer',
      'PREVIEW'
    );
    expect(sample.branding.logoUrl).toBeNull();
    expect(sample.branding.brandColor).toBe('#087F5B');
  });
});
