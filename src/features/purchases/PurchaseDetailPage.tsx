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
import { formatDateTime, formatCurrency } from '@utils/helpers';
import { EmptyState } from '@components';
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
        <Navbar title={t('purchases.purchaseDetails')} />
        <IonContent className="ion-padding">
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
        <Navbar title={t('purchases.purchaseDetails')} />
        <IonContent className="ion-padding">
          <EmptyState message="Purchase not found or error loading details" />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Navbar title={t('purchases.purchaseDetails')} />
      <IonContent className="ion-padding">
        {/* Purchase Header */}
        <IonCard>
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <IonCardTitle>Invoice #{purchase.invoice_number}</IonCardTitle>
                <p style={{ color: 'var(--ion-color-medium)', margin: '4px 0 0 0' }}>
                  {formatDateTime(purchase.invoice_date || purchase.created_at)}
                </p>
              </div>
              <IonBadge color={getStatusColor(purchase.status)}>{purchase.status}</IonBadge>
            </div>
          </IonCardHeader>
        </IonCard>

        {/* Supplier Information */}
        {purchase.supplier && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Supplier Information</IonCardTitle>
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
            <IonCardTitle>Items</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, index: number) => (
                  <IonItem key={index}>
                    <IonLabel>
                      <h3>{item.product_name || 'Unknown Product'}</h3>
                      {item.sku && <p className="text-gray-600">SKU: {item.sku}</p>}
                      {(item.brand || item.size) && (
                        <p className="text-gray-600">
                          {item.brand && `Brand: ${item.brand}`}
                          {item.brand && item.size && ' | '}
                          {item.size && `Size: ${item.size}`}
                        </p>
                      )}
                      <p className="font-medium">
                        Qty: {item.quantity} × {formatCurrency(item.purchase_price)} = {formatCurrency(item.quantity * item.purchase_price)}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))
              ) : (
                <EmptyState message="No items found" />
              )}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Amount Summary */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Payment Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <strong>Total Amount:</strong>
                </IonCol>
                <IonCol size="6" className="ion-text-end">
                  <strong>{formatCurrency(purchase.total_amount)}</strong>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">Paid Amount:</IonCol>
                <IonCol size="6" className="ion-text-end" style={{ color: 'var(--ion-color-success)' }}>
                  {formatCurrency(purchase.paid_amount)}
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">Pending Amount:</IonCol>
                <IonCol size="6" className="ion-text-end" style={{ color: 'var(--ion-color-danger)' }}>
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
