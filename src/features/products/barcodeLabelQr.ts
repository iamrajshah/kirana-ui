import { create } from 'qrcode';

export interface LabelQr {
  size: number;
  path: string;
}

export const createLabelQr = (raw: string): LabelQr | null => {
  const value = raw.trim();
  if (!value || value.length > 180) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    let path = '';
    for (let row = 0; row < modules.size; row += 1) {
      for (let col = 0; col < modules.size; col += 1) {
        if (modules.get(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
      }
    }
    // Four-module quiet zone is part of the vector, not dependent on print CSS.
    return { size: modules.size + 8, path };
  } catch {
    return null;
  }
};
