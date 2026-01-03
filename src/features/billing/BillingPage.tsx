import React, { useState, useEffect } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { add, trash, cash, bookmark } from 'ionicons/icons';
import { useLocation, useHistory } from 'react-router-dom';
import { useLazySearchVariantsQuery } from '@core/api/productApi';
import { useCreateInvoiceMutation, useUpdateInvoiceMutation, useGetInvoiceByIdQuery } from '@core/api/invoiceApi';
import { useLazySearchCustomersQuery } from '@core/api/customerApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { SearchBar, PaymentModal, Loading } from '@components';
import { formatCurrency, generateIdempotencyKey, debounce } from '@utils/helpers';
import notificationService from '@core/services/notificationService';
import type { PaymentMode } from '@core/types';

interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  selling_price: number; // Original selling price from variant
  unit_price: number; // Editable price per unit
  discount_amount: number; // Item-level discount
  discount_type: 'amount' | 'percent';
}

type DiscountType = 'amount' | 'percent';

export const BillingPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const editInvoiceId = new URLSearchParams(location.search).get('edit');
  
  const [searchVariants, { data: variantsData, isLoading: searchLoading }] =
    useLazySearchVariantsQuery();
  const [searchCustomers, { data: customersData, isLoading: customersLoading }] =
    useLazySearchCustomersQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const { data: invoiceData, isLoading: invoiceLoading } = useGetInvoiceByIdQuery(editInvoiceId || '', { skip: !editInvoiceId });
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [loadedInvoiceData, setLoadedInvoiceData] = useState<any>(null);
  const [gstAmount, setGstAmount] = useState(0);
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<DiscountType>('amount');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  // Load invoice data when in edit mode - ONCE
  useEffect(() => {
    if (editInvoiceId && invoiceData?.data && !invoiceLoading && !loadedInvoiceData) {
      const invoice = invoiceData.data as {
        customer_id: string;
        customer?: {
          id?: string;
          name: string;
          phone: string;
        };
        gst_amount: number;
        discount_amount: number;
        items: Array<{
          variant_id: string;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          variant?: {
            id?: string;
            product?: {
              name?: string;
            };
            sku?: string;
            selling_price?: number;
          };
        }>;  
      };
      
      console.log('DEBUG useEffect loading invoice:', invoice);
      setLoadedInvoiceData(invoice);
      
      const custId = invoice.customer?.id?.toString() || '';
      console.log('DEBUG setting selectedCustomerId:', custId);
      setSelectedCustomerId(custId);
      
      if (invoice.customer) {
        setSelectedCustomerName(`${invoice.customer.name} (${invoice.customer.phone})`);
      }
      
      setGstAmount(Number(invoice.gst_amount) || 0);
      setBillDiscount(Number(invoice.discount_amount) || 0);
      setBillDiscountType('amount');
      
      if (invoice.items && invoice.items.length > 0) {
        const loadedCart: CartItem[] = invoice.items.map((item) => ({
          variant_id: item.variant_id?.toString() || '',
          quantity: Number(item.quantity) || 1,
          selling_price: Number(item.variant?.selling_price || item.unit_price || 0),
          unit_price: Number(item.unit_price) || 0,
          discount_amount: Number(item.discount_amount) || 0,
          discount_type: 'amount' as DiscountType,
          product_name: item.variant?.product?.name || 'Unknown Product',
          sku: item.variant?.sku || '',
        }));
        
        setCart(loadedCart);
      }
    }
  }, [editInvoiceId, invoiceData, invoiceLoading, loadedInvoiceData]);

  // Debounced search
  const handleSearch = debounce((term: string) => {
    if (term.length >= 2) {
      searchVariants({ search: term });
    }
  }, 300);

  const handleCustomerSearch = debounce((term: string) => {
    if (term.length >= 2) {
      searchCustomers(term);
    }
  }, 300);

  const addToCart = (variant: unknown) => {
    const variantData = variant as { id: string; selling_price?: number; price?: number; product_name?: string; sku?: string };
    const existing = cart.find((item) => item.variant_id === variantData.id);
    if (existing) {
      updateQuantity(variantData.id, existing.quantity + 1);
    } else {
      const sellingPrice = variantData.selling_price || variantData.price || 0;
      setCart([
        ...cart,
        {
          variant_id: variantData.id,
          quantity: 1,
          selling_price: sellingPrice,
          unit_price: sellingPrice, // Can be edited
          discount_amount: 0,
          discount_type: 'amount',
          product_name: variantData.product_name || 'Unknown Product',
          sku: variantData.sku || '',
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

  const updatePrice = (variantId: string, price: number) => {
    setCart(
      cart.map((item) => (item.variant_id === variantId ? { ...item, unit_price: price } : item))
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId));
  };

  const calculateLineTotal = (item: CartItem) => {
    return Number(item.unit_price) * Number(item.quantity);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };


  const calculateBillDiscount = () => {
    const subtotal = calculateSubtotal();
    if (billDiscountType === 'percent') {
      return (subtotal * Number(billDiscount)) / 100;
    }
    return Number(billDiscount);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const billDiscountAmount = calculateBillDiscount();
    const afterDiscount = Math.max(0, subtotal - billDiscountAmount);
    return afterDiscount + Number(gstAmount);
  };

  const handleSaveAsDraft = async () => {
    if (cart.length === 0) {
      notificationService.error('Please add products to cart');
      return;
    }

    const customerId = selectedCustomerId || loadedInvoiceData?.customer?.id?.toString() || '';
    if (!editInvoiceId && !customerId) {
      notificationService.error('Please select a customer first');
      return;
    }

    try {
      const items = cart.map((item) => {
        let itemDiscount = Number(item.discount_amount) || 0;
        if (item.discount_type === 'percent') {
          const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
          itemDiscount = (lineSubtotal * Number(item.discount_amount)) / 100;
        }

        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.unit_price,
          discount_amount: itemDiscount,
        };
      });

      if (editInvoiceId) {
        const result = await updateInvoice({
          id: editInvoiceId,
          data: {
            items,
            gst_amount: Number(gstAmount),
            discount_amount: calculateBillDiscount(),
          },
        }).unwrap();

        notificationService.success(
          `Draft updated successfully! Invoice #${result.data?.invoice_number || ''}`
        );
        resetForm();
        history.replace('/billing');
      } else {
        const result = await createInvoice({
          customer_id: customerId,
          items,
          gst_amount: Number(gstAmount),
          discount_amount: calculateBillDiscount(),
          status: 'DRAFT',
          idempotency_key: generateIdempotencyKey(),
        }).unwrap();

        notificationService.success(
          `Draft saved successfully! Invoice #${result.data?.invoice_number || ''}`
        );
        resetForm();
        history.replace('/billing');
      }
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      const errMsg = err?.data?.message || err?.message || 'Failed to save draft';
      notificationService.error(errMsg);
    }
  };

  const handleSaveAndCollectPayment = async () => {
    if (cart.length === 0) {
      notificationService.error('Please add products to cart');
      return;
    }

    const customerId = selectedCustomerId || loadedInvoiceData?.customer?.id?.toString() || '';
    console.log('DEBUG handleSaveAndCollectPayment:', {
      selectedCustomerId,
      loadedInvoiceData,
      customerId,
      editInvoiceId
    });
    
    if (!customerId) {
      notificationService.error('Please select a customer first');
      return;
    }

    try {
      const items = cart.map((item) => {
        let itemDiscount = Number(item.discount_amount) || 0;
        if (item.discount_type === 'percent') {
          const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
          itemDiscount = (lineSubtotal * Number(item.discount_amount)) / 100;
        }

        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.unit_price,
          discount_amount: itemDiscount,
        };
      });

      const result = await createInvoice({
        customer_id: customerId,
        items,
        gst_amount: Number(gstAmount),
        discount_amount: calculateBillDiscount(),
        status: 'FINALIZED',
        idempotency_key: generateIdempotencyKey(),
      }).unwrap();

      setPendingInvoiceId(result.data?.id || null);
      setShowPaymentModal(true);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      const errMsg = err?.data?.message || err?.message || 'Failed to create invoice';
      notificationService.error(errMsg);
    }
  };

  const handlePayment = async (amount: number, mode: PaymentMode, reference?: string) => {
    const customerId = selectedCustomerId || loadedInvoiceData?.customer?.id?.toString() || '';
    console.log('DEBUG handlePayment:', {
      amount,
      mode,
      reference,
      customerId,
      pendingInvoiceId
    });
    
    if (!pendingInvoiceId || !customerId) {
      notificationService.error('Missing customer or invoice information');
      return;
    }

    try {
      const result = await createPayment({
        customer_id: customerId,
        invoice_id: pendingInvoiceId,
        amount,
        payment_mode: mode,
        reference_note: reference,
        idempotency_key: generateIdempotencyKey(),
      }).unwrap();

      console.log('Payment result:', result);
      notificationService.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPendingInvoiceId(null);
      resetForm();
      history.replace('/billing');
    } catch (error: unknown) {
      console.error('Payment error:', error);
      const err = error as { data?: { message?: string }; message?: string };
      const errMsg = err?.data?.message || err?.message || 'Payment failed';
      notificationService.error(errMsg);
      throw error;
    }
  };

  const resetForm = () => {
    setCart([]);
    setGstAmount(0);
    setBillDiscount(0);
    setSearchTerm('');
    setCustomerSearchTerm('');
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setLoadedInvoiceData(null);
    setShowPaymentModal(false);
    setPendingInvoiceId(null);
  };

  return (
    <IonPage>
      <Navbar title={editInvoiceId ? "Edit Draft Invoice" : "Billing"} />
      <IonContent className="ion-padding">
        {invoiceLoading && <Loading isOpen={invoiceLoading} message="Loading invoice..." />}
        {creating && <Loading isOpen={creating} message="Saving invoice..." />}
        {updating && <Loading isOpen={updating} message="Updating invoice..." />}
        <div className="max-w-2xl mx-auto">
          {/* Customer Selection */}
          <div className="mb-2">
            <label className="block text-xs font-medium mb-1 text-gray-700">Customer</label>
            {selectedCustomerId ? (
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-300">
                <span className="text-sm font-medium text-green-900">{selectedCustomerName}</span>
                <IonButton
                  fill="clear"
                  size="small"
                  color="danger"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setSelectedCustomerName('');
                    setCustomerSearchTerm('');
                    setCart([]);
                  }}
                  style={{ margin: 0, height: '28px' }}
                >
                  <span className="text-xs">Change</span>
                </IonButton>
              </div>
            ) : (
              <>
                <SearchBar
                  value={customerSearchTerm}
                  onChange={(val: string) => {
                    setCustomerSearchTerm(val);
                    handleCustomerSearch(val);
                  }}
                  placeholder="Search customer by name or phone"
                />
                {customerSearchTerm && customersLoading && (
                  <div className="text-center py-2 text-xs text-gray-500">Loading...</div>
                )}
                {customerSearchTerm && customersData?.data && customersData.data.length > 0 && (
                  <IonList className="mt-1" style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {customersData.data.map((customer: unknown) => {
                      const c = customer as { id: string; name: string; phone: string };
                      return (
                        <IonItem
                          key={c.id}
                          button
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setSelectedCustomerName(`${c.name} (${c.phone})`);
                            setCustomerSearchTerm('');
                          }}
                          lines="none"
                          style={{ '--min-height': '40px' }}
                        >
                          <IonLabel>
                            <h3 className="text-sm font-medium">{c.name}</h3>
                            <p className="text-xs text-gray-500">{c.phone}</p>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                )}
              </>
            )}
          </div>

          {/* Product Search */}
          {selectedCustomerId && (
            <div className="mt-2">
              <SearchBar
                value={searchTerm}
                onChange={(val: string) => {
                  setSearchTerm(val);
                  handleSearch(val);
                }}
                placeholder="Search product by name or SKU"
              />
            </div>
          )}

          {/* Search Results */}
          {searchTerm && searchLoading && (
            <div className="text-center py-2 text-xs text-gray-500">Loading...</div>
          )}
          {searchTerm && variantsData?.data && variantsData.data.length > 0 && (
            <IonList className="mt-1" style={{ maxHeight: '180px', overflow: 'auto' }}>
              {variantsData.data.map((variant: unknown) => {
                const v = variant as { id: string; product_name?: string; sku?: string; selling_price?: number; price?: number };
                return (
                <IonItem key={v.id} button onClick={() => addToCart(variant)} lines="none" style={{ '--min-height': '45px' }}>
                  <IonLabel>
                    <h3 className="text-xs font-medium">{v.product_name}</h3>
                    <p className="text-xs text-gray-500">
                      {v.sku} • {formatCurrency(v.selling_price || v.price)}
                    </p>
                  </IonLabel>
                  <IonIcon icon={add} slot="end" color="primary" style={{ fontSize: '20px' }} />
                </IonItem>
                );
              })}
            </IonList>
          )}

          {/* Cart */}
          {selectedCustomerId && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold mb-1 text-gray-700">Cart Items ({cart.length})</h3>
              {cart.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-xs">
                  Cart is empty
                </div>
              ) : (
                <div className="space-y-1">
                {cart.map((item) => (
                  <IonCard key={item.variant_id} className="m-0" style={{ marginBottom: '2px' }}>
                    <IonCardContent className="p-1.5">
                      {/* Product Info Row */}
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex-1">
                          <h4 className="text-xs font-medium leading-none">{item.product_name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{item.sku}</p>
                        </div>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => removeFromCart(item.variant_id)}
                          style={{ margin: 0, height: '20px', width: '20px', '--padding-start': '0', '--padding-end': '0' }}
                        >
                          <IonIcon icon={trash} slot="icon-only" style={{ fontSize: '14px' }} />
                        </IonButton>
                      </div>

                      {/* Quantity & Price Row */}
                      <div className="grid grid-cols-2 gap-1 mb-0.5">
                        {/* Quantity */}
                        <div>
                          <label className="text-xs text-gray-600 block mb-0.5" style={{ fontSize: '10px' }}>Qty</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                              className="h-7 w-6 flex items-center justify-center border border-gray-300 rounded bg-white active:bg-gray-100"
                              style={{ minWidth: '24px', padding: 0 }}
                            >
                              <span className="text-lg font-bold leading-none">−</span>
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                updateQuantity(item.variant_id, Math.max(1, qty));
                              }}
                              className="h-7 text-center font-semibold text-sm border border-gray-300 rounded"
                              style={{ width: '100%', maxWidth: '60px', padding: '0 2px' }}
                              min="1"
                            />
                            <button
                              onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                              className="h-7 w-6 flex items-center justify-center border border-gray-300 rounded bg-white active:bg-gray-100"
                              style={{ minWidth: '24px', padding: 0 }}
                            >
                              <span className="text-lg font-bold leading-none">+</span>
                            </button>
                          </div>
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="text-xs text-gray-600 block mb-0.5" style={{ fontSize: '10px' }}>Price</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                updatePrice(item.variant_id, parseFloat(e.target.value) || 0)
                              }
                              className="flex-1 h-7 px-1.5 text-sm border border-gray-300 rounded"
                              step="0.01"
                            />
                            <span className="text-gray-700 font-bold" style={{ fontSize: '14px', minWidth: '18px' }}>₹</span>
                          </div>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right text-xs font-semibold text-primary">
                        {formatCurrency(calculateLineTotal(item))}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Billing Summary */}
          {cart.length > 0 && (
            <IonCard className="mt-1" style={{ maxWidth: '500px', margin: '4px auto 0' }}>
              <IonCardContent className="p-1.5">
                {/* Subtotal */}
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700" style={{ fontSize: '11px' }}>Subtotal:</span>
                  <span className="font-semibold" style={{ fontSize: '11px' }}>{formatCurrency(calculateSubtotal())}</span>
                </div>

                {/* Bill Discount - Single Row */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-gray-700" style={{ fontSize: '11px', minWidth: '65px' }}>Bill Disc:</span>
                  <input
                    type="number"
                    value={billDiscount}
                    onChange={(e) => {
                      setBillDiscount(parseFloat(e.target.value) || 0);
                      setBillDiscountType('amount');
                    }}
                    className="flex-1 h-7 px-1.5 text-sm border border-gray-300 rounded"
                    placeholder="0"
                    step="0.01"
                  />
                  <span className="text-gray-700 font-bold" style={{ fontSize: '14px', minWidth: '18px' }}>₹</span>
                </div>

                {/* GST - Single Row */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-gray-700" style={{ fontSize: '11px', minWidth: '65px' }}>GST Amt:</span>
                  <input
                    type="number"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 h-7 px-1.5 text-sm border border-gray-300 rounded"
                    placeholder="0"
                    step="0.01"
                  />
                  <span className="text-gray-700 font-bold" style={{ fontSize: '14px', minWidth: '18px' }}>₹</span>
                </div>

                {/* Final Total */}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                  <span style={{ fontSize: '13px' }}>Total:</span>
                  <span className="text-primary" style={{ fontSize: '14px' }}>{formatCurrency(calculateTotal())}</span>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Action Buttons */}
          {cart.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2 pb-2">
              <IonButton
                onClick={handleSaveAsDraft}
                disabled={cart.length === 0 || creating || updating}
                fill="outline"
                expand="block"
                size="small"
              >
                <IonIcon icon={bookmark} slot="start" style={{ fontSize: '18px' }} />
                <span className="text-xs">{editInvoiceId ? 'Update' : 'Draft'}</span>
              </IonButton>
              <IonButton
                onClick={handleSaveAndCollectPayment}
                disabled={cart.length === 0 || creating}
                color="success"
                expand="block"
                size="small"
              >
                <IonIcon icon={cash} slot="start" style={{ fontSize: '18px' }} />
                <span className="text-xs">Save & Pay</span>
              </IonButton>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {pendingInvoiceId && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              resetForm();
            }}
            onPayment={handlePayment}
            invoiceAmount={calculateTotal()}
            paidAmount={0}
            isLoading={isCreatingPayment}
          />
        )}
      </IonContent>
    </IonPage>
  );
};
