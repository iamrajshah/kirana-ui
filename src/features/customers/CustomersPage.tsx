import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonButtons,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/react';
import { add, close, pencil, trash } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation } from '@core/api/customerApi';
import { SearchBar, Input, Button, EmptyState, Loading } from '@components';
import { Navbar } from '@components/Navbar';
import { formatCurrency } from '@utils/helpers';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasPermission } from '@core/permissions/permissions';
import notificationService from '@core/services/notificationService';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const canCreateCustomer = hasPermission(userRoles, 'CUSTOMER_CREATE');
  const canUpdateCustomer = hasPermission(userRoles, 'CUSTOMER_UPDATE');
  
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useGetCustomersQuery({ search });
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditBalance, setCreditBalance] = useState('0');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreateCustomer = async () => {
    try {
      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          name,
          phone,
          email: email || undefined,
        }).unwrap();
        notificationService.success(t('customers.customerUpdated'));
      } else {
        await createCustomer({
          name,
          phone,
          email: email || undefined,
          opening_balance: Number(creditBalance),
        }).unwrap();
        notificationService.success(t('customers.customerCreated'));
      }

      setShowModal(false);
      resetForm();
      refetch();
    } catch (error: any) {
      notificationService.handleApiError(error);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setCreditBalance(customer.credit_balance?.toString() || '0');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setCreditBalance('0');
  };

  const customers = data?.data || [];

  return (
    <IonPage>
      <Navbar title={t('customers.title')} />
      <IonContent>
        <div className="p-4">
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

          {isLoading ? (
            <Loading isOpen={isLoading} />
          ) : customers.length === 0 ? (
            <EmptyState
              message="No customers found"
              action={
                canCreateCustomer ? (
                  <Button onClick={() => setShowModal(true)}>
                    <IonIcon icon={add} className="mr-2" />
                    {t('customers.addCustomer')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <IonList>
              {customers.map((customer) => (
                <IonItemSliding key={customer.id}>
                  <IonItem 
                    button 
                    onClick={() => history.push(`/customers/${customer.id}/ledger`)}
                  >
                    <IonLabel>
                      <h2 className="font-semibold text-lg">{customer.name}</h2>
                      <p className="text-gray-600">{customer.phone}</p>
                      {customer.credit_balance !== 0 && (
                        <p 
                          className="font-medium"
                          style={{ color: customer.credit_balance > 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}
                        >
                          {customer.credit_balance > 0 
                            ? `${t('customers.creditBalance')}: ${formatCurrency(customer.credit_balance)}`
                            : `You Owe: ${formatCurrency(Math.abs(customer.credit_balance))}`
                          }
                        </p>
                      )}
                    </IonLabel>
                  </IonItem>
                  {canUpdateCustomer && (
                    <IonItemOptions side="end">
                      <IonItemOption 
                        color="primary" 
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <IonIcon slot="icon-only" icon={pencil} />
                      </IonItemOption>
                    </IonItemOptions>
                  )}
                </IonItemSliding>
              ))}
            </IonList>
          )}
        </div>

        {/* FAB Button */}
        {canCreateCustomer && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => {
              console.log('🔘 FAB button clicked');
              setShowModal(true);
            }}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Add Customer Modal */}
        {showModal && (
          <IonModal 
            isOpen={showModal}
            onDidDismiss={() => setShowModal(false)}
          >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <Input
              label={t('customers.customerName')}
              value={name}
              onChange={setName}
              required
            />
            <Input
              label={t('customers.customerPhone')}
              value={phone}
              onChange={setPhone}
              type="tel"
              required
            />
            <Input label={t('customers.customerEmail')} value={email} onChange={setEmail} />
            {!editingCustomer && (
              <Input
                label={t('customers.creditBalance')}
                value={creditBalance}
                onChange={setCreditBalance}
                type="number"
              />
            )}
            <Button onClick={handleCreateCustomer} loading={creating || updating} fullWidth size="large">
              {t('common.save')}
            </Button>
          </IonContent>
        </IonModal>
        )}

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message={t('customers.customerAdded')}
          duration={2000}
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};
