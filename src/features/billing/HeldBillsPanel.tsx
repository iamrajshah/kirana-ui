import React, { useState } from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { close, refresh } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import {
  useClaimHeldBillMutation,
  useGetHeldBillsQuery,
  useReleaseHeldBillMutation,
  useTakeoverHeldBillMutation,
} from '@core/api/invoiceApi';
import notificationService, { apiErrorMessage } from '@core/services/notificationService';
import type { HeldBill, User } from '@core/types';
import { formatCurrency } from '@utils/helpers';
import './HeldBillsPanel.css';

interface HeldBillsPanelProps {
  currentUser: Pick<User, 'id' | 'name' | 'roles'>;
  counterLabel: string | null;
  onRequestCounterLabel: (force?: boolean) => string | null;
  onBeforeResume: (bill: HeldBill) => boolean;
  onResume: (bill: HeldBill) => void;
  onReleased: (bill: HeldBill) => void;
  onClose: () => void;
  focusBillId?: string | null;
  editingInvoiceId?: string | null;
  editingHasChanges?: boolean;
}

const heldAge = (heldAt: string, locale: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(heldAt).getTime()) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'short' });
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  return formatter.format(-Math.floor(minutes / 60), 'hour');
};

export const HeldBillsPanel: React.FC<HeldBillsPanelProps> = ({
  currentUser,
  counterLabel,
  onRequestCounterLabel,
  onBeforeResume,
  onResume,
  onReleased,
  onClose,
  focusBillId,
  editingInvoiceId,
  editingHasChanges = false,
}) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useGetHeldBillsQuery({ take: 50 });
  const [claimHeldBill] = useClaimHeldBillMutation();
  const [releaseHeldBill] = useReleaseHeldBillMutation();
  const [takeoverHeldBill] = useTakeoverHeldBillMutation();
  const [pendingBillId, setPendingBillId] = useState<string | null>(null);

  const canTakeOver = currentUser.roles.some((role) => role === 'OWNER' || role === 'MANAGER');
  const bills = [...(data?.data || [])].sort((left, right) => {
    if (left.id === focusBillId) return -1;
    if (right.id === focusBillId) return 1;
    return 0;
  });

  const counterForAction = () => counterLabel || onRequestCounterLabel(false);

  const runClaim = async (bill: HeldBill, takeover = false) => {
    if (!onBeforeResume(bill)) return;
    const nextCounter = counterForAction();
    if (!nextCounter) return;
    setPendingBillId(bill.id);
    try {
      const response = takeover
        ? await takeoverHeldBill({
            id: bill.id,
            counter_label: nextCounter,
            expected_version: bill.version,
          }).unwrap()
        : await claimHeldBill({
            id: bill.id,
            counter_label: nextCounter,
            expected_version: bill.version,
          }).unwrap();
      if (response.data) onResume(response.data);
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.heldBills.actionFailed'), true));
      await refetch();
    } finally {
      setPendingBillId(null);
    }
  };

  const runRelease = async (bill: HeldBill) => {
    if (
      editingInvoiceId === bill.id &&
      editingHasChanges &&
      !window.confirm(t('billing.heldBills.releaseUnsavedConfirm'))
    ) {
      return;
    }
    setPendingBillId(bill.id);
    try {
      await releaseHeldBill({ id: bill.id, expected_version: bill.version }).unwrap();
      onReleased(bill);
      await refetch();
      notificationService.success(t('billing.heldBills.released'));
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.heldBills.actionFailed'), true));
      await refetch();
    } finally {
      setPendingBillId(null);
    }
  };

  return (
    <section className="held-bills-panel" aria-label={t('billing.heldBills.title')}>
      <header className="held-bills-panel__header">
        <div>
          <p className="held-bills-panel__eyebrow">{t('billing.heldBills.counter')}</p>
          <h2>
            {t('billing.heldBills.title')} ({bills.length})
          </h2>
          <p className="held-bills-panel__counter">
            {counterLabel || t('billing.heldBills.counterNotSet')}
            <button type="button" onClick={() => onRequestCounterLabel(true)}>
              {t('billing.heldBills.editCounter')}
            </button>
          </p>
        </div>
        <button
          type="button"
          className="held-bills-panel__close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <IonIcon icon={close} />
        </button>
      </header>

      <div className="held-bills-panel__body">
        {isLoading ? (
          <div className="held-bills-panel__state">
            <IonSpinner />
          </div>
        ) : isError ? (
          <div className="held-bills-panel__state">
            <p>{t('billing.heldBills.loadFailed')}</p>
            <IonButton fill="outline" onClick={() => void refetch()}>
              <IonIcon icon={refresh} slot="start" />
              {t('common.retry')}
            </IonButton>
          </div>
        ) : bills.length === 0 ? (
          <div className="held-bills-panel__state">
            <strong>{t('billing.heldBills.empty')}</strong>
            <p>{t('billing.heldBills.emptyHint')}</p>
          </div>
        ) : (
          <div className="held-bills-panel__list" aria-busy={isFetching}>
            {bills.map((bill) => {
              const isMine = bill.holder?.id === currentUser.id || bill.held_by === currentUser.id;
              const activeOther = bill.lease_state === 'active' && !isMine;
              const pending = pendingBillId === bill.id;
              return (
                <article
                  className="held-bill-card"
                  data-highlighted={bill.id === focusBillId || undefined}
                  key={bill.id}
                >
                  <div className="held-bill-card__topline">
                    <strong>{formatCurrency(Number(bill.total_amount || 0))}</strong>
                    <span data-state={bill.lease_state}>
                      {t(`billing.heldBills.lease.${bill.lease_state}`)}
                    </span>
                  </div>
                  <p className="held-bill-card__meta">
                    {bill.item_count} {t('billing.heldBills.items')} ·{' '}
                    {heldAge(bill.held_at, i18n.language)}
                  </p>
                  <p className="held-bill-card__holder">
                    {bill.holder
                      ? `${bill.holder.name}${bill.held_counter ? ` · ${bill.held_counter}` : ''}`
                      : t('billing.heldBills.availableAnyCounter')}
                  </p>

                  <div className="held-bill-card__actions">
                    {bill.lease_state === 'active' && isMine ? (
                      <>
                        <IonButton
                          disabled={pending}
                          onClick={() => onBeforeResume(bill) && onResume(bill)}
                        >
                          {t('billing.heldBills.resume')}
                        </IonButton>
                        <IonButton
                          fill="outline"
                          color="medium"
                          disabled={pending}
                          onClick={() => void runRelease(bill)}
                        >
                          {t('billing.heldBills.release')}
                        </IonButton>
                      </>
                    ) : activeOther ? (
                      <>
                        <span className="held-bill-card__readonly">
                          {t('billing.heldBills.readOnly')}
                        </span>
                        {canTakeOver && (
                          <IonButton
                            fill="outline"
                            disabled={pending}
                            onClick={() => void runClaim(bill, true)}
                          >
                            {t('billing.heldBills.takeOver')}
                          </IonButton>
                        )}
                      </>
                    ) : (
                      <IonButton disabled={pending} onClick={() => void runClaim(bill)}>
                        {t('billing.heldBills.claim')}
                      </IonButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
