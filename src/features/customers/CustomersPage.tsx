import React, { useMemo, useState, useEffect } from 'react';
import type { Customer } from '@core/types';
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
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { add, close, pencil } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@core/api/customerApi';
import { SearchBar, Input, Button, EmptyState, Loading } from '@components';
import { Navbar } from '@components/Navbar';
import { formatCurrency } from '@utils/helpers';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasPermission } from '@core/permissions/permissions';
import notificationService from '@core/services/notificationService';
import './CustomersPage.css';
import { validatePartyForm, type PartyFieldError } from '@utils/formValidation';
import { filterCustomers } from '@utils/localSearch';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const canCreateCustomer = hasPermission(userRoles, 'CUSTOMER_CREATE');
  const canUpdateCustomer = hasPermission(userRoles, 'CUSTOMER_UPDATE');

  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const take = 1000;

  const { data, isLoading, isFetching, isError, refetch } = useGetCustomersQuery({
    skip,
    take,
  });
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();

  // Accumulate customers as they're fetched
  useEffect(() => {
    if (data?.data) {
      if (skip === 0) {
        setAllCustomers(data.data);
      } else {
        setAllCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newCustomers = data.data.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newCustomers];
        });
      }
    }
  }, [data, skip]);

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditBalance, setCreditBalance] = useState('0');
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<PartyFieldError, string>>>({});

  const handleCreateCustomer = async () => {
    const errors = validatePartyForm({
      name,
      phone,
      email,
      openingBalance: editingCustomer ? undefined : creditBalance,
    });
    if (Object.keys(errors).length > 0) {
      setFormErrors({
        name: errors.name ? t('validation.validName') : undefined,
        phone: errors.phone ? t('validation.validPhone') : undefined,
        email: errors.email ? t('validation.validEmail') : undefined,
        openingBalance: errors.openingBalance ? t('validation.nonNegativeAmount') : undefined,
      });
      return;
    }
    setFormErrors({});
    const taxFields = {
      address_line1: addressLine1.trim() || null,
      address_line2: addressLine2.trim() || null,
      city: city.trim() || null,
      state: stateName.trim() || null,
      state_code: stateCode.trim() || null,
      postal_code: postalCode.trim() || null,
      gstin: gstin.trim().toUpperCase() || null,
    };
    try {
      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          name,
          phone,
          email: email || undefined,
          ...taxFields,
        }).unwrap();
        notificationService.success(t('customers.customerUpdated'));
      } else {
        await createCustomer({
          name,
          phone,
          email: email || undefined,
          opening_balance: Number(creditBalance),
          ...taxFields,
        }).unwrap();
        notificationService.success(t('customers.customerCreated'));
      }

      setShowModal(false);
      resetForm();
      setSkip(0);
    } catch (error: unknown) {
      notificationService.handleApiError(error);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setCreditBalance(customer.credit_balance?.toString() || '0');
    setAddressLine1(customer.address_line1 || '');
    setAddressLine2(customer.address_line2 || '');
    setCity(customer.city || '');
    setStateName(customer.state || '');
    setStateCode(customer.state_code || '');
    setPostalCode(customer.postal_code || '');
    setGstin(customer.gstin || '');
    setShowTaxDetails(Boolean(customer.gstin || customer.address_line1));
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setCreditBalance('0');
    setShowTaxDetails(false);
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setStateName('');
    setStateCode('');
    setPostalCode('');
    setGstin('');
    setFormErrors({});
  };

  const total = data?.meta?.total || 0;
  const currentBatchSize = data?.data?.length || 0;
  const hasMore = allCustomers.length < total && currentBatchSize === take;
  const visibleCustomers = useMemo(
    () => filterCustomers(allCustomers, search),
    [allCustomers, search]
  );

  const loadMore = async (e: CustomEvent) => {
    if (hasMore && !isFetching) {
      setSkip((prev) => prev + take);
    }
    setTimeout(() => {
      (e.target as HTMLIonInfiniteScrollElement).complete();
    }, 100);
  };

  return (
    <IonPage>
      <Navbar title={t('customers.title')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('customers.title')}</h1>
              <p>{t('customers.pageHint')}</p>
            </div>
            {canCreateCustomer && (
              <div className="workspace-actions customers-desktop-action">
                <Button onClick={() => setShowModal(true)}>
                  <IonIcon icon={add} className="mr-2" />
                  {t('customers.addCustomer')}
                </Button>
              </div>
            )}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

          {isLoading && allCustomers.length === 0 ? (
            <Loading isOpen={isLoading} />
          ) : isError && allCustomers.length === 0 ? (
            <div className="workspace-state">
              <p>{t('customers.loadError')}</p>
              <Button onClick={refetch} variant="outline">
                {t('common.retry')}
              </Button>
            </div>
          ) : visibleCustomers.length === 0 ? (
            <EmptyState
              message={search ? t('customers.noCustomersSearch') : t('customers.noCustomers')}
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
            <>
              <IonList className="workspace-grid customers-grid">
                {visibleCustomers.map((customer) => (
                  <div key={customer.id} className="workspace-record customer-record">
                    <IonItemSliding>
                      <IonItem
                        button
                        onClick={() => history.push(`/customers/${customer.id}/ledger`)}
                      >
                        <IonLabel>
                          <h2 className="customer-record-name">{customer.name}</h2>
                          <p>{customer.phone}</p>
                          {customer.credit_balance !== 0 && (
                            <p
                              className="font-medium"
                              style={{
                                color:
                                  customer.credit_balance > 0
                                    ? 'var(--ion-color-danger)'
                                    : 'var(--ion-color-success)',
                              }}
                            >
                              {customer.credit_balance > 0
                                ? `${t('customers.owesYou')}: ${formatCurrency(customer.credit_balance)}`
                                : `${t('customers.youOwe')}: ${formatCurrency(Math.abs(customer.credit_balance))}`}
                            </p>
                          )}
                        </IonLabel>
                      </IonItem>
                      {canUpdateCustomer && (
                        <IonItemOptions side="end">
                          <IonItemOption
                            color="primary"
                            onClick={() => handleEditCustomer(customer)}
                            aria-label={t('common.edit')}
                          >
                            <IonIcon slot="icon-only" icon={pencil} />
                          </IonItemOption>
                        </IonItemOptions>
                      )}
                    </IonItemSliding>
                    <div className="customer-record-actions">
                      <IonButton
                        fill="clear"
                        onClick={() => history.push(`/customers/${customer.id}/ledger`)}
                      >
                        {t('customers.viewLedger')}
                      </IonButton>
                      {canUpdateCustomer && (
                        <IonButton fill="clear" onClick={() => handleEditCustomer(customer)}>
                          <IonIcon icon={pencil} slot="start" />
                          {t('common.edit')}
                        </IonButton>
                      )}
                    </div>
                  </div>
                ))}
              </IonList>

              <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
                <IonInfiniteScrollContent loadingText={t('customers.loadingMore')} />
              </IonInfiniteScroll>
            </>
          )}
        </div>

        {/* FAB Button */}
        {canCreateCustomer && (
          <IonFab
            vertical="bottom"
            horizontal="end"
            slot="fixed"
            className="customers-mobile-action"
          >
            <IonFabButton
              onClick={() => {
                setShowModal(true);
              }}
              aria-label={t('customers.addCustomer')}
            >
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Add Customer Modal */}
        {showModal && (
          <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>
                  {editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
                </IonTitle>
                <IonButtons slot="end">
                  <IonButton
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
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
                error={formErrors.name}
                maxLength={150}
                required
              />
              <Input
                label={t('customers.customerPhone')}
                value={phone}
                onChange={setPhone}
                type="tel"
                error={formErrors.phone}
                maxLength={10}
                inputMode="numeric"
                required
              />
              <Input
                label={t('customers.customerEmail')}
                value={email}
                onChange={setEmail}
                type="email"
                error={formErrors.email}
                maxLength={254}
              />
              {!editingCustomer && (
                <Input
                  label={t('customers.creditBalance')}
                  value={creditBalance}
                  onChange={setCreditBalance}
                  type="number"
                  error={formErrors.openingBalance}
                  min={0}
                  inputMode="decimal"
                />
              )}
              <details
                className="customer-tax-details"
                open={showTaxDetails}
                onToggle={(event) => setShowTaxDetails(event.currentTarget.open)}
              >
                <summary>{t('taxFields.customerDetails')}</summary>
                <p>{t('taxFields.customerDetailsHint')}</p>
                <Input label={t('taxFields.gstin')} value={gstin} onChange={(value) => setGstin(value.toUpperCase())} maxLength={15} />
                <Input label={t('taxFields.addressLine1')} value={addressLine1} onChange={setAddressLine1} />
                <Input label={t('taxFields.addressLine2')} value={addressLine2} onChange={setAddressLine2} />
                <Input label={t('taxFields.city')} value={city} onChange={setCity} />
                <Input label={t('taxFields.state')} value={stateName} onChange={setStateName} />
                <Input label={t('taxFields.stateCode')} value={stateCode} onChange={setStateCode} maxLength={2} inputMode="numeric" />
                <Input label={t('taxFields.postalCode')} value={postalCode} onChange={setPostalCode} maxLength={6} inputMode="numeric" />
              </details>
              <Button
                onClick={handleCreateCustomer}
                loading={creating || updating}
                fullWidth
                size="large"
              >
                {t('common.save')}
              </Button>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};
