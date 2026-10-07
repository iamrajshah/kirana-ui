import React from 'react';
import { IonCard, IonCardContent, IonBadge, IonButton, IonIcon } from '@ionic/react';
import { settings } from 'ionicons/icons';
import { BankAccount } from '../../../core/api/supplierApi';

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
  return (
    <IonCard>
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Primary Bank Account
          </h3>
          <IonButton fill="clear" size="small" onClick={onManageClick} disabled={!hasPermission}>
            <IonIcon icon={settings} slot="start" />
            Manage
          </IonButton>
        </div>

        {bankAccount ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {bankAccount.bank_name}
              </h2>
              <IonBadge color="primary" mode="ios">PRIMARY</IonBadge>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  Account Holder:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px' }}>
                  {bankAccount.account_holder_name}
                </p>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  Account Number:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px', fontFamily: 'monospace' }}>
                  {bankAccount.account_number}
                </p>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                  IFSC Code:
                </strong>
                <p style={{ margin: '2px 0', fontSize: '15px', fontFamily: 'monospace' }}>
                  {bankAccount.ifsc_code}
                </p>
              </div>
              {bankAccount.branch_name && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                    Branch:
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
              No bank details added yet
            </p>
            <IonButton onClick={onManageClick} size="small" disabled={!hasPermission}>
              Add Bank Account
            </IonButton>
            {!hasPermission && (
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '8px' }}>
                Contact your manager to add bank details
              </p>
            )}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};
