import React from 'react';
import type { ReceiptLabels, ReceiptViewModel } from './types';
import { defaultReceiptLabels } from './receiptLabels';
import './receipt.css';

const money = (value: string) => `₹${value}`;
const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export interface ReceiptDocumentProps {
  receipt: ReceiptViewModel;
  labels?: Partial<ReceiptLabels>;
  className?: string;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  receipt,
  labels: labelOverrides,
  className = '',
}) => {
  const labels = { ...defaultReceiptLabels, ...receipt.labels, ...labelOverrides };
  const isGst = receipt.mode === 'GST_TAX_INVOICE';

  return (
    <article
      className={`sale-receipt sale-receipt--${isGst ? 'gst' : 'simple'} sale-receipt--${receipt.branding.template.toLowerCase()} ${className}`.trim()}
      style={{ '--receipt-brand': receipt.branding.brandColor } as React.CSSProperties}
      aria-label={`${receipt.title} ${receipt.invoiceNumber}`}
    >
      {receipt.demoMarker && (
        <div className="sale-receipt__demo" role="status">{receipt.demoMarker}</div>
      )}
      {receipt.cancellationMarker && (
        <div className="sale-receipt__cancelled" role="status">
          {receipt.cancellationMarker}
        </div>
      )}
      <header className="sale-receipt__header">
        <div>
          {receipt.branding.logoUrl && <img className="sale-receipt__logo" src={receipt.branding.logoUrl} alt="" />}
          <h1>{receipt.supplier.name}</h1>
          {receipt.supplier.address && <p>{receipt.supplier.address}</p>}
          {receipt.supplier.phone && <p>{receipt.supplier.phone}</p>}
          {isGst && receipt.supplier.gstin && <p>{labels.gstin}: {receipt.supplier.gstin}</p>}
        </div>
        <div className="sale-receipt__identity">
          <strong>{receipt.title}</strong>
          <span>{labels.invoice}: {receipt.invoiceNumber}</span>
          <span>{labels.date}: {dateTime(receipt.issuedAt)}</span>
          {receipt.isLegacy && <span className="sale-receipt__legacy">{labels.legacy}</span>}
        </div>
      </header>

      <section className="sale-receipt__party" aria-label={labels.customer}>
        <strong>{labels.customer}</strong>
        {receipt.customer.kind === 'walk-in' ? (
          <span>{receipt.customer.label}</span>
        ) : (
          <div>
            <span>{receipt.customer.name}</span>
            {receipt.customer.address && <span>{receipt.customer.address}</span>}
            {receipt.customer.phone && <span>{receipt.customer.phone}</span>}
            {isGst && receipt.customer.gstin && <span>{labels.gstin}: {receipt.customer.gstin}</span>}
          </div>
        )}
        {isGst && receipt.placeOfSupply && (
          <span>{labels.placeOfSupply}: {receipt.placeOfSupply.name ?? ''}{receipt.placeOfSupply.stateCode ? ` (${receipt.placeOfSupply.stateCode})` : ''}</span>
        )}
      </section>

      <div className="sale-receipt__items" role="table" aria-label={labels.saleItems}>
        <div className="sale-receipt__item sale-receipt__item--head" role="row">
          <span role="columnheader">{labels.item}</span>
          {isGst && <span role="columnheader">{labels.hsn}</span>}
          <span role="columnheader">{labels.qty}</span>
          <span role="columnheader">{labels.rate}</span>
          {isGst && <span role="columnheader">{labels.tax}</span>}
          <span role="columnheader">{labels.amount}</span>
        </div>
        {receipt.items.map((item) => (
          <div className="sale-receipt__item" role="row" key={item.key}>
            <span role="cell"><b>{item.name}</b>{item.sku && <small>{item.sku}</small>}</span>
            {isGst && <span role="cell">{item.hsnCode ?? '—'}</span>}
            <span role="cell">{item.quantity}{item.unitLabel || item.uqcCode ? ` ${item.unitLabel || item.uqcCode}` : ''}</span>
            <span role="cell">{money(item.unitPrice)}</span>
            {isGst && <span role="cell">{item.gstRate ?? '0.00'}%</span>}
            <span role="cell">{money(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <section className="sale-receipt__summary" aria-label={labels.billTotals}>
        <dl>
          <div><dt>{labels.subtotal}</dt><dd>{money(receipt.totals.subtotal)}</dd></div>
          {Number(receipt.totals.discount) > 0 && <div><dt>{labels.discount}</dt><dd>−{money(receipt.totals.discount)}</dd></div>}
          {isGst && <div><dt>{labels.gst}</dt><dd>{money(receipt.totals.gst)}</dd></div>}
          <div className="sale-receipt__grand-total"><dt>{labels.total}</dt><dd>{money(receipt.totals.total)}</dd></div>
          {receipt.totals.mrpSavings && Number(receipt.totals.mrpSavings) > 0 && (
            <div className="sale-receipt__savings">
              <dt>{labels.savings}</dt>
              <dd>{money(receipt.totals.mrpSavings)}</dd>
            </div>
          )}
        </dl>
        <div className={`sale-receipt__payment sale-receipt__payment--${receipt.payment.status.toLowerCase()}`}>
          <strong>{receipt.payment.statusLabel}</strong>
          <span>{labels.paid}: {money(receipt.payment.paid)}</span>
          <span>{labels.remaining}: {money(receipt.payment.remaining)}</span>
          {receipt.payment.modes.length > 0 && <span>{labels.paymentMode}: {receipt.payment.modes.join(', ')}</span>}
          <small>{labels.paymentAsOf}: {dateTime(receipt.payment.asOf)}</small>
        </div>
      </section>

      <footer className="sale-receipt__footer">
        {receipt.footer && <p>{receipt.footer}</p>}
        {isGst && receipt.supplier.signatory && <p>{labels.authorizedSignatory}: {receipt.supplier.signatory}</p>}
      </footer>
    </article>
  );
};
