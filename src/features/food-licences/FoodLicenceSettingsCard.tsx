import { SelectionControl } from '@components/SelectionControl';
import { useDeviceWriteAccess } from '@core/commercial/useDeviceWriteAccess';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetFirmsQuery } from '@core/api/firmApi';
import {
  useGetFoodLicencesQuery,
  useCreateFoodLicenceMutation,
  useUpdateFoodLicenceMutation,
  type FoodLicence,
  type FoodLicenceInput,
} from '@core/api/foodLicenceApi';
import { apiErrorMessage } from '@core/services/notificationService';
import './translations';
import './FoodLicences.css';

const blank = (): FoodLicenceInput => ({
  firm_id: '',
  label: '',
  licence_number: '',
  holder_name: '',
  premises_address: '',
  valid_from: null,
  expiry_date: null,
  is_active: true,
});
export const FoodLicenceSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const deviceWrite = useDeviceWriteAccess('FOOD_LICENCES');
  const { data, isFetching, isError, refetch } = useGetFoodLicencesQuery();
  const { data: firmsData } = useGetFirmsQuery();
  const [create, { isLoading: creating }] = useCreateFoodLicenceMutation();
  const [update, { isLoading: updating }] = useUpdateFoodLicenceMutation();
  const [form, setForm] = useState<FoodLicenceInput | null>(null);
  const [editing, setEditing] = useState<FoodLicence | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const busy = creating || updating;
  const licences = data?.data.licences ?? [];
  const firms = firmsData?.data.firms ?? [];
  const field = <K extends keyof FoodLicenceInput>(key: K, value: FoodLicenceInput[K]) =>
    setForm((old) => (old ? { ...old, [key]: value } : old));
  const edit = (licence: FoodLicence) => {
    setEditing(licence);
    setError('');
    setSaved(false);
    setForm({
      firm_id: licence.firm_id,
      label: licence.label,
      licence_number: licence.licence_number,
      holder_name: licence.holder_name,
      premises_address: licence.premises_address,
      valid_from: licence.valid_from?.slice(0, 10) ?? null,
      expiry_date: licence.expiry_date?.slice(0, 10) ?? null,
      is_active: licence.is_active,
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || busy) return;
    setError('');
    setSaved(false);
    if (form.valid_from && form.expiry_date && form.valid_from > form.expiry_date) {
      setError(t('foodLicences.dateError'));
      return;
    }
    try {
      if (editing) {
        const changes = {
          label: form.label,
          holder_name: form.holder_name,
          premises_address: form.premises_address,
          valid_from: form.valid_from,
          expiry_date: form.expiry_date,
          is_active: form.is_active,
        };
        await update({
          id: editing.id,
          changes: { ...changes, version: editing.version },
        }).unwrap();
      } else await create(form).unwrap();
      setForm(null);
      setEditing(null);
      setSaved(true);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('foodLicences.saveFailed')));
    }
  };
  return (
    <section className="food-licences food-licences-card" aria-labelledby="food-licence-title">
      <h2 id="food-licence-title">{t('foodLicences.title')}</h2>
      <p>{t('foodLicences.description')}</p>
      <p>
        {t('foodLicences.limit', { count: licences.filter((licence) => licence.is_active).length })}
      </p>
      {isFetching && <p role="status">{t('foodLicences.loading')}</p>}
      {isError && (
        <p role="alert">
          {t('foodLicences.loadFailed')}{' '}
          <button type="button" onClick={() => void refetch()}>
            {t('foodLicences.retry')}
          </button>
        </p>
      )}
      {saved && <p role="status">{t('foodLicences.saved')}</p>}
      {!isFetching && !licences.length && !isError && <p>{t('foodLicences.empty')}</p>}
      <div className="food-licences-list">
        {licences.map((licence) => (
          <article key={licence.id}>
            <strong>{licence.label}</strong>
            <span>{licence.licence_number}</span>
            <span>
              {firms.find((firm) => firm.id === licence.firm_id)?.display_name ?? licence.firm_id}
            </span>
            <span>{licence.holder_name}</span>
            <span>{licence.premises_address}</span>
            <span>
              {licence.expiry_date
                ? t('foodLicences.validUntil', { date: licence.expiry_date.slice(0, 10) })
                : t('foodLicences.unknownValidity')}
            </span>
            <span>{t(licence.is_active ? 'foodLicences.active' : 'foodLicences.inactive')}</span>
            <button type="button" disabled={!deviceWrite || busy} onClick={() => edit(licence)}>
              {t('foodLicences.edit')}
            </button>
          </article>
        ))}
      </div>
      {!form && (
        <button
          type="button"
          disabled={
            !deviceWrite ||
            isError ||
            isFetching ||
            licences.filter((licence) => licence.is_active).length >= 3
          }
          onClick={() => {
            setForm(blank());
            setEditing(null);
            setError('');
            setSaved(false);
          }}
        >
          {t('foodLicences.add')}
        </button>
      )}
      {form && (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={!deviceWrite || busy}>
            <legend>{t(editing ? 'foodLicences.edit' : 'foodLicences.add')}</legend>
            <label>
              {t('foodLicences.firm')}
              <SelectionControl
                required
                aria-label={t('foodLicences.firm')}
                disabled={!!editing}
                value={form.firm_id}
                onChange={(event) => field('firm_id', event.target.value)}
              >
                <option value="">{t('foodLicences.selectFirm')}</option>
                {firms
                  .filter((firm) => firm.is_active || firm.id === editing?.firm_id)
                  .map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.display_name}
                    </option>
                  ))}
              </SelectionControl>
            </label>
            <label>
              {t('foodLicences.number')}
              <input
                required
                disabled={!!editing}
                inputMode="numeric"
                pattern="[1-9][0-9]{13}"
                maxLength={14}
                value={form.licence_number}
                onChange={(event) => field('licence_number', event.target.value)}
              />
            </label>
            {editing && <small>{t('foodLicences.identityHint')}</small>}
            <label>
              {t('foodLicences.label')}
              <input
                required
                maxLength={100}
                value={form.label}
                onChange={(event) => field('label', event.target.value)}
              />
            </label>
            <label>
              {t('foodLicences.holder')}
              <input
                required
                maxLength={200}
                value={form.holder_name}
                onChange={(event) => field('holder_name', event.target.value)}
              />
            </label>
            <label>
              {t('foodLicences.premises')}
              <textarea
                required
                maxLength={500}
                value={form.premises_address}
                onChange={(event) => field('premises_address', event.target.value)}
              />
            </label>
            <div className="food-licences-dates">
              <label>
                {t('foodLicences.validFrom')}
                <input
                  type="date"
                  value={form.valid_from ?? ''}
                  onChange={(event) => field('valid_from', event.target.value || null)}
                />
              </label>
              <label>
                {t('foodLicences.expiry')}
                <input
                  type="date"
                  value={form.expiry_date ?? ''}
                  min={form.valid_from ?? undefined}
                  onChange={(event) => field('expiry_date', event.target.value || null)}
                />
              </label>
            </div>
            <label className="food-licences-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => field('is_active', event.target.checked)}
              />
              {t('foodLicences.active')}
            </label>
            <p>{t('foodLicences.verificationHint')}</p>
            {error && <p role="alert">{error}</p>}
            <button type="submit">{t(busy ? 'foodLicences.saving' : 'foodLicences.save')}</button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
            >
              {t('foodLicences.cancel')}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
};
