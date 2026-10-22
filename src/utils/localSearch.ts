import type { BillingSearchVariant } from '@core/api/productApi';
import type { Customer, Inventory, Product } from '@core/types';

const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

const includesQuery = (query: string, values: unknown[]) =>
  values.some((value) => normalize(value).includes(query));

export const filterBillingCatalog = (
  items: BillingSearchVariant[],
  rawQuery: string,
  limit = 20
) => {
  const query = normalize(rawQuery);
  if (query.length < 2) return [];

  return items
    .filter((item) =>
      includesQuery(query, [
        item.product_name,
        item.sku,
        item.brand,
        item.size,
        item.packaging,
      ])
    )
    .slice(0, limit);
};

export const filterProducts = (items: Product[], rawQuery: string) => {
  const query = normalize(rawQuery);
  if (!query) return items;

  return items.filter((product) => {
    const variants = product.variants ?? product.product_variants ?? [];
    return (
      includesQuery(query, [product.name, product.category?.name, product.hsn_code]) ||
      variants.some((variant) =>
        includesQuery(query, [
          variant.sku,
          variant.brand,
          variant.size,
          variant.packaging,
          ...((variant.barcodes ?? []).map((barcode) => barcode.barcode)),
        ])
      )
    );
  });
};

export const filterCustomers = (items: Customer[], rawQuery: string) => {
  const query = normalize(rawQuery);
  if (!query) return items;

  return items.filter((customer) =>
    includesQuery(query, [customer.name, customer.phone, customer.email])
  );
};

export const filterInventory = (items: Inventory[], rawQuery: string) => {
  const query = normalize(rawQuery);
  if (!query) return items;

  return items.filter((item) =>
    includesQuery(query, [
      item.variant?.product?.name,
      item.variant?.sku,
      item.variant?.brand,
      item.variant?.size,
      item.variant?.packaging,
    ])
  );
};
