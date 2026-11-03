import React from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { Navbar } from '@components/Navbar';
import { EmptyState, Loading } from '@components';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@utils/helpers';
import {
  useGetIncomingStorefrontOrdersQuery,
  useUpdateStorefrontOrderStatusMutation,
  type StorefrontOrderStatus,
} from '@core/api/storefrontOrderApi';

const nextActions: Partial<Record<StorefrontOrderStatus, StorefrontOrderStatus[]>> = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
};

const StorefrontOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetIncomingStorefrontOrdersQuery();
  const [updateStatus, { isLoading: updating }] = useUpdateStorefrontOrderStatusMutation();
  const orders = data?.data ?? [];
  return (
    <IonPage>
      <Navbar title={t('storefrontOrders.title')} />
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            await refetch();
            event.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('storefrontOrders.title')}</h1>
              <p>{t('storefrontOrders.subtitle')}</p>
            </div>
          </div>
          {isLoading ? (
            <Loading isOpen />
          ) : orders.length === 0 ? (
            <EmptyState message={t('storefrontOrders.empty')} />
          ) : (
            orders.map((order) => (
              <IonCard key={order.id}>
                <IonCardContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>
                        #{order.id} · {order.contact_name || t('storefrontOrders.customer')}
                      </strong>
                      <p>
                        {order.contact_phone} ·{' '}
                        {t(`storefrontOrders.fulfillment.${order.fulfillment_type}`)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <IonChip>{t(`storefrontOrders.status.${order.status}`)}</IonChip>
                      <h2>{formatCurrency(Number(order.total_amount))}</h2>
                    </div>
                  </div>
                  {order.delivery_address_snapshot && (
                    <p>
                      <strong>{t('storefrontOrders.address')}:</strong>{' '}
                      {order.delivery_address_snapshot}
                    </p>
                  )}
                  {order.customer_note && (
                    <p>
                      <strong>{t('storefrontOrders.note')}:</strong> {order.customer_note}
                    </p>
                  )}
                  <div style={{ margin: '12px 0', display: 'grid', gap: 6 }}>
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
                      >
                        <span>
                          {item.product_name || t('storefrontOrders.item')}
                          {item.size ? ` · ${item.size}` : ''}
                          {` × ${item.quantity}`}
                        </span>
                        <strong>{formatCurrency(Number(item.total_price))}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(nextActions[order.status] ?? []).map((status) => (
                      <IonButton
                        key={status}
                        disabled={updating}
                        color={status === 'CANCELLED' ? 'danger' : 'primary'}
                        fill={status === 'CANCELLED' ? 'outline' : 'solid'}
                        onClick={() => updateStatus({ id: order.id, status })}
                      >
                        {t(`storefrontOrders.actions.${status}`)}
                      </IonButton>
                    ))}
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StorefrontOrdersPage;
