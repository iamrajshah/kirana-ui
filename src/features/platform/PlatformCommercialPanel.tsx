import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { platformApi, type DowngradePreview, type PlatformPlan, type PlatformTenantDetails } from '@core/api/platformApi';

interface Props {
  tenant: PlatformTenantDetails;
  plans: PlatformPlan[];
  onChanged: () => Promise<void> | void;
}

export const PlatformCommercialPanel: React.FC<Props> = ({ tenant, plans, onChanged }) => {
  const { t } = useTranslation();
  const paidPlans = plans.filter((plan) => ['STARTER', 'PRO', 'BUSINESS'].includes(plan.code));
  const [planCode, setPlanCode] = useState(tenant.commercial?.plan.code || 'STARTER');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>(tenant.commercial?.billingCycle || 'YEARLY');
  const [preview, setPreview] = useState<DowngradePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lifecycle, setLifecycle] = useState('ACTIVE');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');

  const previewPlan = async () => {
    setBusy(true); setError(''); setSuccess('');
    try { setPreview(await platformApi.previewSubscriptionChange(tenant.id, planCode)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')); }
    finally { setBusy(false); }
  };

  const applyPlan = async () => {
    if (!preview?.canActivate) return;
    setBusy(true); setError('');
    try {
      await platformApi.changeSubscription(tenant.id, planCode, billingCycle);
      setSuccess(t('platform.commercial.planUpdated'));
      setPreview(null);
      await onChanged();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')); }
    finally { setBusy(false); }
  };

  const applyLifecycle = async () => {
    if (!password || reason.trim().length < 4) return;
    setBusy(true); setError('');
    try {
      await platformApi.reauthenticate(password);
      await platformApi.transitionSubscription(tenant.id, lifecycle, reason.trim());
      setPassword(''); setReason(''); setSuccess(t('platform.commercial.lifecycleUpdated'));
      await onChanged();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t('platform.commercial.actionFailed')); }
    finally { setBusy(false); }
  };

  return (
    <section className="platform-commercial-panel" aria-labelledby="commercial-heading">
      <div className="platform-detail-heading">
        <div><p className="platform-eyebrow">{t('platform.commercial.eyebrow')}</p><h2 id="commercial-heading">{t('platform.commercial.title')}</h2></div>
        <span className="platform-commercial-state">{tenant.commercial?.state || t('common.notAvailable')}</span>
      </div>
      {tenant.commercial && (
        <dl className="platform-detail-grid">
          <div><dt>{t('platform.commercial.plan')}</dt><dd>{tenant.commercial.plan.name} {t('platform.commercial.version', { version: tenant.commercial.plan.version })}</dd></div>
          <div><dt>{t('platform.commercial.billingCycle')}</dt><dd>{tenant.commercial.billingCycle || t('common.notAvailable')}</dd></div>
          <div><dt>{t('platform.commercial.staffUsage')}</dt><dd>{tenant.commercial.usage.staff} / {tenant.commercial.limits.staff ?? '∞'}</dd></div>
          <div><dt>{t('platform.commercial.firmUsage')}</dt><dd>{tenant.commercial.usage.firms} / {tenant.commercial.limits.firms ?? '∞'}</dd></div>
          <div><dt>{t('platform.commercial.renewsOn')}</dt><dd>{tenant.commercial.endsAt ? new Date(tenant.commercial.endsAt).toLocaleDateString() : t('common.notAvailable')}</dd></div>
          <div><dt>{t('platform.commercial.graceUntil')}</dt><dd>{tenant.commercial.graceExpiresAt ? new Date(tenant.commercial.graceExpiresAt).toLocaleDateString() : t('common.notAvailable')}</dd></div>
        </dl>
      )}

      <div className="platform-commercial-form">
        <label>{t('platform.commercial.targetPlan')}<select value={planCode} onChange={(event) => { setPlanCode(event.target.value); setPreview(null); }}>{paidPlans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} {t('platform.commercial.version', { version: plan.version })}</option>)}</select></label>
        <label>{t('platform.commercial.billingCycle')}<select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as 'MONTHLY' | 'YEARLY')}><option value="YEARLY">{t('platform.commercial.yearly')}</option><option value="MONTHLY">{t('platform.commercial.monthly')}</option></select></label>
        <button type="button" onClick={() => void previewPlan()} disabled={busy}>{t('platform.commercial.previewChange')}</button>
      </div>
      {preview && <div className={preview.canActivate ? 'platform-commercial-preview ready' : 'platform-commercial-preview blocked'} role="status">
        <strong>{preview.canActivate ? t('platform.commercial.ready') : t('platform.commercial.blocked')}</strong>
        {preview.conflicts.map((conflict, index) => <p key={`${conflict.type}-${index}`}>{conflict.type}{conflict.current !== undefined ? `: ${conflict.current} / ${conflict.limit}` : conflict.feature ? `: ${conflict.feature}` : ''}</p>)}
        {preview.canActivate && <button type="button" onClick={() => void applyPlan()} disabled={busy}>{t('platform.commercial.applyChange')}</button>}
      </div>}

      <details className="platform-sensitive-action">
        <summary>{t('platform.commercial.lifecycleOverride')}</summary>
        <p>{t('platform.commercial.reauthNotice')}</p>
        <label>{t('platform.commercial.state')}<select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}><option value="ACTIVE">{t('platform.commercial.stateActive')}</option><option value="GRACE">{t('platform.commercial.stateGrace')}</option><option value="READ_ONLY">{t('platform.commercial.stateReadOnly')}</option><option value="SUSPENDED">{t('platform.commercial.stateSuspended')}</option><option value="CANCELLED">{t('platform.commercial.stateCancelled')}</option></select></label>
        <label>{t('platform.commercial.reason')}<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label>{t('platform.commercial.adminPassword')}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="button" onClick={() => void applyLifecycle()} disabled={busy || !password || reason.trim().length < 4}>{t('platform.commercial.confirmLifecycle')}</button>
      </details>

      {error && <p role="alert" className="platform-message error">{error}</p>}
      {success && <p role="status" className="platform-message success">{success}</p>}
      {!!tenant.commercial?.history.length && <div className="platform-history"><h3>{t('platform.commercial.subscriptionHistory')}</h3>{tenant.commercial.history.map((item) => <article key={item.id}><strong>{item.from || '—'} → {item.to}</strong><span>{item.reason || t('common.notAvailable')}</span><time>{new Date(item.occurredAt).toLocaleString()}</time></article>)}</div>}
      {!!tenant.auditHistory.length && <div className="platform-history"><h3>{t('platform.commercial.auditHistory')}</h3>{tenant.auditHistory.map((item) => <article key={item.id}><strong>{item.action}</strong><time>{new Date(item.occurredAt).toLocaleString()}</time></article>)}</div>}
    </section>
  );
};
