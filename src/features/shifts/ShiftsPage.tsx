import React, { useMemo, useState } from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@components';
import {
  useAddShiftAdjustmentMutation,
  useCloseShiftMutation,
  useGetCurrentShiftQuery,
  useGetShiftsQuery,
  useOpenShiftMutation,
} from '@core/api/shiftApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { formatCurrency, formatDateTime } from '@utils/helpers';
import {
  calculateCashVariance,
  parseNonNegativeAmount,
  requiresVarianceExplanation,
} from './shiftReconciliation';
import './ShiftsPage.css';

const amount = (value: string) => Number(value || 0);

const ShiftsPage: React.FC = () => {
  const { t } = useTranslation();
  const currentQuery = useGetCurrentShiftQuery();
  const historyQuery = useGetShiftsQuery();
  const [openShift, { isLoading: opening }] = useOpenShiftMutation();
  const [adjustShift, { isLoading: adjusting }] = useAddShiftAdjustmentMutation();
  const [closeShift, { isLoading: closing }] = useCloseShiftMutation();
  const [openingCash, setOpeningCash] = useState('');
  const [counter, setCounter] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const current = currentQuery.data?.data ?? null;
  const expected = useMemo(() => amount(current?.expected_cash ?? '0'), [current?.expected_cash]);
  const openingCashValue = parseNonNegativeAmount(openingCash);
  const adjustmentAmountValue = parseNonNegativeAmount(adjustmentAmount);
  const countedCashValue = parseNonNegativeAmount(countedCash);
  const variance = calculateCashVariance(countedCash, expected);
  const varianceExplanationRequired = requiresVarianceExplanation(variance, closingNote);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setNotice(null);
    try {
      await action();
      setNotice({ error: false, text: success });
      await Promise.all([currentQuery.refetch(), historyQuery.refetch()]);
    } catch (error: unknown) {
      setNotice({ error: true, text: apiErrorMessage(error, t('shifts.failed')) });
    }
  };

  const submitOpenShift = () => {
    if (openingCashValue === null) return;
    void run(
      () =>
        openShift({
          opening_cash: openingCashValue,
          counter_label: counter.trim() || undefined,
        }).unwrap(),
      t('shifts.openedSuccess')
    );
  };

  const submitAdjustment = () => {
    if (!current || adjustmentAmountValue === null || adjustmentAmountValue === 0) return;
    const note = adjustmentNote.trim();
    if (note.length < 2) return;
    void run(
      () =>
        adjustShift({
          id: current.id,
          type: adjustmentType,
          amount: adjustmentAmountValue,
          note,
        }).unwrap(),
      t('shifts.adjustmentSaved')
    );
  };

  const submitCloseShift = () => {
    if (!current || countedCashValue === null || varianceExplanationRequired) return;
    void run(
      () =>
        closeShift({
          id: current.id,
          counted_cash: countedCashValue,
          closing_note: closingNote.trim() || undefined,
        }).unwrap(),
      t('shifts.closedSuccess')
    );
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>{t('shifts.title')}</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <main className="shift-page">
          <header className="shift-hero">
            <div><p>{t('shifts.eyebrow')}</p><h1>{t('shifts.heading')}</h1><span>{t('shifts.description')}</span></div>
            {current && <IonBadge color="success">{t('shifts.open')}</IonBadge>}
          </header>

          {(currentQuery.isLoading || historyQuery.isLoading) && <IonSpinner aria-label={t('common.loading')} />}
          {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'shift-notice shift-notice--error' : 'shift-notice'}>{notice.text}</p>}

          {!current && !currentQuery.isLoading && (
            <IonCard>
              <IonCardHeader><IonCardTitle>{t('shifts.openShift')}</IonCardTitle></IonCardHeader>
              <IonCardContent className="shift-form">
                <Input label={t('shifts.openingCash')} value={openingCash} onChange={setOpeningCash} type="number" min={0} />
                <Input label={t('shifts.counter')} value={counter} onChange={setCounter} maxLength={32} />
                <IonButton disabled={opening || openingCashValue === null} onClick={submitOpenShift}>
                  {opening ? t('common.loading') : t('shifts.openShift')}
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}

          {current && (
            <>
              <section className="shift-summary" aria-label={t('shifts.liveSummary')}>
                <article><span>{t('shifts.openingCash')}</span><strong>{formatCurrency(amount(current.opening_cash))}</strong></article>
                <article><span>{t('shifts.cashSales')}</span><strong>{formatCurrency(amount(current.cash_sales))}</strong></article>
                <article><span>{t('shifts.cashIn')}</span><strong>{formatCurrency(amount(current.cash_in))}</strong></article>
                <article><span>{t('shifts.cashOut')}</span><strong>{formatCurrency(amount(current.cash_out))}</strong></article>
                <article className="shift-summary__expected"><span>{t('shifts.expectedCash')}</span><strong>{formatCurrency(expected)}</strong></article>
              </section>

              <div className="shift-actions-grid">
                <IonCard>
                  <IonCardHeader><IonCardTitle>{t('shifts.cashMovement')}</IonCardTitle></IonCardHeader>
                  <IonCardContent className="shift-form">
                    <Select label={t('shifts.movementType')} value={adjustmentType} onChange={(value) => setAdjustmentType(value as 'CASH_IN' | 'CASH_OUT')} options={[
                      { value: 'CASH_IN', label: t('shifts.cashIn') },
                      { value: 'CASH_OUT', label: t('shifts.cashOut') },
                    ]} />
                    <Input label={t('common.amount')} value={adjustmentAmount} onChange={setAdjustmentAmount} type="number" min={0} />
                    <Input label={t('shifts.reason')} value={adjustmentNote} onChange={setAdjustmentNote} maxLength={255} />
                    <IonButton fill="outline" disabled={adjusting || adjustmentAmountValue === null || adjustmentAmountValue === 0 || adjustmentNote.trim().length < 2} onClick={submitAdjustment}>
                      {t('shifts.saveMovement')}
                    </IonButton>
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader><IonCardTitle>{t('shifts.closeShift')}</IonCardTitle></IonCardHeader>
                  <IonCardContent className="shift-form">
                    <p>{t('shifts.countHint', { amount: formatCurrency(expected) })}</p>
                    <Input label={t('shifts.countedCash')} value={countedCash} onChange={setCountedCash} type="number" min={0} />
                    <Input label={t(varianceExplanationRequired ? 'shifts.closingNoteRequired' : 'shifts.closingNote')} value={closingNote} onChange={setClosingNote} maxLength={255} />
                    {variance !== null && <p className={variance === 0 ? 'shift-variance' : 'shift-variance shift-variance--warning'}>{t('shifts.variance')}: {formatCurrency(variance)}</p>}
                    {varianceExplanationRequired && <p role="alert" className="shift-variance shift-variance--warning">{t('shifts.varianceReasonRequired')}</p>}
                    <IonButton color="warning" disabled={closing || countedCashValue === null || varianceExplanationRequired} onClick={submitCloseShift}>
                      {t('shifts.closeShift')}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </div>
            </>
          )}

          <section className="shift-history">
            <h2>{t('shifts.recent')}</h2>
            {(historyQuery.data?.data ?? []).map((shift) => (
              <article key={shift.id}>
                <div><strong>{shift.user_name || t('common.defaultUserRole')}</strong><span>{formatDateTime(shift.opened_at)}{shift.counter_label ? ` · ${shift.counter_label}` : ''}</span></div>
                <div><IonBadge color={shift.status === 'OPEN' ? 'success' : 'medium'}>{t(`shifts.${shift.status.toLowerCase()}`)}</IonBadge><strong>{shift.expected_cash ? formatCurrency(amount(shift.expected_cash)) : '—'}</strong>{shift.variance != null && <span>{t('shifts.variance')}: {formatCurrency(amount(shift.variance))}</span>}</div>
              </article>
            ))}
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default ShiftsPage;
