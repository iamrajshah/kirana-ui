import React from 'react';
import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  type RefresherEventDetail,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetDashboardStatsQuery } from '@core/api/dashboardApi';
import { selectCurrentUser } from '@core/auth/authSlice';
import { useAppSelector } from '@core/hooks';
import { getNavigationItems } from '@core/navigation/navigation';
import type { DashboardStats } from '@core/types';
import { Navbar } from '@components/Navbar';
import { formatCurrency, formatNumber } from '@utils/helpers';
import './DashboardPage.css';

type Metric = {
  key: keyof DashboardStats;
  labelKey: string;
  format: (value: number) => string;
  tone: 'sales' | 'pending' | 'stock' | 'neutral';
  zeroKey?: string;
};

const priorityMetrics: Metric[] = [
  { key: 'today_sales', labelKey: 'dashboard.todaySales', format: formatCurrency, tone: 'sales', zeroKey: 'dashboard.noSalesToday' },
  { key: 'pending_invoices', labelKey: 'dashboard.pendingInvoices', format: formatNumber, tone: 'pending', zeroKey: 'dashboard.noPendingInvoices' },
  { key: 'low_stock_items', labelKey: 'dashboard.lowStock', format: formatNumber, tone: 'stock', zeroKey: 'dashboard.stockHealthy' },
];

const otherMetrics: Metric[] = [
  { key: 'total_customers', labelKey: 'dashboard.totalCustomers', format: formatNumber, tone: 'neutral' },
  { key: 'supplier_payables', labelKey: 'dashboard.supplierPayables', format: formatCurrency, tone: 'neutral' },
  { key: 'customer_receivables', labelKey: 'dashboard.customerReceivables', format: formatCurrency, tone: 'neutral' },
];

const shortcutIds = new Set(['billing', 'invoices', 'inventory']);

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const { data, isLoading, isError, refetch } = useGetDashboardStatsQuery();
  const stats = data?.data;
  const shortcuts = getNavigationItems(user?.roles || []).filter((item) => shortcutIds.has(item.id));

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await refetch();
    } finally {
      event.detail.complete();
    }
  };

  const renderMetric = (metric: Metric) => {
    const value = stats?.[metric.key] ?? 0;
    return (
      <article key={metric.key} className={`workspace-record dashboard-metric dashboard-metric--${metric.tone}`}>
        <h3>{t(metric.labelKey)}</h3>
        <strong className="dashboard-metric-value">{metric.format(value)}</strong>
        {value === 0 && metric.zeroKey && <p className="dashboard-metric-note">{t(metric.zeroKey)}</p>}
      </article>
    );
  };

  return (
    <IonPage>
      <Navbar title={t('dashboard.title')} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <main className="workspace-page dashboard-page">
          <header className="workspace-header">
            <div>
              <h1>{t('dashboard.title')}</h1>
              <p>{t('dashboard.subtitle')}</p>
            </div>
          </header>

          {isError && stats && (
            <div className="workspace-state dashboard-error dashboard-stale-warning" role="alert">
              <p>{t('dashboard.statsUnavailable')}</p>
              <button type="button" onClick={() => void refetch()}>{t('dashboard.retry')}</button>
            </div>
          )}

          {isLoading && !stats ? (
            <div className="workspace-state" role="status">{t('common.loading')}</div>
          ) : !stats ? (
            <div className="workspace-state dashboard-error" role="alert">
              <p>{t('dashboard.statsUnavailable')}</p>
              <button type="button" onClick={() => void refetch()}>{t('dashboard.retry')}</button>
            </div>
          ) : (
            <>
              <section className="dashboard-priorities" data-testid="dashboard-priorities" aria-label={t('dashboard.title')}>
                {priorityMetrics.map(renderMetric)}
              </section>
              <section className="dashboard-secondary" aria-labelledby="dashboard-secondary-title">
                <h2 id="dashboard-secondary-title">{t('dashboard.moreMetrics')}</h2>
                <div className="workspace-grid dashboard-secondary-grid">
                  {otherMetrics.map(renderMetric)}
                </div>
              </section>
            </>
          )}

          {shortcuts.length > 0 && (
            <section className="dashboard-actions" aria-labelledby="dashboard-actions-title">
              <h2 id="dashboard-actions-title">{t('dashboard.quickActions')}</h2>
              <div className="workspace-actions dashboard-shortcuts">
                {shortcuts.map((item) => (
                  <button key={item.id} type="button" onClick={() => history.push(item.href)}>
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};
