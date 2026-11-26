import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { receiptPdfTextRuns } from './receiptPdfText';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit') as {
  openSync: (path: string) => { hasGlyphForCodePoint: (codepoint: number) => boolean };
};

describe('receipt PDF currency glyph coverage', () => {
  it.each([400, 700])(
    'renders every INR amount character with an actual %s font glyph',
    (weight) => {
      const fonts: Record<string, string> = {
        'Receipt Latin': `@fontsource/noto-sans/files/noto-sans-latin-${weight}-normal.woff`,
        'Receipt Devanagari': `@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-${weight}-normal.woff`,
      };
      const runs = receiptPdfTextRuns('₹170.00');
      expect(runs.map((run) => run.text).join('')).toBe('₹170.00');
      for (const run of runs) {
        const font = fontkit.openSync(require.resolve(fonts[run.family]));
        for (const char of run.text)
          expect(font.hasGlyphForCodePoint(char.codePointAt(0)!)).toBe(true);
      }
    }
  );
});
