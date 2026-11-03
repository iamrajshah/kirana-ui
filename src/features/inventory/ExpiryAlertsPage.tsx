import React, { useMemo, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  type RefresherEventDetail,
} from '@ionic/react';
import { alertCircleOutline, calendarOutline, cubeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { ROUTES } from '@core/constants';
import {
  type ExpiryInventoryBatch,
  useAdjustExpiryBatchMutation,
  useGetExpiryAlertsQuery,
} from '@core/api/expiryApi';
import { formatCurrency, formatNumber } from '@utils/helpers';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';
import { hasPermission } from '@core/permissions/permissions';
import { apiErrorMessage } from '@core/services/notificationService';
import './ExpiryAlertsPage.css';

type ExpiryFilter = 'ALL' | 'EXPIRED' | 'NEAR_EXPIRY';

const ExpiryAlertsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const currentUser = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const canAdjustExpiry =
    hasPermission(currentUser?.roles ?? [], 'PRODUCT_UPDATE') &&
    canUseCommercialFeature(currentUser?.roles ?? [], commercialAccess, 'EXPIRY_TRACKING');
  const [windowDays, setWindowDays] = useState(30);
  const [filter, setFilter] = useState<ExpiryFilter>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<ExpiryInventoryBatch | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [disposition, setDisposition] = useState<'EXPIRED' | 'DAMAGED' | 'OTHER'>('EXPIRED');
  const [confirmedAdjustment, setConfirmedAdjustment] = useState(false);
  const [adjustmentKey, setAdjustmentKey] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustBatch, { isLoading: isAdjusting }] = useAdjustExpiryBatchMutation();
  const { data, isLoading, isFetching, isError, refetch } = useGetExpiryAlertsQuery(
    { windowDays },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const alerts = data?.data;
  const batches = useMemo(
    () =>
      (alerts?.batches ?? [])
        .filter((batch) => filter === 'ALL' || batch.state === filter)
        .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate)),
    [alerts?.batches, filter]
  );

  const refresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await refetch();
    } finally {
      event.detail.complete();
    }
  };

  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));

  const openAdjustment = (batch: ExpiryInventoryBatch) => {
    setSelectedBatch(batch);
    setAdjustQuantity(String(Math.min(1, batch.quantity)));
    setAdjustReason('');
    setDisposition(batch.state === 'EXPIRED' ? 'EXPIRED' : 'OTHER');
    setConfirmedAdjustment(false);
    setAdjustError('');
    setAdjustmentKey(
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `expiry-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  };

  const closeAdjustment = () => {
    if (isAdjusting) return;
    setSelectedBatch(null);
  };

  const submitAdjustment = async () => {
    if (!selectedBatch || !canAdjustExpiry) return;
    const quantity = Number(adjustQuantity);
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > selectedBatch.quantity ||
      adjustReason.trim().length < 4 ||
      !confirmedAdjustment
    ) {
      setAdjustError(t('expiry.adjustValidation'));
      return;
    }
    setAdjustError('');
    try {
      await adjustBatch({
        batchId: selectedBatch.id,
        quantity,
        reason: adjustReason.trim(),
        disposition,
        idempotencyKey: adjustmentKey,
      }).unwrap();
      setSelectedBatch(null);
      await refetch();
    } catch (cause) {
      setAdjustError(apiErrorMessage(cause, t('expiry.adjustFailed'), true));
    }
  };

  return (
    <IonPage>
      <Navbar title={t('expiry.title')} backHref={ROUTES.INVENTORY} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>
        <main className="workspace-page expiry-page">
          <header className="workspace-header expiry-header">
            <div>
              <h1>{t('expiry.title')}</h1>
              <p>{t('expiry.subtitle')}</p>
            </div>
            <div className="expiry-controls">
              <IonSelect
                aria-label={t('expiry.windowLabel')}
                value={windowDays}
                interface="popover"
                onIonChange={(event) => setWindowDays(Number(event.detail.value))}
              >
                {[7, 15, 30, 60, 90].map((days) => (
                  <IonSelectOption key={days} value={days}>
                    {t('expiry.nextDays', { count: days })}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
          </header>

          {alerts && (
            <section className="expiry-summary" aria-label={t('expiry.summary')}>
              <button
                type="button"
                className={`expiry-summary-card expiry-summary-card--expired ${filter === 'EXPIRED' ? 'is-active' : ''}`}
                onClick={() => setFilter(filter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
              >
                <IonIcon icon={alertCircleOutline} />
                <span>{t('expiry.expired')}</span>
                <strong>{formatNumber(alerts.summary.expiredBatches)}</strong>
              </button>
              <button
                type="button"
                className={`expiry-summary-card expiry-summary-card--warning ${filter === 'NEAR_EXPIRY' ? 'is-active' : ''}`}
                onClick={() => setFilter(filter === 'NEAR_EXPIRY' ? 'ALL' : 'NEAR_EXPIRY')}
              >
                <IonIcon icon={calendarOutline} />
                <span>{t('expiry.nearExpiry')}</span>
                <strong>{formatNumber(alerts.summary.nearExpiryBatches)}</strong>
              </button>
              <article className="expiry-summary-card expiry-summary-card--neutral">
                <IonIcon icon={cubeOutline} />
                <span>{t('expiry.affectedUnits')}</span>
                <strong>{formatNumber(alerts.summary.affectedUnits)}</strong>
              </article>
              {typeof alerts.summary.affectedValue === 'number' && (
                <article className="expiry-summary-card expiry-summary-card--neutral">
                  <span>
                    {t(
                      alerts.summary.valuationEstimated
                        ? 'expiry.stockAtRiskEstimated'
                        : 'expiry.stockAtRisk'
                    )}
                  </span>
                  <strong>{formatCurrency(alerts.summary.affectedValue)}</strong>
                  {alerts.summary.valuationEstimated && (
                    <small>{t('expiry.valuationEstimatedHint')}</small>
                  )}
                </article>
              )}
            </section>
          )}

          {isLoading && !alerts ? (
            <div className="workspace-state" role="status">
              {t('common.loading')}
            </div>
          ) : isError && !alerts ? (
            <div className="workspace-state" role="alert">
              <p>{t('expiry.loadError')}</p>
              <IonButton onClick={() => void refetch()}>{t('common.retry')}</IonButton>
            </div>
          ) : batches.length === 0 ? (
            <div className="workspace-state expiry-clear-state">
              <strong>{t('expiry.noAlerts')}</strong>
              <p>{t('expiry.noAlertsHint', { count: windowDays })}</p>
            </div>
          ) : (
            <section className="expiry-list" aria-busy={isFetching}>
              {batches.map((batch) => (
                <article
                  key={batch.id}
                  className={`workspace-record expiry-batch expiry-batch--${batch.state.toLowerCase()}`}
                >
                  <div className="expiry-batch__heading">
                    <div>
                      <h2>{batch.productName}</h2>
                      <p>{[batch.brand, batch.size, batch.sku].filter(Boolean).join(' · ')}</p>
                    </div>
                    <IonBadge color={batch.state === 'EXPIRED' ? 'danger' : 'warning'}>
                      {batch.state === 'EXPIRED'
                        ? batch.daysToExpiry === 0
                          ? t('expiry.expiredToday')
                          : t('expiry.expiredDaysAgo', { count: Math.abs(batch.daysToExpiry) })
                        : t('expiry.daysRemaining', { count: batch.daysToExpiry })}
                    </IonBadge>
                  </div>
                  <dl className="expiry-batch__details">
                    <div>
                      <dt>{t('expiry.batch')}</dt>
                      <dd>{batch.batchNumber || t('expiry.notRecorded')}</dd>
                    </div>
                    <div>
                      <dt>{t('expiry.expiryDate')}</dt>
                      <dd>{date(batch.expiryDate)}</dd>
                    </div>
                    <div>
                      <dt>{t('expiry.quantity')}</dt>
                      <dd>{formatNumber(batch.quantity)}</dd>
                    </div>
                  </dl>
                  <div className="expiry-batch__actions">
                    <IonButton
                      fill="outline"
                      onClick={() => history.push(`/products/${batch.productId}`)}
                    >
                      {t('expiry.reviewProduct')}
                    </IonButton>
                    {canAdjustExpiry && (
                      <IonButton
                        color="danger"
                        fill="outline"
                        onClick={() => openAdjustment(batch)}
                      >
                        {t('expiry.writeOff')}
                      </IonButton>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}

          <IonModal isOpen={Boolean(selectedBatch)} onDidDismiss={closeAdjustment}>
            <div className="expiry-adjust-modal">
              <header>
                <h2>{t('expiry.adjustTitle')}</h2>
                <p>{selectedBatch?.productName}</p>
              </header>
              <label>
                <span>{t('expiry.adjustQuantity')}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max={selectedBatch?.quantity}
                  value={adjustQuantity}
                  onChange={(event) => setAdjustQuantity(event.target.value)}
                />
              </label>
              <label>
                <span>{t('expiry.disposition')}</span>
                <select
                  value={disposition}
                  onChange={(event) => setDisposition(event.target.value as typeof disposition)}
                >
                  <option value="EXPIRED">{t('expiry.dispositions.EXPIRED')}</option>
                  <option value="DAMAGED">{t('expiry.dispositions.DAMAGED')}</option>
                  <option value="OTHER">{t('expiry.dispositions.OTHER')}</option>
                </select>
              </label>
              <label>
                <span>{t('expiry.adjustReason')}</span>
                <textarea
                  value={adjustReason}
                  maxLength={300}
                  onChange={(event) => setAdjustReason(event.target.value)}
                />
              </label>
              <label className="expiry-adjust-confirm">
                <input
                  type="checkbox"
                  checked={confirmedAdjustment}
                  onChange={(event) => setConfirmedAdjustment(event.target.checked)}
                />
                <span>{t('expiry.adjustConfirm')}</span>
              </label>
              {adjustError && (
                <p className="expiry-adjust-error" role="alert">
                  {adjustError}
                </p>
              )}
              <div className="expiry-adjust-actions">
                <IonButton fill="clear" disabled={isAdjusting} onClick={closeAdjustment}>
                  {t('common.cancel')}
                </IonButton>
                <IonButton
                  color="danger"
                  disabled={isAdjusting}
                  onClick={() => void submitAdjustment()}
                >
                  {isAdjusting ? t('common.loading') : t('expiry.confirmWriteOff')}
                </IonButton>
              </div>
            </div>
          </IonModal>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default ExpiryAlertsPage;
