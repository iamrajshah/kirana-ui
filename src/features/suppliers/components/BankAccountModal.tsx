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
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonAlert,
  IonText,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { close, add, pencil, trash, star } from 'ionicons/icons';
import { BankAccount } from '../../../core/api/supplierApi';
import { EmptyState } from '../../../components';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  bankAccounts: BankAccount[];
  onAddClick: () => void;
  onEditClick: (account: BankAccount) => void;
  onDeleteClick: (account: BankAccount) => void;
  onSetPrimaryClick: (account: BankAccount) => void;
}

export const BankAccountModal: React.FC<BankAccountModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onSetPrimaryClick,
}) => {
  console.log('BankAccountModal render - isOpen:', isOpen, 'bankAccounts:', bankAccounts);
  
  const primaryAccount = bankAccounts.find((acc) => acc.is_primary);
  const otherAccounts = bankAccounts.filter((acc) => !acc.is_primary);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Manage Bank Accounts</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {bankAccounts.length === 0 ? (
          <div>
            <EmptyState message="No bank accounts added yet" />
            <IonButton expand="block" onClick={onAddClick} className="ion-margin-top">
              <IonIcon icon={add} slot="start" />
              Add Bank Account
            </IonButton>
          </div>
        ) : (
          <>
            {/* Primary Account */}
            {primaryAccount && (
              <div className="ion-margin-bottom">
                <h3 style={{ marginTop: 0, marginBottom: '12px', fontWeight: 600 }}>
                  Primary Account
                </h3>
                <IonCard>
                  <IonCardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                            {primaryAccount.bank_name}
                          </h2>
                          <IonBadge color="primary" mode="ios">PRIMARY</IonBadge>
                        </div>
                        <p style={{ margin: '4px 0', color: 'var(--ion-color-medium)' }}>
                          <strong>{primaryAccount.account_holder_name}</strong>
                        </p>
                        <p style={{ margin: '4px 0', color: 'var(--ion-color-dark)', fontFamily: 'monospace' }}>
                          {primaryAccount.account_number}
                        </p>
                        <p style={{ margin: '4px 0', color: 'var(--ion-color-medium)' }}>
                          IFSC: {primaryAccount.ifsc_code}
                        </p>
                        {primaryAccount.branch_name && (
                          <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                            {primaryAccount.branch_name}
                          </p>
                        )}
                        {primaryAccount.account_type && (
                          <IonBadge color="medium" mode="ios" style={{ marginTop: '8px' }}>
                            {primaryAccount.account_type}
                          </IonBadge>
                        )}
                      </div>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => onEditClick(primaryAccount)}
                      >
                        <IonIcon icon={pencil} slot="icon-only" />
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            )}

            {/* Other Accounts */}
            {otherAccounts.length > 0 && (
              <div>
                <h3 style={{ marginTop: '24px', marginBottom: '12px', fontWeight: 600 }}>
                  Other Accounts
                </h3>
                <IonList>
                  {otherAccounts.map((account) => (
                    <IonItem key={account.id} lines="full">
                      <IonLabel>
                        <h2 style={{ fontWeight: 600 }}>{account.bank_name}</h2>
                        <p style={{ color: 'var(--ion-color-medium)' }}>
                          {account.account_holder_name}
                        </p>
                        <p style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                          {account.account_number}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                          IFSC: {account.ifsc_code}
                        </p>
                        {account.account_type && (
                          <IonBadge color="medium" mode="ios" style={{ marginTop: '4px' }}>
                            {account.account_type}
                          </IonBadge>
                        )}
                      </IonLabel>
                      <div slot="end" style={{ display: 'flex', gap: '4px' }}>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => onSetPrimaryClick(account)}
                          title="Set as Primary"
                        >
                          <IonIcon icon={star} slot="icon-only" />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => onEditClick(account)}
                          title="Edit"
                        >
                          <IonIcon icon={pencil} slot="icon-only" />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => onDeleteClick(account)}
                          title="Deactivate"
                        >
                          <IonIcon icon={trash} slot="icon-only" />
                        </IonButton>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              </div>
            )}

            {/* Add Button */}
            <IonButton
              expand="block"
              onClick={onAddClick}
              className="ion-margin-top"
              style={{ marginTop: '24px' }}
            >
              <IonIcon icon={add} slot="start" />
              Add Another Account
            </IonButton>
          </>
        )}
      </IonContent>
    </IonModal>
  );
};
