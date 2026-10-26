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
import type {
  CustomerCreditDecision,
  DashboardDecisionGroup,
  DashboardStats,
  HeldBillAttentionDecision,
  LowStockDecision,
} from '@core/types';
import { Navbar } from '@components/Navbar';
import { formatCurrency, formatNumber } from '@utils/helpers';
import './DashboardPage.css';

type Metric = {
  key: keyof Pick<
    DashboardStats,
    | 'today_sales'
    | 'pending_invoices'
    | 'low_stock_items'
    | 'total_customers'
    | 'supplier_payables'
    | 'customer_receivables'
  >;
  labelKey: string;
  format: (value: number) => string;
  tone: 'sales' | 'pending' | 'stock' | 'neutral';
  zeroKey?: string;
};

const priorityMetrics: Metric[] = [
  {
    key: 'today_sales',
    labelKey: 'dashboard.todaySales',
    format: formatCurrency,
    tone: 'sales',
    zeroKey: 'dashboard.noSalesToday',
  },
  {
    key: 'pending_invoices',
    labelKey: 'dashboard.pendingInvoices',
    format: formatNumber,
    tone: 'pending',
    zeroKey: 'dashboard.noPendingInvoices',
  },
  {
    key: 'low_stock_items',
    labelKey: 'dashboard.lowStock',
    format: formatNumber,
    tone: 'stock',
    zeroKey: 'dashboard.stockHealthy',
  },
];

const otherMetrics: Metric[] = [
  {
    key: 'total_customers',
    labelKey: 'dashboard.totalCustomers',
    format: formatNumber,
    tone: 'neutral',
  },
  {
    key: 'supplier_payables',
    labelKey: 'dashboard.supplierPayables',
    format: formatCurrency,
    tone: 'neutral',
  },
  {
    key: 'customer_receivables',
    labelKey: 'dashboard.customerReceivables',
    format: formatCurrency,
    tone: 'neutral',
  },
];

const shortcutIds = new Set(['billing', 'invoices', 'inventory']);

type DecisionGroupName = 'money' | 'stock' | 'held';

const variantName = (decision: LowStockDecision) =>
  [decision.brand, decision.size].filter(Boolean).join(' · ');

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const { data, isLoading, isError, refetch } = useGetDashboardStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const stats = data?.data;
  const shortcuts = getNavigationItems(user?.roles || []).filter((item) =>
    shortcutIds.has(item.id)
  );
  const canSeeDecisionInbox =
    user?.roles?.some((role) => role === 'OWNER' || role === 'MANAGER') ?? false;

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
      <article
        key={metric.key}
        className={`workspace-record dashboard-metric dashboard-metric--${metric.tone}`}
      >
        <h3>{t(metric.labelKey)}</h3>
        <strong className="dashboard-metric-value">{metric.format(value)}</strong>
        {value === 0 && metric.zeroKey && (
          <p className="dashboard-metric-note">{t(metric.zeroKey)}</p>
        )}
      </article>
    );
  };

  const renderUnavailableGroup = (group: DecisionGroupName) => (
    <div className="dashboard-decision-state" role="alert">
      <p>{t('dashboard.decisionInbox.groupUnavailable')}</p>
      <button
        type="button"
        aria-label={t(`dashboard.decisionInbox.${group}.retry`)}
        onClick={() => void refetch()}
      >
        {t('dashboard.retry')}
      </button>
    </div>
  );

  const renderMoneyGroup = (group: DashboardDecisionGroup<CustomerCreditDecision>) => (
    <section className="dashboard-decision-group" aria-labelledby="dashboard-money-decisions">
      <h3 id="dashboard-money-decisions">{t('dashboard.decisionInbox.money.title')}</h3>
      {!group.available ? (
        renderUnavailableGroup('money')
      ) : group.records.length === 0 ? (
        <p className="dashboard-decision-empty">{t('dashboard.decisionInbox.money.empty')}</p>
      ) : (
        <div className="dashboard-decision-list">
          {group.records.map((decision) => (
            <article
              className="dashboard-decision-card dashboard-decision-card--money"
              key={decision.customer_id}
            >
              <div className="dashboard-decision-card__heading">
                <strong>
                  {decision.customer_name || t('dashboard.decisionInbox.money.unknownCustomer')}
                </strong>
                <span>{formatCurrency(decision.due_amount)}</span>
              </div>
              <p>{t('dashboard.decisionInbox.money.reason')}</p>
              <button
                type="button"
                onClick={() =>
                  history.push(`/customers/${decision.destination.customer_id}/ledger`)
                }
              >
                {t('dashboard.decisionInbox.money.action')}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderStockGroup = (group: DashboardDecisionGroup<LowStockDecision>) => (
    <section className="dashboard-decision-group" aria-labelledby="dashboard-stock-decisions">
      <h3 id="dashboard-stock-decisions">{t('dashboard.decisionInbox.stock.title')}</h3>
      {!group.available ? (
        renderUnavailableGroup('stock')
      ) : group.records.length === 0 ? (
        <p className="dashboard-decision-empty">{t('dashboard.decisionInbox.stock.empty')}</p>
      ) : (
        <div className="dashboard-decision-list">
          {group.records.map((decision) => (
            <article
              className="dashboard-decision-card dashboard-decision-card--stock"
              key={decision.variant_id}
            >
              <div className="dashboard-decision-card__heading">
                <strong>
                  {decision.product_name || t('dashboard.decisionInbox.stock.unknownProduct')}
                </strong>
                <span>
                  {formatNumber(decision.reason.quantity)} /{' '}
                  {formatNumber(decision.reason.low_stock_threshold)}
                </span>
              </div>
              {variantName(decision) && <p>{variantName(decision)}</p>}
              <p className="dashboard-decision-card__sku">
                <span>{t('dashboard.decisionInbox.stock.sku')}</span>
                <span>{decision.sku || t('dashboard.decisionInbox.stock.noSku')}</span>
              </p>
              <p>{t('dashboard.decisionInbox.stock.reason')}</p>
              <button
                type="button"
                onClick={() => history.push(`/products/${decision.destination.product_id}`)}
              >
                {t('dashboard.decisionInbox.stock.action')}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderHeldGroup = (group: DashboardDecisionGroup<HeldBillAttentionDecision>) => (
    <section className="dashboard-decision-group" aria-labelledby="dashboard-held-decisions">
      <h3 id="dashboard-held-decisions">{t('dashboard.decisionInbox.held.title')}</h3>
      {!group.available ? (
        renderUnavailableGroup('held')
      ) : group.records.length === 0 ? (
        <p className="dashboard-decision-empty">{t('dashboard.decisionInbox.held.empty')}</p>
      ) : (
        <div className="dashboard-decision-list">
          {group.records.map((decision) => (
            <article
              className="dashboard-decision-card dashboard-decision-card--held"
              key={decision.invoice_id}
            >
              <div className="dashboard-decision-card__heading">
                <strong>
                  {decision.invoice_number || t('dashboard.decisionInbox.held.unnumbered')}
                </strong>
                <span>{formatCurrency(decision.total_amount)}</span>
              </div>
              <p>
                {formatNumber(decision.item_count)} {t('dashboard.decisionInbox.held.items')} ·{' '}
                {t(`dashboard.decisionInbox.held.lease.${decision.lease_state.toLowerCase()}`)}
              </p>
              <p>
                {t('dashboard.decisionInbox.held.reason', {
                  heldAt: new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(decision.held_at)),
                })}
              </p>
              <button
                type="button"
                onClick={() =>
                  history.push(
                    `/billing?held=${encodeURIComponent(decision.destination.invoice_id)}`
                  )
                }
              >
                {t('dashboard.decisionInbox.held.action')}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

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

          {isError && stats && (
            <div className="workspace-state dashboard-error dashboard-stale-warning" role="alert">
              <p>{t('dashboard.statsUnavailable')}</p>
              <button type="button" onClick={() => void refetch()}>
                {t('dashboard.retry')}
              </button>
            </div>
          )}

          {isLoading && !stats ? (
            <div className="workspace-state" role="status">
              {t('common.loading')}
            </div>
          ) : !stats ? (
            <div className="workspace-state dashboard-error" role="alert">
              <p>{t('dashboard.statsUnavailable')}</p>
              <button type="button" onClick={() => void refetch()}>
                {t('dashboard.retry')}
              </button>
            </div>
          ) : (
            <>
              {canSeeDecisionInbox && (
                <section
                  className="dashboard-decision-inbox"
                  aria-labelledby="dashboard-decision-inbox-title"
                >
                  <div className="dashboard-decision-inbox__header">
                    <div>
                      <h2 id="dashboard-decision-inbox-title">
                        {t('dashboard.decisionInbox.title')}
                      </h2>
                      <p>{t('dashboard.decisionInbox.subtitle')}</p>
                    </div>
                  </div>
                  {!stats.decision_inbox ? (
                    <div
                      className="dashboard-decision-state dashboard-decision-state--inbox"
                      role="alert"
                    >
                      <p>{t('dashboard.decisionInbox.unavailable')}</p>
                      <button type="button" onClick={() => void refetch()}>
                        {t('dashboard.retry')}
                      </button>
                    </div>
                  ) : (
                    <div className="dashboard-decision-groups">
                      {renderMoneyGroup(stats.decision_inbox.money_to_collect)}
                      {renderStockGroup(stats.decision_inbox.low_stock)}
                      {renderHeldGroup(stats.decision_inbox.held_bills)}
                    </div>
                  )}
                </section>
              )}
              <section
                className="dashboard-priorities"
                data-testid="dashboard-priorities"
                aria-label={t('dashboard.title')}
              >
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
        </main>
      </IonContent>
    </IonPage>
  );
};
