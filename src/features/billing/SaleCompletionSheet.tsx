import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReceiptDocument,
  type ReceiptOutputAction,
  type ReceiptViewModel,
} from '../invoices/receipt';
import { formatCurrency } from '@utils/helpers';
import './SaleCompletionSheet.css';

interface SaleCompletionSheetProps {
  invoiceId: string;
  receipt: ReceiptViewModel | null;
  isLoading: boolean;
  isError: boolean;
  outputBusy?: boolean;
  outputMessage?: string | null;
  onRetry: () => void;
  onViewBill: () => void;
  onNewSale: () => void;
  onOutput: (action: ReceiptOutputAction) => void;
}

export const SaleCompletionSheet: React.FC<SaleCompletionSheetProps> = ({
  invoiceId,
  receipt,
  isLoading,
  isError,
  outputBusy = false,
  outputMessage,
  onRetry,
  onViewBill,
  onNewSale,
  onOutput,
}) => {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <main className="sale-completion" aria-busy={isLoading || outputBusy}>
      <section className="sale-completion__card" aria-labelledby="sale-completion-title">
        <div className="sale-completion__check" aria-hidden="true">
          ✓
        </div>
        <p className="sale-completion__eyebrow">{t('billing.completion.saved')}</p>
        <h1 id="sale-completion-title" ref={titleRef} tabIndex={-1}>
          {t('billing.completion.title')}
        </h1>

        {isLoading && (
          <p role="status" className="sale-completion__notice">
            {t('billing.completion.loadingBill')}
          </p>
        )}

        {isError && !receipt && (
          <div role="alert" className="sale-completion__recovery">
            <strong>{t('billing.completion.temporarilyUnavailable')}</strong>
            <span>{t('billing.completion.savedInvoice', { invoiceId })}</span>
          </div>
        )}

        {receipt && (
          <>
            <div className="sale-completion__identity">
              <span>{receipt.invoiceNumber}</span>
              <strong>{formatCurrency(Number(receipt.totals.total))}</strong>
            </div>
            <div
              role="status"
              className={`sale-completion__payment sale-completion__payment--${receipt.payment.status.toLowerCase()}`}
            >
              <strong>{receipt.payment.statusLabel}</strong>
              <span>
                {t('billing.completion.paid')}: {formatCurrency(Number(receipt.payment.paid))}
              </span>
              <span>
                {t('billing.completion.due')}: {formatCurrency(Number(receipt.payment.remaining))}
              </span>
            </div>
            <div className="sale-completion__print-receipt" aria-hidden="true">
              <ReceiptDocument receipt={receipt} />
            </div>
          </>
        )}

        {outputMessage && (
          <p role="status" className="sale-completion__notice">
            {outputMessage}
          </p>
        )}

        <div
          className="sale-completion__actions"
          aria-label={t('billing.completion.handoffActions')}
        >
          {receipt ? (
            <>
              <button type="button" disabled={outputBusy} onClick={() => onOutput('print')}>
                {t('billing.completion.print')}
              </button>
              <button type="button" disabled={outputBusy} onClick={() => onOutput('pdf')}>
                {t('billing.completion.pdf')}
              </button>
              <button type="button" disabled={outputBusy} onClick={() => onOutput('share')}>
                {t('billing.completion.share')}
              </button>
            </>
          ) : (
            <button type="button" disabled={isLoading} onClick={onRetry}>
              {t('billing.completion.retryBill')}
            </button>
          )}
          <button type="button" onClick={onViewBill}>
            {t('billing.completion.viewBill')}
          </button>
          <button
            type="button"
            className="sale-completion__new"
            disabled={outputBusy}
            onClick={onNewSale}
          >
            {t('billing.completion.newSale')}
          </button>
        </div>
      </section>
    </main>
  );
};
