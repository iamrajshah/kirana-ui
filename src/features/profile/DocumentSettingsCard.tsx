import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import { receiptOutline, save } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@components';
import type {
  TenantDocumentSettings,
  UpdateTenantDocumentSettings,
} from '@core/types';
import {
  useGetTenantSettingsQuery,
  useUpdateTenantSettingsMutation,
} from '@core/api/tenantSettingsApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { getGstActivationBlockers } from './documentSettingsValidation';

const textFields = [
  'supplier_name', 'address_line1', 'address_line2', 'city', 'state', 'state_code',
  'postal_code', 'gstin', 'phone', 'footer', 'authorized_signatory',
] as const;

const toForm = (settings: TenantDocumentSettings): UpdateTenantDocumentSettings =>
  textFields.reduce<UpdateTenantDocumentSettings>(
    (form, field) => ({ ...form, [field]: settings[field] ?? '' }),
    {
      document_mode: settings.document_mode,
      default_paper_width: settings.default_paper_width,
    }
  );

const toPayload = (form: UpdateTenantDocumentSettings): UpdateTenantDocumentSettings =>
  textFields.reduce<UpdateTenantDocumentSettings>(
    (payload, field) => ({ ...payload, [field]: form[field]?.trim() || null }),
    {
      document_mode: form.document_mode,
      default_paper_width: form.default_paper_width,
    }
  );

export const DocumentSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetTenantSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateTenantSettingsMutation();
  const [form, setForm] = useState<UpdateTenantDocumentSettings | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (data?.data) setForm(toForm(data.data));
  }, [data]);

  const blockers = useMemo(
    () => (form?.document_mode === 'GST_TAX_INVOICE' ? getGstActivationBlockers(form) : []),
    [form]
  );
  const capabilityBlocked =
    form?.document_mode === 'GST_TAX_INVOICE' && !data?.data.capabilities.receipt_documents_enabled;
  const fieldError = (field: (typeof blockers)[number]) =>
    blockers.includes(field) ? t(`documentSettings.blockers.${field}`) : undefined;

  const setField = <K extends keyof UpdateTenantDocumentSettings>(
    field: K,
    value: UpdateTenantDocumentSettings[K]
  ) => setForm((current) => (current ? { ...current, [field]: value } : current));

  const handleSave = async () => {
    if (!form || blockers.length > 0 || capabilityBlocked) return;
    setNotice(null);
    try {
      await updateSettings(toPayload(form)).unwrap();
      setNotice({ kind: 'success', message: t('documentSettings.saved') });
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        message: apiErrorMessage(error, t('documentSettings.saveFailed')),
      });
    }
  };

  return (
    <IonCard className="document-settings-card">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={receiptOutline} aria-hidden="true" />
          {t('documentSettings.title')}
        </IonCardTitle>
        <p>{t('documentSettings.description')}</p>
      </IonCardHeader>
      <IonCardContent>
        {isLoading && <IonSpinner aria-label={t('common.loading')} />}
        {isError && (
          <div role="alert" className="document-settings-notice document-settings-error">
            <p>{t('documentSettings.loadFailed')}</p>
            <IonButton fill="outline" onClick={() => refetch()}>{t('common.retry')}</IonButton>
          </div>
        )}
        {form && data?.data && (
          <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
            <Select
              label={t('documentSettings.documentMode')}
              value={form.document_mode || 'SIMPLE_RECEIPT'}
              onChange={(value) => setField('document_mode', value as TenantDocumentSettings['document_mode'])}
              options={[
                { value: 'SIMPLE_RECEIPT', label: t('documentSettings.simpleReceipt') },
                { value: 'GST_TAX_INVOICE', label: t('documentSettings.gstTaxInvoice') },
              ]}
            />
            <Select
              label={t('documentSettings.paperWidth')}
              value={form.default_paper_width || 'MM80'}
              onChange={(value) => setField('default_paper_width', value as TenantDocumentSettings['default_paper_width'])}
              options={data.data.capabilities.supported_paper_widths.map((width) => ({
                value: width,
                label: t(`documentSettings.paper.${width}`),
              }))}
            />
            <Input label={t('documentSettings.footer')} value={form.footer || ''} onChange={(value) => setField('footer', value)} maxLength={500} />

            {form.document_mode === 'GST_TAX_INVOICE' && (
              <fieldset className="document-settings-gst">
                <legend>{t('documentSettings.gstDetails')}</legend>
                <p>{t('documentSettings.gstDetailsHint')}</p>
                <div className="document-settings-grid">
                  <Input label={t('documentSettings.supplierName')} value={form.supplier_name || ''} onChange={(value) => setField('supplier_name', value)} error={fieldError('supplier_name')} required />
                  <Input label={t('documentSettings.gstin')} value={form.gstin || ''} onChange={(value) => setField('gstin', value.toUpperCase())} error={fieldError(blockers.includes('gstin_state_mismatch') ? 'gstin_state_mismatch' : 'gstin')} maxLength={15} required />
                  <Input label={t('documentSettings.addressLine1')} value={form.address_line1 || ''} onChange={(value) => setField('address_line1', value)} error={fieldError('address_line1')} required />
                  <Input label={t('documentSettings.addressLine2')} value={form.address_line2 || ''} onChange={(value) => setField('address_line2', value)} />
                  <Input label={t('documentSettings.city')} value={form.city || ''} onChange={(value) => setField('city', value)} error={fieldError('city')} required />
                  <Input label={t('documentSettings.state')} value={form.state || ''} onChange={(value) => setField('state', value)} error={fieldError('state')} required />
                  <Input label={t('documentSettings.stateCode')} value={form.state_code || ''} onChange={(value) => setField('state_code', value)} error={fieldError('state_code')} maxLength={2} inputMode="numeric" required />
                  <Input label={t('documentSettings.postalCode')} value={form.postal_code || ''} onChange={(value) => setField('postal_code', value)} error={fieldError('postal_code')} maxLength={6} inputMode="numeric" required />
                  <Input label={t('documentSettings.phone')} value={form.phone || ''} onChange={(value) => setField('phone', value)} type="tel" />
                  <Input label={t('documentSettings.authorizedSignatory')} value={form.authorized_signatory || ''} onChange={(value) => setField('authorized_signatory', value)} error={fieldError('authorized_signatory')} required />
                </div>
                {(blockers.length > 0 || capabilityBlocked) && (
                  <div role="alert" className="document-settings-notice document-settings-error">
                    <strong>{t('documentSettings.activationBlocked')}</strong>
                    <ul>
                      {capabilityBlocked && <li>{t('documentSettings.blockers.capability')}</li>}
                      {blockers.map((blocker) => <li key={blocker}>{t(`documentSettings.blockers.${blocker}`)}</li>)}
                    </ul>
                  </div>
                )}
              </fieldset>
            )}

            {notice && (
              <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`document-settings-notice document-settings-${notice.kind}`}>
                {notice.message}
              </p>
            )}
            <IonButton type="submit" expand="block" disabled={isSaving || blockers.length > 0 || capabilityBlocked}>
              <IonIcon icon={save} slot="start" />
              {isSaving ? t('documentSettings.saving') : t('documentSettings.save')}
            </IonButton>
          </form>
        )}
      </IonCardContent>
    </IonCard>
  );
};
