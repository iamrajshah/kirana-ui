import React, { useEffect, useMemo, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
  IonToggle,
} from '@ionic/react';
import { add, businessOutline, star, trash } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Input } from '@components';
import {
  type Firm,
  type FirmSummary,
  type FirmBankAccount,
  type FirmInput,
  useCreateFirmMutation,
  useGetFirmsQuery,
  useLazyGetFirmQuery,
  useSetDefaultSalesFirmMutation,
  useUpdateFirmMutation,
} from '@core/api/firmApi';
import notificationService from '@core/services/notificationService';

const blankFirm = (): FirmInput => ({
  code: '',
  legal_name: '',
  display_name: '',
  gstin: null,
  pan: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  state_code: null,
  postal_code: null,
  phone: null,
  invoice_prefix: '',
  is_active: true,
  bank_accounts: [],
});

const blankBankAccount = (): FirmBankAccount => ({
  account_holder_name: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  branch_name: '',
  account_type: '',
  is_primary: false,
  is_active: true,
});

const nullable = (value: string | null | undefined) => value?.trim() || null;

export const FirmSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetFirmsQuery();
  const [createFirm, { isLoading: isCreating }] = useCreateFirmMutation();
  const [updateFirm, { isLoading: isUpdating }] = useUpdateFirmMutation();
  const [setDefaultSales, { isLoading: isSettingDefault }] = useSetDefaultSalesFirmMutation();
  const [loadFirm, { isFetching: isLoadingFirm }] = useLazyGetFirmQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FirmInput | null>(null);

  const firms = useMemo(() => data?.data.firms || [], [data]);
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (editingId && !firms.some((firm) => firm.id === editingId)) {
      setEditingId(null);
      setForm(null);
    }
  }, [editingId, firms]);

  const populateFirmForm = (firm: Firm) => {
    setEditingId(firm.id);
    setForm({
      code: firm.code,
      legal_name: firm.legal_name,
      display_name: firm.display_name,
      gstin: firm.gstin,
      pan: firm.pan,
      address_line1: firm.address_line1,
      address_line2: firm.address_line2,
      city: firm.city,
      state: firm.state,
      state_code: firm.state_code,
      postal_code: firm.postal_code,
      phone: firm.phone,
      invoice_prefix: firm.invoice_prefix,
      is_active: firm.is_active,
      bank_accounts: firm.bank_accounts.map((account) => ({
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        account_number: account.account_number,
        ifsc_code: account.ifsc_code,
        branch_name: account.branch_name,
        account_type: account.account_type,
        is_primary: account.is_primary,
        is_active: account.is_active,
      })),
    });
  };

  const editFirm = async (firmId: string) => {
    try {
      const response = await loadFirm(firmId).unwrap();
      populateFirmForm(response.data);
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  const setField = <K extends keyof FirmInput>(field: K, value: FirmInput[K]) =>
    setForm((current) => (current ? { ...current, [field]: value } : current));

  const setBankField = <K extends keyof FirmBankAccount>(
    index: number,
    field: K,
    value: FirmBankAccount[K]
  ) => {
    setForm((current) => {
      if (!current) return current;
      const accounts = (current.bank_accounts || []).map((account, accountIndex) => ({
        ...account,
        ...(accountIndex === index ? { [field]: value } : {}),
        ...(field === 'is_primary' && value === true && accountIndex !== index
          ? { is_primary: false }
          : {}),
      }));
      return { ...current, bank_accounts: accounts };
    });
  };

  const saveFirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.code.trim() || !form.legal_name.trim() || !form.display_name.trim() || !form.invoice_prefix.trim()) {
      notificationService.warning(t('firms.requiredFields'));
      return;
    }
    const hasInvalidBank = form.bank_accounts?.some(
      (account) =>
        !account.account_holder_name.trim() ||
        !account.bank_name.trim() ||
        !account.account_number.trim() ||
        !account.ifsc_code.trim()
    );
    if (hasInvalidBank) {
      notificationService.warning(t('firms.bankRequiredFields'));
      return;
    }

    const payload: FirmInput = {
      ...form,
      code: form.code.trim().toUpperCase(),
      legal_name: form.legal_name.trim(),
      display_name: form.display_name.trim(),
      invoice_prefix: form.invoice_prefix.trim().toUpperCase(),
      gstin: nullable(form.gstin)?.toUpperCase() || null,
      pan: nullable(form.pan)?.toUpperCase() || null,
      address_line1: nullable(form.address_line1),
      address_line2: nullable(form.address_line2),
      city: nullable(form.city),
      state: nullable(form.state),
      state_code: nullable(form.state_code),
      postal_code: nullable(form.postal_code),
      phone: nullable(form.phone),
      bank_accounts: form.bank_accounts?.map((account) => ({
        ...account,
        account_holder_name: account.account_holder_name.trim(),
        bank_name: account.bank_name.trim(),
        account_number: account.account_number.trim(),
        ifsc_code: account.ifsc_code.trim().toUpperCase(),
        branch_name: nullable(account.branch_name),
        account_type: nullable(account.account_type),
      })),
    };

    try {
      if (editingId) await updateFirm({ id: editingId, changes: payload }).unwrap();
      else await createFirm(payload).unwrap();
      notificationService.success(t(editingId ? 'firms.updated' : 'firms.created'));
      setEditingId(null);
      setForm(null);
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  const makeDefault = async (firm: FirmSummary) => {
    try {
      await setDefaultSales(firm.id).unwrap();
      notificationService.success(t('firms.defaultUpdated'));
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  return (
    <IonCard className="document-settings-card">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={businessOutline} aria-hidden="true" /> {t('firms.title')}
        </IonCardTitle>
        <p>{t('firms.description')}</p>
      </IonCardHeader>
      <IonCardContent>
        {isLoading && <IonSpinner aria-label={t('common.loading')} />}
        {isError && (
          <div role="alert">
            <p>{t('firms.loadFailed')}</p>
            <IonButton fill="outline" onClick={() => refetch()}>{t('common.retry')}</IonButton>
          </div>
        )}

        {!isLoading && !form && (
          <>
            <div className="firm-settings-list">
              {firms.map((firm) => (
                <div className="firm-settings-row" key={firm.id}>
                  <div>
                    <strong>{firm.display_name}</strong>
                    <p>{firm.legal_name} · {firm.code}</p>
                    {firm.is_default_sales && <IonBadge color="success">{t('firms.salesDefault')}</IonBadge>}
                    {!firm.is_active && <IonBadge color="medium">{t('firms.inactive')}</IonBadge>}
                  </div>
                  <div className="workspace-actions">
                    {!firm.is_default_sales && firm.is_active && (
                      <IonButton fill="outline" disabled={isSettingDefault} onClick={() => void makeDefault(firm)}>
                        <IonIcon icon={star} slot="start" /> {t('firms.makeSalesDefault')}
                      </IonButton>
                    )}
                    <IonButton fill="outline" disabled={isLoadingFirm} onClick={() => void editFirm(firm.id)}>{t('common.edit')}</IonButton>
                  </div>
                </div>
              ))}
            </div>
            <IonButton expand="block" onClick={() => { setEditingId(null); setForm(blankFirm()); }}>
              <IonIcon icon={add} slot="start" /> {t('firms.addFirm')}
            </IonButton>
          </>
        )}

        {form && (
          <form onSubmit={saveFirm}>
            <div className="document-settings-grid">
              <Input label={t('firms.displayName')} value={form.display_name} onChange={(value) => setField('display_name', value)} required />
              <Input label={t('firms.legalName')} value={form.legal_name} onChange={(value) => setField('legal_name', value)} required />
              <Input label={t('firms.code')} value={form.code} onChange={(value) => setField('code', value)} maxLength={20} required />
              <Input label={t('firms.invoicePrefix')} value={form.invoice_prefix} onChange={(value) => setField('invoice_prefix', value)} maxLength={12} required />
              <Input label={t('firms.gstin')} value={form.gstin || ''} onChange={(value) => setField('gstin', value)} maxLength={15} />
              <Input label={t('firms.pan')} value={form.pan || ''} onChange={(value) => setField('pan', value)} maxLength={10} />
              <Input label={t('firms.addressLine1')} value={form.address_line1 || ''} onChange={(value) => setField('address_line1', value)} />
              <Input label={t('firms.addressLine2')} value={form.address_line2 || ''} onChange={(value) => setField('address_line2', value)} />
              <Input label={t('firms.city')} value={form.city || ''} onChange={(value) => setField('city', value)} />
              <Input label={t('firms.state')} value={form.state || ''} onChange={(value) => setField('state', value)} />
              <Input label={t('firms.stateCode')} value={form.state_code || ''} onChange={(value) => setField('state_code', value)} maxLength={2} />
              <Input label={t('firms.postalCode')} value={form.postal_code || ''} onChange={(value) => setField('postal_code', value)} maxLength={6} />
              <Input label={t('firms.phone')} value={form.phone || ''} onChange={(value) => setField('phone', value)} type="tel" />
            </div>
            <IonToggle
              checked={form.is_active}
              disabled={firms.find((firm) => firm.id === editingId)?.is_default_sales}
              onIonChange={(event) => setField('is_active', event.detail.checked)}
            >
              {t('firms.active')}
            </IonToggle>
            {firms.find((firm) => firm.id === editingId)?.is_default_sales && (
              <p>{t('firms.defaultCannotDeactivate')}</p>
            )}

            <h3>{t('firms.bankAccounts')}</h3>
            {(form.bank_accounts || []).map((account, index) => (
              <fieldset key={index} className="document-settings-gst">
                <legend>{t('firms.bankAccountNumber', { number: index + 1 })}</legend>
                <div className="document-settings-grid">
                  <Input label={t('firms.accountHolder')} value={account.account_holder_name} onChange={(value) => setBankField(index, 'account_holder_name', value)} required />
                  <Input label={t('firms.bankName')} value={account.bank_name} onChange={(value) => setBankField(index, 'bank_name', value)} required />
                  <Input label={t('firms.accountNumber')} value={account.account_number} onChange={(value) => setBankField(index, 'account_number', value)} required />
                  <Input label={t('firms.ifsc')} value={account.ifsc_code} onChange={(value) => setBankField(index, 'ifsc_code', value)} required />
                  <Input label={t('firms.branch')} value={account.branch_name || ''} onChange={(value) => setBankField(index, 'branch_name', value)} />
                  <Input label={t('firms.accountType')} value={account.account_type || ''} onChange={(value) => setBankField(index, 'account_type', value)} />
                </div>
                <div className="workspace-actions">
                  <IonButton type="button" fill={account.is_primary ? 'solid' : 'outline'} onClick={() => setBankField(index, 'is_primary', true)}>
                    {t('firms.primaryAccount')}
                  </IonButton>
                  <IonButton type="button" fill="clear" color="danger" onClick={() => setField('bank_accounts', (form.bank_accounts || []).filter((_, itemIndex) => itemIndex !== index))}>
                    <IonIcon icon={trash} slot="start" /> {t('firms.removeBankAccount')}
                  </IonButton>
                </div>
              </fieldset>
            ))}
            <IonButton type="button" fill="outline" onClick={() => setField('bank_accounts', [...(form.bank_accounts || []), blankBankAccount()])}>
              <IonIcon icon={add} slot="start" /> {t('firms.addBankAccount')}
            </IonButton>
            <div className="workspace-actions firm-settings-form-actions">
              <IonButton type="button" fill="outline" onClick={() => { setEditingId(null); setForm(null); }}>{t('common.cancel')}</IonButton>
              <IonButton type="submit" disabled={isSaving}>{isSaving ? t('common.loading') : t('common.save')}</IonButton>
            </div>
          </form>
        )}
      </IonCardContent>
    </IonCard>
  );
};
