import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/react';
import { downloadOutline, refreshOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { ROUTES } from '@core/constants';
import {
  type GstDownloadReport,
  type GstPurchaseRegisterRow,
  type GstSalesRegisterRow,
  useDownloadGstReportMutation,
  useGetGstHsnSummaryQuery,
  useGetGstPurchaseRegisterQuery,
  useGetGstSalesRegisterQuery,
  useGetGstSummaryQuery,
} from '@core/api/gstReportsApi';
import { useGetFirmsQuery } from '@core/api/firmApi';
import { formatCurrency, formatDate, formatNumber } from '@utils/helpers';
import { apiErrorMessage } from '@core/services/notificationService';
import { currentLocalDate, currentLocalMonthRange } from './gstReportDates';
import { exportGstCsv } from './gstReportExport';
import './GstReportsPage.css';

type GstView = 'SUMMARY' | 'SALES' | 'PURCHASES' | 'HSN';

const GstReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const initialRange = useMemo(() => currentLocalMonthRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [firmId, setFirmId] = useState('');
  const [view, setView] = useState<GstView>('SUMMARY');
  const [downloadError, setDownloadError] = useState('');
  // Historical statutory reports remain available after a firm is deactivated.
  // Posting screens intentionally keep using `{ active: true }`.
  const { data: firmsResponse } = useGetFirmsQuery();
  const firms = useMemo(() => firmsResponse?.data.firms ?? [], [firmsResponse?.data.firms]);

  useEffect(() => {
    if (firmId || firms.length === 0) return;
    setFirmId(firms.find((firm) => firm.is_default_sales)?.id ?? firms[0].id);
  }, [firmId, firms]);

  const params = { from, to, firmId };
  const skip = !from || !to || from > to || !firmId;
  const summary = useGetGstSummaryQuery(params, { skip });
  const sales = useGetGstSalesRegisterQuery(params, { skip: skip || view !== 'SALES' });
  const purchases = useGetGstPurchaseRegisterQuery(params, {
    skip: skip || view !== 'PURCHASES',
  });
  const hsn = useGetGstHsnSummaryQuery(params, { skip: skip || view !== 'HSN' });
  const [downloadReport, { isLoading: isDownloading }] = useDownloadGstReportMutation();

  const activeQuery =
    view === 'SUMMARY'
      ? summary
      : view === 'SALES'
        ? sales
        : view === 'PURCHASES'
          ? purchases
          : hsn;
  const activeData = activeQuery.data?.data;
  const activeWarnings = 'warnings' in (activeData ?? {}) ? (activeData?.warnings ?? []) : [];
  const activeDisclaimer = activeData?.disclaimer ?? summary.data?.data.disclaimer;

  const refresh = () => {
    if (skip) return;
    void summary.refetch();
    if (view === 'SALES') void sales.refetch();
    if (view === 'PURCHASES') void purchases.refetch();
    if (view === 'HSN') void hsn.refetch();
  };

  const download = async (report: GstDownloadReport) => {
    if (skip) return;
    setDownloadError('');
    try {
      const blob = await downloadReport({ report, params }).unwrap();
      await exportGstCsv(
        blob,
        `kirana-gst-${report}-${from}-to-${to}.csv`,
        t('gstReports.exportTitle', { report: t(`gstReports.tabs.${view}`) })
      );
    } catch (cause) {
      setDownloadError(apiErrorMessage(cause, t('gstReports.downloadFailed'), true));
    }
  };

  const downloadButton = (report: GstDownloadReport) => (
    <IonButton
      fill="outline"
      size="small"
      disabled={isDownloading || skip}
      onClick={() => void download(report)}
    >
      <IonIcon slot="start" icon={downloadOutline} />
      {t('gstReports.downloadCsv')}
    </IonButton>
  );

  const renderSalesRegister = (rows: GstSalesRegisterRow[]) => (
    <section className="gst-register-section">
      <div className="gst-section-heading">
        <span>{t('gstReports.records', { count: rows.length })}</span>
        {downloadButton('sales-register')}
      </div>
      {rows.length === 0 ? (
        <div className="workspace-state">{t('gstReports.noRecords')}</div>
      ) : (
        <div className="gst-register-grid">
          {rows.map((row) => (
            <article
              key={`${row.invoiceNumber}-${row.invoiceDate}`}
              className="workspace-record gst-register-card"
            >
              <div>
                <strong>{row.invoiceNumber}</strong>
                <span>{formatDate(row.invoiceDate)}</span>
              </div>
              <div>
                <span>{row.customerName}</span>
                <small>{row.customerGstin || t('gstReports.unregistered')}</small>
              </div>
              <dl>
                <div>
                  <dt>{t('gstReports.taxableValue')}</dt>
                  <dd>{formatCurrency(row.taxableValue)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.cgst')}</dt>
                  <dd>{formatCurrency(row.cgst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.sgst')}</dt>
                  <dd>{formatCurrency(row.sgst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.igst')}</dt>
                  <dd>{formatCurrency(row.igst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.invoiceValue')}</dt>
                  <dd>{formatCurrency(row.invoiceValue)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderPurchaseRegister = (rows: GstPurchaseRegisterRow[]) => (
    <section className="gst-register-section">
      <div className="gst-section-heading">
        <span>{t('gstReports.records', { count: rows.length })}</span>
        {downloadButton('purchase-register')}
      </div>
      {rows.length === 0 ? (
        <div className="workspace-state">{t('gstReports.noRecords')}</div>
      ) : (
        <div className="gst-register-grid">
          {rows.map((row) => (
            <article
              key={`${row.invoiceNumber}-${row.invoiceDate}`}
              className="workspace-record gst-register-card"
            >
              <div>
                <strong>{row.invoiceNumber}</strong>
                <span>{formatDate(row.invoiceDate)}</span>
              </div>
              <div>
                <span>{row.supplierName}</span>
                <small>{row.supplierGstin || t('gstReports.unregistered')}</small>
              </div>
              <dl>
                <div>
                  <dt>{t('gstReports.taxableValue')}</dt>
                  <dd>{formatCurrency(row.taxableValue)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.cgst')}</dt>
                  <dd>{formatCurrency(row.inputCgst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.sgst')}</dt>
                  <dd>{formatCurrency(row.inputSgst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.igst')}</dt>
                  <dd>{formatCurrency(row.inputIgst)}</dd>
                </div>
                <div>
                  <dt>{t('gstReports.invoiceValue')}</dt>
                  <dd>{formatCurrency(row.invoiceValue)}</dd>
                </div>
              </dl>
              {!row.taxSnapshotComplete && (
                <p className="gst-row-warning">{t('gstReports.taxSnapshotIncomplete')}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <IonPage>
      <Navbar title={t('gstReports.title')} backHref={ROUTES.REPORTS} />
      <IonContent>
        <main className="workspace-page gst-page">
          <header className="workspace-header">
            <div>
              <h1>{t('gstReports.title')}</h1>
              <p>{t('gstReports.subtitle')}</p>
            </div>
            <div className="workspace-actions">
              <IonButton fill="outline" disabled={skip} onClick={refresh}>
                <IonIcon slot="start" icon={refreshOutline} />
                {t('common.refresh')}
              </IonButton>
            </div>
          </header>

          <section className="workspace-record gst-filters">
            <label>
              <span>{t('gstReports.from')}</span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              <span>{t('gstReports.to')}</span>
              <input
                type="date"
                value={to}
                min={from}
                max={currentLocalDate()}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <label>
              <span>{t('gstReports.firm')}</span>
              <IonSelect
                value={firmId}
                interface="popover"
                onIonChange={(event) => setFirmId(event.detail.value)}
              >
                {firms.map((firm) => (
                  <IonSelectOption key={firm.id} value={firm.id}>
                    {firm.display_name}
                    {!firm.is_active ? ` (${t('common.inactive')})` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </label>
          </section>
          {skip && (
            <div className="workspace-state" role="alert">
              {t(firmId ? 'gstReports.invalidPeriod' : 'gstReports.selectFirm')}
            </div>
          )}

          <nav className="gst-tabs" aria-label={t('gstReports.title')}>
            {(['SUMMARY', 'SALES', 'PURCHASES', 'HSN'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={view === item ? 'is-active' : ''}
                onClick={() => setView(item)}
              >
                {t(`gstReports.tabs.${item}`)}
              </button>
            ))}
          </nav>

          {!skip && activeQuery.isLoading ? (
            <div className="workspace-state" role="status">
              <IonSpinner /> {t('common.loading')}
            </div>
          ) : !skip && activeQuery.isError ? (
            <div className="workspace-state" role="alert">
              <p>{t('gstReports.loadFailed')}</p>
              <IonButton onClick={refresh}>{t('common.retry')}</IonButton>
            </div>
          ) : view === 'SUMMARY' && summary.data?.data ? (
            <>
              <div
                className={`gst-readiness ${summary.data.data.warnings.length > 0 ? 'needs-review' : 'ready'}`}
                role="status"
              >
                <strong>
                  {t(
                    summary.data.data.warnings.length > 0
                      ? 'gstReports.needsCaReview'
                      : 'gstReports.preparationReady'
                  )}
                </strong>
                <span>{t('gstReports.notFiled')}</span>
              </div>
              <section className="gst-summary-grid">
                <article className="workspace-record gst-summary-card">
                  <span>{t('gstReports.outwardTax')}</span>
                  <strong>{formatCurrency(summary.data.data.outward.totalTax)}</strong>
                  <small>
                    {t('gstReports.taxableValue')}:{' '}
                    {formatCurrency(summary.data.data.outward.taxableValue)}
                  </small>
                </article>
                <article className="workspace-record gst-summary-card">
                  <span>{t('gstReports.inputTax')}</span>
                  <strong>{formatCurrency(summary.data.data.inputTaxCredit.total)}</strong>
                  <small>
                    {t('gstReports.purchaseValue')}:{' '}
                    {formatCurrency(summary.data.data.inward.invoiceValue)}
                  </small>
                </article>
                <article className="workspace-record gst-summary-card gst-summary-card--liability">
                  <span>{t('gstReports.estimatedLiability')}</span>
                  <strong>{formatCurrency(summary.data.data.estimatedNetLiability.total)}</strong>
                  <small>{t('gstReports.estimateOnly')}</small>
                </article>
              </section>
              <section className="workspace-record gst-tax-breakdown">
                <div className="gst-section-heading">
                  <h2>{t('gstReports.liabilitySummary')}</h2>
                  {downloadButton('summary')}
                </div>
                <dl>
                  <div>
                    <dt>{t('gstReports.cgst')}</dt>
                    <dd>{formatCurrency(summary.data.data.estimatedNetLiability.cgst)}</dd>
                  </div>
                  <div>
                    <dt>{t('gstReports.sgst')}</dt>
                    <dd>{formatCurrency(summary.data.data.estimatedNetLiability.sgst)}</dd>
                  </div>
                  <div>
                    <dt>{t('gstReports.igst')}</dt>
                    <dd>{formatCurrency(summary.data.data.estimatedNetLiability.igst)}</dd>
                  </div>
                </dl>
              </section>
            </>
          ) : view === 'SALES' ? (
            renderSalesRegister(sales.data?.data.rows ?? [])
          ) : view === 'PURCHASES' ? (
            renderPurchaseRegister(purchases.data?.data.rows ?? [])
          ) : view === 'HSN' ? (
            <section className="gst-register-section">
              <div className="gst-section-heading">
                <span>{t('gstReports.records', { count: hsn.data?.data.rows.length ?? 0 })}</span>
                {downloadButton('hsn-summary')}
              </div>
              <div className="gst-register-grid">
                {(hsn.data?.data.rows ?? []).map((row) => (
                  <article
                    key={`${row.hsnCode}-${row.gstRate}`}
                    className="workspace-record gst-register-card"
                  >
                    <div>
                      <strong>{row.hsnCode}</strong>
                      <span>
                        {t('gstReports.gstRateLabel', {
                          value: formatNumber(row.gstRate),
                        })}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>{t('gstReports.saleQuantity')}</dt>
                        <dd>{formatNumber(row.saleQuantity)}</dd>
                      </div>
                      <div>
                        <dt>{t('gstReports.saleTaxableValue')}</dt>
                        <dd>{formatCurrency(row.saleTaxableValue)}</dd>
                      </div>
                      <div>
                        <dt>{t('gstReports.outputTax')}</dt>
                        <dd>{formatCurrency(row.outputTax)}</dd>
                      </div>
                      <div>
                        <dt>{t('gstReports.purchaseQuantity')}</dt>
                        <dd>{formatNumber(row.purchaseQuantity)}</dd>
                      </div>
                      <div>
                        <dt>{t('gstReports.purchaseTaxableValue')}</dt>
                        <dd>{formatCurrency(row.purchaseTaxableValue)}</dd>
                      </div>
                      <div>
                        <dt>{t('gstReports.inputTax')}</dt>
                        <dd>{formatCurrency(row.inputTax)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeWarnings.length > 0 && (
            <aside className="gst-warnings" role="alert">
              <strong>{t('gstReports.needsCaReview')}</strong>
              <ul>
                {activeWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </aside>
          )}
          {downloadError && (
            <div className="workspace-state" role="alert">
              {downloadError}
            </div>
          )}
          <aside className="gst-disclaimer">
            <strong>{t('gstReports.disclaimerTitle')}</strong>
            <p>{activeDisclaimer || t('gstReports.disclaimer')}</p>
          </aside>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default GstReportsPage;
