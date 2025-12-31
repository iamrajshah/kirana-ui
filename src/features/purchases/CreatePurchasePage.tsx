import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonBadge,
} from '@ionic/react';
import { add, remove, trash, checkmarkCircle } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { Navbar } from '@components/Navbar';

import { useGetSuppliersQuery } from '../../core/api/supplierApi';
import { useCreatePurchaseMutation } from '../../core/api/purchaseApi';
import { useLazySearchVariantsQuery } from '../../core/api/productApi';
import { SearchBar, Input, Button, Select, EmptyState } from '../../components';
import { formatCurrency, debounce } from '@utils/helpers';
import notificationService from '@core/services/notificationService';

interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
}

const CreatePurchasePage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const [searchVariants, { data: variantsData, isLoading: searchLoading }] = useLazySearchVariantsQuery();
  const { data: suppliersData } = useGetSuppliersQuery({});
  const [createPurchase, { isLoading: creating }] = useCreatePurchaseMutation();

  const suppliers = suppliersData?.data || [];
  const variants = variantsData?.data || [];

  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [showSupplierModal, setShowSupplierModal] = useState(false);

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
          unit_price: variant.price || 0,
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

  const updatePrice = (variantId: string, unit_price: number) => {
    setCart(cart.map((item) => (item.variant_id === variantId ? { ...item, unit_price } : item)));
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  };

  const calculatePending = () => {
    const subtotal = calculateSubtotal();
    const paid = parseFloat(paymentAmount) || 0;
    return subtotal - paid;
  };

  const handleCreatePurchase = async () => {
    // Validation
    if (!selectedSupplierId) {
      notificationService.warning(t('purchases.selectSupplier'));
      setShowSupplierModal(true);
      return;
    }

    if (!invoiceNumber.trim()) {
      notificationService.warning(t('purchases.enterInvoiceNumber'));
      return;
    }

    if (cart.length === 0) {
      notificationService.warning(t('purchases.addProducts'));
      return;
    }

    try {
      const items = cart.map((item) => ({
        variant_id: parseInt(item.variant_id),
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      await createPurchase({
        supplier_id: parseInt(selectedSupplierId),
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        items,
        payment_amount: parseFloat(paymentAmount) || 0,
        payment_mode: paymentMode as 'CASH' | 'UPI' | 'CARD' | 'BANK',
      }).unwrap();

      notificationService.success(t('purchases.purchaseCreated'));
      
      // Reset form
      setCart([]);
      setInvoiceNumber('');
      setPaymentAmount('');
      setSearchTerm('');
      
      setTimeout(() => history.push('/purchases'), 1000);
    } catch (error: any) {
      notificationService.handleApiError(error);
    }
  };

  // Check if form is valid
  const isFormValid = selectedSupplierId && invoiceNumber.trim() && cart.length > 0;

  const subtotal = calculateSubtotal();
  const pending = calculatePending();

  return (
    <IonPage>
      <Navbar title="Create Purchase" />
      <IonContent className="ion-padding">
        {/* Supplier & Invoice Info */}
        <IonCard>
          <IonCardContent>
            <div style={{ marginBottom: '16px' }}>
              <Button 
                onClick={() => setShowSupplierModal(true)}
                fullWidth
              >
                {selectedSupplierId 
                  ? `✓ ${suppliers.find(s => s.id === selectedSupplierId)?.name}`
                  : 'Select Supplier'}
              </Button>
            </div>

            <Input
              label="Invoice Number"
              value={invoiceNumber}
              onChange={setInvoiceNumber}
              placeholder="Enter supplier invoice number"
              required
            />

            <Input
              label="Invoice Date"
              value={invoiceDate}
              onChange={setInvoiceDate}
              type="text"
              placeholder="YYYY-MM-DD"
            />
          </IonCardContent>
        </IonCard>

        {/* Product Search */}
        <IonCard>
          <IonCardContent>
            <SearchBar
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                handleSearch(val);
              }}
              placeholder="Search products to add..."
            />

            {searchLoading && <IonText color="medium"><p>Searching...</p></IonText>}

            {searchTerm.length >= 2 && variants.length > 0 && (
              <IonList>
                {variants.map((variant: any) => (
                  <IonItem key={variant.id} button onClick={() => addToCart(variant)}>
                    <IonLabel>
                      <h3>{variant.product_name}</h3>
                      <p>{variant.sku}</p>
                      <p>{formatCurrency(variant.price || 0)}</p>
                    </IonLabel>
                    <IonIcon icon={add} slot="end" color="primary" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        {/* Cart Items */}
        {cart.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                Items ({cart.length})
                <IonBadge color="primary" style={{ marginLeft: '8px' }}>
                  {formatCurrency(subtotal)}
                </IonBadge>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {cart.map((item) => (
                  <IonItem key={item.variant_id}>
                    <IonLabel>
                      <h3>{item.product_name}</h3>
                      <p>{item.sku}</p>
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}>
                            <IonIcon icon={remove} />
                          </IonButton>
                          <IonText><strong>{item.quantity}</strong></IonText>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}>
                            <IonIcon icon={add} />
                          </IonButton>
                        </div>

                        <div style={{ flex: 1 }}>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updatePrice(item.variant_id, parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid var(--ion-color-medium)',
                              borderRadius: '4px',
                            }}
                            placeholder="Unit Price"
                          />
                        </div>
                      </div>

                      <p style={{ marginTop: '8px', color: 'var(--ion-color-primary)' }}>
                        Total: {formatCurrency(item.quantity * item.unit_price)}
                      </p>
                    </IonLabel>

                    <IonButton fill="clear" slot="end" onClick={() => removeFromCart(item.variant_id)}>
                      <IonIcon icon={trash} color="danger" />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Payment & Summary */}
        {cart.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Payment Details</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ marginBottom: '16px' }}>
                <IonText color="medium"><p>Subtotal</p></IonText>
                <IonText><h2 style={{ margin: 0 }}>{formatCurrency(subtotal)}</h2></IonText>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500' }}>Payment Amount</label>
                  <IonButton 
                    size="small" 
                    fill="outline"
                    onClick={() => setPaymentAmount(subtotal.toString())}
                  >
                    Pay Full
                  </IonButton>
                </div>
                <Input
                  label=""
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  type="number"
                  placeholder="0.00"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Payment Mode
                </label>
                <IonSelect
                  value={paymentMode}
                  onIonChange={(e) => setPaymentMode(e.detail.value)}
                  interface="popover"
                  style={{ 
                    border: '1px solid var(--ion-color-medium)',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                >
                  <IonSelectOption value="CASH">Cash</IonSelectOption>
                  <IonSelectOption value="UPI">UPI</IonSelectOption>
                  <IonSelectOption value="CARD">Card</IonSelectOption>
                  <IonSelectOption value="BANK_TRANSFER">Bank Transfer</IonSelectOption>
                </IonSelect>
              </div>

              {pending > 0 && (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--ion-color-danger-tint)',
                    borderRadius: '8px',
                    marginTop: '16px',
                  }}
                >
                  <IonText color="danger">
                    <p style={{ margin: 0 }}>Pending Amount: <strong>{formatCurrency(pending)}</strong></p>
                  </IonText>
                </div>
              )}

              <Button
                onClick={handleCreatePurchase}
                loading={creating}
                disabled={!isFormValid}
                fullWidth
                size="large"
              >
                <IonIcon icon={checkmarkCircle} slot="start" />
                Create Purchase
              </Button>
            </IonCardContent>
          </IonCard>
        )}

        {cart.length === 0 && (
          <EmptyState 
            message="Add products to create purchase order" 
            icon="cart"
          />
        )}

        {/* Supplier Selection Modal */}
        {showSupplierModal && (
          <IonModal isOpen={true} onDidDismiss={() => setShowSupplierModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Select Supplier</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowSupplierModal(false)}>Close</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <IonList>
                {suppliers.map((supplier) => (
                  <IonItem
                    key={supplier.id}
                    button
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setShowSupplierModal(false);
                    }}
                    color={selectedSupplierId === supplier.id ? 'light' : undefined}
                  >
                    <IonLabel>
                      <h2>{supplier.name}</h2>
                      <p>{supplier.phone}</p>
                    </IonLabel>
                    {selectedSupplierId === supplier.id && (
                      <IonIcon icon={checkmarkCircle} slot="end" color="success" />
                    )}
                  </IonItem>
                ))}
              </IonList>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CreatePurchasePage;
