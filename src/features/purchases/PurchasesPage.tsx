import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
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
  IonButton,
  RefresherEventDetail,
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
import { ROUTES } from '@core/constants';
import '../products/stock-workspace.css';
import { purchaseMatchesSearch } from '@utils/formValidation';

const PurchasesPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const hasCreatePermission = hasPermission(userRoles, 'PURCHASE_CREATE');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError, refetch } = useGetPurchasesQuery({});

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
    purchaseMatchesSearch(purchase, searchTerm)
  );

  return (
    <IonPage>
      <Navbar title={t('purchases.title')} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="workspace-page stock-page">
          <div className="workspace-header">
            <h1>{t('purchases.title')}</h1>
            {hasCreatePermission && (
              <div className="workspace-actions stock-primary-actions">
                <IonButton onClick={() => history.push(ROUTES.PURCHASE_CREATE)}>
                  <IonIcon slot="start" icon={add} />
                  {t('purchases.createPurchase')}
                </IonButton>
              </div>
            )}
          </div>
          <div className="stock-toolbar">
            <IonSearchbar
              value={searchTerm}
              onIonInput={(e) => setSearchTerm(e.detail.value || '')}
              placeholder={t('purchases.searchPurchases')}
            />
          </div>

          {isLoading ? (
            <div className="workspace-state">
              <IonSpinner />
            </div>
          ) : isError ? (
            <div className="workspace-state" role="alert">
              <p>{t('purchases.loadError')}</p>
              <IonButton onClick={() => refetch()}>{t('common.retry')}</IonButton>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="workspace-state">
              <p>{searchTerm ? t('purchases.noPurchasesFound') : t('purchases.noPurchases')}</p>
            </div>
          ) : (
            <div className="stock-card-grid">
              {filteredPurchases.map((purchase) => (
                <IonCard
                  key={purchase.id}
                  button
                  className="workspace-record stock-purchase-card"
                  onClick={() => history.push(`/purchases/${purchase.id}`)}
                >
                  <IonCardHeader>
                    <div className="stock-purchase-top">
                      <div>
                        <IonCardTitle>
                          <IonIcon
                            icon={documentText}
                            style={{ marginRight: '8px', verticalAlign: 'middle' }}
                          />
                          {purchase.invoice_number}
                        </IonCardTitle>
                        <p
                          style={{
                            margin: '4px 0 0',
                            color: 'var(--ion-color-medium)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {formatDate(purchase.invoice_date)}
                        </p>
                      </div>
                      <IonBadge color={getStatusColor(purchase.status)}>{purchase.status}</IonBadge>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    {purchase.suppliers && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: 0, fontWeight: '500' }}>{purchase.suppliers.name}</p>
                      </div>
                    )}

                    <div className="stock-purchase-summary">
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
                      <div className="stock-purchase-pending">
                        <IonText color="danger">
                          <small style={{ display: 'block', marginBottom: '4px' }}>
                            {t('purchases.pendingAmount')}
                          </small>
                          <strong style={{ fontSize: '1.1rem' }}>
                            {formatCurrency(purchase.total_amount - purchase.paid_amount)}
                          </strong>
                        </IonText>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}
        </div>

        {/* Create Purchase FAB */}
        {hasCreatePermission && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed" className="stock-fab">
            <IonFabButton
              onClick={() => history.push(ROUTES.PURCHASE_CREATE)}
              aria-label={t('purchases.createPurchase')}
            >
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PurchasesPage;
