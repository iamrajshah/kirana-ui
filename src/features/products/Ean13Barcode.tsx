import React from 'react';
import { encodeEan13 } from './ean13';

export const Ean13Barcode: React.FC<{ value: string; ariaLabel: string }> = ({ value, ariaLabel }) => {
  const bits = encodeEan13(value);
  if (!bits) return null;

  return (
    <svg className="store-barcode-svg" viewBox="0 0 109 67" role="img" aria-label={ariaLabel}>
      <rect width="109" height="67" fill="#fff" />
      {bits.split('').map((bit, index) => bit === '1' ? (
        <rect key={index} x={index + 7} y="3" width="1" height="50" fill="#000" />
      ) : null)}
      <text x="54.5" y="64" textAnchor="middle" fill="#000" fontSize="9" fontFamily="monospace" letterSpacing="1.3">
        {value}
      </text>
    </svg>
  );
};
