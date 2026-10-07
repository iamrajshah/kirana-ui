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
  console.log('BankAccountFormModal render - isOpen:', isOpen);
  
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
      newErrors.account_holder_name = 'Account holder name is required';
    }
    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required';
    }
    if (!editingAccount && !formData.account_number.trim()) {
      newErrors.account_number = 'Account number is required';
    }
    if (!formData.ifsc_code.trim()) {
      newErrors.ifsc_code = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      newErrors.ifsc_code = 'Invalid IFSC code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    console.log('DEBUG - BankAccountFormModal handleSubmit called');
    console.log('DEBUG - formData:', formData);
    
    if (validateForm()) {
      console.log('DEBUG - Form validation passed');
      const submitData = { ...formData };
      // Remove account_number if editing and it's empty (keep existing)
      if (editingAccount && !submitData.account_number.trim()) {
        delete (submitData as any).account_number;
      }
      console.log('DEBUG - Calling onSubmit with:', submitData);
      onSubmit(submitData);
    } else {
      console.log('DEBUG - Form validation failed');
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
          <IonTitle>{editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <Input
          label="Account Holder Name"
          value={formData.account_holder_name}
          onChange={(value) => setFormData({ ...formData, account_holder_name: value })}
          required
          error={errors.account_holder_name}
          maxLength={150}
        />

        <Input
          label="Bank Name"
          value={formData.bank_name}
          onChange={(value) => setFormData({ ...formData, bank_name: value })}
          required
          error={errors.bank_name}
          maxLength={150}
        />

        <Input
          label={editingAccount ? 'Account Number (leave empty to keep existing)' : 'Account Number'}
          value={formData.account_number}
          onChange={(value) => setFormData({ ...formData, account_number: value })}
          required={!editingAccount}
          error={errors.account_number}
          maxLength={50}
          placeholder={editingAccount ? 'Enter new account number or leave empty' : ''}
        />

        <Input
          label="IFSC Code"
          value={formData.ifsc_code}
          onChange={(value) => setFormData({ ...formData, ifsc_code: value.toUpperCase() })}
          required
          error={errors.ifsc_code}
          maxLength={11}
          placeholder="e.g., SBIN0001234"
        />

        <Input
          label="Branch Name (Optional)"
          value={formData.branch_name}
          onChange={(value) => setFormData({ ...formData, branch_name: value })}
          maxLength={150}
        />

        <Select
          label="Account Type (Optional)"
          value={formData.account_type}
          onChange={(value) => setFormData({ ...formData, account_type: value })}
          options={[
            { value: '', label: 'Select Type' },
            { value: 'SAVINGS', label: 'Savings' },
            { value: 'CURRENT', label: 'Current' },
          ]}
        />

        <IonItem lines="none" style={{ marginTop: '16px', marginBottom: '16px' }}>
          <IonCheckbox
            slot="start"
            checked={formData.is_primary}
            onIonChange={(e) => setFormData({ ...formData, is_primary: e.detail.checked })}
          />
          <IonLabel>
            <h3>Set as Primary Account</h3>
            {formData.is_primary && (
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                This will be the default account for this supplier
              </p>
            )}
          </IonLabel>
        </IonItem>

        <Button onClick={handleSubmit} loading={isLoading} fullWidth size="large">
          {editingAccount ? 'Update Account' : 'Add Account'}
        </Button>
      </IonContent>
    </IonModal>
  );
};
