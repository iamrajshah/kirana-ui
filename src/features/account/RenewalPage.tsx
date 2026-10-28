import React, { useMemo, useState, type FormEvent } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useGetPublicProductQuery } from '@core/api/lifecycleApi';
import {
  useListRenewalsQuery,
  useSubmitRenewalMutation,
  useUploadRenewalProofMutation,
} from '@core/api/subscriptionApi';

const allowedProofTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const maxProofBytes = 5 * 1024 * 1024;

export const RenewalPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: product } = useGetPublicProductQuery();
  const renewals = useListRenewalsQuery(undefined, {
    pollingInterval: 30_000,
    skipPollingIfUnfocused: true,
  });
  const [submitRenewal, submitState] = useSubmitRenewalMutation();
  const [uploadProof, uploadState] = useUploadRenewalProofMutation();
  const [planCode, setPlanCode] = useState<'STARTER' | 'PRO' | 'BUSINESS'>('PRO');
  const [billingCycle, setBillingCycle] = useState<'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY'>('YEARLY');
  const [provider, setProvider] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [validationError, setValidationError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pending = useMemo(
    () => renewals.data?.find((renewal) => renewal.status === 'PENDING') ?? null,
    [renewals.data]
  );
  const busy = submitState.isLoading || uploadState.isLoading;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError('');
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setValidationError(t('renewal.amountInvalid'));
      return;
    }
    if (proof && (!allowedProofTypes.has(proof.type) || proof.size > maxProofBytes)) {
      setValidationError(t('renewal.proofInvalid'));
      return;
    }
    try {
      const created = await submitRenewal({
        planCode,
        billingCycle,
        provider,
        transactionReference: reference,
        amountPaise: Math.round(rupees * 100),
      }).unwrap();
      if (proof && !created.proof)
        await uploadProof({ requestId: created.id, file: proof }).unwrap();
      setSubmitted(true);
      setReference('');
      setAmount('');
      setProof(null);
    } catch {
      return;
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto max-w-4xl space-y-5 text-[var(--ion-text-color)]">
          <header className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm">
            <p className="text-sm font-medium text-[var(--ion-color-primary)]">
              {t('renewal.eyebrow')}
            </p>
            <h1 className="text-3xl font-bold">{t('renewal.title')}</h1>
            <p className="mt-2">{t('renewal.description')}</p>
          </header>
          {pending ? (
            <section
              className="rounded-2xl border border-amber-400 bg-[var(--ion-card-background)] p-5 shadow-sm"
              role="status"
            >
              <h2 className="text-xl font-semibold">{t('renewal.pendingTitle')}</h2>
              <p className="mt-2">
                {t('renewal.pendingDescription', { reference: pending.transactionReference })}
              </p>
              {pending.proof ? <p className="mt-2 text-sm">{t('renewal.proofReceived')}</p> : null}
            </section>
          ) : (
            <form
              className="space-y-4 rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm"
              onSubmit={(event) => void submit(event)}
            >
              <h2 className="text-xl font-semibold">{t('renewal.submitTitle')}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  {t('renewal.plan')}
                  <select
                    className="mt-1 w-full rounded border bg-transparent p-3"
                    value={planCode}
                    onChange={(event) => setPlanCode(event.target.value as typeof planCode)}
                  >
                    {product?.plans
                      .filter((plan) => ['STARTER', 'PRO', 'BUSINESS'].includes(plan.code))
                      .map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {t('renewal.billingCycle')}
                  <select
                    className="mt-1 w-full rounded border bg-transparent p-3"
                    value={billingCycle}
                    onChange={(event) => setBillingCycle(event.target.value as typeof billingCycle)}
                  >
                    <option value="YEARLY">{t('account.yearly')}</option>
                    <option value="HALF_YEARLY">{t('account.half_yearly')}</option>
                    <option value="QUARTERLY">{t('account.quarterly')}</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  {t('renewal.provider')}
                  <input
                    className="mt-1 w-full rounded border bg-transparent p-3"
                    value={provider}
                    onChange={(event) => setProvider(event.target.value)}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  {t('renewal.reference')}
                  <input
                    className="mt-1 w-full rounded border bg-transparent p-3"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    required
                    minLength={4}
                  />
                </label>
              </div>
              <label className="block">
                {t('renewal.amount')}
                <input
                  className="mt-1 w-full rounded border bg-transparent p-3"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="block">
                {t('renewal.proof')}
                <input
                  className="mt-1 block w-full rounded border p-3"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(event) => setProof(event.target.files?.[0] ?? null)}
                />
                <small>{t('renewal.proofHelp')}</small>
              </label>
              {validationError ? (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {validationError}
                </p>
              ) : null}
              {submitState.isError || uploadState.isError ? (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {t('renewal.submitFailed')}
                </p>
              ) : null}
              {submitted ? (
                <p role="status" className="rounded bg-green-50 p-3 text-green-800">
                  {t('renewal.submitted')}
                </p>
              ) : null}
              <button
                className="rounded-lg bg-[var(--ion-color-primary)] px-5 py-3 font-semibold text-white disabled:opacity-60"
                disabled={busy}
              >
                {busy ? t('renewal.submitting') : t('renewal.submit')}
              </button>
            </form>
          )}
          <section className="rounded-2xl bg-[var(--ion-card-background)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t('renewal.history')}</h2>
              <button
                type="button"
                className="text-[var(--ion-color-primary)]"
                onClick={() => renewals.refetch()}
              >
                {t('common.refresh')}
              </button>
            </div>
            {renewals.isLoading ? (
              <p className="mt-3" role="status">
                {t('common.loading')}
              </p>
            ) : renewals.isError ? (
              <p className="mt-3" role="alert">
                {t('renewal.loadFailed')}
              </p>
            ) : !renewals.data?.length ? (
              <p className="mt-3">{t('renewal.empty')}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {renewals.data.map((renewal) => (
                  <article key={renewal.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>
                        {renewal.plan.name} · {renewal.billingCycle}
                      </strong>
                      <span>{t(`renewal.status.${renewal.status}`)}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      {renewal.provider} · {renewal.transactionReference}
                    </p>
                    {renewal.decisionReason ? (
                      <p className="mt-2 text-sm">
                        {t('renewal.reason', { reason: renewal.decisionReason })}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
          <Link className="inline-block text-[var(--ion-color-primary)]" to={ROUTES.ACCOUNT}>
            {t('renewal.back')}
          </Link>
        </main>
      </IonContent>
    </IonPage>
  );
};
