import React, { useState } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonToast,
  IonModal,
} from '@ionic/react';
import { add, remove, trash, checkmarkCircle } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useLazySearchVariantsQuery } from '@core/api/productApi';
import { useCreateInvoiceMutation } from '@core/api/invoiceApi';
import { useGetCustomersQuery } from '@core/api/customerApi';
import { SearchBar, Button, Select, EmptyState, Input } from '@components';
import { formatCurrency, generateIdempotencyKey, debounce } from '@utils/helpers';
import type { ProductVariant, InvoiceItem } from '@core/types';

interface CartItem extends InvoiceItem {
  product_name: string;
  sku: string;
}

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchVariants, { data: variantsData, isLoading: searchLoading }] =
    useLazySearchVariantsQuery();
  const { data: customersData } = useGetCustomersQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [gstAmount, setGstAmount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Debounced search
  const handleSearch = debounce((term: string) => {
    if (term.length >= 2) {
      searchVariants({ search: term });
    }
  }, 300);

  const addToCart = (variant: any) => {
    const existing = cart.find((item) => item.variant_id === variant.id);
    if (existing) {
      updateQuantity(variant.id, existing.quantity + 1);
    } else {
      setCart([
        ...cart,
        {
          variant_id: variant.id,
          quantity: 1,
          price: variant.price,
          product_name: variant.product_name || 'Unknown Product',
          sku: variant.sku || '',
        },
      ]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart(cart.map((item) => (item.variant_id === variantId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + gstAmount;
  };

  const handleGenerateInvoice = async () => {
    // Validation
    if (!selectedCustomerId) {
      setErrorMessage(t('billing.selectCustomerFirst') || 'Please select a customer first');
      setShowError(true);
      setShowCustomerModal(true);
      return;
    }

    if (cart.length === 0) {
      setErrorMessage(t('billing.addProductsFirst') || 'Please add at least one product to cart');
      setShowError(true);
      return;
    }

    try {
      const items = cart.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
      }));

      console.log('🧾 Creating invoice:', {
        customer_id: selectedCustomerId,
        items,
        gst_amount: gstAmount,
      });

      const result = await createInvoice({
        customer_id: selectedCustomerId,
        items,
        gst_amount: gstAmount,
        idempotency_key: generateIdempotencyKey(),
      }).unwrap();

      console.log('✅ Invoice created:', result);

      setShowSuccess(true);
      // Reset cart
      setCart([]);
      setGstAmount(0);
      setSearchTerm('');
    } catch (error: any) {
      console.error('❌ Failed to create invoice:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });
      const errMsg = error?.data?.message || error?.message || 'Failed to create invoice';
      setErrorMessage(errMsg);
      setShowError(true);
    }
  };

  // Check if form is valid for generating invoice
  const isFormValid = selectedCustomerId && cart.length > 0;

  const customers =
    customersData?.data?.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` })) ||
    [];

  return (
    <IonPage>
      <Navbar title={t('billing.title')} />
      <IonContent>
        <div className="p-4">
          {/* Customer Selection */}
          <div className="mb-4">
            <Select
              label={t('billing.selectCustomer')}
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={customers}
              placeholder={t('billing.selectCustomer')}
              required
            />
          </div>

          {/* Product Search */}
          <SearchBar
            value={searchTerm}
            onChange={(val: string) => {
              setSearchTerm(val);
              handleSearch(val);
            }}
            placeholder={t('billing.searchProduct')}
          />

          {/* Search Results */}
          {searchTerm && searchLoading && (
            <div className="text-center py-4">{t('common.loading')}</div>
          )}
          {searchTerm && variantsData?.data && variantsData.data.length > 0 && (
            <IonList className="mb-4">
              {variantsData.data.map((variant: any) => (
                <IonItem key={variant.id} button onClick={() => addToCart(variant)}>
                  <IonLabel>
                    <h3 className="font-semibold">{variant.product_name}</h3>
                    <p className="text-sm text-gray-600">
                      SKU: {variant.sku} | {formatCurrency(variant.price)}
                    </p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}

          {/* Cart */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">{t('billing.cart')}</h3>
            {cart.length === 0 ? (
              <EmptyState message={t('billing.emptyCart')} />
            ) : (
              <IonList>
                {cart.map((item) => (
                  <IonItem key={item.variant_id}>
                    <IonLabel>
                      <h3 className="font-medium">{item.product_name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </IonLabel>
                    <div className="flex items-center gap-2">
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                      >
                        <IonIcon icon={remove} />
                      </IonButton>
                      <IonBadge color="primary" className="text-lg px-3">
                        {item.quantity}
                      </IonBadge>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                      >
                        <IonIcon icon={add} />
                      </IonButton>
                      <IonButton
                        fill="clear"
                        size="small"
                        color="danger"
                        onClick={() => removeFromCart(item.variant_id)}
                      >
                        <IonIcon icon={trash} />
                      </IonButton>
                      <div className="ml-2 font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>

          {/* Total Section */}
          {cart.length > 0 && (
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>{t('billing.subtotal')}:</span>
                <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="mb-2">
                <Input
                  label={t('billing.gst')}
                  type="number"
                  value={gstAmount}
                  onChange={(val: string) => setGstAmount(Number(val) || 0)}
                />
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                <span>{t('billing.total')}:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          )}

          {/* Generate Invoice Button */}
          {cart.length > 0 && (
            <div className="mt-6 pb-4">
              <Button
                onClick={handleGenerateInvoice}
                loading={creating}
                disabled={!isFormValid || creating}
                fullWidth
                size="large"
                variant="success"
              >
                <IonIcon icon={checkmarkCircle} className="mr-2" />
                {t('billing.generateInvoice')}
              </Button>
              {!selectedCustomerId && (
                <p className="text-danger text-center mt-2 text-sm">
                  {t('billing.selectCustomerFirst') || 'Please select a customer'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Success Toast */}
        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message={t('billing.invoiceGenerated')}
          duration={2000}
          color="success"
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showError}
          onDidDismiss={() => setShowError(false)}
          message={errorMessage}
          duration={3000}
          color="danger"
        />

        {/* Customer Modal */}
        {showCustomerModal && (
          <IonModal 
            isOpen={true}
            onDidDismiss={() => setShowCustomerModal(false)}
          >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('billing.selectCustomer')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCustomerModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <p className="text-center text-lg">Please select a customer first</p>
          </IonContent>
        </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};
