import type { Category } from '@core/api/categoryApi';
export type TaxDefaults = { hsn: string; gst: string };
export function categoryTaxDefaults(category?: Category | null): TaxDefaults {
  return {
    hsn: category?.default_hsn_code ?? '',
    gst: category?.default_gst_percent == null ? '' : String(category.default_gst_percent),
  };
}
/** Follow changed category defaults only until the field has been explicitly overridden. */
export function applyCategoryTaxDefaults(
  current: TaxDefaults,
  previous: TaxDefaults,
  next: TaxDefaults
): TaxDefaults {
  return {
    hsn: !current.hsn || current.hsn === previous.hsn ? next.hsn : current.hsn,
    gst: !current.gst || current.gst === previous.gst ? next.gst : current.gst,
  };
}
