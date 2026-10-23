import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { Navbar } from '@components/Navbar';
import { useGetPurchaseByIdQuery } from '../../core/api/purchaseApi';
import { formatDate, formatCurrency } from '@utils/helpers';
import { EmptyState } from '@components';
import { ROUTES } from '@core/constants';
import './PurchaseDetailPage.css';

const PurchaseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetPurchaseByIdQuery(id);

  const purchase = data?.data;

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

  if (isLoading) {
    return (
      <IonPage>
        <Navbar title={t('purchases.purchaseDetails')} backHref={ROUTES.PURCHASES} />
        <IonContent className="detail-workspace">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !purchase) {
    return (
      <IonPage>
        <Navbar title={t('purchases.purchaseDetails')} backHref={ROUTES.PURCHASES} />
        <IonContent className="detail-workspace">
          <EmptyState message={t('purchases.purchaseNotFound')} />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Navbar title={t('purchases.purchaseDetails')} backHref={ROUTES.PURCHASES} />
      <IonContent className="detail-workspace">
        {/* Purchase Header */}
        <IonCard>
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <IonCardTitle>
                  {t('purchases.invoiceHash')}
                  {purchase.invoice_number}
                </IonCardTitle>
                <p style={{ color: 'var(--ion-color-medium)', margin: '4px 0 0 0' }}>
                  {formatDate(purchase.invoice_date || purchase.created_at)}
                </p>
              </div>
              <IonBadge color={getStatusColor(purchase.status)}>{purchase.status}</IonBadge>
            </div>
          </IonCardHeader>
        </IonCard>

        {purchase.firm && (
          <IonCard>
            <IonCardHeader><IonCardTitle>{t('purchases.purchaseFirm')}</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <strong>{purchase.firm.display_name}</strong>
              <p>{purchase.firm.legal_name} · {purchase.firm.code}</p>
            </IonCardContent>
          </IonCard>
        )}

        {/* Supplier Information */}
        {purchase.supplier && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('purchases.supplierInformation')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem lines="none">
                  <IonLabel>
                    <h2>{purchase.supplier.name}</h2>
                    {purchase.supplier.phone && <p>{purchase.supplier.phone}</p>}
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Items */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('purchases.items')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, index: number) => (
                  <IonItem key={index}>
                    <IonLabel>
                      <h3>{item.product_name || t('invoiceDetail.unknownProduct')}</h3>
                      {item.sku && (
                        <p className="text-gray-600">
                          {t('reports.skuLabel')} {item.sku}
                        </p>
                      )}
                      {(item.brand || item.size) && (
                        <p className="text-gray-600">
                          {item.brand && `${t('products.brand')}: ${item.brand}`}
                          {item.brand && item.size && ' | '}
                          {item.size && `${t('products.size')}: ${item.size}`}
                        </p>
                      )}
                      <p className="font-medium">
                        {t('purchases.quantity')}: {item.quantity} ×{' '}
                        {formatCurrency(item.purchase_price)} ={' '}
                        {formatCurrency(item.quantity * item.purchase_price)}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))
              ) : (
                <EmptyState message={t('invoiceDetail.noItemsFound')} />
              )}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Amount Summary */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('purchases.paymentSummary')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <strong>{t('purchases.totalAmount')}:</strong>
                </IonCol>
                <IonCol size="6" className="ion-text-end">
                  <strong>{formatCurrency(purchase.total_amount)}</strong>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">{t('purchases.paidAmount')}:</IonCol>
                <IonCol
                  size="6"
                  className="ion-text-end"
                  style={{ color: 'var(--ion-color-success)' }}
                >
                  {formatCurrency(purchase.paid_amount)}
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">{t('purchases.pendingAmount')}:</IonCol>
                <IonCol
                  size="6"
                  className="ion-text-end"
                  style={{ color: 'var(--ion-color-danger)' }}
                >
                  {formatCurrency(purchase.total_amount - purchase.paid_amount)}
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PurchaseDetailPage;
