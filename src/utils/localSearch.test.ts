import { describe, expect, it } from 'vitest';
import {
  filterBillingCatalog,
  filterCustomers,
  filterInventory,
  filterProducts,
} from './localSearch';

describe('local catalog search', () => {
  it('finds billing variants by product, SKU, brand, size, or packaging', () => {
    const items = [
      {
        id: 'variant-1',
        product_id: 'product-1',
        product_name: 'India Gate Rice',
        brand: 'India Gate',
        size: '5 kg',
        packaging: 'PACKET' as const,
        price: 650,
        sku: 'RICE-5KG',
        available_quantity: 10,
        low_stock_threshold: 2,
      },
    ];

    expect(filterBillingCatalog(items, 'rice')).toEqual(items);
    expect(filterBillingCatalog(items, '5 kg')).toEqual(items);
    expect(filterBillingCatalog(items, 'packet')).toEqual(items);
    expect(filterBillingCatalog(items, 'r')).toEqual([]);
  });

  it('filters product, customer, and inventory indexes without another request', () => {
    const products = [
      {
        id: 'product-1',
        name: 'Loose Sugar',
        category_id: 'category-1',
        is_active: true,
        variants: [
          {
            id: 'variant-1',
            product_id: 'product-1',
            sku: 'SUGAR-LOOSE',
            price: 45,
            is_active: true,
            brand: 'Store Packed',
            barcodes: [{ id: 'barcode-1', barcode: '202300000001', is_active: true }],
          },
        ],
      },
    ];
    const customers = [
      {
        id: 'customer-1',
        name: 'Asha Stores',
        phone: '9876543210',
        email: 'asha@example.com',
        credit_balance: 100,
        is_active: true,
        created_at: '2026-10-22',
      },
    ];
    const inventory = [
      {
        variant_id: 'variant-1',
        quantity: 5,
        low_stock_threshold: 2,
        is_low_stock: false,
        variant: {
          id: 'variant-1',
          product_id: 'product-1',
          sku: 'SUGAR-LOOSE',
          price: 45,
          is_active: true,
          brand: 'Store Packed',
          product: products[0],
        },
      },
    ];

    expect(filterProducts(products, '202300000001')).toEqual(products);
    expect(filterCustomers(customers, '9876')).toEqual(customers);
    expect(filterInventory(inventory, 'store packed')).toEqual(inventory);
    expect(filterInventory(inventory, 'salt')).toEqual([]);
  });
});
