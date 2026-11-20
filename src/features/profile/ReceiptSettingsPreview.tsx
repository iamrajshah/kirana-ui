import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateTenantDocumentSettings } from '@core/types';
import { sampleReceipt } from './receiptSettingsPreview.logic';
import { ReceiptDocument } from '../invoices/receipt/ReceiptDocument';

export const ReceiptSettingsPreview: React.FC<{ form: UpdateTenantDocumentSettings }> = ({
  form,
}) => {
  const { t } = useTranslation();
  const [long, setLong] = useState(false);
  const [a4, setA4] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const receipt = useMemo(
    () =>
      sampleReceipt(
        form,
        long ? 30 : 2,
        t('documentSettings.sampleProduct'),
        t('documentSettings.sampleCustomer'),
        t('documentSettings.previewOnly')
      ),
    [form, long, t]
  );
  useEffect(() => {
    generation.current += 1;
    setPdfUrl(null);
    setBusy(false);
    setError(false);
    return () => {
      generation.current += 1;
    };
  }, [receipt, a4]);
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl]
  );
  const previewPdf = async () => {
    const version = ++generation.current;
    setBusy(true);
    setError(false);
    try {
      const { renderReceiptPdf } = await import('../invoices/receipt/pdfRenderer');
      const blob = await renderReceiptPdf(
        receipt,
        a4 ? undefined : form.default_paper_width === 'MM58' ? '58mm' : '80mm'
      );
      if (generation.current === version) setPdfUrl(URL.createObjectURL(blob));
    } catch {
      if (generation.current === version) setError(true);
    } finally {
      if (generation.current === version) setBusy(false);
    }
  };
  return (
    <section className="receipt-settings-preview" aria-label={t('documentSettings.previewTitle')}>
      <h3>{t('documentSettings.previewTitle')}</h3>
      <p>{t('documentSettings.previewOnly')}</p>
      <label>
        <input type="checkbox" checked={long} onChange={(e) => setLong(e.target.checked)} />{' '}
        {t('documentSettings.longSample')}
      </label>
      <label>
        <input type="checkbox" checked={a4} onChange={(e) => setA4(e.target.checked)} /> A4
      </label>
      <button
        type="button"
        className="min-h-touch"
        disabled={busy}
        onClick={() => void previewPdf()}
      >
        {busy ? t('common.loading') : t('documentSettings.previewPdf')}
      </button>
      {error && <p role="alert">{t('documentSettings.previewFailed')}</p>}
      {pdfUrl && (
        <iframe
          title={t('documentSettings.previewPdf')}
          src={pdfUrl}
          style={{ width: '100%', height: 500, border: 0 }}
        />
      )}
      <div style={{ maxHeight: 480, overflow: 'auto' }}>
        <ReceiptDocument receipt={receipt} />
      </div>
    </section>
  );
};
