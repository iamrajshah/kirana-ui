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

const PACKAGING_OPTIONS = [
  { value: 'PACKET', label: 'Packet' },
  { value: 'BOX', label: 'Box' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'LOOSE', label: 'Loose' },
  { value: 'KG', label: 'KG' },
];

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
        setErrorMessage('Product name is required');
        setShowError(true);
        return;
      }

      if (!price || parseFloat(price) <= 0) {
        setErrorMessage('Valid price is required');
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
      setErrorMessage(error?.data?.message || 'Failed to create product');
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
            <EmptyState message="No products found" />
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
          message="Product created successfully"
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
                <IonTitle>Create Product</IonTitle>
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
                  label="Product Name *"
                  value={productName}
                  onChange={setProductName}
                  placeholder="Enter product name"
                />

                <Select
                  label="Category"
                  value={categoryId?.toString() || ''}
                  onChange={(value) => setCategoryId(value ? parseInt(value) : null)}
                  options={categoryOptions}
                  placeholder="Select category"
                />

                <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '24px', marginBottom: '8px' }}>Variant Details</h3>

                <Input label="Brand" value={brand} onChange={setBrand} placeholder="Enter brand" />
                <Input label="Size" value={size} onChange={setSize} placeholder="e.g., 1L, 500g" />

                <Select
                  label="Packaging"
                  value={packaging || ''}
                  onChange={(value) => setPackaging(value || null)}
                  placeholder="Select packaging"
                  options={PACKAGING_OPTIONS}
                />

                <Input label="Price *" type="number" value={price} onChange={setPrice} placeholder="Enter price" />
                <Input label="GST %" type="number" value={gstPercent} onChange={setGstPercent} placeholder="Enter GST percentage" />
                <Input label="SKU" value={sku} onChange={setSku} placeholder="Enter SKU code" />

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleCreateProduct}
                    disabled={creating || creatingVariant || !productName || !price}
                    loading={creating || creatingVariant}
                  >
                    Create Product
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
