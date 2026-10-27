import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  platformApi,
  type PlatformLead,
  type PlatformLeadDetails,
  type PlatformPlan,
} from '@core/api/platformApi';

interface Props {
  plans: PlatformPlan[];
  onActivated: () => Promise<void> | void;
}

export const PlatformLeadPanel: React.FC<Props> = ({ plans, onActivated }) => {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [selected, setSelected] = useState<PlatformLead | null>(null);
  const [details, setDetails] = useState<PlatformLeadDetails | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [planCode, setPlanCode] = useState<'STARTER' | 'PRO' | 'BUSINESS'>('PRO');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    email: '',
    gstNumber: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [repair, setRepair] = useState({
    userId: '',
    tenantId: '',
    reason: '',
    password: '',
    confirmed: false,
  });
  const [cleanup, setCleanup] = useState<Array<{ id: string; tenantId: string; status: string }>>(
    []
  );
  const [cleanupPassword, setCleanupPassword] = useState('');
  const [cleanupConfirmed, setCleanupConfirmed] = useState(false);
  const [deletion, setDeletion] = useState({
    requestId: '',
    decision: 'IN_REVIEW' as 'IN_REVIEW' | 'COMPLETED' | 'REJECTED' | 'CANCELLED',
    notes: '',
    password: '',
    confirmed: false,
  });

  const load = useCallback(
    async (search = '') => setLeads(await platformApi.listLeads(search)),
    []
  );
  useEffect(() => {
    void load().catch((requestError) =>
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      )
    );
  }, [load, t]);

  const choose = (lead: PlatformLead) => {
    setSelected(lead);
    setMessage('');
    setError('');
    setForm({
      shopName: lead.shopName || '',
      ownerName: lead.identity.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      gstNumber: '',
    });
    setDetails(null);
    void platformApi
      .getLeadDetails(lead.id)
      .then(setDetails)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : t('platform.commercial.actionFailed')
        )
      );
  };

  const decideDeletion = async () => {
    if (
      !deletion.confirmed ||
      !deletion.password ||
      !deletion.requestId ||
      deletion.notes.trim().length < 4
    )
      return;
    setBusy(true);
    setError('');
    try {
      await platformApi.reauthenticate(deletion.password);
      await platformApi.decideDeletionRequest(
        deletion.requestId,
        deletion.decision,
        deletion.notes.trim()
      );
      if (selected) setDetails(await platformApi.getLeadDetails(selected.id));
      setDeletion({
        requestId: '',
        decision: 'IN_REVIEW',
        notes: '',
        password: '',
        confirmed: false,
      });
      setMessage(t('platform.commercial.deletionUpdated'));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      );
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await platformApi.activateLead(selected.id, {
        ...form,
        gstNumber: form.gstNumber || undefined,
        planCode,
        billingCycle,
      });
      setMessage(
        result.idempotent
          ? t('platform.commercial.activationRecovered')
          : t('platform.commercial.activationComplete')
      );
      await Promise.all([load(), onActivated()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      );
    } finally {
      setBusy(false);
    }
  };

  const repairMembership = async () => {
    if (!selected || !repair.confirmed || !repair.password) return;
    setBusy(true);
    setError('');
    try {
      await platformApi.reauthenticate(repair.password);
      await platformApi.repairIdentityMembership(
        selected.identity.id,
        repair.userId,
        repair.tenantId,
        repair.reason
      );
      setMessage(t('platform.commercial.repairComplete'));
      setRepair({ userId: '', tenantId: '', reason: '', password: '', confirmed: false });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      );
    } finally {
      setBusy(false);
    }
  };

  const previewCleanup = async () => {
    try {
      setCleanup(await platformApi.previewDemoCleanup());
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      );
    }
  };

  const executeCleanup = async () => {
    if (!cleanupConfirmed || !cleanupPassword || cleanup.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await platformApi.reauthenticate(cleanupPassword);
      await platformApi.executeDemoCleanup(cleanup.map((item) => item.id));
      setCleanup([]);
      setCleanupPassword('');
      setCleanupConfirmed(false);
      setMessage(t('platform.commercial.cleanupComplete'));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="platform-lead-panel" aria-labelledby="lead-heading">
      <div className="platform-detail-heading">
        <div>
          <p className="platform-eyebrow">{t('platform.commercial.leadEyebrow')}</p>
          <h2 id="lead-heading">{t('platform.commercial.leads')}</h2>
        </div>
          <button type="button" onClick={() => void load(leadSearch)}>
          {t('platform.commercial.refresh')}
        </button>
      </div>
      <form
        className="platform-inline-search"
        onSubmit={(event) => {
          event.preventDefault();
          void load(leadSearch);
        }}
      >
        <label>
          {t('platform.commercial.searchLeads')}
          <input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} />
        </label>
        <button type="submit">{t('platform.searchAction')}</button>
      </form>
      <div className="platform-lead-grid">
        {leads.map((lead) => (
          <button
            type="button"
            key={lead.id}
            className={selected?.id === lead.id ? 'selected' : ''}
            onClick={() => choose(lead)}
          >
            <strong>{lead.shopName || lead.identity.name || lead.email}</strong>
            <span>
              {lead.identity.provider || t('common.notAvailable')} · {lead.status}
            </span>
            <span>
              {lead.demo?.status || t('common.notAvailable')} · {lead.milestones.length}{' '}
              {t('platform.commercial.milestones')}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="platform-lead-actions">
          <section>
            <h3>{t('platform.commercial.activateProspect')}</h3>
            <label>
              {t('platform.shopName')}
              <input
                value={form.shopName}
                onChange={(event) => setForm({ ...form, shopName: event.target.value })}
              />
            </label>
            <label>
              {t('platform.ownerName')}
              <input
                value={form.ownerName}
                onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
              />
            </label>
            <label>
              {t('platform.phone')}
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label>
              {t('platform.loginEmail')}
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              {t('platform.commercial.targetPlan')}
              <select
                value={planCode}
                onChange={(event) => setPlanCode(event.target.value as typeof planCode)}
              >
                {plans
                  .filter((plan) => ['STARTER', 'PRO', 'BUSINESS'].includes(plan.code))
                  .map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t('platform.commercial.billingCycle')}
              <select
                value={billingCycle}
                onChange={(event) => setBillingCycle(event.target.value as typeof billingCycle)}
              >
                <option value="YEARLY">{t('platform.commercial.yearly')}</option>
                <option value="MONTHLY">{t('platform.commercial.monthly')}</option>
              </select>
            </label>
            <button type="button" onClick={() => void activate()} disabled={busy}>
              {t('platform.commercial.activate')}
            </button>
          </section>
          <details>
            <summary>{t('platform.commercial.repairMembership')}</summary>
            <p>{t('platform.commercial.repairWarning')}</p>
            <label>
              {t('platform.commercial.userId')}
              <input
                value={repair.userId}
                onChange={(event) => setRepair({ ...repair, userId: event.target.value })}
              />
            </label>
            <label>
              {t('platform.commercial.tenantId')}
              <input
                value={repair.tenantId}
                onChange={(event) => setRepair({ ...repair, tenantId: event.target.value })}
              />
            </label>
            <label>
              {t('platform.commercial.reason')}
              <input
                value={repair.reason}
                onChange={(event) => setRepair({ ...repair, reason: event.target.value })}
              />
            </label>
            <label>
              {t('platform.commercial.adminPassword')}
              <input
                type="password"
                value={repair.password}
                onChange={(event) => setRepair({ ...repair, password: event.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={repair.confirmed}
                onChange={(event) => setRepair({ ...repair, confirmed: event.target.checked })}
              />
              {t('platform.commercial.confirmRepair')}
            </label>
            <button
              type="button"
              disabled={busy || !repair.confirmed || !repair.password || repair.reason.length < 4}
              onClick={() => void repairMembership()}
            >
              {t('platform.commercial.repair')}
            </button>
          </details>
          {details && (
            <section
              className="platform-lead-detail"
              aria-label={t('platform.commercial.activityDetails')}
            >
              <h3>{t('platform.commercial.activityDetails')}</h3>
              <p>
                {t('platform.commercial.identityProvider')}:{' '}
                {details.identity.providers.map((provider) => provider.provider).join(', ') ||
                  t('common.notAvailable')}
              </p>
              <p>
                {t('platform.commercial.lastSignIn')}:{' '}
                {details.identity.providers[0]?.lastSeenAt
                  ? new Date(details.identity.providers[0].lastSeenAt).toLocaleString()
                  : t('common.notAvailable')}
              </p>
              <p>
                {t('platform.commercial.conversionState')}:{' '}
                {details.conversions[0]?.status || selected.status}
              </p>
              <div className="platform-history">
                {details.milestones.map((milestone) => (
                  <article key={milestone.code}>
                    <strong>{milestone.code}</strong>
                    <time>{new Date(milestone.firstObservedAt).toLocaleString()}</time>
                  </article>
                ))}
              </div>
            </section>
          )}
          {!!details?.deletionRequests.length && (
            <details className="platform-sensitive-action">
              <summary>{t('platform.commercial.deletionHandling')}</summary>
              <label>
                {t('platform.commercial.deletionRequest')}
                <select
                  value={deletion.requestId}
                  onChange={(event) => setDeletion({ ...deletion, requestId: event.target.value })}
                >
                  <option value="">{t('platform.commercial.selectRequest')}</option>
                  {details.deletionRequests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.id} · {request.status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('platform.commercial.decision')}
                <select
                  value={deletion.decision}
                  onChange={(event) =>
                    setDeletion({
                      ...deletion,
                      decision: event.target.value as typeof deletion.decision,
                    })
                  }
                >
                  <option value="IN_REVIEW">{t('platform.commercial.decisionReview')}</option>
                  <option value="COMPLETED">{t('platform.commercial.decisionComplete')}</option>
                  <option value="REJECTED">{t('platform.commercial.decisionReject')}</option>
                  <option value="CANCELLED">{t('platform.commercial.decisionCancel')}</option>
                </select>
              </label>
              <label>
                {t('platform.commercial.notes')}
                <input
                  value={deletion.notes}
                  onChange={(event) => setDeletion({ ...deletion, notes: event.target.value })}
                />
              </label>
              <label>
                {t('platform.commercial.adminPassword')}
                <input
                  type="password"
                  value={deletion.password}
                  onChange={(event) => setDeletion({ ...deletion, password: event.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={deletion.confirmed}
                  onChange={(event) =>
                    setDeletion({ ...deletion, confirmed: event.target.checked })
                  }
                />
                {t('platform.commercial.confirmDeletion')}
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  !deletion.confirmed ||
                  !deletion.password ||
                  !deletion.requestId ||
                  deletion.notes.trim().length < 4
                }
                onClick={() => void decideDeletion()}
              >
                {t('platform.commercial.applyDecision')}
              </button>
            </details>
          )}
        </div>
      )}
      <details className="platform-cleanup-panel">
        <summary>{t('platform.commercial.demoCleanup')}</summary>
        <button type="button" onClick={() => void previewCleanup()}>
          {t('platform.commercial.previewCleanup')}
        </button>
        {cleanup.map((item) => (
          <p key={item.id}>
            {item.id} · {item.tenantId} · {item.status}
          </p>
        ))}
        {cleanup.length > 0 && (
          <>
            <label>
              {t('platform.commercial.adminPassword')}
              <input
                type="password"
                value={cleanupPassword}
                onChange={(event) => setCleanupPassword(event.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={cleanupConfirmed}
                onChange={(event) => setCleanupConfirmed(event.target.checked)}
              />
              {t('platform.commercial.confirmCleanup')}
            </label>
            <button
              type="button"
              disabled={busy || !cleanupConfirmed || !cleanupPassword}
              onClick={() => void executeCleanup()}
            >
              {t('platform.commercial.purge')}
            </button>
          </>
        )}
      </details>
      {message && (
        <p role="status" className="platform-message success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="platform-message error">
          {error}
        </p>
      )}
    </section>
  );
};
