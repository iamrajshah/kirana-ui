import React, { useState, useEffect } from 'react';
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
import { checkmarkCircle, search } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import {
  useLazyLookupBarcodeQuery,
  useCreateProductFromBarcodeMutation,
} from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import {
  Input,
  Select,
  Button,
  Loading,
  BarcodeScannerComponent,
  ProductPreviewCard,
} from '@components';
import type { BarcodeLookupData } from '@core/types';

export const AddProductBarcodePage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
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

  // Toasts
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // API
  const [lookupBarcode, { isLoading: scanning }] = useLazyLookupBarcodeQuery();
  const [createProduct, { isLoading: creating }] = useCreateProductFromBarcodeMutation();
  const { data: categoriesData } = useGetCategoriesQuery();

  const categories = categoriesData?.data || [];

  // Handle barcode scan from camera (mobile) or manual input (web)
  const handleBarcodeScanned = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    checkBarcode(scannedBarcode);
  };

  const checkBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) {
      setErrorMessage('Please enter a barcode');
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
    } catch (error: any) {
      setErrorMessage(error?.data?.message || 'Failed to check barcode');
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

  const handleSubmit = async () => {
    // Validate
    if (!barcode || !productMasterName || !productName || !mrp || !sellingPrice || !quantity) {
      setErrorMessage('Please fill in all required fields');
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
      
      const result = await createProduct(payload).unwrap();

      setShowSuccess(true);
      
      // Reset form and navigate back after a delay
      setTimeout(() => {
        history.goBack();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error?.data?.message || 'Failed to create product');
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
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/products" />
          </IonButtons>
          <IonTitle>Add Product via Barcode</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="p-4">
          {/* Barcode Input Section */}
          {!foundProduct && !showForm && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Scan or Enter Barcode</IonCardTitle>
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
                      or enter barcode manually below
                    </div>
                  )}

                  {/* Manual barcode input */}
                  <div>
                    <Input
                      label="Barcode"
                      value={barcode}
                      onChange={(value) => setBarcode(value)}
                      placeholder="Enter barcode number"
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
                    {scanning ? 'Checking...' : 'Check Barcode'}
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
                  <p className="text-sm font-medium">✓ Product found in your database</p>
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
                Scan Another Barcode
              </IonButton>
            </div>
          )}

          {/* External Product Found - Show Info + Form */}
          {foundProduct && productSource === 'EXTERNAL' && showForm && (
            <IonCard color="tertiary">
              <IonCardContent>
                <p className="text-sm font-medium">📦 Product found in Open Food Facts</p>
                <p className="text-xs mt-1">Review and complete the details below to add it to your inventory</p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Product Not Found - Show Info */}
          {productSource === 'NONE' && showForm && (
            <IonCard color="warning">
              <IonCardContent>
                <p className="text-sm font-medium">ℹ️ Product not found</p>
                <p className="text-xs mt-1">Fill in the details below to add this new product</p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Product Creation Form */}
          {showForm && (
            <div className="space-y-4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    {productSource === 'EXTERNAL' ? 'Complete Product Details' : 'Create New Product'}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {productSource === 'NONE' && (
                    <p className="text-sm text-gray-600 mb-4">
                      Create a new product with barcode: <strong>{barcode}</strong>
                    </p>
                  )}

                  {/* Show product image if available from external source */}
                  {foundProduct?.image_url && productSource === 'EXTERNAL' && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={foundProduct.image_url} 
                        alt={foundProduct.name || 'Product'}
                        className="h-40 w-40 object-contain rounded border"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Product Master Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">Product Master Info</h3>
                      <Input
                        label="Product Master Name *"
                        value={productMasterName}
                        onChange={(value) => setProductMasterName(value)}
                        placeholder="e.g., Parle-G Gold"
                      />
                      <Input
                        label="Brand"
                        value={brand}
                        onChange={(value) => setBrand(value)}
                        placeholder="e.g., Parle"
                      />
                      <Input
                        label="Category Name"
                        value={categoryName}
                        onChange={(value) => setCategoryName(value)}
                        placeholder="e.g., Biscuits"
                      />
                    </div>

                    {/* Product Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">Product Info</h3>
                      <Input
                        label="Product Name *"
                        value={productName}
                        onChange={(value) => setProductName(value)}
                        placeholder="e.g., Parle-G Gold 200g"
                      />
                      <Select
                        label="Category"
                        value={categoryId?.toString() || ''}
                        onChange={(value) => {
                          setCategoryId(value ? parseInt(value) : null);
                        }}
                        options={[
                          { value: '', label: 'Select Category' },
                          ...categories.map((cat: any) => ({
                            value: cat.id,
                            label: cat.name,
                          })),
                        ]}
                      />
                    </div>

                    {/* Variant Section */}
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">Variant Info</h3>
                      <Input
                        label="SKU"
                        value={sku}
                        onChange={(value) => setSku(value)}
                        placeholder="e.g., PG-GOLD-200"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="MRP *"
                          value={mrp}
                          onChange={(value) => setMrp(value)}
                          placeholder="0.00"
                          type="number"
                        />
                        <Input
                          label="Selling Price *"
                          value={sellingPrice}
                          onChange={(value) => setSellingPrice(value)}
                          placeholder="0.00"
                          type="number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Unit"
                          value={unit}
                          onChange={(value) => setUnit(value)}
                          placeholder="g, ml, kg, etc."
                        />
                        <Input
                          label="Unit Value"
                          value={unitValue}
                          onChange={(value) => setUnitValue(value)}
                          placeholder="200"
                          type="number"
                        />
                      </div>
                    </div>

                    {/* Inventory Section */}
                    <div>
                      <h3 className="font-semibold mb-3">Inventory</h3>
                      <Input
                        label="Initial Quantity *"
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
                        Cancel
                      </IonButton>
                      <IonButton
                        expand="block"
                        onClick={handleSubmit}
                        disabled={creating}
                        className="flex-1"
                      >
                        {creating ? 'Creating...' : 'Create Product'}
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
          message="Product created successfully!"
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
      </IonContent>
    </IonPage>
  );
};
