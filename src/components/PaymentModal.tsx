import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';
import type { PaymentMode } from '@core/types';
import type { SplitPaymentTender } from '@core/api/paymentApi';
import { useTranslation } from 'react-i18next';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayment: (amount: number, mode: PaymentMode, reference?: string) => void | Promise<void>;
  onSplitPayment?: (
    tenders: SplitPaymentTender[]
  ) => void | SplitPaymentSubmissionOutcome | Promise<void | SplitPaymentSubmissionOutcome>;
  initialSplitTenders?: SplitPaymentTender[];
  invoiceAmount: number;
  previousBalance?: number;
  paidAmount?: number;
  isLoading?: boolean;
  allowPartial?: boolean;
}

export type SplitPaymentSubmissionOutcome = 'completed' | 'rejected' | 'uncertain';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayment,
  onSplitPayment,
  initialSplitTenders,
  invoiceAmount,
  previousBalance = 0,
  paidAmount = 0,
  isLoading = false,
  allowPartial = true,
}) => {
  const { t } = useTranslation();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [amount, setAmount] = useState<string>('');
  const [reference, setReference] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'split'>(
    initialSplitTenders?.length ? 'split' : 'full'
  );
  const [splitTenders, setSplitTenders] = useState<
    Array<{
      payment_mode: SplitPaymentTender['payment_mode'];
      amount: string;
      reference_note: string;
    }>
  >(
    initialSplitTenders?.length
      ? initialSplitTenders.map((tender) => ({
          payment_mode: tender.payment_mode,
          amount: String(tender.amount),
          reference_note: tender.reference_note ?? '',
        }))
      : [
          { payment_mode: 'CASH', amount: '', reference_note: '' },
          { payment_mode: 'UPI', amount: '', reference_note: '' },
        ]
  );
  const [splitLocked, setSplitLocked] = useState(Boolean(initialSplitTenders?.length));

  const balanceAmount = invoiceAmount - paidAmount;
  const previousOutstanding = Math.max(0, previousBalance);
  const customerAdvance = Math.max(0, -previousBalance);
  const totalCustomerDue = previousOutstanding + balanceAmount;
  const effectivePaymentType =
    paymentType === 'split' ? 'split' : allowPartial ? paymentType : 'full';
  const balancePaise = Math.round(balanceAmount * 100);
  const splitTotalPaise = splitTenders.reduce(
    (total, tender) => total + Math.round((parseFloat(tender.amount) || 0) * 100),
    0
  );
  const splitRemainingPaise = balancePaise - splitTotalPaise;
  const splitModesAreUnique =
    new Set(splitTenders.map((tender) => tender.payment_mode)).size === splitTenders.length;
  const splitIsValid =
    splitTenders.length >= 2 &&
    splitTenders.every((tender) => Math.round((parseFloat(tender.amount) || 0) * 100) > 0) &&
    splitModesAreUnique &&
    splitRemainingPaise === 0;

  const handleSubmit = async () => {
    if (effectivePaymentType === 'split') {
      if (!onSplitPayment || !splitIsValid) return;
      const tenders = splitTenders.map((tender) => ({
        payment_mode: tender.payment_mode,
        amount: Math.round(parseFloat(tender.amount) * 100) / 100,
        ...(tender.reference_note.trim() ? { reference_note: tender.reference_note.trim() } : {}),
      }));
      setSplitLocked(true);
      try {
        const outcome = await onSplitPayment(tenders);
        if (outcome === 'uncertain') return;
        if (outcome === 'rejected') {
          // The API definitely rejected the request and BillingPage confirmed
          // that the invoice is still unpaid. The cashier can now correct the
          // tender mix; the next submission uses a fresh idempotency key.
          setSplitLocked(false);
          return;
        }
        setSplitTenders([
          { payment_mode: 'CASH', amount: '', reference_note: '' },
          { payment_mode: 'UPI', amount: '', reference_note: '' },
        ]);
        setSplitLocked(false);
        setPaymentType('full');
      } catch (error) {
        // Keep the exact tender set locked so an uncertain network result can
        // only be retried with the same idempotent payload.
        console.error('Split payment error:', error);
      }
      return;
    }

    const payAmount = effectivePaymentType === 'full' ? balanceAmount : parseFloat(amount) || 0;

    if (payAmount <= 0) {
      return;
    }

    if (payAmount > balanceAmount) {
      return;
    }

    try {
      await onPayment(payAmount, paymentMode, reference || undefined);

      // Reset form
      setAmount('');
      setReference('');
      setPaymentType('full');
      setPaymentMode('CASH');
    } catch (error) {
      // Error will be handled by parent component
      console.error('Payment error:', error);
    }
  };

  const paymentModeOptions: Array<{
    value: SplitPaymentTender['payment_mode'];
    label: string;
  }> = [
    { value: 'CASH', label: t('payment.cash') },
    { value: 'UPI', label: t('payment.upi') },
    { value: 'CARD', label: t('payment.card') },
    { value: 'BANK', label: t('payment.bankTransfer') },
  ];

  const updateSplitTender = (
    index: number,
    field: 'payment_mode' | 'amount' | 'reference_note',
    value: string
  ) => {
    if (splitLocked) return;
    setSplitTenders((current) =>
      current.map((tender, tenderIndex) =>
        tenderIndex === index
          ? {
              ...tender,
              [field]:
                field === 'payment_mode' ? (value as SplitPaymentTender['payment_mode']) : value,
            }
          : tender
      )
    );
  };

  const addSplitTender = () => {
    if (splitLocked || splitTenders.length >= paymentModeOptions.length) return;
    const usedModes = new Set(splitTenders.map((tender) => tender.payment_mode));
    const nextMode = paymentModeOptions.find((option) => !usedModes.has(option.value))?.value;
    if (!nextMode) return;
    setSplitTenders((current) => [
      ...current,
      { payment_mode: nextMode, amount: '', reference_note: '' },
    ]);
  };

  const removeSplitTender = (index: number) => {
    if (splitLocked || splitTenders.length <= 2) return;
    setSplitTenders((current) => current.filter((_, tenderIndex) => tenderIndex !== index));
  };

  return (
    <IonModal isOpen={isOpen} backdropDismiss={false}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('payment.collectPayment')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} disabled={isLoading} aria-label={t('common.cancel')}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Invoice Summary */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: '#666' }}>{t('payment.totalAmount')}</span>
              <span className="font-semibold">{formatCurrency(invoiceAmount)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#666' }}>{t('payment.paidAmount')}</span>
                <span style={{ color: '#22c55e', fontWeight: '500' }}>
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between font-bold border-t pt-2"
              style={{ borderColor: '#ddd' }}
            >
              <span>{t('payment.balanceAmount')}</span>
              <span style={{ color: '#3880ff' }}>{formatCurrency(balanceAmount)}</span>
            </div>
            {previousBalance !== 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#666' }}>
                    {previousBalance < 0
                      ? t('billing.customerAdvance')
                      : t('billing.previousKhata')}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(previousBalance < 0 ? customerAdvance : previousOutstanding)}
                  </span>
                </div>
                {previousBalance > 0 ? (
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t('billing.totalCustomerDue')}</span>
                    <span>{formatCurrency(totalCustomerDue)}</span>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: '#666' }}>
                    {t('billing.advanceNotApplied')}
                  </p>
                )}
                <p className="text-xs" style={{ color: '#666' }}>
                  {t('billing.currentBillPaymentOnly')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Payment Type Selector */}
        {(allowPartial || onSplitPayment) && (
          <div className="mb-4">
            <IonSegment
              key={paymentType}
              value={paymentType}
              onIonChange={(e) => setPaymentType(e.detail.value as 'full' | 'partial' | 'split')}
              color="primary"
              disabled={splitLocked || isLoading}
            >
              <IonSegmentButton value="full" onClick={() => setPaymentType('full')}>
                <IonLabel>{t('payment.fullPayment')}</IonLabel>
              </IonSegmentButton>
              {allowPartial && (
                <IonSegmentButton value="partial" onClick={() => setPaymentType('partial')}>
                  <IonLabel>{t('payment.partialPayment')}</IonLabel>
                </IonSegmentButton>
              )}
              {onSplitPayment && (
                <IonSegmentButton value="split" onClick={() => setPaymentType('split')}>
                  <IonLabel>{t('payment.splitPayment')}</IonLabel>
                </IonSegmentButton>
              )}
            </IonSegment>
          </div>
        )}

        {/* Payment Amount */}
        {effectivePaymentType === 'full' ? (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#e3f2fd' }}>
            <p className="text-sm mb-1" style={{ color: '#666' }}>
              {t('payment.payingFull')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#3880ff' }}>
              {formatCurrency(balanceAmount)}
            </p>
          </div>
        ) : effectivePaymentType === 'partial' ? (
          <div className="mb-4">
            <Input
              label={t('payment.partialAmount')}
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
            />
            {parseFloat(amount) > balanceAmount && (
              <p className="text-sm mt-1" style={{ color: '#eb445a' }}>
                {t('payment.amountExceedsBalance')}
              </p>
            )}
          </div>
        ) : null}

        {/* Payment Mode */}
        {effectivePaymentType !== 'split' && (
          <div className="mb-4">
            <Select
              label={t('payment.paymentMode')}
              value={paymentMode}
              onChange={(val) => setPaymentMode(val as PaymentMode)}
              options={paymentModeOptions}
            />
          </div>
        )}

        {/* Reference Note */}
        {effectivePaymentType !== 'split' &&
          (paymentMode === 'UPI' || paymentMode === 'CARD' || paymentMode === 'BANK') && (
            <div className="mb-4">
              <Input
                label={t('payment.referenceNumber')}
                value={reference}
                onChange={setReference}
                placeholder={
                  paymentMode === 'UPI'
                    ? t('payment.upiTransactionId')
                    : paymentMode === 'CARD'
                      ? t('payment.last4DigitsOrApproval')
                      : t('payment.bankReferenceNumber')
                }
              />
            </div>
          )}

        {effectivePaymentType === 'split' && (
          <section aria-label={t('payment.splitPayment')} className="mb-4 space-y-3">
            <p className="text-sm" style={{ color: '#666' }}>
              {splitLocked ? t('payment.splitRetryHint') : t('payment.splitHint')}
            </p>
            {splitTenders.map((tender, index) => {
              const needsReference = tender.payment_mode !== 'CASH';
              return (
                <div
                  key={`${index}-${tender.payment_mode}`}
                  data-testid={`split-tender-card-${index}`}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: 'var(--ion-border-color)',
                    backgroundColor: 'var(--ion-card-background)',
                    color: 'var(--ion-text-color)',
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <strong>{t('payment.tenderNumber', { number: index + 1 })}</strong>
                    {splitTenders.length > 2 && !splitLocked && (
                      <button
                        type="button"
                        onClick={() => removeSplitTender(index)}
                        className="text-sm"
                        style={{ color: '#eb445a' }}
                      >
                        {t('payment.removeTender')}
                      </button>
                    )}
                  </div>
                  <Select
                    label={t('payment.paymentMode')}
                    value={tender.payment_mode}
                    onChange={(value) => updateSplitTender(index, 'payment_mode', value)}
                    options={paymentModeOptions}
                    disabled={splitLocked}
                  />
                  <Input
                    label={t('payment.tenderAmount')}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={tender.amount}
                    onChange={(value) => updateSplitTender(index, 'amount', value)}
                    placeholder="0.00"
                    disabled={splitLocked}
                    required
                  />
                  {needsReference && (
                    <Input
                      label={t('payment.referenceNumber')}
                      value={tender.reference_note}
                      onChange={(value) => updateSplitTender(index, 'reference_note', value)}
                      placeholder={t('payment.referenceNumber')}
                      disabled={splitLocked}
                    />
                  )}
                </div>
              );
            })}
            {!splitModesAreUnique && (
              <p role="alert" className="text-sm" style={{ color: '#eb445a' }}>
                {t('payment.splitModesUnique')}
              </p>
            )}
            <div
              role="status"
              className="flex items-center justify-between rounded-lg p-3 font-semibold"
              style={{
                backgroundColor:
                  splitRemainingPaise === 0
                    ? 'var(--kirana-surface-accent-strong)'
                    : 'var(--kirana-surface-soft)',
                border: `1px solid ${
                  splitRemainingPaise === 0
                    ? 'var(--ion-color-success)'
                    : 'var(--ion-color-warning)'
                }`,
                color: 'var(--ion-text-color)',
              }}
            >
              <span>
                {splitRemainingPaise >= 0 ? t('payment.splitRemaining') : t('payment.splitOver')}
              </span>
              <span>{formatCurrency(Math.abs(splitRemainingPaise) / 100)}</span>
            </div>
            {splitTenders.length < paymentModeOptions.length && !splitLocked && (
              <button
                type="button"
                className="w-full rounded-lg border p-3 font-semibold"
                style={{ borderColor: '#3880ff', color: '#3880ff' }}
                onClick={addSplitTender}
              >
                {t('payment.addTender')}
              </button>
            )}
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button fullWidth variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (effectivePaymentType === 'partial' && (!amount || parseFloat(amount) <= 0)) ||
              (effectivePaymentType === 'partial' && parseFloat(amount) > balanceAmount) ||
              (effectivePaymentType === 'split' && !splitIsValid)
            }
            loading={isLoading}
          >
            {t('payment.collectPayment')}
          </Button>
        </div>
      </IonContent>
    </IonModal>
  );
};
