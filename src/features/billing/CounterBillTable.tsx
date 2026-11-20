import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@utils/helpers';
import type { BillingCartItem } from './billing.logic';
import './counter-bill-table.css';

export const CounterBillTable: React.FC<{
  items: BillingCartItem[];
  stock: Map<string, number>;
  disabled: boolean;
  onQuantity: (id: string, quantity: number) => void;
  onPrice: (id: string, price: number) => void;
}> = ({ items, stock, disabled, onQuantity, onPrice }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const rows = useRef<HTMLTableSectionElement>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      `${item.product_name} ${item.sku}`.toLocaleLowerCase().includes(normalized)
    );
  useEffect(() => {
    // Only a new line scrolls the grid; editing a quantity never moves focus.
    if (!normalized) rows.current?.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
  }, [items.length, normalized]);
  const finishEdit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('counter-barcode-input')?.focus({ preventScroll: true });
    }
  };

  return (
    <section className="counter-bill" aria-label={t('billing.cartItems')}>
      <label className="counter-bill-filter">
        <span>{t('billing.findInBill')}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <span>{t('billing.billRows', { shown: visible.length, total: items.length })}</span>
      </label>
      <div
        className="counter-bill-scroll"
        tabIndex={0}
        role="region"
        aria-label={t('billing.cartItems')}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t('billing.productColumn')}</th>
              <th scope="col">{t('billing.qty')}</th>
              <th scope="col">{t('billing.priceLabel')}</th>
              <th scope="col">{t('billing.amountColumn')}</th>
              <th scope="col">
                <span className="sr-only">{t('billing.removeFromCart')}</span>
              </th>
            </tr>
          </thead>
          <tbody ref={rows}>
            {visible.map(({ item, index }) => {
              const available = stock.get(item.variant_id) ?? item.available_quantity;
              const atLimit = available !== undefined && item.quantity >= available;
              const exceeded = available !== undefined && item.quantity > available;
              return (
                <tr key={item.variant_id} className={exceeded ? 'counter-row-error' : ''}>
                  <td className="counter-row-number">{index + 1}</td>
                  <th scope="row" className="counter-product">
                    <strong>{item.product_name}</strong>
                    <small>{item.sku}</small>
                  </th>
                  <td className="counter-quantity">
                    <span className="counter-mobile-label">{t('billing.qty')}</span>
                    <div className="counter-quantity-control">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={t('billing.decreaseQuantity', { product: item.product_name })}
                        onClick={() => onQuantity(item.variant_id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={available}
                        disabled={disabled}
                        aria-label={t('billing.quantityFor', { product: item.product_name })}
                        value={item.quantity}
                        onKeyDown={finishEdit}
                        onChange={(event) =>
                          onQuantity(item.variant_id, Math.max(1, Number(event.target.value) || 1))
                        }
                      />
                      <button
                        type="button"
                        disabled={disabled || atLimit}
                        aria-label={t('billing.increaseQuantity', { product: item.product_name })}
                        onClick={() => onQuantity(item.variant_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    {available !== undefined && (
                      <small role={atLimit ? 'status' : undefined}>
                        {t(atLimit ? 'billing.stockLimit' : 'billing.availableStock', {
                          count: available,
                        })}
                      </small>
                    )}
                    {exceeded && (
                      <small role="alert">
                        {t('billing.reduceQuantityToAvailable', { count: available })}
                      </small>
                    )}
                  </td>
                  <td className="counter-price">
                    <label>
                      <span className="counter-mobile-label">{t('billing.priceLabel')}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={disabled}
                        aria-label={t('billing.priceFor', { product: item.product_name })}
                        value={item.unit_price}
                        onKeyDown={finishEdit}
                        onChange={(event) =>
                          onPrice(item.variant_id, Number(event.target.value) || 0)
                        }
                      />
                    </label>
                  </td>
                  <td className="counter-amount">
                    <span className="counter-mobile-label">{t('billing.amountColumn')}</span>
                    <strong>{formatCurrency(item.quantity * item.unit_price)}</strong>
                  </td>
                  <td className="counter-remove">
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={t('billing.removeFromCart')}
                      onClick={() => onQuantity(item.variant_id, 0)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="counter-no-match" role="status">
            {t('billing.noBillMatches')}
          </p>
        )}
      </div>
    </section>
  );
};
