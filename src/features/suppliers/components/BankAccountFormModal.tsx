import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { Input, Button, Select } from '../../../components';
import { BankAccount } from '../../../core/api/supplierApi';
import { useTranslation } from 'react-i18next';

interface BankAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BankAccountFormData) => void;
  isLoading: boolean;
  editingAccount?: BankAccount | null;
}

export interface BankAccountFormData {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  is_primary: boolean;
}

export const BankAccountFormModal: React.FC<BankAccountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  editingAccount,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<BankAccountFormData>({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: '',
    is_primary: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        account_holder_name: editingAccount.account_holder_name,
        bank_name: editingAccount.bank_name,
        account_number: '', // Don't prefill masked account number
        ifsc_code: editingAccount.ifsc_code,
        branch_name: editingAccount.branch_name || '',
        account_type: editingAccount.account_type || '',
        is_primary: editingAccount.is_primary,
      });
    } else {
      resetForm();
    }
  }, [editingAccount, isOpen]);

  const resetForm = () => {
    setFormData({
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_type: '',
      is_primary: false,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_holder_name.trim()) {
      newErrors.account_holder_name = t('foundation.bank.holderRequired');
    }
    if (!formData.bank_name.trim()) {
      newErrors.bank_name = t('foundation.bank.bankRequired');
    }
    if (!editingAccount && !formData.account_number.trim()) {
      newErrors.account_number = t('foundation.bank.numberRequired');
    }
    if (!formData.ifsc_code.trim()) {
      newErrors.ifsc_code = t('foundation.bank.ifscRequired');
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      newErrors.ifsc_code = t('foundation.bank.ifscInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const submitData = { ...formData };
      // Remove account_number if editing and it's empty (keep existing)
      if (editingAccount && !submitData.account_number.trim()) {
        delete (submitData as Partial<BankAccountFormData>).account_number;
      }
      onSubmit(submitData);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editingAccount ? t('foundation.bank.editAccount') : t('foundation.bank.addAccount')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <Input
          label={t('foundation.bank.accountHolder')}
          value={formData.account_holder_name}
          onChange={(value) => setFormData({ ...formData, account_holder_name: value })}
          required
          error={errors.account_holder_name}
          maxLength={150}
        />

        <Input
          label={t('foundation.bank.bankName')}
          value={formData.bank_name}
          onChange={(value) => setFormData({ ...formData, bank_name: value })}
          required
          error={errors.bank_name}
          maxLength={150}
        />

        <Input
          label={editingAccount ? t('foundation.bank.accountNumberKeep') : t('foundation.bank.accountNumber')}
          value={formData.account_number}
          onChange={(value) => setFormData({ ...formData, account_number: value })}
          required={!editingAccount}
          error={errors.account_number}
          maxLength={50}
          placeholder={editingAccount ? t('foundation.bank.accountNumberPlaceholder') : ''}
        />

        <Input
          label={t('foundation.bank.ifscCode')}
          value={formData.ifsc_code}
          onChange={(value) => setFormData({ ...formData, ifsc_code: value.toUpperCase() })}
          required
          error={errors.ifsc_code}
          maxLength={11}
          placeholder={t('foundation.bank.ifscExample')}
        />

        <Input
          label={t('foundation.bank.branchOptional')}
          value={formData.branch_name}
          onChange={(value) => setFormData({ ...formData, branch_name: value })}
          maxLength={150}
        />

        <Select
          label={t('foundation.bank.typeOptional')}
          value={formData.account_type}
          onChange={(value) => setFormData({ ...formData, account_type: value })}
          options={[
            { value: '', label: t('foundation.bank.selectType') },
            { value: 'SAVINGS', label: t('foundation.bank.savings') },
            { value: 'CURRENT', label: t('foundation.bank.current') },
          ]}
        />

        <IonItem lines="none" style={{ marginTop: '16px', marginBottom: '16px' }}>
          <IonCheckbox
            slot="start"
            checked={formData.is_primary}
            onIonChange={(e) => setFormData({ ...formData, is_primary: e.detail.checked })}
          />
          <IonLabel>
            <h3>{t('foundation.bank.setAsPrimary')}</h3>
            {formData.is_primary && (
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                {t('foundation.bank.defaultHint')}
              </p>
            )}
          </IonLabel>
        </IonItem>

        <Button onClick={handleSubmit} loading={isLoading} fullWidth size="large">
          {editingAccount ? t('foundation.bank.updateAccount') : t('foundation.bank.addAccount')}
        </Button>
      </IonContent>
    </IonModal>
  );
};
