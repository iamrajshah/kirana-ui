import type { BillingSearchVariant } from '@core/api/productApi';

export interface CompiledWhatsAppLine {
  id: string;
  source: string;
  quantity: number;
  selectedVariantId: string | null;
  alternatives: BillingSearchVariant[];
}

const normalize = (value: string): string =>
  value
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const parseLine = (source: string): { query: string; quantity: number } => {
  const trimmed = source.replace(/^\s*[-•]\s*/, '').trim();
  const leading = trimmed.match(/^(\d{1,3})\s*(?:x|×|\*)\s*(.+)$/i);
  const trailing = trimmed.match(/^(.+?)\s+(?:x|×|\*)\s*(\d{1,3})$/i);
  if (leading) return { query: leading[2], quantity: Math.max(1, Number(leading[1])) };
  if (trailing) return { query: trailing[1], quantity: Math.max(1, Number(trailing[2])) };
  return { query: trimmed, quantity: 1 };
};

const searchableVariant = (variant: BillingSearchVariant): string =>
  normalize(
    [variant.product_name, variant.brand, variant.size, variant.packaging, variant.sku]
      .filter(Boolean)
      .join(' ')
  );

const scoreVariant = (query: string, variant: BillingSearchVariant): number => {
  const candidate = searchableVariant(variant);
  if (!query || !candidate) return 0;
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 90;
  if (candidate.includes(query)) return 80;
  const tokens = query.split(' ').filter((token) => token.length > 1);
  return tokens.length && tokens.every((token) => candidate.includes(token)) ? 65 : 0;
};

export const compileWhatsAppList = (
  text: string,
  catalog: BillingSearchVariant[]
): CompiledWhatsAppLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((source, index) => {
      const parsed = parseLine(source);
      const query = normalize(parsed.query);
      const ranked = catalog
        .map((variant) => ({ variant, score: scoreVariant(query, variant) }))
        .filter((entry) => entry.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score || left.variant.id.localeCompare(right.variant.id)
        )
        .slice(0, 3);
      const confident =
        ranked.length > 0 &&
        ranked[0].score >= 65 &&
        (ranked.length === 1 || ranked[0].score - ranked[1].score >= 10);
      return {
        id: `${index}-${normalize(source)}`,
        source,
        quantity: parsed.quantity,
        selectedVariantId: confident ? ranked[0].variant.id : null,
        alternatives: ranked.map((entry) => entry.variant),
      };
    });
