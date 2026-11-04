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
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { useAppSelector } from '@core/hooks';
import { getNavigationItems } from '@core/navigation/navigation';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';
import { useGetExpiryAlertsQuery } from '@core/api/expiryApi';
import { ROUTES } from '@core/constants';
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
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const canTrackExpiry = canUseCommercialFeature(
    user?.roles ?? [],
    commercialAccess,
    'EXPIRY_TRACKING'
  );
  const { data, isLoading, isError, refetch } = useGetDashboardStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const stats = data?.data;
  const {
    data: expiryResponse,
    isError: expiryError,
    refetch: refetchExpiry,
  } = useGetExpiryAlertsQuery(
    { windowDays: 30 },
    { skip: !canTrackExpiry, refetchOnFocus: true, refetchOnReconnect: true }
  );
  const shortcuts = getNavigationItems(user?.roles || [], commercialAccess).filter((item) =>
    shortcutIds.has(item.id)
  );
  const canSeeDecisionInbox =
    user?.roles?.some((role) => role === 'OWNER' || role === 'MANAGER') ?? false;
  const isCashierOnly =
    Boolean(user?.roles?.includes('CASHIER')) &&
    !user?.roles?.some((role) => role === 'OWNER' || role === 'MANAGER');

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await Promise.all([refetch(), ...(canTrackExpiry ? [refetchExpiry()] : [])]);
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

  const renderOwnerInsights = () => {
    const insight = stats?.insights?.owner;
    if (!insight) return null;
    const paymentTotal = insight.paymentMix.reduce((sum, item) => sum + item.amount, 0);
    const growthTone = Number(insight.sales.growthPercent ?? 0) < 0 ? 'negative' : 'positive';

    return (
      <section className="dashboard-insights" aria-labelledby="dashboard-owner-insights">
        <div className="dashboard-insights__heading">
          <div>
            <h2 id="dashboard-owner-insights">{t('dashboard.insights.owner.title')}</h2>
            <p>{t('dashboard.insights.owner.subtitle')}</p>
          </div>
          <span className="dashboard-insights__badge">{t('dashboard.insights.owner.badge')}</span>
        </div>
        <div className="dashboard-insights__grid">
          <article className="dashboard-insight-card dashboard-insight-card--sales">
            <h3>{t('dashboard.insights.owner.monthSales')}</h3>
            <strong>{formatCurrency(insight.sales.month)}</strong>
            <div className="dashboard-comparison">
              <span>
                {t('dashboard.insights.owner.previousMonth')}:{' '}
                {formatCurrency(insight.sales.previousMonth)}
              </span>
              {insight.sales.growthPercent !== null && (
                <span className={`dashboard-growth dashboard-growth--${growthTone}`}>
                  {insight.sales.growthPercent >= 0 ? '+' : ''}
                  {insight.sales.growthPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </article>

          <article className="dashboard-insight-card">
            <h3>{t('dashboard.insights.owner.paymentMix')}</h3>
            {insight.paymentMix.length === 0 ? (
              <p className="dashboard-insight-empty">{t('dashboard.insights.noData')}</p>
            ) : (
              <div className="dashboard-payment-mix">
                {insight.paymentMix.map((item) => {
                  const percent = paymentTotal > 0 ? (item.amount / paymentTotal) * 100 : 0;
                  return (
                    <div className="dashboard-payment-row" key={item.mode}>
                      <div>
                        <span>{t(`payments.modes.${item.mode.toLowerCase()}`, item.mode)}</span>
                        <strong>{formatCurrency(item.amount)}</strong>
                      </div>
                      <div className="dashboard-payment-bar" aria-hidden="true">
                        <span style={{ width: `${Math.max(3, percent)}%` }} />
                      </div>
                      <small>{t('dashboard.insights.billCount', { count: item.billCount })}</small>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="dashboard-insight-card">
            <h3>{t('dashboard.insights.owner.onlineOrders')}</h3>
            <div className="dashboard-funnel">
              <div>
                <strong>{formatNumber(insight.online.pending)}</strong>
                <span>{t('dashboard.insights.pending')}</span>
              </div>
              <div>
                <strong>{formatNumber(insight.online.accepted)}</strong>
                <span>{t('dashboard.insights.accepted')}</span>
              </div>
              <div>
                <strong>{formatNumber(insight.online.completed)}</strong>
                <span>{t('dashboard.insights.completed')}</span>
              </div>
            </div>
          </article>
        </div>

        <article className="dashboard-seasonal">
          <div>
            <h3>{t('dashboard.insights.owner.seasonalTitle')}</h3>
            <p>{t('dashboard.insights.owner.seasonalSubtitle')}</p>
          </div>
          {insight.seasonalRestock.length === 0 ? (
            <div className="dashboard-history-state">
              <strong>{t('dashboard.insights.owner.historyBuilding')}</strong>
              <span>{t('dashboard.insights.owner.historyBuildingHint')}</span>
            </div>
          ) : (
            <div className="dashboard-seasonal-list">
              {insight.seasonalRestock.map((item) => (
                <button
                  type="button"
                  className="dashboard-seasonal-item"
                  key={item.variantId}
                  onClick={() => history.push(`/products/${item.productId}`)}
                >
                  <span>
                    <strong>{item.productName}</strong>
                    <small>
                      {t('dashboard.insights.owner.lastYear', {
                        quantity: formatNumber(item.lastYearSameMonthQty),
                      })}
                    </small>
                  </span>
                  <span>
                    {t('dashboard.insights.owner.suggested', {
                      quantity: formatNumber(item.suggestedQty),
                    })}
                    <small>
                      {t(`dashboard.insights.confidence.${item.confidence.toLowerCase()}`)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>
    );
  };

  const renderManagerInsights = () => {
    const insight = stats?.insights?.manager;
    if (!insight) return null;
    return (
      <section className="dashboard-insights" aria-labelledby="dashboard-manager-insights">
        <div className="dashboard-insights__heading">
          <div>
            <h2 id="dashboard-manager-insights">{t('dashboard.insights.manager.title')}</h2>
            <p>{t('dashboard.insights.manager.subtitle')}</p>
          </div>
        </div>
        <div className="dashboard-manager-strip">
          <span>
            <strong>{formatNumber(insight.onlineQueue.pending)}</strong>
            {t('dashboard.insights.manager.ordersWaiting')}
          </span>
          <span>
            <strong>{formatNumber(insight.onlineQueue.accepted)}</strong>
            {t('dashboard.insights.manager.ordersAccepted')}
          </span>
          <span>
            <strong>{formatNumber(insight.heldBills)}</strong>
            {t('dashboard.insights.manager.heldBills')}
          </span>
        </div>
        <div className="dashboard-cashiers" role="table">
          <div className="dashboard-cashiers__row dashboard-cashiers__header" role="row">
            <span role="columnheader">{t('dashboard.insights.manager.cashier')}</span>
            <span role="columnheader">{t('dashboard.insights.manager.bills')}</span>
            <span role="columnheader">{t('dashboard.insights.manager.sales')}</span>
            <span role="columnheader">{t('dashboard.insights.manager.averageBill')}</span>
          </div>
          {insight.cashierPerformance.length === 0 ? (
            <p className="dashboard-insight-empty">{t('dashboard.insights.noData')}</p>
          ) : (
            insight.cashierPerformance.map((cashier) => (
              <div className="dashboard-cashiers__row" role="row" key={cashier.userId}>
                <strong role="cell">{cashier.name}</strong>
                <span role="cell">{formatNumber(cashier.billCount)}</span>
                <span role="cell">{formatCurrency(cashier.sales)}</span>
                <span role="cell">{formatCurrency(cashier.averageBasket)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  const renderCashierInsights = () => {
    const insight = stats?.insights?.cashier;
    if (!insight) return null;
    return (
      <section className="dashboard-insights" aria-labelledby="dashboard-cashier-insights">
        <div className="dashboard-insights__heading">
          <div>
            <h2 id="dashboard-cashier-insights">{t('dashboard.insights.cashier.title')}</h2>
            <p>{t('dashboard.insights.cashier.subtitle')}</p>
          </div>
        </div>
        <div className="dashboard-manager-strip">
          <span>
            <strong>{formatNumber(insight.ownBills)}</strong>
            {t('dashboard.insights.cashier.bills')}
          </span>
          <span>
            <strong>{formatCurrency(insight.ownSales)}</strong>
            {t('dashboard.insights.cashier.sales')}
          </span>
          <span>
            <strong>{formatNumber(insight.heldBills)}</strong>
            {t('dashboard.insights.cashier.heldBills')}
          </span>
        </div>
      </section>
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
              {stats.insights?.scope === 'OWNER' && renderOwnerInsights()}
              {stats.insights?.scope === 'MANAGER' && renderManagerInsights()}
              {stats.insights?.scope === 'CASHIER' && renderCashierInsights()}
              {canTrackExpiry && expiryResponse?.data && (
                <button
                  type="button"
                  className="dashboard-expiry-alert"
                  onClick={() => history.push(ROUTES.EXPIRY_ALERTS)}
                >
                  <span>
                    <strong>{t('expiry.dashboardTitle')}</strong>
                    <small>{t('expiry.dashboardHint')}</small>
                  </span>
                  <span>
                    <strong>{formatNumber(expiryResponse.data.summary.expiredBatches)}</strong>
                    <small>{t('expiry.expired')}</small>
                  </span>
                  <span>
                    <strong>{formatNumber(expiryResponse.data.summary.nearExpiryBatches)}</strong>
                    <small>{t('expiry.nearExpiry')}</small>
                  </span>
                </button>
              )}
              {canTrackExpiry && expiryError && (
                <div className="dashboard-expiry-unavailable" role="status">
                  {t('expiry.dashboardUnavailable')}
                </div>
              )}
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
              {!isCashierOnly && (
                <>
                  <section
                    className="dashboard-priorities"
                    data-testid="dashboard-priorities"
                    aria-label={t('dashboard.title')}
                  >
                    {priorityMetrics.map(renderMetric)}
                  </section>
                  <section
                    className="dashboard-secondary"
                    aria-labelledby="dashboard-secondary-title"
                  >
                    <h2 id="dashboard-secondary-title">{t('dashboard.moreMetrics')}</h2>
                    <div className="workspace-grid dashboard-secondary-grid">
                      {otherMetrics.map(renderMetric)}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};
