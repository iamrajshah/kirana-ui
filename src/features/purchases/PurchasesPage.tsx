import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonText,
  IonFab,
  IonFabButton,
  RefresherEventDetail,
  IonToolbar,
} from '@ionic/react';
import { add, documentText } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { Navbar } from '@components/Navbar';

import { useGetPurchasesQuery } from '../../core/api/purchaseApi';
import { formatCurrency, formatDate } from '@utils/helpers';
import { useAppSelector } from '../../core/hooks';
import { selectCurrentUser } from '../../core/auth/authSlice';
import { hasPermission } from '../../core/permissions/permissions';

const PurchasesPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const hasCreatePermission = hasPermission(userRoles, 'PURCHASE_CREATE');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = useGetPurchasesQuery({});

  const purchases = data?.data || [];

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refetch();
    event.detail.complete();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'UNPAID':
        return 'danger';
      case 'PARTIAL':
        return 'warning';
      default:
        return 'medium';
    }
  };

  const filteredPurchases = purchases.filter((purchase) =>
    purchase.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <IonPage>
      <Navbar title={t('purchases.title')} />
      <IonContent>
        <IonToolbar>
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value!)}
            placeholder={t('purchases.searchPurchases')}
          />
        </IonToolbar>

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="ion-text-center ion-padding">
            <IonText color="medium">
              <p>{searchTerm ? t('purchases.noPurchasesFound') : t('purchases.noPurchases')}</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {filteredPurchases.map((purchase) => (
              <IonCard 
                key={purchase.id} 
                button
                onClick={() => history.push(`/purchases/${purchase.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <IonCardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <IonCardTitle style={{ fontSize: '1.1rem' }}>
                        <IonIcon icon={documentText} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        {purchase.invoice_number}
                      </IonCardTitle>
                      <p style={{ margin: '4px 0 0', color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>
                        {formatDate(purchase.invoice_date)}
                      </p>
                    </div>
                    <IonBadge color={getStatusColor(purchase.status)}>
                      {purchase.status}
                    </IonBadge>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  {purchase.suppliers && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ margin: 0, fontWeight: '500' }}>{purchase.suppliers.name}</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <IonText color="medium">
                        <small>{t('purchases.totalAmount')}</small>
                      </IonText>
                      <br />
                      <strong>{formatCurrency(purchase.total_amount)}</strong>
                    </div>
                    <div>
                      <IonText color="medium">
                        <small>{t('purchases.paidAmount')}</small>
                      </IonText>
                      <br />
                      <IonText color="success">
                        <strong>{formatCurrency(purchase.paid_amount)}</strong>
                      </IonText>
                    </div>
                  </div>

                  {purchase.status !== 'PAID' && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--ion-color-light)' }}>
                      <IonText color="danger">
                        <small style={{ display: 'block', marginBottom: '4px' }}>{t('purchases.pendingAmount')}</small>
                        <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(purchase.total_amount - purchase.paid_amount)}</strong>
                      </IonText>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>
        )}

        {/* Create Purchase FAB */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton 
            onClick={() => history.push('/purchases/create')}
            disabled={!hasCreatePermission}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default PurchasesPage;
