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
} from '@ionic/react';
import { add, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetCustomersQuery, useCreateCustomerMutation } from '@core/api/customerApi';
import { SearchBar, Input, Button, EmptyState, Loading } from '@components';
import { Navbar } from '@components/Navbar';
import { formatCurrency } from '@utils/helpers';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasPermission } from '@core/permissions/permissions';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const canCreateCustomer = hasPermission(userRoles, 'CUSTOMER_CREATE');
  
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useGetCustomersQuery({ search });
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditBalance, setCreditBalance] = useState('0');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreateCustomer = async () => {
    try {
      console.log('👤 Creating customer:', {
        name,
        phone,
        email: email || undefined,
        opening_balance: Number(creditBalance),
      });

      const result = await createCustomer({
        name,
        phone,
        email: email || undefined,
        opening_balance: Number(creditBalance),
      }).unwrap();

      console.log('✅ Customer created:', result);

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('❌ Failed to create customer:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });
      alert(`Failed to create customer: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const resetForm = () => {
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
                <IonItem key={customer.id} button>
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
            isOpen={true}
            onDidDismiss={() => {
              console.log('🚪 Modal dismissed');
              setShowModal(false);
            }}
          >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('customers.addCustomer')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => {
                  console.log('❌ Close button clicked');
                  setShowModal(false);
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
            <Input
              label={t('customers.creditBalance')}
              value={creditBalance}
              onChange={setCreditBalance}
              type="number"
            />
            <Button onClick={() => {
              console.log('💾 Save button clicked');
              handleCreateCustomer();
            }} loading={creating} fullWidth size="large">
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
