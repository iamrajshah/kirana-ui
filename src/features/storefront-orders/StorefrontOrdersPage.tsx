import React, { useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToggle,
} from '@ionic/react';
import { Navbar } from '@components/Navbar';
import { EmptyState, Loading } from '@components';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@utils/helpers';
import {
  useGetIncomingStorefrontOrdersQuery,
  useUpdateStorefrontOrderStatusMutation,
  type StorefrontOrderStatus,
  useCreateStorefrontOfferMutation,
  useDeleteStorefrontOfferMutation,
  useGetStorefrontOffersQuery,
  useUpdateStorefrontOfferMutation,
} from '@core/api/storefrontOrderApi';
import { useGetProductsQuery } from '@core/api/productApi';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';

const storefrontBaseUrl = (
  import.meta.env.VITE_CUSTOMER_STOREFRONT_URL || 'https://kirana-customer.pages.dev'
).replace(/\/$/, '');

const nextActions: Partial<Record<StorefrontOrderStatus, StorefrontOrderStatus[]>> = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
};

const StorefrontOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAppSelector(selectCurrentUser);
  const [section, setSection] = useState<'orders' | 'offers'>('orders');
  const [linkCopied, setLinkCopied] = useState(false);
  const { data, isLoading, refetch } = useGetIncomingStorefrontOrdersQuery();
  const {
    data: offerData,
    isLoading: offersLoading,
    refetch: refetchOffers,
  } = useGetStorefrontOffersQuery();
  const { data: productData } = useGetProductsQuery({ take: 100 });
  const [updateStatus, { isLoading: updating }] = useUpdateStorefrontOrderStatusMutation();
  const [createOffer, { isLoading: creatingOffer }] = useCreateStorefrontOfferMutation();
  const [updateOffer] = useUpdateStorefrontOfferMutation();
  const [deleteOffer] = useDeleteStorefrontOfferMutation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badgeText, setBadgeText] = useState('TODAY’S OFFER');
  const [productId, setProductId] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const orders = data?.data ?? [];
  const offers = offerData?.data ?? [];
  const products = productData?.data ?? [];
  const tenantId = currentUser?.tenant?.id;
  const storefrontUrl = tenantId ? `${storefrontBaseUrl}/shop/shop-${tenantId}` : '';

  const copyStorefrontLink = async () => {
    if (!storefrontUrl) return;
    await navigator.clipboard.writeText(storefrontUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareStorefrontLink = async () => {
    if (!storefrontUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: currentUser?.tenant?.name || t('storefrontOrders.share.title'),
        text: t('storefrontOrders.share.message'),
        url: storefrontUrl,
      });
      return;
    }
    await copyStorefrontLink();
  };

  const submitOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    await createOffer({
      title: title.trim(),
      description: description.trim() || null,
      badge_text: badgeText.trim() || null,
      product_id: productId || null,
      is_active: publishNow,
    }).unwrap();
    setTitle('');
    setDescription('');
    setProductId('');
  };

  return (
    <IonPage>
      <Navbar title={t('storefrontOrders.title')} />
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            if (section === 'offers') await refetchOffers();
            else await refetch();
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
          {storefrontUrl && (
            <IonCard>
              <IonCardContent>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <h2>{t('storefrontOrders.share.title')}</h2>
                    <p>{t('storefrontOrders.share.help')}</p>
                  </div>
                  <a href={storefrontUrl} target="_blank" rel="noreferrer">
                    {storefrontUrl}
                  </a>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <IonButton fill="outline" onClick={() => void copyStorefrontLink()}>
                      {linkCopied
                        ? t('storefrontOrders.share.copied')
                        : t('storefrontOrders.share.copy')}
                    </IonButton>
                    <IonButton onClick={() => void shareStorefrontLink()}>
                      {t('storefrontOrders.share.share')}
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}
          <IonSegment
            value={section}
            onIonChange={(event) => setSection(event.detail.value as 'orders' | 'offers')}
            style={{ marginBottom: 18 }}
          >
            <IonSegmentButton value="orders">
              <IonLabel>{t('storefrontOrders.ordersTab')}</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="offers">
              <IonLabel>{t('storefrontOrders.offersTab')}</IonLabel>
            </IonSegmentButton>
          </IonSegment>
          {section === 'offers' ? (
            <>
              <IonCard>
                <IonCardContent>
                  <form onSubmit={(event) => void submitOffer(event)} className="space-y-4">
                    <div>
                      <h2>{t('storefrontOrders.offerEditor.title')}</h2>
                      <p>{t('storefrontOrders.offerEditor.help')}</p>
                    </div>
                    <IonInput
                      label={t('storefrontOrders.offerEditor.name')}
                      labelPlacement="stacked"
                      fill="outline"
                      value={title}
                      maxlength={120}
                      required
                      onIonInput={(event) => setTitle(String(event.detail.value ?? ''))}
                    />
                    <IonTextarea
                      label={t('storefrontOrders.offerEditor.description')}
                      labelPlacement="stacked"
                      fill="outline"
                      value={description}
                      maxlength={300}
                      onIonInput={(event) => setDescription(String(event.detail.value ?? ''))}
                    />
                    <IonInput
                      label={t('storefrontOrders.offerEditor.badge')}
                      labelPlacement="stacked"
                      fill="outline"
                      value={badgeText}
                      maxlength={40}
                      onIonInput={(event) => setBadgeText(String(event.detail.value ?? ''))}
                    />
                    <label style={{ display: 'grid', gap: 6 }}>
                      <strong>{t('storefrontOrders.offerEditor.product')}</strong>
                      <select
                        value={productId}
                        onChange={(event) => setProductId(event.target.value)}
                        style={{ minHeight: 48, padding: '0 12px', borderRadius: 10 }}
                      >
                        <option value="">{t('storefrontOrders.offerEditor.noProduct')}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <IonToggle
                      checked={publishNow}
                      onIonChange={(event) => setPublishNow(event.detail.checked)}
                    >
                      {t('storefrontOrders.offerEditor.publishNow')}
                    </IonToggle>
                    <IonButton type="submit" disabled={creatingOffer || title.trim().length < 3}>
                      {t('storefrontOrders.offerEditor.create')}
                    </IonButton>
                  </form>
                </IonCardContent>
              </IonCard>
              {offersLoading ? (
                <Loading isOpen />
              ) : offers.length === 0 ? (
                <EmptyState message={t('storefrontOrders.offerEditor.empty')} />
              ) : (
                offers.map((offer) => (
                  <IonCard key={offer.id}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                          <IonChip color={offer.is_active ? 'success' : 'medium'}>
                            {offer.is_active
                              ? t('storefrontOrders.offerEditor.published')
                              : t('storefrontOrders.offerEditor.draft')}
                          </IonChip>
                          <h2>{offer.title}</h2>
                          {offer.description && <p>{offer.description}</p>}
                          {offer.product?.name && (
                            <p>
                              <strong>{t('storefrontOrders.offerEditor.product')}:</strong>{' '}
                              {offer.product.name}
                            </p>
                          )}
                        </div>
                        <div
                          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'start' }}
                        >
                          <IonButton
                            fill="outline"
                            onClick={() =>
                              void updateOffer({
                                id: offer.id,
                                data: { is_active: !offer.is_active },
                              })
                            }
                          >
                            {offer.is_active
                              ? t('storefrontOrders.offerEditor.unpublish')
                              : t('storefrontOrders.offerEditor.publish')}
                          </IonButton>
                          <IonButton
                            fill="clear"
                            color="danger"
                            onClick={() => void deleteOffer(offer.id)}
                          >
                            {t('common.delete')}
                          </IonButton>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </>
          ) : isLoading ? (
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
