import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser, selectSessionContext } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import {
  commercialFromSession,
  useCreateSupportRequestMutation,
  useGetAccountSummaryQuery,
  useGetPublicProductQuery,
  useRequestAccountDeletionMutation,
  useSelectAccountMembershipMutation,
} from '@core/api/lifecycleApi';

const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);

const daysRemaining = (value: string | null | undefined) => {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
};

export const SubscriptionAccountPage: React.FC = () => {
  const { t } = useTranslation();
  const session = useAppSelector(selectSessionContext);
  const currentUser = useAppSelector(selectCurrentUser);
  const access = commercialFromSession(session);
  const { data: product } = useGetPublicProductQuery();
  const { data: account } = useGetAccountSummaryQuery();
  const [billing, setBilling] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [support, setSupport] = useState({ subject: '', message: '' });
  const [requestDeletion, deletionState] = useRequestAccountDeletionMutation();
  const [createSupport, supportState] = useCreateSupportRequestMutation();
  const [selectMembership, membershipState] = useSelectAccountMembershipMutation();

  const activeMemberships = useMemo(
    () => session?.memberships.filter((membership) => membership.active) ?? [],
    [session]
  );
  const inactiveMemberships = useMemo(
    () => session?.memberships.filter((membership) => !membership.active) ?? [],
    [session]
  );
  const lifecycleText = access
    ? t(`account.lifecycle.${access.state}`, {
        days: daysRemaining(access.demoExpiresAt ?? access.graceExpiresAt ?? access.endsAt),
      })
    : t('account.lifecycle.UNKNOWN');

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto max-w-5xl space-y-5 text-[var(--ion-text-color)]">
          <header className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm">
            <p className="text-sm font-medium text-[var(--ion-color-primary)]">
              {t('account.eyebrow')}
            </p>
            <h1 className="text-3xl font-bold">{t('account.title')}</h1>
            <p className="mt-2" role="status">
              {lifecycleText}
            </p>
            {access && (
              <p className="mt-1 text-sm">{t('account.currentPlan', { plan: access.planCode })}</p>
            )}
            {currentUser?.roles?.includes('OWNER') && (
              <a
                className="mt-4 inline-block rounded-lg bg-[var(--ion-color-primary)] px-4 py-2 font-semibold text-white"
                href={ROUTES.ACCOUNT_RENEWAL}
              >
                {t('renewal.open')}
              </a>
            )}
          </header>

          <section
            className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm"
            aria-labelledby="plans-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="plans-heading" className="text-2xl font-semibold">
                {t('account.plans')}
              </h2>
              <div
                className="flex rounded-lg border p-1"
                role="group"
                aria-label={t('account.billingPeriod')}
              >
                {(['MONTHLY', 'YEARLY'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={billing === period}
                    onClick={() => setBilling(period)}
                    className={`rounded px-3 py-2 ${billing === period ? 'bg-[var(--ion-color-primary)] text-white' : ''}`}
                  >
                    {t(`account.${period.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {product?.plans.map((plan) => (
                <article
                  key={plan.code}
                  className="rounded-xl border border-[var(--ion-color-light-shade)] p-4"
                >
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm">{plan.description}</p>
                  <p className="mt-4 text-2xl font-bold">
                    {money(billing === 'YEARLY' ? plan.yearlyPricePaise : plan.monthlyPricePaise)}
                    <span className="text-sm font-normal">
                      /{billing === 'YEARLY' ? t('account.year') : t('account.month')}
                    </span>
                  </p>
                  <p className="mt-2 text-sm">
                    {t('account.planLimits', {
                      staff: plan.staffLimit ?? '∞',
                      firms: plan.firmLimit ?? '∞',
                    })}
                  </p>
                  <a
                    className="mt-4 inline-block text-[var(--ion-color-primary)]"
                    href={`mailto:${product.support.email}?subject=${encodeURIComponent(`Kirana ${plan.name} plan`)}`}
                  >
                    {t('account.contactToBuy')}
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">{t('account.shops')}</h2>
            {activeMemberships.length > 1 && (
              <div className="mt-3 space-y-2">
                {activeMemberships.map((membership) => (
                  <button
                    key={membership.userId}
                    type="button"
                    disabled={
                      membershipState.isLoading || session?.selected?.userId === membership.userId
                    }
                    onClick={() => void selectMembership({ userId: membership.userId })}
                    className="w-full rounded-lg border p-3 text-left disabled:opacity-60"
                  >
                    {membership.tenantName}{' '}
                    {session?.selected?.userId === membership.userId
                      ? `· ${t('account.current')}`
                      : ''}
                  </button>
                ))}
              </div>
            )}
            {activeMemberships.length <= 1 && <p className="mt-2">{t('account.oneShop')}</p>}
            {inactiveMemberships.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="font-semibold">{t('account.inactiveHistory')}</h3>
                {inactiveMemberships.map((membership) => (
                  <p key={membership.userId}>
                    {membership.tenantName} · {t('account.inactive')}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <form
              className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void createSupport(support);
              }}
            >
              <h2 className="text-xl font-semibold">{t('account.support')}</h2>
              <label className="mt-3 block">
                {t('account.subject')}
                <input
                  className="mt-1 w-full rounded border bg-transparent p-3"
                  value={support.subject}
                  onChange={(event) => setSupport({ ...support, subject: event.target.value })}
                  required
                  minLength={3}
                />
              </label>
              <label className="mt-3 block">
                {t('account.message')}
                <textarea
                  className="mt-1 w-full rounded border bg-transparent p-3"
                  value={support.message}
                  onChange={(event) => setSupport({ ...support, message: event.target.value })}
                  required
                  minLength={10}
                />
              </label>
              <Button type="submit" loading={supportState.isLoading}>
                {t('account.send')}
              </Button>
              {supportState.isSuccess && (
                <p role="status" className="mt-2">
                  {t('account.supportSent')}
                </p>
              )}
            </form>

            <form
              className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                if (confirmed) void requestDeletion({ reason });
              }}
            >
              <h2 className="text-xl font-semibold">{t('account.deletion')}</h2>
              <p className="mt-2 text-sm">{t('account.deletionHelp')}</p>
              {account?.deletionRequest ? (
                <p className="mt-3" role="status">
                  {t('account.deletionStatus', { status: account.deletionRequest.status })}
                </p>
              ) : (
                <>
                  <label className="mt-3 block">
                    {t('account.reason')}
                    <textarea
                      className="mt-1 w-full rounded border bg-transparent p-3"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                      minLength={4}
                    />
                  </label>
                  <label className="my-3 flex gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    {t('account.confirmDeletion')}
                  </label>
                  <Button type="submit" disabled={!confirmed} loading={deletionState.isLoading}>
                    {t('account.requestDeletion')}
                  </Button>
                </>
              )}
              {deletionState.data?.mode === 'ASSISTED_PAID_OWNER' && (
                <p role="status" className="mt-2">
                  {t('account.assistedDeletion')}
                </p>
              )}
            </form>
          </section>

          <nav className="flex flex-wrap gap-4 pb-8" aria-label={t('account.legal')}>
            <a href={ROUTES.PRIVACY}>{t('auth.privacy')}</a>
            <a href={ROUTES.TERMS}>{t('auth.terms')}</a>
            <a href={ROUTES.ACCOUNT_DELETION}>{t('auth.accountDeletion')}</a>
          </nav>
        </main>
      </IonContent>
    </IonPage>
  );
};
