import { Font } from '@react-pdf/renderer';
import latinRegular from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import latinBold from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?url';
import devanagariRegular from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url';
import devanagariBold from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff?url';
import gujaratiRegular from '@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-400-normal.woff?url';
import gujaratiBold from '@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-700-normal.woff?url';

let fontsRegistered = false;

const fontSource = (source: string) => {
  if (import.meta.env.MODE !== 'test') return source;
  if (source.startsWith('/@fs/')) return source.slice('/@fs'.length);
  if (source.startsWith('/node_modules/')) return `${process.cwd()}${source}`;
  return source;
};

export const registerReceiptFonts = () => {
  if (fontsRegistered) return;
  Font.register({
    family: 'Receipt Latin',
    fonts: [{ src: fontSource(latinRegular) }, { src: fontSource(latinBold), fontWeight: 700 }],
  });
  Font.register({
    family: 'Receipt Devanagari',
    fonts: [
      { src: fontSource(devanagariRegular) },
      { src: fontSource(devanagariBold), fontWeight: 700 },
    ],
  });
  Font.register({
    family: 'Receipt Gujarati',
    fonts: [
      { src: fontSource(gujaratiRegular) },
      { src: fontSource(gujaratiBold), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
};
