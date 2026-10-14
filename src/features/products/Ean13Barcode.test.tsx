import React from 'react';
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ean13Barcode } from './Ean13Barcode';
import { encodeEan13 } from './ean13';

describe('Ean13Barcode', () => {
  it('encodes a valid 13-digit store barcode into the 95 EAN modules', () => {
    const bits = encodeEan13('2012345678903');
    expect(bits).toHaveLength(95);
    expect(bits.startsWith('101')).toBe(true);
    expect(bits.endsWith('101')).toBe(true);
  });

  it('renders a printable barcode with an accessible value', () => {
    const { container } = render(
      <Ean13Barcode value="2012345678903" ariaLabel="Barcode 2012345678903" />
    );
    expect(within(container).getByRole('img', { name: 'Barcode 2012345678903' })).toBeTruthy();
  });

  it('keeps the barcode graphic when the human-readable number is hidden', () => {
    const { container } = render(
      <Ean13Barcode
        value="2012345678903"
        ariaLabel="Barcode 2012345678903"
        showText={false}
      />
    );

    expect(within(container).getByRole('img', { name: 'Barcode 2012345678903' })).toBeTruthy();
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(1);
  });

  it('does not render malformed values', () => {
    const { container } = render(<Ean13Barcode value="ABC" ariaLabel="Invalid barcode" />);
    expect(container.firstChild).toBeNull();
  });
});
