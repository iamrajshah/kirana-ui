import React, { useState } from 'react';
import type { Category } from '@core/api/categoryApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { useHistory } from 'react-router';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonToast,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  isPlatform,
} from '@ionic/react';
import { checkmarkCircle, search, add } from 'ionicons/icons';
import {
  useLazyLookupBarcodeQuery,
  useCreateProductFromBarcodeMutation,
  useUpdateProductMutation,
  useUpdateVariantMutation,
} from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import {
  Input,
  Select,
  Loading,
  BarcodeScannerComponent,
  ProductPreviewCard,
  AddCategoryModal,
} from '@components';
import type { BarcodeLookupData, UqcCode } from '@core/types';
import { useTranslation } from 'react-i18next';
import './stock-workspace.css';

export const AddProductBarcodePage: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const isMobile = isPlatform('capacitor');

  // State
  const [barcode, setBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState<BarcodeLookupData | null>(null);
  const [productSource, setProductSource] = useState<'LOCAL' | 'EXTERNAL' | 'NONE'>('NONE');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [productMasterName, setProductMasterName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sku, setSku] = useState('');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [uqcCode, setUqcCode] = useState('');
  const [unitLabel, setUnitLabel] = useState('');

  // Toasts
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // API
  const [lookupBarcode, { isLoading: scanning }] = useLazyLookupBarcodeQuery();
  const [createProduct, { isLoading: creating }] = useCreateProductFromBarcodeMutation();
  const [updateProduct, { isLoading: updatingProduct }] = useUpdateProductMutation();
  const [updateVariant, { isLoading: updatingVariant }] = useUpdateVariantMutation();
  const { data: categoriesData } = useGetCategoriesQuery();

  const categories = categoriesData?.data || [];

  // Handle barcode scan from camera (mobile) or manual input (web)
  const handleBarcodeScanned = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    checkBarcode(scannedBarcode);
  };

  const checkBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) {
      setErrorMessage(t('foundation.barcode.pleaseEnter'));
      setShowError(true);
      return;
    }

    try {
      const result = await lookupBarcode(barcodeValue).unwrap();
      
      if (result.data.found && result.data.data) {
        const productData = result.data.data;
        setFoundProduct(productData);
        setProductSource(result.data.source);
        
        // If external product, pre-fill the form
        if (result.data.source === 'EXTERNAL') {
          setProductMasterName(productData.name || '');
          setBrand(productData.brand || '');
          // Clean category hint - remove language prefix like "en:", "fr:", etc.
          const cleanCategory = productData.category_hint?.replace(/^[a-z]{2}:/i, '') || '';
          setCategoryName(cleanCategory);
          setProductName(productData.name || '');
          // Parse quantity if available
          if (productData.quantity) {
            const quantityMatch = productData.quantity.match(/^([\d.]+)\s*(.*)$/);
            if (quantityMatch) {
              setUnitValue(quantityMatch[1]);
              setUnit(quantityMatch[2] || '');
            }
          }
          setShowForm(true);
        } else {
          // Local product found - show preview
          setShowForm(false);
        }
      } else {
        // Barcode not found - show empty form
        setFoundProduct(null);
        setProductSource('NONE');
        setShowForm(true);
      }
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('foundation.barcode.lookupFailed')));
      setShowError(true);
    }
  };

  const handleCheckBarcode = () => {
    checkBarcode(barcode);
  };

  const handleUpdateInventory = () => {
    // Navigate to inventory page
    history.push(`/inventory`);
  };

  const handleEditProduct = () => {
    // Navigate to products page
    history.push(`/products`);
  };

  const handleCategoryCreated = (newCategory: Category) => {
    // Auto-select the newly created category
    setCategoryId(newCategory.id);
  };

  const handleSubmit = async () => {
    // Validate
    if (!barcode || !productMasterName || !productName || !mrp || !sellingPrice || !quantity) {
      setErrorMessage(t('foundation.barcode.fillRequired'));
      setShowError(true);
      return;
    }

    try {
      const payload = {
        barcode,
        productMaster: {
          name: productMasterName,
          brand: brand || null,
          categoryName: categoryName || null,
        },
        product: {
          name: productName,
          categoryId: categoryId,
        },
        variant: {
          sku: sku || null,
          mrp: parseFloat(mrp),
          sellingPrice: parseFloat(sellingPrice),
          unit: unit || null,
          unitValue: unitValue ? parseFloat(unitValue) : null,
          imageUrl: foundProduct?.image_url || null,
        },
        inventory: {
          quantity: parseInt(quantity),
        },
      };
      
      const created = await createProduct(payload).unwrap();
      const followUpUpdates: Promise<unknown>[] = [];
      if (hsnCode.trim()) {
        followUpUpdates.push(updateProduct({ id: created.data.product.id, data: { hsn_code: hsnCode.trim() } }).unwrap());
      }
      if (gstPercent || uqcCode || unitLabel.trim()) {
        followUpUpdates.push(updateVariant({
          id: created.data.variant.id,
          data: {
            gst_percent: gstPercent ? parseFloat(gstPercent) : null,
            uqc_code: (uqcCode as UqcCode) || null,
            unit_label: unitLabel.trim() || null,
          },
        }).unwrap());
      }
      await Promise.all(followUpUpdates);

      setShowSuccess(true);
      
      // Reset form and navigate back after a delay
      setTimeout(() => {
        history.goBack();
      }, 1500);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('foundation.barcode.createFailed')));
      setShowError(true);
    }
  };

  const resetForm = () => {
    setBarcode('');
    setFoundProduct(null);
    setShowForm(false);
    setProductMasterName('');
    setBrand('');
    setCategoryName('');
    setProductName('');
    setCategoryId(null);
    setSku('');
    setMrp('');
    setSellingPrice('');
    setUnit('');
    setUnitValue('');
    setQuantity('');
    setHsnCode('');
    setGstPercent('');
    setUqcCode('');
    setUnitLabel('');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/products" />
          </IonButtons>
          <IonTitle>{t('foundation.barcode.pageTitle')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="p-4">
          {/* Barcode Input Section */}
          {!foundProduct && !showForm && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{t('foundation.barcode.scanOrEnter')}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="space-y-4">
                  {/* Mobile: Show camera scanner */}
                  <BarcodeScannerComponent
                    onScan={handleBarcodeScanned}
                    onError={(error) => {
                      setErrorMessage(error);
                      setShowError(true);
                    }}
                  />

                  {/* Show manual input help text on mobile */}
                  {isMobile && (
                    <div className="text-center text-sm text-gray-500 my-2">
                      {t('foundation.barcode.manualHint')}
                    </div>
                  )}

                  {/* Manual barcode input */}
                  <div>
                    <Input
                      label={t('foundation.barcode.barcode')}
                      value={barcode}
                      onChange={(value) => setBarcode(value)}
                      placeholder={t('foundation.barcode.enterBarcode')}
                      type="text"
                      disabled={scanning}
                    />
                  </div>

                  <IonButton
                    expand="block"
                    onClick={handleCheckBarcode}
                    disabled={!barcode || scanning}
                  >
                    <IonIcon slot="start" icon={search} />
                    {scanning ? t('foundation.barcode.checking') : t('foundation.barcode.check')}
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Product Found Locally - Show Preview */}
          {foundProduct && productSource === 'LOCAL' && !showForm && (
            <div>
              <IonCard color="success">
                <IonCardContent>
                  <p className="text-sm font-medium">✓ {t('foundation.barcode.foundLocal')}</p>
                </IonCardContent>
              </IonCard>
              <ProductPreviewCard
                data={foundProduct}
                onUpdateInventory={handleUpdateInventory}
                onEditProduct={handleEditProduct}
              />
              <IonButton
                expand="block"
                fill="outline"
                onClick={resetForm}
                className="mt-4"
              >
                {t('foundation.barcode.scanAnother')}
              </IonButton>
            </div>
          )}

          {/* External Product Found - Show Info + Form */}
          {foundProduct && productSource === 'EXTERNAL' && showForm && (
            <IonCard color="tertiary">
              <IonCardContent>
                <p className="text-sm font-medium">📦 {t('foundation.barcode.foundExternal')}</p>
                <p className="text-xs mt-1">{t('foundation.barcode.externalReview')}</p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Product Not Found - Show Info */}
          {productSource === 'NONE' && showForm && (
            <IonCard color="warning">
              <IonCardContent>
                <p className="text-sm font-medium">ℹ️ {t('foundation.barcode.notFound')}</p>
                <p className="text-xs mt-1">{t('foundation.barcode.notFoundHint')}</p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Product Creation Form */}
          {showForm && (
            <div className="space-y-4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    {productSource === 'EXTERNAL' ? t('foundation.barcode.completeDetails') : t('foundation.barcode.createNew')}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {productSource === 'NONE' && (
                    <p className="text-sm text-gray-600 mb-4">
                      {t('foundation.barcode.createWithBarcode')} <strong>{barcode}</strong>
                    </p>
                  )}

                  {/* Show product image if available from external source */}
                  {foundProduct?.image_url && productSource === 'EXTERNAL' && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={foundProduct.image_url} 
                        alt={foundProduct.name || t('foundation.barcode.imageAlt')}
                        className="h-40 w-40 object-contain rounded border"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Product Master Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">{t('foundation.barcode.masterInfo')}</h3>
                      <Input
                        label={`${t('foundation.barcode.masterName')} *`}
                        value={productMasterName}
                        onChange={(value) => setProductMasterName(value)}
                        placeholder={t('foundation.barcode.masterExample')}
                      />
                      <Input
                        label={t('products.brand')}
                        value={brand}
                        onChange={(value) => setBrand(value)}
                        placeholder={t('foundation.barcode.brandExample')}
                      />
                      <Input
                        label={t('foundation.barcode.categoryName')}
                        value={categoryName}
                        onChange={(value) => setCategoryName(value)}
                        placeholder={t('foundation.barcode.categoryExample')}
                      />
                    </div>

                    {/* Product Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">{t('products.productInfo')}</h3>
                      <Input
                        label={`${t('products.productName')} *`}
                        value={productName}
                        onChange={(value) => setProductName(value)}
                        placeholder={t('foundation.barcode.productExample')}
                      />
                      
                      <div className="space-y-2">
                        <Select
                          label={`${t('products.category')} *`}
                          value={categoryId?.toString() || ''}
                          onChange={(value) => {
                            if (value === 'ADD_NEW') {
                              setShowCategoryModal(true);
                              // Don't update categoryId state
                            } else {
                              setCategoryId(value ? parseInt(value) : null);
                            }
                          }}
                          options={[
                            { value: '', label: t('foundation.barcode.selectCategory') },
                            ...categories
                              .filter((cat) => cat.is_active)
                              .map((cat) => ({
                                value: cat.id.toString(),
                                label: cat.name,
                              })),
                          ]}
                        />
                        <IonButton 
                          expand="block" 
                          fill="outline" 
                          size="small"
                          onClick={() => {
                            setShowCategoryModal(true);
                          }}
                        >
                          <IonIcon slot="start" icon={add} />
                          {t('products.addNewCategory')}
                        </IonButton>
                      </div>
                    </div>

                    {/* Variant Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">{t('products.variantDetailsHeading')}</h3>
                      <Input
                        label={t('products.sku')}
                        value={sku}
                        onChange={(value) => setSku(value)}
                        placeholder={t('foundation.barcode.skuExample')}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label={`${t('foundation.barcode.mrp')} *`}
                          value={mrp}
                          onChange={(value) => setMrp(value)}
                          placeholder="0.00"
                          type="number"
                        />
                        <Input
                          label={`${t('products.sellingPrice')} *`}
                          value={sellingPrice}
                          onChange={(value) => setSellingPrice(value)}
                          placeholder="0.00"
                          type="number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label={t('foundation.barcode.unit')}
                          value={unit}
                          onChange={(value) => setUnit(value)}
                          placeholder={t('foundation.barcode.unitExample')}
                        />
                        <Input
                          label={t('foundation.barcode.unitValue')}
                          value={unitValue}
                          onChange={(value) => setUnitValue(value)}
                          placeholder="200"
                          type="number"
                        />
                      </div>
                      <details className="product-tax-details">
                        <summary>{t('taxFields.productDetails')}</summary>
                        <p>{t('taxFields.productDetailsHint')}</p>
                        <Input label={t('taxFields.hsnCode')} value={hsnCode} onChange={setHsnCode} maxLength={8} inputMode="numeric" />
                        <Input label={t('products.gstLabel')} value={gstPercent} onChange={setGstPercent} type="number" />
                        <Select
                          label={t('taxFields.uqcCode')}
                          value={uqcCode}
                          onChange={setUqcCode}
                          options={[
                            { value: '', label: t('common.notAvailable') },
                            ...['BAG','BAL','BDL','BOX','BTL','CTN','DOZ','GMS','KGS','LTR','MLT','MTR','NOS','PAC','PCS','SET'].map((value) => ({ value, label: value })),
                          ]}
                        />
                        <Input label={t('taxFields.unitLabel')} value={unitLabel} onChange={setUnitLabel} maxLength={30} />
                      </details>
                    </div>

                    {/* Inventory Section */}
                    <div>
                      <h3 className="font-semibold mb-3">{t('inventory.title')}</h3>
                      <Input
                        label={`${t('foundation.barcode.initialQuantity')} *`}
                        value={quantity}
                        onChange={(value) => setQuantity(value)}
                        placeholder="0"
                        type="number"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <IonButton
                        expand="block"
                        onClick={resetForm}
                        fill="outline"
                        className="flex-1"
                      >
                        {t('common.cancel')}
                      </IonButton>
                      <IonButton
                        expand="block"
                        onClick={handleSubmit}
                        disabled={creating || updatingProduct || updatingVariant}
                        className="flex-1"
                      >
                        {creating || updatingProduct || updatingVariant ? t('common.creating') : t('products.createProductButton')}
                      </IonButton>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        <Loading isOpen={scanning || creating} />

        {/* Success Toast */}
        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message={t('products.productCreatedSuccessfully')}
          duration={2000}
          color="success"
          icon={checkmarkCircle}
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showError}
          onDidDismiss={() => setShowError(false)}
          message={errorMessage}
          duration={3000}
          color="danger"
        />

        {/* Add Category Modal */}
        <AddCategoryModal
          isOpen={showCategoryModal}
          onDidDismiss={() => setShowCategoryModal(false)}
          onCategoryCreated={handleCategoryCreated}
        />
      </IonContent>
    </IonPage>
  );
};
