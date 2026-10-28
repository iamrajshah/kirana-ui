import React, { useMemo, useRef, useState } from 'react';
import {
  IonAlert,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCancelInvoiceMutation,
  useFinalizeInvoiceMutation,
  useGetFinalizedDocumentQuery,
  useGetInvoiceByIdQuery,
} from '../../core/api/invoiceApi';
import { useGetTenantSettingsQuery } from '@core/api/tenantSettingsApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { PaymentModal } from '@components/PaymentModal';
import { apiErrorMessage } from '@core/services/notificationService';
import type { PaymentMode } from '@core/types';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '@utils/helpers';
import {
  getReceiptOutputFeedback,
  mapReceiptDocument,
  ReceiptDocument,
  type ReceiptOutputAction,
  useReceiptOutput,
} from './receipt';
import { openWhatsAppReceipt } from './receipt/whatsapp';
import './InvoiceDetailPage.css';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const documentQuery = useGetFinalizedDocumentQuery(id);
  const nonDocument = documentQuery.data?.data.kind === 'NON_DOCUMENT';
  const invoiceQuery = useGetInvoiceByIdQuery(id, { skip: !nonDocument });
  const { data: settingsData } = useGetTenantSettingsQuery();
  const [finalizeInvoice, { isLoading: finalizing }] = useFinalizeInvoiceMutation();
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [createPayment, { isLoading: creatingPayment }] = useCreatePaymentMutation();
  const receiptOutput = useReceiptOutput();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState<{ color: 'success' | 'danger'; message: string } | null>(null);
  const paymentIdempotencyKey = useRef(generateIdempotencyKey());

  const finalizedDocument =
    documentQuery.data?.data.kind === 'FINALIZED_DOCUMENT' ? documentQuery.data.data : null;
  const receipt = useMemo(
    () => (finalizedDocument ? mapReceiptDocument(finalizedDocument) : null),
    [finalizedDocument]
  );
  const invoice = nonDocument ? invoiceQuery.data?.data : null;
  const paperWidth = settingsData?.data.default_paper_width === 'MM58' ? '58mm' : '80mm';

  const handleOutput = async (action: ReceiptOutputAction) => {
    if (!receipt) return;
    await receiptOutput.run(action, receipt, paperWidth);
  };

  const handlePayment = async (amount: number, mode: PaymentMode, reference?: string) => {
    const customerId =
      receipt?.customer.kind === 'named' ? finalizedDocument?.customer?.id : invoice?.customer?.id;
    if (!customerId) {
      setToast({ color: 'danger', message: t('invoiceDetail.paymentRequiresCustomer') });
      return;
    }

    try {
      if (invoice?.status === 'DRAFT') await finalizeInvoice({ id }).unwrap();
      await createPayment({
        customer_id: customerId,
        invoice_id: id,
        amount,
        payment_mode: mode,
        reference_note: reference,
        idempotency_key: paymentIdempotencyKey.current,
      }).unwrap();
      paymentIdempotencyKey.current = generateIdempotencyKey();
      setShowPaymentModal(false);
      setToast({ color: 'success', message: t('invoiceDetail.paymentRecordedSuccess') });
      if (receipt) await documentQuery.refetch();
      else await invoiceQuery.refetch();
    } catch (error: unknown) {
      setToast({
        color: 'danger',
        message: apiErrorMessage(error, t('invoiceDetail.paymentFailed')),
      });
      throw error;
    }
  };

  const handleCancelDraft = async () => {
    try {
      await cancelInvoice({ id, reason: cancelReason || 'Cancelled by user' }).unwrap();
      setShowCancelAlert(false);
      setCancelReason('');
      setToast({ color: 'success', message: t('invoiceDetail.invoiceCancelledSuccess') });
      await invoiceQuery.refetch();
    } catch (error: unknown) {
      setToast({
        color: 'danger',
        message: apiErrorMessage(error, t('invoiceDetail.failedToCancelInvoice')),
      });
    }
  };

  const header = (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/invoices" />
        </IonButtons>
        <IonTitle>{t('invoiceDetail.title')}</IonTitle>
      </IonToolbar>
    </IonHeader>
  );

  if (documentQuery.isLoading || (nonDocument && invoiceQuery.isLoading)) {
    return (
      <IonPage>
        {header}
        <IonContent className="ion-padding">
          <div className="invoice-workspace-state" role="status" aria-label={t('common.loading')}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (documentQuery.error || (nonDocument && (invoiceQuery.error || !invoice))) {
    return (
      <IonPage>
        {header}
        <IonContent className="ion-padding">
          <div className="invoice-workspace-state" role="alert">
            <strong>{t('invoiceDetail.documentUnavailable')}</strong>
            <p>{t('invoiceDetail.documentUnavailableHint')}</p>
            <IonButton fill="outline" onClick={() => void documentQuery.refetch()}>
              {t('common.retry')}
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (receipt && finalizedDocument) {
    const outputFeedback = getReceiptOutputFeedback(receiptOutput.state);
    const outputMessage = outputFeedback
      ? t({
          working: 'invoiceDetail.preparingOutput',
          downloaded: 'invoiceDetail.pdfDownloaded',
          error: 'invoiceDetail.outputFailed',
        }[outputFeedback])
      : null;
    const mayCollect =
      Number(receipt.payment.remaining) > 0 &&
      receipt.customer.kind === 'named' &&
      Boolean(finalizedDocument.customer?.id) &&
      !receipt.cancellationMarker;

    return (
      <IonPage>
        {header}
        <IonContent>
          <main
            className="invoice-workspace"
            aria-busy={documentQuery.isFetching || receiptOutput.isBusy}
          >
            <section className="invoice-workspace-hero" aria-labelledby="invoice-workspace-heading">
              <div>
                <p className="invoice-workspace-eyebrow">{t('invoiceDetail.customerDocument')}</p>
                <h1 id="invoice-workspace-heading">{receipt.invoiceNumber}</h1>
                <p>{t('invoiceDetail.frozenSaleHint')}</p>
              </div>
              <IonBadge
                className={`invoice-workspace-status invoice-workspace-status--${receipt.payment.status.toLowerCase()}`}
              >
                {receipt.payment.statusLabel}
              </IonBadge>
            </section>

            {receipt.cancellationMarker && (
              <div className="invoice-workspace-cancelled" role="status">
                {receipt.cancellationMarker}
              </div>
            )}
            {receipt.isLegacy && (
              <div className="invoice-workspace-legacy" role="note">
                <strong>{t('invoiceDetail.legacyReceipt')}</strong>
                <span>{t('invoiceDetail.legacyReceiptHint')}</span>
              </div>
            )}

            <div
              className="invoice-workspace-actions"
              aria-label={t('invoiceDetail.outputActions')}
            >
              <IonButton disabled={receiptOutput.isBusy} onClick={() => void handleOutput('print')}>
                {t('invoiceDetail.print')}
              </IonButton>
              <IonButton
                disabled={receiptOutput.isBusy}
                fill="outline"
                onClick={() => void handleOutput('pdf')}
              >
                {t('invoiceDetail.pdf')}
              </IonButton>
              <IonButton
                disabled={receiptOutput.isBusy}
                fill="outline"
                onClick={() => void handleOutput('share')}
              >
                {t('invoiceDetail.share')}
              </IonButton>
              {receipt.customer.kind === 'named' && receipt.customer.phone && (
                <IonButton
                  color="success"
                  fill="outline"
                  onClick={() => {
                    if (!openWhatsAppReceipt(receipt)) {
                      setToast({ color: 'danger', message: t('invoiceDetail.whatsAppInvalidPhone') });
                    }
                  }}
                >
                  {Number(receipt.payment.remaining) > 0
                    ? t('invoiceDetail.whatsAppReminder')
                    : t('invoiceDetail.whatsAppReceipt')}
                </IonButton>
              )}
            </div>
            {outputMessage && (
              <p
                className={
                  receiptOutput.state.phase === 'recoverable-error'
                    ? 'invoice-workspace-output invoice-workspace-output--error'
                    : 'invoice-workspace-output'
                }
                role={receiptOutput.state.phase === 'recoverable-error' ? 'alert' : 'status'}
              >
                {outputMessage}
              </p>
            )}

            <div className="invoice-workspace-grid">
              <section
                className="invoice-workspace-document"
                aria-label={t('invoiceDetail.frozenSale')}
              >
                <ReceiptDocument receipt={receipt} />
              </section>

              <aside className="invoice-payment-panel" aria-labelledby="current-payment-heading">
                <div className="invoice-payment-panel__header">
                  <div>
                    <p>{t('invoiceDetail.livePayment')}</p>
                    <h2 id="current-payment-heading">
                      {t('invoiceDetail.currentPaymentPosition')}
                    </h2>
                  </div>
                  <IonBadge>{receipt.payment.statusLabel}</IonBadge>
                </div>
                <dl className="invoice-payment-totals">
                  <div>
                    <dt>{t('invoiceDetail.totalAmount')}</dt>
                    <dd>{formatCurrency(Number(receipt.totals.total))}</dd>
                  </div>
                  <div>
                    <dt>{t('invoiceDetail.paid')}</dt>
                    <dd>{formatCurrency(Number(receipt.payment.paid))}</dd>
                  </div>
                  <div className="invoice-payment-totals__due">
                    <dt>{t('invoiceDetail.balance')}</dt>
                    <dd>{formatCurrency(Number(receipt.payment.remaining))}</dd>
                  </div>
                </dl>
                <dl className="invoice-payment-times">
                  <div>
                    <dt>{t('invoiceDetail.lastPayment')}</dt>
                    <dd>
                      {receipt.payment.lastAllocationAt
                        ? formatDateTime(receipt.payment.lastAllocationAt)
                        : t('invoiceDetail.noPayments')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('invoiceDetail.projectionTime')}</dt>
                    <dd>{formatDateTime(receipt.payment.asOf)}</dd>
                  </div>
                </dl>
                <h3>{t('invoiceDetail.allocationHistory')}</h3>
                {receipt.payment.allocations.length > 0 ? (
                  <ol className="invoice-allocation-list">
                    {receipt.payment.allocations.map((allocation, index) => (
                      <li key={allocation.payment_id ?? `${allocation.created_at}-${index}`}>
                        <div>
                          <strong>{allocation.payment_mode ?? t('invoiceDetail.payment')}</strong>
                          <span>
                            {allocation.created_at ? formatDateTime(allocation.created_at) : '—'}
                          </span>
                        </div>
                        <b>{formatCurrency(Number(allocation.amount))}</b>
                        {allocation.reference_note && <small>{allocation.reference_note}</small>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="invoice-payment-empty">{t('invoiceDetail.noPayments')}</p>
                )}
                {mayCollect && (
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    {t('invoiceDetail.addPayment')}
                  </IonButton>
                )}
              </aside>
            </div>

            {mayCollect && (
              <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onPayment={handlePayment}
                invoiceAmount={Number(receipt.totals.total)}
                paidAmount={Number(receipt.payment.paid)}
                isLoading={creatingPayment}
              />
            )}
          </main>
          <IonToast
            isOpen={Boolean(toast)}
            onDidDismiss={() => setToast(null)}
            message={toast?.message}
            duration={toast?.color === 'danger' ? 3000 : 2000}
            color={toast?.color}
            position="top"
          />
        </IonContent>
      </IonPage>
    );
  }

  if (!invoice) return null;

  return (
    <IonPage>
      {header}
      <IonContent className="ion-padding">
        <main className="invoice-draft-workspace">
          <IonCard>
            <IonCardContent>
              <p className="invoice-workspace-eyebrow">{t('invoiceDetail.notIssued')}</p>
              <h1>{invoice.invoice_number}</h1>
              <p>{t('invoiceDetail.draftHint')}</p>
              <strong>{formatCurrency(Number(invoice.total_amount || 0))}</strong>
            </IonCardContent>
          </IonCard>
          {invoice.status === 'DRAFT' && invoice.held_at ? (
            <IonButton
              expand="block"
              onClick={() => history.push(`/billing?held=${encodeURIComponent(invoice.id)}`)}
            >
              {t('invoiceDetail.openHeldBill')}
            </IonButton>
          ) : invoice.status === 'DRAFT' ? (
            <>
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => history.push(`/billing?edit=${invoice.id}`)}
              >
                {t('invoiceDetail.editDraft')}
              </IonButton>
              {settingsData?.data.document_mode !== 'GST_TAX_INVOICE' && (
                <IonButton
                  expand="block"
                  disabled={finalizing}
                  onClick={() => setShowPaymentModal(true)}
                >
                  {t('invoiceDetail.finalizeAndCollectPayment')}
                </IonButton>
              )}
              <IonButton
                expand="block"
                color="danger"
                fill="outline"
                disabled={cancelling}
                onClick={() => setShowCancelAlert(true)}
              >
                {t('invoiceDetail.cancelInvoice')}
              </IonButton>
            </>
          ) : null}
        </main>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPayment={handlePayment}
          invoiceAmount={Number(invoice.total_amount || 0)}
          paidAmount={Number(invoice.paid_amount || 0)}
          isLoading={creatingPayment || finalizing}
        />
        <IonAlert
          isOpen={showCancelAlert}
          onDidDismiss={() => {
            setShowCancelAlert(false);
            setCancelReason('');
          }}
          header={t('invoiceDetail.cancelInvoiceTitle')}
          message={t('invoiceDetail.cancelInvoiceMessage')}
          inputs={[
            {
              name: 'reason',
              type: 'textarea',
              placeholder: t('invoiceDetail.cancelReasonPlaceholder'),
              value: cancelReason,
            },
          ]}
          buttons={[
            { text: t('invoiceDetail.no'), role: 'cancel' },
            {
              text: t('invoiceDetail.yesCancelInvoice'),
              role: 'destructive',
              handler: (data) => {
                setCancelReason(data.reason || '');
                void handleCancelDraft();
              },
            },
          ]}
        />
        <IonToast
          isOpen={Boolean(toast)}
          onDidDismiss={() => setToast(null)}
          message={toast?.message}
          duration={toast?.color === 'danger' ? 3000 : 2000}
          color={toast?.color}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default InvoiceDetailPage;
