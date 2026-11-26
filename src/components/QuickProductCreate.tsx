import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateProductMutation, type BillingSearchVariant } from '@core/api/productApi';
import type { Category } from '@core/api/categoryApi';
import { CategoryPicker } from './CategoryPicker';
import { advanceOnEnter } from './keyboardNavigation';
import { apiErrorMessage } from '@core/services/notificationService';

export function QuickProductCreate({
  initialName,
  onCreated,
  onClose,
}: {
  initialName: string;
  onCreated: (variant: BillingSearchVariant) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName.trim());
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('0');
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [create, { isLoading }] = useCreateProductMutation();
  const valid =
    name.trim() &&
    price.trim() &&
    Number.isFinite(Number(price)) &&
    Number(price) > 0 &&
    (cost === '' || (Number.isFinite(Number(cost)) && Number(cost) >= 0)) &&
    stock.trim() &&
    Number.isInteger(Number(stock)) &&
    Number(stock) >= 0;
  return (
    <form
      className="mt-3 space-y-3 rounded-lg border p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || isLoading) return;
        try {
          const result = await create({
            name: name.trim(),
            category_id: category ? Number(category.id) : null,
            hsn_code: category?.default_hsn_code ?? null,
            initial_variant: {
              price: Number(price),
              selling_price: Number(price),
              purchase_price: cost === '' ? undefined : Number(cost),
              opening_quantity: Number(stock),
              gst_percent: category?.default_gst_percent ?? null,
            },
          }).unwrap();
          const variant = result.data.variants?.[0];
          if (variant)
            onCreated({
              id: String(variant.id),
              product_id: String(result.data.id),
              product_name: result.data.name,
              price: Number(price),
              sku: variant.sku ?? '',
              available_quantity: Number(stock),
              low_stock_threshold: 0,
            });
          onClose();
        } catch (cause) {
          setError(apiErrorMessage(cause, t('products.failedToCreateProduct')));
        }
      }}
    >
      <label className="block">
        {t('products.productNameLabel')}
        <input
          autoFocus
          className="block w-full border rounded p-3"
          required
          maxLength={150}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={advanceOnEnter}
        />
      </label>
      <CategoryPicker
        value={category ? String(category.id) : ''}
        onSelect={setCategory}
        canCreate
      />
      {[
        {
          label: t('billing.unknownBarcode.sellingPrice'),
          value: price,
          change: setPrice,
          step: '0.01',
        },
        { label: t('products.purchaseCostLabel'), value: cost, change: setCost, step: '0.01' },
        {
          label: t('billing.unknownBarcode.openingStock'),
          value: stock,
          change: setStock,
          step: '1',
        },
      ].map((field) => (
        <label key={field.label} className="block">
          {field.label}
          <input
            className="block w-full border rounded p-3"
            type="number"
            min={0}
            step={field.step}
            value={field.value}
            onChange={(event) => field.change(event.target.value)}
            onKeyDown={advanceOnEnter}
          />
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      <button
        type="submit"
        disabled={!valid || isLoading}
        className="min-h-touch border rounded px-4"
      >
        {t('common.save')}
      </button>
      <button type="button" disabled={isLoading} className="min-h-touch px-4" onClick={onClose}>
        {t('common.cancel')}
      </button>
    </form>
  );
}
