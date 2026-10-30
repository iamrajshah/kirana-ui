import React, { useState, useMemo, useEffect } from 'react';
import type { Category } from '@core/api/categoryApi';
import type { Product, UqcCode } from '@core/types';
import type { Packaging } from '@core/api/productApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { Navbar } from '@components/Navbar';
import { useHistory } from 'react-router';
import {
  IonContent,
  IonPage,
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
  useIonActionSheet,
} from '@ionic/react';
import { add, close, barcodeOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetProductsQuery, useCreateProductMutation, useCreateVariantMutation } from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { SearchBar, Loading, EmptyState, Input, Select, Button, AddCategoryModal } from '@components';
import { formatCurrency } from '@utils/helpers';
import { ROUTES } from '@core/constants';
import { filterProducts } from '@utils/localSearch';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import { useRequestSettledInfiniteScroll } from '@hooks/useRequestSettledInfiniteScroll';
import './stock-workspace.css';

const PAGE_SIZE = 50;

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [present] = useIonActionSheet();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [querySearch, setQuerySearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const {
    currentData: pageData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetProductsQuery({
    skip,
    take: PAGE_SIZE,
    ...(querySearch ? { search: querySearch } : {}),
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [createVariant, { isLoading: creatingVariant }] = useCreateVariantMutation();
  const beginLoadMore = useRequestSettledInfiniteScroll({
    currentData: pageData,
    isError,
    isFetching,
    requestKey: `${querySearch}:${skip}`,
  });

  const PACKAGING_OPTIONS = [
    { value: 'POUCH', label: t('products.packagingPouch') },
    { value: 'BOTTLE', label: t('products.packagingBottle') },
    { value: 'CAN', label: t('products.packagingCan') },
    { value: 'BOX', label: t('products.packagingBox') },
    { value: 'PACKET', label: t('products.packagingPacket') },
    { value: 'JAR', label: t('products.packagingJar') },
    { value: 'LOOSE', label: t('products.packagingLoose') },
  ];

  useEffect(() => {
    if (debouncedSearch === querySearch) return;
    setSkip(0);
    setAllProducts([]);
    setTotalProducts(0);
    setQuerySearch(debouncedSearch);
  }, [debouncedSearch, querySearch]);

  // Keep an accumulated page window so scrolling remains instant after each fetch.
  useEffect(() => {
    if (pageData?.data) {
      setTotalProducts(pageData.meta.total);
      if (skip === 0) {
        setAllProducts(pageData.data);
      } else {
        setAllProducts(prev => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = pageData.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [pageData, skip]);

  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [packaging, setPackaging] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [mrpPrice, setMrpPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [sku, setSku] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [uqcCode, setUqcCode] = useState('');
  const [unitLabel, setUnitLabel] = useState('');

  const hasMore = allProducts.length < totalProducts;

  const visibleProducts = useMemo(
    () => filterProducts(allProducts, search),
    [allProducts, search]
  );

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    visibleProducts.forEach((product) => {
      const categoryName = product.category?.name || t('products.uncategorized');
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
    });
    
    return groups;
  }, [visibleProducts, t]);

  const categoryNames = useMemo(() => {
    return Object.keys(groupedProducts).sort();
  }, [groupedProducts]);

  const loadMore = (event: CustomEvent) => {
    if (!beginLoadMore(event, hasMore && !isFetching)) return;
    setSkip((previous) => previous + PAGE_SIZE);
  };
  const categories = categoriesData?.data || [];

  const resetForm = () => {
    setProductName('');
    setCategoryId(null);
    setBrand('');
    setSize('');
    setPackaging(null);
    setPrice('');
    setMrpPrice('');
    setGstPercent('');
    setSku('');
    setHsnCode('');
    setUqcCode('');
    setUnitLabel('');
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
      if (mrpPrice && parseFloat(mrpPrice) < parseFloat(price)) {
        setErrorMessage(t('products.mrpBelowSellingPrice'));
        setShowError(true);
        return;
      }

      const productResult = await createProduct({
        name: productName,
        category_id: categoryId,
        hsn_code: hsnCode.trim() || null,
      }).unwrap();

      await createVariant({
        productId: productResult.data.id,
        variant: {
          brand: brand || null,
          size: size || null,
          packaging: (packaging as Packaging | null) || null,
          price: parseFloat(price),
          selling_price: parseFloat(price),
          mrp_price: mrpPrice ? parseFloat(mrpPrice) : null,
          gst_percent: gstPercent ? parseFloat(gstPercent) : null,
          uqc_code: (uqcCode as UqcCode) || null,
          unit_label: unitLabel.trim() || null,
          sku: sku || null,
        },
      }).unwrap();

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
      setSearch('');
      setQuerySearch('');
      setSkip(0);
      setAllProducts([]);
      setTotalProducts(0);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('products.failedToCreateProduct')));
      setShowError(true);
    }
  };

  const handleProductClick = (productId: string) => {
    history.push(`/products/${productId}`);
  };

  const handleCategoryCreated = (newCategory: Category) => {
    setCategoryId(newCategory.id);
  };

  return (
    <IonPage>
      <Navbar title={t('products.title')} />
      <IonContent>
        <div className="workspace-page stock-page">
          <div className="workspace-header">
            <h1>{t('products.title')}</h1>
            <div className="workspace-actions stock-primary-actions">
              <IonButton fill="outline" onClick={() => history.push(ROUTES.PRODUCT_BARCODE)}>
                <IonIcon slot="start" icon={barcodeOutline} />
                {t('products.scanBarcode')}
              </IonButton>
              <IonButton onClick={() => setShowModal(true)}>
                <IonIcon slot="start" icon={add} />
                {t('products.addManually')}
              </IonButton>
            </div>
          </div>
          <div className="stock-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('common.search')}
              debounce={0}
            />
          </div>

          {(isLoading || isFetching) && allProducts.length === 0 ? (
            <Loading isOpen={true} />
          ) : isError && allProducts.length === 0 ? (
            <div className="workspace-state" role="alert">
              <p>{t('products.loadError')}</p>
              <Button onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <EmptyState message={t('products.noProductsFound')} />
          ) : (
            <>
              {categoryNames.map((categoryName) => (
                <section key={categoryName} className="stock-category">
                  <h2 className="stock-category-heading">
                    {categoryName}
                    <IonBadge color="primary">
                      {groupedProducts[categoryName].length}
                    </IonBadge>
                  </h2>
                  <div className="stock-card-grid">
                    {groupedProducts[categoryName].map((product) => (
                      <button key={product.id} type="button" className="workspace-record stock-card stock-card-button" onClick={() => handleProductClick(product.id)}>
                        <div className="stock-card-top">
                          <h2>{product.name}</h2>
                          <IonBadge color={product.is_active ? 'success' : 'medium'}>
                            {product.is_active ? t('common.active') : t('common.inactive')}
                          </IonBadge>
                        </div>
                        {product.variants && product.variants.length > 0 && (
                          <div className="stock-variant-list">
                            {product.variants.map((variant) => (
                              <div key={variant.id} className="stock-variant">
                                <span>{t('products.sku')}: {variant.sku}</span>
                                <strong>{formatCurrency(variant.price)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              
              {isError && allProducts.length > 0 && (
                <div className="workspace-state" role="alert">
                  <p>{t('common.loadMoreError')}</p>
                  <Button onClick={() => refetch()} variant="outline">
                    {t('common.retry')}
                  </Button>
                </div>
              )}
              <IonInfiniteScroll
                threshold="50%"
                onIonInfinite={loadMore}
                disabled={!hasMore || isError}
              >
                <IonInfiniteScrollContent loadingText={t('products.loadingMore')} />
              </IonInfiniteScroll>
            </>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="stock-fab">
          <IonFabButton aria-label={t('products.addProduct')} onClick={() => {
            present({
              header: t('products.addProduct'),
              buttons: [
                {
                  text: t('products.scanBarcode'),
                  icon: barcodeOutline,
                  handler: () => {
                    history.push(ROUTES.PRODUCT_BARCODE);
                  },
                },
                {
                  text: t('products.addManually'),
                  icon: add,
                  handler: () => {
                    setShowModal(true);
                  },
                },
                {
                  text: t('common.cancel'),
                  role: 'cancel',
                },
              ],
            });
          }}>
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
                  onChange={(value) => {
                    setCategoryId(value ? parseInt(value) : null);
                  }}
                  options={[
                    { value: '', label: t('products.selectCategoryPlaceholder2') },
                    ...categories
                      .filter((cat) => cat.is_active)
                      .map((cat) => ({ value: cat.id.toString(), label: cat.name })),
                  ]}
                  placeholder={t('products.selectCategoryPlaceholder2')}
                />
                
                <IonButton 
                  expand="block" 
                  fill="outline" 
                  size="small"
                  onClick={() => setShowCategoryModal(true)}
                  style={{ marginTop: '8px' }}
                >
                  <IonIcon slot="start" icon={add} />
                  {t('products.addNewCategory')}
                </IonButton>

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

                <Input label={t('products.sellingPriceLabel')} type="number" value={price} onChange={setPrice} placeholder={t('products.enterPricePlaceholder')} />
                <Input label={t('products.mrpPriceLabel')} type="number" value={mrpPrice} onChange={setMrpPrice} placeholder={t('products.enterMrpPlaceholder')} />
                <Input label={t('products.skuLabel')} value={sku} onChange={setSku} placeholder={t('products.enterSKUCode')} />

                <details className="product-tax-details">
                  <summary>{t('taxFields.productDetails')}</summary>
                  <p>{t('taxFields.productDetailsHint')}</p>
                  <Input label={t('taxFields.hsnCode')} value={hsnCode} onChange={setHsnCode} maxLength={8} inputMode="numeric" />
                  <Input label={t('products.gstLabel')} type="number" value={gstPercent} onChange={setGstPercent} placeholder={t('products.enterGSTPercentage')} />
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
