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
import { pencil, close, barcodeOutline, cashOutline } from 'ionicons/icons';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useUpdateVariantMutation,
  useUpdateVariantPurchaseCostMutation,
  useGetProductPurchaseCostsQuery,
} from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { Loading, EmptyState, Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';
import type { ProductVariant, UqcCode, VariantPurchaseCost } from '@core/types';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';
import { hasPermission } from '@core/permissions/permissions';
import { APP_NAME } from '@core/constants';
import {
  optionalGstRateIsValid,
  optionalHsnCodeIsSupported,
} from '@core/constants/gstMasterData';
import { ProductBarcodeLabelModal } from './ProductBarcodeLabelModal';
import { useGetExpiryAlertsQuery } from '@core/api/expiryApi';
import { parseOptionalUqcQuantityFactor } from './uqcQuantityFactor';
import './ProductDetailPage.css';

export const ProductDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const canManageBarcodes = canUseCommercialFeature(
    currentUser?.roles ?? [],
    commercialAccess,
    'CUSTOM_BARCODE'
  );
  const canManagePurchaseCost =
    hasPermission(currentUser?.roles ?? [], 'PRODUCT_UPDATE') &&
    canUseCommercialFeature(currentUser?.roles ?? [], commercialAccess, 'LIVE_MARGIN_PREVIEW');
  const canTrackExpiry = canUseCommercialFeature(
    currentUser?.roles ?? [],
    commercialAccess,
    'EXPIRY_TRACKING'
  );
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetProductByIdQuery(id);
  const { data: purchaseCostsData } = useGetProductPurchaseCostsQuery(id, {
    skip: !canManagePurchaseCost,
  });
  const { data: expiryResponse } = useGetExpiryAlertsQuery(
    { windowDays: 90 },
    { skip: !canTrackExpiry }
  );
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [updateVariant, { isLoading: updatingVariant }] = useUpdateVariantMutation();
  const [updateVariantPurchaseCost, { isLoading: updatingPurchaseCost }] =
    useUpdateVariantPurchaseCostMutation();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantEditModal, setShowVariantEditModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [editName, setEditName] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editMrpPrice, setEditMrpPrice] = useState('');
  const [editHsnCode, setEditHsnCode] = useState('');
  const [editGstPercent, setEditGstPercent] = useState('');
  const [editUqcCode, setEditUqcCode] = useState('');
  const [editUnitLabel, setEditUnitLabel] = useState('');
  const [editUqcQuantityFactor, setEditUqcQuantityFactor] = useState('');
  const [barcodeVariant, setBarcodeVariant] = useState<ProductVariant | null>(null);
  const [costVariant, setCostVariant] = useState<ProductVariant | null>(null);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseCostSource, setPurchaseCostSource] = useState<
    'OPENING_STOCK' | 'MANUAL_CORRECTION'
  >('OPENING_STOCK');
  const [purchaseCostReason, setPurchaseCostReason] = useState('');

  const categories = categoriesData?.data || [];

  const handleEditClick = () => {
    if (data?.data) {
      setEditName(data.data.name);
      setEditImageUrl(data.data.image_url || '');
      setEditCategoryId(
        typeof data.data.category_id === 'string'
          ? parseInt(data.data.category_id)
          : data.data.category_id
      );
      setEditHsnCode(data.data.hsn_code || '');
      setShowEditModal(true);
    }
  };

  const handleVariantEditClick = (variantId: string) => {
    const product = data?.data;
    if (!product) return;
    const variants = product.variants || product.product_variants || [];
    const variant = variants.find(
      (v: ProductVariant) => v.id?.toString() === variantId?.toString()
    );
    if (!variant) {
      return;
    }
    setEditingVariant(variant);
    setEditSellingPrice(variant.selling_price?.toString() || variant.price.toString());
    setEditMrpPrice(variant.mrp_price?.toString() || '');
    setEditGstPercent(variant.gst_percent?.toString() || '');
    setEditUqcCode(variant.uqc_code || '');
    setEditUnitLabel(variant.unit_label || '');
    setEditUqcQuantityFactor(variant.uqc_quantity_factor?.toString() || '');
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
    const mrpPrice = editMrpPrice ? parseFloat(editMrpPrice) : null;
    if (mrpPrice !== null && (isNaN(mrpPrice) || mrpPrice < sellingPrice)) {
      setErrorMessage(t('products.mrpBelowSellingPrice'));
      setShowError(true);
      return;
    }
    const parsedUqcQuantityFactor = parseOptionalUqcQuantityFactor(editUqcQuantityFactor);
    if (!parsedUqcQuantityFactor.valid) {
      setErrorMessage(t('taxFields.uqcQuantityFactorInvalid'));
      setShowError(true);
      return;
    }
    const parsedGstPercent = editGstPercent ? Number(editGstPercent) : null;
    if (!optionalGstRateIsValid(parsedGstPercent)) {
      setErrorMessage(t('taxFields.unsupportedGstRate'));
      setShowError(true);
      return;
    }

    try {
      await updateVariant({
        id: editingVariant.id,
        data: {
          selling_price: sellingPrice,
          mrp_price: mrpPrice,
          gst_percent: parsedGstPercent,
          uqc_code: (editUqcCode as UqcCode) || null,
          unit_label: editUnitLabel.trim() || null,
          uqc_quantity_factor: parsedUqcQuantityFactor.value,
        },
      }).unwrap();

      setSuccessMessage(t('products.productUpdated'));
      setShowSuccess(true);
      setShowVariantEditModal(false);
      setEditingVariant(null);
      setEditSellingPrice('');
      setEditMrpPrice('');
      setEditUqcQuantityFactor('');
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || t('products.updateFailed'));
      setShowError(true);
    }
  };

  const handleUpdateProduct = async () => {
    if (!optionalHsnCodeIsSupported(editHsnCode)) {
      setErrorMessage(t('taxFields.hsnCodeInvalid'));
      setShowError(true);
      return;
    }
    try {
      await updateProduct({
        id,
        data: {
          name: editName,
          image_url: editImageUrl.trim() || null,
          category_id: editCategoryId,
          hsn_code: editHsnCode.trim() || null,
        },
      }).unwrap();

      setSuccessMessage(t('products.productUpdated'));
      setShowSuccess(true);
      setShowEditModal(false);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || t('products.updateFailed'));
      setShowError(true);
    }
  };

  const handlePurchaseCostClick = (variant: ProductVariant) => {
    const currentCost = purchaseCostsData?.data.find(
      (cost) => cost.variant_id === variant.id.toString()
    );
    setCostVariant(variant);
    setPurchaseCost(currentCost?.purchase_price?.toString() ?? '');
    setPurchaseCostSource(
      currentCost?.purchase_price == null ? 'OPENING_STOCK' : 'MANUAL_CORRECTION'
    );
    setPurchaseCostReason('');
  };

  const handleUpdatePurchaseCost = async () => {
    if (!costVariant) return;
    const value = Number(purchaseCost);
    if (!Number.isFinite(value) || value < 0) {
      setErrorMessage(t('products.purchaseCostInvalid'));
      setShowError(true);
      return;
    }
    if (purchaseCostReason.trim().length < 3) {
      setErrorMessage(t('products.purchaseCostReasonRequired'));
      setShowError(true);
      return;
    }

    try {
      await updateVariantPurchaseCost({
        id: costVariant.id,
        purchase_price: value,
        source: purchaseCostSource,
        reason: purchaseCostReason.trim(),
      }).unwrap();
      setCostVariant(null);
      setSuccessMessage(t('products.purchaseCostUpdated'));
      setShowSuccess(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || t('products.updateFailed'));
      setShowError(true);
    }
  };

  const purchaseCostSourceLabel = (source: VariantPurchaseCost['source']) => {
    if (source === 'PURCHASE') return t('products.purchaseCostSourcePurchase');
    if (source === 'OPENING_STOCK') return t('products.purchaseCostSourceOpening');
    if (source === 'MANUAL_CORRECTION') return t('products.purchaseCostSourceCorrection');
    return t('common.notAvailable');
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
  const purchaseCostsByVariant = new Map(
    purchaseCostsData?.data.map((cost) => [cost.variant_id, cost]) ?? []
  );
  const productExpiryBatches = (expiryResponse?.data.batches ?? []).filter(
    (batch) => batch.productId === id
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/products" />
          </IonButtons>
          <IonTitle>{product.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleEditClick} aria-label={t('products.editProduct')}>
              <IonIcon slot="icon-only" icon={pencil} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="workspace-page">
          <IonCard style={{ backgroundColor: 'var(--ion-card-background)' }}>
            <IonCardHeader>
              <IonCardTitle style={{ color: 'var(--ion-text-color)' }}>
                {t('products.productInfo')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3 style={{ color: 'var(--ion-text-color)' }}>{t('products.category')}</h3>
                    <p style={{ color: 'var(--ion-color-medium)' }}>
                      {product.category?.name || t('products.uncategorized')}
                    </p>
                  </IonLabel>
                </IonItem>
                {product.hsn_code && (
                  <IonItem>
                    <IonLabel>{t('taxFields.hsnCode')}</IonLabel>
                    <IonLabel slot="end">{product.hsn_code}</IonLabel>
                  </IonItem>
                )}
                <IonItem>
                  <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                    {t('common.status')}
                  </IonLabel>
                  <IonBadge slot="end" color={product.is_active ? 'success' : 'danger'}>
                    {product.is_active ? t('products.active') : t('products.inactive')}
                  </IonBadge>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          {canTrackExpiry && productExpiryBatches.length > 0 && (
            <IonCard className="product-expiry-card">
              <IonCardHeader>
                <IonCardTitle>{t('expiry.productAlerts')}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="product-expiry-list">
                  {productExpiryBatches.map((batch) => (
                    <article key={batch.id}>
                      <div>
                        <strong>{batch.batchNumber || t('expiry.notRecorded')}</strong>
                        <span>
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                            new Date(batch.expiryDate)
                          )}
                        </span>
                      </div>
                      <IonBadge color={batch.state === 'EXPIRED' ? 'danger' : 'warning'}>
                        {batch.state === 'EXPIRED'
                          ? t('expiry.expired')
                          : t('expiry.daysRemaining', { count: batch.daysToExpiry })}
                      </IonBadge>
                      <span>{t('expiry.unitsCount', { count: batch.quantity })}</span>
                    </article>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {variants && variants.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--ion-text-color)',
                }}
              >
                {t('products.variants')} ({variants.length})
              </h2>
              {variants.map((variant: ProductVariant) => {
                const cost = purchaseCostsByVariant.get(variant.id.toString());
                return (
                  <IonCard
                    key={variant.id}
                    style={{ backgroundColor: 'var(--ion-card-background)' }}
                  >
                    <IonCardHeader>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <IonCardTitle style={{ color: 'var(--ion-text-color)' }}>
                          {variant.brand || t('products.variant')} - {variant.size || ''}
                        </IonCardTitle>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <IonButton
                            fill="clear"
                            size="small"
                            aria-label={t('products.editVariant')}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVariantEditClick(variant.id?.toString());
                            }}
                          >
                            <IonIcon icon={pencil} />
                          </IonButton>
                        </div>
                      </div>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonList>
                        {variant.packaging && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('products.packaging')}
                            </IonLabel>
                            <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>
                              {variant.packaging}
                            </IonLabel>
                          </IonItem>
                        )}
                        <IonItem>
                          <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                            {t('products.price')}
                          </IonLabel>
                          <IonLabel
                            slot="end"
                            style={{ fontWeight: 'bold', color: 'var(--ion-text-color)' }}
                          >
                            {formatCurrency(Number(variant.price))}
                          </IonLabel>
                        </IonItem>
                        {variant.selling_price && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('products.sellingPrice')}
                            </IonLabel>
                            <IonLabel
                              slot="end"
                              style={{ fontWeight: 'bold', color: 'var(--ion-color-success)' }}
                            >
                              {formatCurrency(Number(variant.selling_price))}
                            </IonLabel>
                          </IonItem>
                        )}
                        {variant.mrp_price && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('products.mrpShort')}
                            </IonLabel>
                            <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>
                              {formatCurrency(Number(variant.mrp_price))}
                            </IonLabel>
                          </IonItem>
                        )}
                        {canManagePurchaseCost && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              <h3>{t('products.latestPurchaseCost')}</h3>
                              <p>
                                {cost?.source
                                  ? purchaseCostSourceLabel(cost.source)
                                  : t('products.purchaseCostNotRecorded')}
                                {cost?.updated_at
                                  ? ` · ${new Intl.DateTimeFormat(undefined, {
                                      dateStyle: 'medium',
                                    }).format(new Date(cost.updated_at))}`
                                  : ''}
                              </p>
                            </IonLabel>
                            <IonLabel slot="end" style={{ fontWeight: 'bold' }}>
                              {cost?.purchase_price == null
                                ? t('common.notAvailable')
                                : formatCurrency(cost.purchase_price)}
                            </IonLabel>
                          </IonItem>
                        )}
                        {variant.gst_percent && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('products.gstLabel')}
                            </IonLabel>
                            <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>
                              {variant.gst_percent}%
                            </IonLabel>
                          </IonItem>
                        )}
                        {(variant.uqc_code || variant.unit_label) && (
                          <IonItem>
                            <IonLabel>{t('taxFields.unitOfQuantity')}</IonLabel>
                            <IonLabel slot="end">
                              {[variant.uqc_code, variant.unit_label].filter(Boolean).join(' · ')}
                            </IonLabel>
                          </IonItem>
                        )}
                        {variant.uqc_quantity_factor != null && (
                          <IonItem lines="none">
                            <IonLabel>
                              <p>{t('taxFields.uqcQuantityFactor')}</p>
                              <h3>{variant.uqc_quantity_factor}</h3>
                            </IonLabel>
                          </IonItem>
                        )}
                        {variant.sku && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('products.sku')}
                            </IonLabel>
                            <IonLabel slot="end" style={{ color: 'var(--ion-text-color)' }}>
                              {variant.sku}
                            </IonLabel>
                          </IonItem>
                        )}
                        {variant.inventory && (
                          <IonItem>
                            <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                              {t('inventory.currentStock')}
                            </IonLabel>
                            <IonBadge
                              slot="end"
                              color={
                                (variant.inventory.quantity || 0) <=
                                (variant.inventory.low_stock_threshold || 5)
                                  ? 'danger'
                                  : 'success'
                              }
                            >
                              {variant.inventory.quantity || 0} {t('foundation.product.units')}
                            </IonBadge>
                          </IonItem>
                        )}
                      </IonList>
                      {canManageBarcodes && (
                        <IonButton
                          expand="block"
                          fill="outline"
                          onClick={() => setBarcodeVariant(variant)}
                        >
                          <IonIcon slot="start" icon={barcodeOutline} />
                          {t('products.manageBarcodeLabel')}
                        </IonButton>
                      )}
                      {canManagePurchaseCost && (
                        <IonButton
                          expand="block"
                          fill="outline"
                          onClick={() => handlePurchaseCostClick(variant)}
                        >
                          <IonIcon slot="start" icon={cashOutline} />
                          {cost?.purchase_price == null
                            ? t('products.setOpeningCost')
                            : t('products.correctPurchaseCost')}
                        </IonButton>
                      )}
                    </IonCardContent>
                  </IonCard>
                );
              })}
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
          message={successMessage || t('products.productUpdated')}
          duration={2000}
          color="success"
          onDidDismiss={() => setShowSuccess(false)}
        />

        <ProductBarcodeLabelModal
          isOpen={Boolean(barcodeVariant)}
          shopName={currentUser?.tenant?.name || APP_NAME}
          productName={product.name}
          variant={barcodeVariant}
          onDismiss={() => setBarcodeVariant(null)}
          isDemo={commercialAccess?.planCode === 'DEMO'}
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

                <Input
                  label={t('products.imageUrlLabel')}
                  value={editImageUrl}
                  onChange={setEditImageUrl}
                  placeholder={t('products.imageUrlPlaceholder')}
                  inputMode="text"
                />
                {editImageUrl && (
                  <img
                    src={editImageUrl}
                    alt={editName || t('products.imagePreview')}
                    style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 12 }}
                  />
                )}

                <Select
                  label={t('products.category')}
                  value={editCategoryId?.toString() || ''}
                  onChange={(value) => setEditCategoryId(value ? parseInt(value) : null)}
                  options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                  placeholder={t('common.placeholders.selectCategory')}
                />

                <Input
                  label={t('taxFields.hsnCode')}
                  value={editHsnCode}
                  onChange={setEditHsnCode}
                  maxLength={8}
                  inputMode="numeric"
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
              setEditMrpPrice('');
              setEditUqcQuantityFactor('');
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
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {editingVariant.brand || t('products.variant')} - {editingVariant.size || ''}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                    {t('products.sku')}: {editingVariant.sku || t('common.notAvailable')}
                  </p>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <IonLabel
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
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

                <Input
                  label={t('products.mrpPriceLabel')}
                  type="number"
                  value={editMrpPrice}
                  onChange={setEditMrpPrice}
                  placeholder={t('products.enterMrpPlaceholder')}
                />

                <Input
                  label={t('products.gstLabel')}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  inputMode="decimal"
                  value={editGstPercent}
                  onChange={setEditGstPercent}
                />
                <Select
                  label={t('taxFields.uqcCode')}
                  value={editUqcCode}
                  onChange={setEditUqcCode}
                  options={[
                    { value: '', label: t('common.notAvailable') },
                    ...[
                      'BAG',
                      'BAL',
                      'BDL',
                      'BOX',
                      'BTL',
                      'CTN',
                      'DOZ',
                      'GMS',
                      'KGS',
                      'LTR',
                      'MLT',
                      'MTR',
                      'NOS',
                      'PAC',
                      'PCS',
                      'SET',
                    ].map((value) => ({ value, label: value })),
                  ]}
                />
                <Input
                  label={t('taxFields.unitLabel')}
                  value={editUnitLabel}
                  onChange={setEditUnitLabel}
                  maxLength={30}
                />
                <Input
                  label={t('taxFields.uqcQuantityFactor')}
                  value={editUqcQuantityFactor}
                  onChange={setEditUqcQuantityFactor}
                  type="number"
                  inputMode="decimal"
                  min={0.001}
                  max={1_000_000}
                  step="0.001"
                  error={
                    editUqcQuantityFactor &&
                    !parseOptionalUqcQuantityFactor(editUqcQuantityFactor).valid
                      ? t('taxFields.uqcQuantityFactorInvalid')
                      : undefined
                  }
                />
                <p className="product-tax-field-hint">{t('taxFields.uqcQuantityFactorHint')}</p>

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleUpdateVariantPrice}
                    disabled={
                      updatingVariant || !editSellingPrice || parseFloat(editSellingPrice) <= 0
                    }
                    loading={updatingVariant}
                  >
                    {t('products.updatePrice')}
                  </Button>
                </div>
              </div>
            </IonContent>
          </IonModal>
        )}

        <IonModal isOpen={Boolean(costVariant)} onDidDismiss={() => setCostVariant(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('products.costAndPricing')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setCostVariant(null)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div style={{ padding: '16px' }}>
              <p style={{ color: 'var(--ion-color-medium)' }}>{t('products.purchaseCostHelp')}</p>
              <Input
                label={t('products.purchaseCostLabel')}
                type="number"
                value={purchaseCost}
                onChange={setPurchaseCost}
                placeholder={t('products.purchaseCostPlaceholder')}
              />
              <Select
                label={t('products.purchaseCostSource')}
                value={purchaseCostSource}
                onChange={(value) =>
                  setPurchaseCostSource(value as 'OPENING_STOCK' | 'MANUAL_CORRECTION')
                }
                options={[
                  { value: 'OPENING_STOCK', label: t('products.purchaseCostSourceOpening') },
                  {
                    value: 'MANUAL_CORRECTION',
                    label: t('products.purchaseCostSourceCorrection'),
                  },
                ]}
              />
              <Input
                label={t('products.purchaseCostReason')}
                value={purchaseCostReason}
                onChange={setPurchaseCostReason}
                placeholder={t('products.purchaseCostReasonPlaceholder')}
                maxLength={255}
              />
              <p style={{ color: 'var(--ion-color-medium)', fontSize: '13px' }}>
                {t('products.purchaseCostHistoryNote')}
              </p>
              <Button
                onClick={handleUpdatePurchaseCost}
                disabled={
                  updatingPurchaseCost ||
                  purchaseCost === '' ||
                  !Number.isFinite(Number(purchaseCost)) ||
                  Number(purchaseCost) < 0 ||
                  purchaseCostReason.trim().length < 3
                }
                loading={updatingPurchaseCost}
              >
                {t('products.savePurchaseCost')}
              </Button>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};
