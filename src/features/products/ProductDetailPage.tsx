import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBackButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonModal,
  IonToast,
} from '@ionic/react';
import { pencil, close } from 'ionicons/icons';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useGetProductByIdQuery, useUpdateProductMutation, useUpdateVariantMutation } from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { Loading, EmptyState, Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';
import type { ProductVariant } from '@core/types';

export const ProductDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetProductByIdQuery(id);
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [updateVariant, { isLoading: updatingVariant }] = useUpdateVariantMutation();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantEditModal, setShowVariantEditModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState('');

  const categories = categoriesData?.data || [];

  const handleEditClick = () => {
    if (data?.data) {
      setEditName(data.data.name);
      setEditCategoryId(typeof data.data.category_id === 'string' ? parseInt(data.data.category_id) : data.data.category_id);
      setShowEditModal(true);
    }
  };

  const handleVariantEditClick = (variantId: string) => {
    const product = data?.data;
    if (!product) return;
    const variants = product.variants || product.product_variants || [];
    const variant = variants.find((v: ProductVariant) => v.id?.toString() === variantId?.toString());
    if (!variant) {
      console.error('Variant not found:', variantId, 'Available variants:', variants.map(v => v.id));
      return;
    }
    console.log('Editing variant:', variant.id, 'Product:', variant.product_id);
    setEditingVariant(variant);
    setEditSellingPrice(variant.selling_price?.toString() || variant.price.toString());
    setShowVariantEditModal(true);
  };

  const handleUpdateVariantPrice = async () => {
    if (!editingVariant) return;
    
    const sellingPrice = parseFloat(editSellingPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      setErrorMessage(t('errors.validPrice'));
      setShowError(true);
      return;
    }

    try {
      await updateVariant({
        id: editingVariant.id,
        data: { selling_price: sellingPrice },
      }).unwrap();

      setShowSuccess(true);
      setShowVariantEditModal(false);
      setEditingVariant(null);
      setEditSellingPrice('');
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || t('products.updateFailed'));
      setShowError(true);
    }
  };

  const handleUpdateProduct = async () => {
    try {
      await updateProduct({
        id,
        data: {
          name: editName,
          category_id: editCategoryId,
        },
      }).unwrap();

      setShowSuccess(true);
      setShowEditModal(false);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || t('products.updateFailed'));
      setShowError(true);
    }
  };

  if (isLoading) {
    return <Loading isOpen={true} />;
  }

  if (!data?.data || error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/products" />
            </IonButtons>
            <IonTitle>{t('products.productNotFound')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <EmptyState message={t('products.productNotFound')} />
        </IonContent>
      </IonPage>
    );
  }

  const product = data.data;
  const variants = product.variants || product.product_variants || [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/products" />
          </IonButtons>
          <IonTitle>{product.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleEditClick}>
              <IonIcon slot="icon-only" icon={pencil} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          <IonCard style={{ backgroundColor: 'var(--ion-card-background)' }}>
            <IonCardHeader>
              <IonCardTitle style={{ color: 'var(--ion-text-color)' }}>{t('products.productInfo')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3 style={{ color: 'var(--ion-text-color)' }}>{t('products.category')}</h3>
                    <p style={{ color: 'var(--ion-color-medium)' }}>{product.category?.name || t('products.uncategorized')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('common.status')}</IonLabel>
                  <IonBadge slot="end" color={product.is_active ? 'success' : 'danger'}>
                    {product.is_active ? t('products.active') : t('products.inactive')}
                  </IonBadge>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          {variants && variants.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--ion-text-color)' }}>
                {t('products.variants')} ({variants.length})
              </h2>
              {variants.map((variant: ProductVariant) => (
                <IonCard key={variant.id} style={{ backgroundColor: 'var(--ion-card-background)' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <IonCardTitle style={{ color: 'var(--ion-text-color)' }}>
                        {variant.brand || t('products.variant')} - {variant.size || ''}
                      </IonCardTitle>
                      <IonButton 
                        fill="clear" 
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVariantEditClick(variant.id?.toString());
                        }}
                      >
                        <IonIcon icon={pencil} />
                      </IonButton>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      {variant.packaging && (
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('products.packaging')}</IonLabel>
                          <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>{variant.packaging}</IonLabel>
                        </IonItem>
                      )}
                      <IonItem>
                        <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('products.price')}</IonLabel>
                        <IonLabel slot="end" style={{ fontWeight: 'bold', color: 'var(--ion-text-color)' }}>
                          {formatCurrency(Number(variant.price))}
                        </IonLabel>
                      </IonItem>
                      {variant.selling_price && (
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('products.sellingPrice')}</IonLabel>
                          <IonLabel slot="end" style={{ fontWeight: 'bold', color: 'var(--ion-color-success)' }}>
                            {formatCurrency(Number(variant.selling_price))}
                          </IonLabel>
                        </IonItem>
                      )}
                      {variant.gst_percent && (
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>GST</IonLabel>
                          <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>{variant.gst_percent}%</IonLabel>
                        </IonItem>
                      )}
                      {variant.sku && (
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('products.sku')}</IonLabel>
                          <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>{variant.sku}</IonLabel>
                        </IonItem>
                      )}
                      {variant.inventory && (
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>{t('inventory.currentStock')}</IonLabel>
                          <IonBadge
                            slot="end"
                            color={
                              (variant.inventory.quantity || 0) <= (variant.inventory.low_stock_threshold || 5)
                                ? 'danger'
                                : 'success'
                            }
                          >
                            {variant.inventory.quantity || 0} units
                          </IonBadge>
                        </IonItem>
                      )}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {(!variants || variants.length === 0) && (
            <IonCard>
              <IonCardContent>
                <EmptyState message={t('products.noVariants')} />
              </IonCardContent>
            </IonCard>
          )}
        </div>

        <IonToast
          isOpen={showSuccess}
          message={t('products.productUpdated')}
          duration={2000}
          color="success"
          onDidDismiss={() => setShowSuccess(false)}
        />

        <IonToast
          isOpen={showError}
          message={errorMessage}
          duration={3000}
          color="danger"
          onDidDismiss={() => setShowError(false)}
        />

        {showEditModal && (
          <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('products.editProductTitle')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowEditModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <div style={{ padding: '16px' }}>
                <Input
                  label={t('products.productNameLabel')}
                  value={editName}
                  onChange={setEditName}
                  placeholder={t('products.enterProductName')}
                />

                <Select
                  label={t('products.category')}
                  value={editCategoryId?.toString() || ''}
                  onChange={(value) => setEditCategoryId(value ? parseInt(value) : null)}
                  options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                  placeholder={t('common.placeholders.selectCategory')}
                />

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleUpdateProduct}
                    disabled={updating || !editName.trim()}
                    loading={updating}
                  >
                    {t('products.updateProduct')}
                  </Button>
                </div>
              </div>
            </IonContent>
          </IonModal>
        )}

        {showVariantEditModal && editingVariant && (
          <IonModal 
            isOpen={showVariantEditModal}
            onDidDismiss={() => {
              setShowVariantEditModal(false);
              setEditingVariant(null);
              setEditSellingPrice('');
            }}
          >
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('products.editSellingPriceTitle')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowVariantEditModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {editingVariant.brand || t('products.variant')} - {editingVariant.size || ''}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                    {t('products.sku')}: {editingVariant.sku || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <IonLabel style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    {t('products.basePriceCostPrice')}
                  </IonLabel>
                  <div style={{ padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {formatCurrency(Number(editingVariant.price))}
                    </span>
                  </div>
                </div>

                <Input
                  label={t('products.sellingPriceLabel')}
                  type="number"
                  value={editSellingPrice}
                  onChange={setEditSellingPrice}
                  placeholder={t('products.enterPrice')}
                />

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleUpdateVariantPrice}
                    disabled={updatingVariant || !editSellingPrice || parseFloat(editSellingPrice) <= 0}
                    loading={updatingVariant}
                  >
                    {t('products.updatePrice')}
                  </Button>
                </div>
              </div>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};
