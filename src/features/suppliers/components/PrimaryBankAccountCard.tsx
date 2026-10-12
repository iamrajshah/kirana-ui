import React from 'react';
import { IonCard, IonCardContent, IonBadge, IonButton, IonIcon } from '@ionic/react';
import { settings } from 'ionicons/icons';
import { BankAccount } from '../../../core/api/supplierApi';
import { useTranslation } from 'react-i18next';

interface PrimaryBankAccountCardProps {
  bankAccount: BankAccount | null;
  onManageClick: () => void;
  hasPermission: boolean;
}

export const PrimaryBankAccountCard: React.FC<PrimaryBankAccountCardProps> = ({
  bankAccount,
  onManageClick,
  hasPermission,
}) => {
  const { t } = useTranslation();
  return (
    <IonCard>
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            {t('foundation.bank.primaryAccount')}
          </h3>
          <IonButton fill="clear" size="small" onClick={onManageClick} disabled={!hasPermission}>
            <IonIcon icon={settings} slot="start" />
            {t('foundation.bank.manage')}
          </IonButton>
        </div>

        {bankAccount ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {bankAccount.bank_name}
              </h2>
              <IonBadge color="primary" mode="ios">{t('foundation.bank.primary')}</IonBadge>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  {t('foundation.bank.accountHolder')}:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px' }}>
                  {bankAccount.account_holder_name}
                </p>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  {t('foundation.bank.accountNumber')}:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px', fontFamily: 'monospace' }}>
                  {bankAccount.account_number}
                </p>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  {t('foundation.bank.ifscCode')}:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px', fontFamily: 'monospace' }}>
                  {bankAccount.ifsc_code}
                </p>
              </div>
              {bankAccount.branch_name && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                    {t('foundation.bank.branch')}:
                  </strong>
                  <p style={{ margin: '2px 0', fontSize: '15px' }}>
                    {bankAccount.branch_name}
                  </p>
                </div>
              )}
              {bankAccount.account_type && (
                <div style={{ marginTop: '8px' }}>
                  <IonBadge color="medium" mode="ios">
                    {bankAccount.account_type}
                  </IonBadge>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--ion-color-medium)', margin: '0 0 12px' }}>
              {t('foundation.bank.noDetails')}
            </p>
            <IonButton onClick={onManageClick} size="small" disabled={!hasPermission}>
              {t('foundation.bank.addAccount')}
            </IonButton>
            {!hasPermission && (
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '8px' }}>
                {t('foundation.bank.contactManager')}
              </p>
            )}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};
