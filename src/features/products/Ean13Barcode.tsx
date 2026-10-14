import React from 'react';
import { encodeEan13 } from './ean13';

export const Ean13Barcode: React.FC<{ value: string; ariaLabel: string }> = ({ value, ariaLabel }) => {
  const bits = encodeEan13(value);
  if (!bits) return null;

  return (
    <svg
      className="store-barcode-svg"
      viewBox="0 0 109 70"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
      <rect width="109" height="70" fill="#fff" />
      {bits.split('').map((bit, index) => bit === '1' ? (
        <rect key={index} x={index + 7} y="2" width="1" height="53" fill="#000" />
      ) : null)}
      <text x="54.5" y="67" textAnchor="middle" fill="#000" fontSize="10" fontFamily="monospace" letterSpacing="1.15">
        {value}
      </text>
    </svg>
  );
};
