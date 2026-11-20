import { describe, expect, it } from 'vitest';
import { createLabelQr } from './barcodeLabelQr';

describe('printable label QR', () => {
  it('generates deterministic vector modules with an integral quiet zone', () => {
    const code = createLabelQr('https://shop.example/shop/my-shop/products/1');
    expect(code?.size).toBeGreaterThan(21);
    expect(code?.path).toMatch(/^M4,4/);
    expect(createLabelQr('https://shop.example/shop/my-shop/products/1')).toEqual(code);
  });
  it.each([
    '',
    'javascript:alert(1)',
    'http://example.com',
    'https://user:password@example.com',
    'https://example.com/' + 'x'.repeat(180),
  ])('rejects an unsuitable link: %s', (value) => {
    expect(createLabelQr(value)).toBeNull();
  });
});
