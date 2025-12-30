import React, { useState } from 'react';
import { Navbar } from '@components/Navbar';
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
} from '@ionic/react';
import { add, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetProductsQuery, useCreateProductMutation, useCreateVariantMutation } from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { SearchBar, Loading, EmptyState, Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetProductsQuery({ search });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [createVariant, { isLoading: creatingVariant }] = useCreateVariantMutation();

  const [showModal, setShowModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [packaging, setPackaging] = useState<'PACKET' | 'BOX' | 'BOTTLE' | 'LOOSE' | 'KG' | null>(null);
  const [price, setPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [sku, setSku] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const products = data?.data || [];
  const categories = categoriesData?.data || [];

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

      console.log('📦 Creating product:', { productName, categoryId });

      // Create product
      const productResult = await createProduct({
        name: productName,
        category_id: categoryId,
      }).unwrap();

      console.log('✅ Product created:', productResult);

      // Create variant
      const variantResult = await createVariant({
        productId: productResult.data.id,
        variant: {
          brand: brand || null,
          size: size || null,
          packaging: packaging || null,
          price: parseFloat(price),
          gst_percent: gstPercent ? parseFloat(gstPercent) : null,
          sku: sku || null,
        },
      }).unwrap();

      console.log('✅ Variant created:', variantResult);

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error creating product:', error);
      setErrorMessage(error?.data?.message || 'Failed to create product');
      setShowError(true);
    }
  };

  const packagingOptions = [
    { value: 'PACKET', label: 'Packet' },
    { value: 'BOX', label: 'Box' },
    { value: 'BOTTLE', label: 'Bottle' },
    { value: 'LOOSE', label: 'Loose' },
    { value: 'KG', label: 'KG' },
  ];

  return (
    <IonPage>
      <Navbar title={t('products.title')} />
      <IonContent>
        <div className="p-4">
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

          {isLoading ? (
            <Loading isOpen={isLoading} />
          ) : products.length === 0 ? (
            <EmptyState message="No products found" />
          ) : (
            <IonList>
              {products.map((product) => (
                <IonItem key={product.id} button>
                  <IonLabel>
                    <h2 className="font-semibold text-lg">{product.name}</h2>
                    <p className="text-gray-600">{product.category?.name}</p>
                    {product.variants && product.variants.length > 0 && (
                      <div className="mt-2">
                        {product.variants.map((variant) => (
                          <div key={variant.id} className="flex justify-between text-sm py-1">
                            <span>SKU: {variant.sku}</span>
                            <span className="font-medium">{formatCurrency(variant.price)}</span>
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
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {showModal && (
          <IonModal isOpen={true} onDidDismiss={() => setShowModal(false)}>
            <IonPage>
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
              <IonContent className="ion-padding">
                <div className="space-y-4">
                  <Input
                    label="Product Name *"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter product name"
                  />

                  <Select
                    label="Category"
                    value={categoryId?.toString() || ''}
                    onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>

                  <div className="text-lg font-semibold mt-6 mb-2">Variant Details</div>

                  <Input
                    label="Brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Enter brand"
                  />

                  <Input
                    label="Size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g., 1L, 500g"
                  />

                  <Select
                    label="Packaging"
                    value={packaging || ''}
                    onChange={(e) => setPackaging(e.target.value as any || null)}
                  >
                    <option value="">Select packaging</option>
                    {packagingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Price *"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                  />

                  <Input
                    label="GST %"
                    type="number"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    placeholder="Enter GST percentage"
                  />

                  <Input
                    label="SKU"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Enter SKU code"
                  />

                  <div className="mt-6">
                    <Button
                      onClick={handleCreateProduct}
                      disabled={creating || creatingVariant || !productName || !price}
                      isLoading={creating || creatingVariant}
                    >
                      Create Product
                    </Button>
                  </div>
                </div>
              </IonContent>
            </IonPage>
          </IonModal>
        )}

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
      </IonContent>
    </IonPage>
  );
};
