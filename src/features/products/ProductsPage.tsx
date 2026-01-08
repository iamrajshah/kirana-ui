import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from '@components/Navbar';
import { useHistory } from 'react-router';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonButtons,
  IonButton,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { add, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetProductsQuery, useCreateProductMutation, useCreateVariantMutation } from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { SearchBar, Loading, EmptyState, Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const take = 50;
  const { data, isLoading, isFetching } = useGetProductsQuery({ search, skip, take });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [createVariant, { isLoading: creatingVariant }] = useCreateVariantMutation();

  const PACKAGING_OPTIONS = [
    { value: 'PACKET', label: t('products.packagingPacket') },
    { value: 'BOX', label: t('products.packagingBox') },
    { value: 'BOTTLE', label: t('products.packagingBottle') },
    { value: 'LOOSE', label: t('products.packagingLoose') },
    { value: 'KG', label: t('products.packagingKG') },
  ];

  useEffect(() => {
    setSkip(0);
    setAllProducts([]);
  }, [search]);

  // Accumulate products as they're fetched
  useEffect(() => {
    if (data?.data) {
      if (skip === 0) {
        setAllProducts(data.data);
      } else {
        setAllProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const newProducts = data.data.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [data, skip]);

  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [packaging, setPackaging] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [sku, setSku] = useState('');

  const total = data?.meta?.total || 0;
  const currentBatchSize = data?.data?.length || 0;
  const hasMore = allProducts.length < total && currentBatchSize === take;

  const loadMore = async (e: CustomEvent) => {
    if (hasMore && !isFetching) {
      setSkip(prev => prev + take);
    }
    setTimeout(() => {
      (e.target as HTMLIonInfiniteScrollElement).complete();
    }, 100);
  };
  const categories = categoriesData?.data || [];

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }));
  }, [categories]);

  const resetForm = () => {
    setProductName('');
    setCategoryId(null);
    setBrand('');
    setSize('');
    setPackaging(null);
    setPrice('');
    setGstPercent('');
    setSku('');
  };

  const handleCreateProduct = async () => {
    try {
      if (!productName.trim()) {
        setErrorMessage(t('products.productNameRequired'));
        setShowError(true);
        return;
      }

      if (!price || parseFloat(price) <= 0) {
        setErrorMessage(t('products.validPriceRequired'));
        setShowError(true);
        return;
      }

      const productResult = await createProduct({
        name: productName,
        category_id: categoryId,
      }).unwrap();

      await createVariant({
        productId: productResult.data.id,
        variant: {
          brand: brand || null,
          size: size || null,
          packaging: (packaging as any) || null,
          price: parseFloat(price),
          gst_percent: gstPercent ? parseFloat(gstPercent) : null,
          sku: sku || null,
        },
      }).unwrap();

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setErrorMessage(error?.data?.message || t('products.failedToCreateProduct'));
      setShowError(true);
    }
  };

  const handleProductClick = (productId: string) => {
    history.push(`/products/${productId}`);
  };

  return (
    <IonPage>
      <Navbar title={t('products.title')} />
      <IonContent>
        <div style={{ padding: '16px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

          {isLoading && allProducts.length === 0 ? (
            <Loading isOpen={isLoading} />
          ) : allProducts.length === 0 ? (
            <EmptyState message={t('products.noProductsFound')} />
          ) : (
            <>
              <IonList>
                {allProducts.map((product) => (
                  <IonItem key={product.id} button onClick={() => handleProductClick(product.id)}>
                    <IonLabel>
                      <h2 style={{ fontWeight: '600', fontSize: '16px' }}>{product.name}</h2>
                      <p>{product.category?.name}</p>
                      {product.variants && product.variants.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          {product.variants.map((variant) => (
                            <div key={variant.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '4px', paddingBottom: '4px' }}>
                              <span>SKU: {variant.sku}</span>
                              <span style={{ fontWeight: '500' }}>{formatCurrency(variant.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </IonLabel>
                    <IonBadge slot="end" color={product.is_active ? 'success' : 'medium'}>
                      {product.is_active ? t('common.active') : t('common.inactive')}
                    </IonBadge>
                  </IonItem>
                ))}
              </IonList>
              
              <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
                <IonInfiniteScrollContent loadingText="Loading more products..." />
              </IonInfiniteScroll>
            </>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonToast
          isOpen={showSuccess}
          message={t('products.productCreatedSuccessfully')}
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

        {showModal && (
          <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('products.createProductTitle')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <div style={{ padding: '16px' }}>
                <Input
                  label={t('products.productNameLabel')}
                  value={productName}
                  onChange={setProductName}
                  placeholder={t('products.enterProductNamePlaceholder')}
                />

                <Select
                  label={t('products.categoryLabel')}
                  value={categoryId?.toString() || ''}
                  onChange={(value) => setCategoryId(value ? parseInt(value) : null)}
                  options={categoryOptions}
                  placeholder={t('products.selectCategoryPlaceholder2')}
                />

                <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '24px', marginBottom: '8px' }}>{t('products.variantDetailsHeading')}</h3>

                <Input label={t('products.brandLabel')} value={brand} onChange={setBrand} placeholder={t('products.enterBrandPlaceholder')} />
                <Input label={t('products.sizeLabel')} value={size} onChange={setSize} placeholder={t('products.sizePlaceholder')} />

                <Select
                  label={t('products.packagingLabel')}
                  value={packaging || ''}
                  onChange={(value) => setPackaging(value || null)}
                  placeholder={t('products.selectPackagingPlaceholder')}
                  options={PACKAGING_OPTIONS}
                />

                <Input label={t('products.priceLabel')} type="number" value={price} onChange={setPrice} placeholder={t('products.enterPricePlaceholder')} />
                <Input label={t('products.gstLabel')} type="number" value={gstPercent} onChange={setGstPercent} placeholder={t('products.enterGSTPercentage')} />
                <Input label={t('products.skuLabel')} value={sku} onChange={setSku} placeholder={t('products.enterSKUCode')} />

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleCreateProduct}
                    disabled={creating || creatingVariant || !productName || !price}
                    loading={creating || creatingVariant}
                  >
                    {t('products.createProductButton')}
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
