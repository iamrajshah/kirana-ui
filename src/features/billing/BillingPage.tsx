import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { add, remove, trash, cash, bookmark } from 'ionicons/icons';
import { useLocation, useHistory } from 'react-router-dom';
import { useLazySearchVariantsQuery } from '@core/api/productApi';
import { useCreateInvoiceMutation, useUpdateInvoiceMutation, useGetInvoiceByIdQuery } from '@core/api/invoiceApi';
import { useGetCustomersQuery } from '@core/api/customerApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { SearchBar, Select, PaymentModal, Loading } from '@components';
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
  const { data: customersData, isLoading: customersLoading } = useGetCustomersQuery({ skip: 0, take: 1000 });
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const { data: invoiceData, isLoading: invoiceLoading } = useGetInvoiceByIdQuery(editInvoiceId || '', { skip: !editInvoiceId });
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();

  const [searchTerm, setSearchTerm] = useState('');
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

  const updateItemDiscount = (
    variantId: string,
    discount: number,
    type: DiscountType = 'amount'
  ) => {
    setCart(
      cart.map((item) =>
        item.variant_id === variantId
          ? { ...item, discount_amount: discount, discount_type: type }
          : item
      )
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId));
  };

  const calculateLineTotal = (item: CartItem) => {
    const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
    let itemDiscount = 0;
    if (item.discount_type === 'percent') {
      itemDiscount = (lineSubtotal * Number(item.discount_amount)) / 100;
    } else {
      itemDiscount = Number(item.discount_amount);
    }
    return Math.max(0, lineSubtotal - itemDiscount);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
  };

  const calculateTotalItemDiscount = () => {
    return cart.reduce((sum, item) => {
      const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
      if (item.discount_type === 'percent') {
        return sum + (lineSubtotal * Number(item.discount_amount)) / 100;
      }
      return sum + Number(item.discount_amount);
    }, 0);
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
    const totalItemDiscount = calculateTotalItemDiscount();
    const billDiscountAmount = calculateBillDiscount();
    const afterDiscount = Math.max(0, subtotal - totalItemDiscount - billDiscountAmount);
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
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setLoadedInvoiceData(null);
    setShowPaymentModal(false);
    setPendingInvoiceId(null);
  };

  const customers =
    customersData?.data?.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` })) || [];

  return (
    <IonPage>
      <Navbar title={editInvoiceId ? "Edit Draft Invoice" : "Billing"} />
      <IonContent className="ion-padding">
        {invoiceLoading && <Loading isOpen={invoiceLoading} message="Loading invoice..." />}
        {creating && <Loading isOpen={creating} message="Saving invoice..." />}
        {updating && <Loading isOpen={updating} message="Updating invoice..." />}
        <div className="max-w-2xl mx-auto">
          {/* Customer Selection - Compact */}
          {editInvoiceId ? (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Customer</label>
              <div className="px-3 py-2 bg-gray-100 rounded border">
                <span className="text-sm">{selectedCustomerName || 'Loading...'}</span>
              </div>
            </div>
          ) : (
            <Select
              label="Select Customer"
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={customers}
              placeholder="Choose customer"
              required
            />
          )}

          {/* Product Search - Compact */}
          <div className="mt-3">
            <SearchBar
              value={searchTerm}
              onChange={(val: string) => {
                setSearchTerm(val);
                handleSearch(val);
              }}
              placeholder="Search product by name or SKU"
            />
          </div>

          {/* Search Results - Compact */}
          {searchTerm && searchLoading && (
            <div className="text-center py-2 text-sm">Loading...</div>
          )}
          {searchTerm && variantsData?.data && variantsData.data.length > 0 && (
            <IonList className="mt-2">
              {variantsData.data.map((variant: unknown) => {
                const v = variant as { id: string; product_name?: string; sku?: string; selling_price?: number; price?: number };
                return (
                <IonItem key={v.id} button onClick={() => addToCart(variant)} lines="none">
                  <IonLabel>
                    <h3 className="text-sm font-medium">{v.product_name}</h3>
                    <p className="text-xs text-gray-500">
                      {v.sku} • {formatCurrency(v.selling_price || v.price)}
                    </p>
                  </IonLabel>
                  <IonIcon icon={add} slot="end" color="primary" />
                </IonItem>
                );
              })}
            </IonList>
          )}

          {/* Cart - Compact Design */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Cart Items</h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Cart is empty. Search and add products above.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <IonCard key={item.variant_id} className="m-0">
                    <IonCardContent className="p-3">
                      {/* Product Info Row */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{item.product_name}</h4>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </div>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => removeFromCart(item.variant_id)}
                          className="m-0"
                        >
                          <IonIcon icon={trash} slot="icon-only" />
                        </IonButton>
                      </div>

                      {/* Quantity & Price Row */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {/* Quantity */}
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Qty</label>
                          <div className="flex items-center gap-1">
                            <IonButton
                              fill="outline"
                              size="small"
                              onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                              className="h-8 w-8"
                            >
                              <IonIcon icon={remove} slot="icon-only" />
                            </IonButton>
                            <div className="flex-1 text-center font-semibold text-sm">
                              {item.quantity}
                            </div>
                            <IonButton
                              fill="outline"
                              size="small"
                              onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                              className="h-8 w-8"
                            >
                              <IonIcon icon={add} slot="icon-only" />
                            </IonButton>
                          </div>
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Price</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              updatePrice(item.variant_id, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                            step="0.01"
                          />
                        </div>

                        {/* Discount */}
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Disc</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={item.discount_amount}
                              onChange={(e) =>
                                updateItemDiscount(
                                  item.variant_id,
                                  parseFloat(e.target.value) || 0,
                                  item.discount_type
                                )
                              }
                              className="w-16 px-1 py-1 text-xs border rounded"
                              step="0.01"
                            />
                            <IonSegment
                              value={item.discount_type}
                              onIonChange={(e) =>
                                updateItemDiscount(
                                  item.variant_id,
                                  item.discount_amount,
                                  e.detail.value as DiscountType
                                )
                              }
                              className="w-14 h-7"
                            >
                              <IonSegmentButton value="amount" className="text-xs">
                                ₹
                              </IonSegmentButton>
                              <IonSegmentButton value="percent" className="text-xs">
                                %
                              </IonSegmentButton>
                            </IonSegment>
                          </div>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right text-sm font-semibold text-primary">
                        Total: {formatCurrency(calculateLineTotal(item))}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </div>

          {/* Billing Summary - Compact */}
          {cart.length > 0 && (
            <IonCard className="mt-4">
              <IonCardContent className="p-3">
                {/* Subtotal */}
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                </div>

                {/* Item Discounts */}
                {calculateTotalItemDiscount() > 0 && (
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Item Discounts:</span>
                    <span>- {formatCurrency(calculateTotalItemDiscount())}</span>
                  </div>
                )}

                {/* Bill Discount */}
                <div className="mb-2">
                  <label className="text-xs text-gray-600 block mb-1">Bill Discount:</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={billDiscount}
                      onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      placeholder="0"
                      step="0.01"
                    />
                    <IonSegment
                      value={billDiscountType}
                      onIonChange={(e) => setBillDiscountType(e.detail.value as DiscountType)}
                      className="w-20 h-8"
                    >
                      <IonSegmentButton value="amount" className="text-xs">
                        ₹
                      </IonSegmentButton>
                      <IonSegmentButton value="percent" className="text-xs">
                        %
                      </IonSegmentButton>
                    </IonSegment>
                  </div>
                  {billDiscount > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      - {formatCurrency(calculateBillDiscount())}
                    </div>
                  )}
                </div>

                {/* GST */}
                <div className="mb-2">
                  <label className="text-xs text-gray-600 block mb-1">GST Amount:</label>
                  <input
                    type="number"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                {/* Final Total */}
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Action Buttons */}
          {cart.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4 pb-4">
              <IonButton
                onClick={handleSaveAsDraft}
                disabled={cart.length === 0 || creating || updating}
                fill="outline"
                expand="block"
              >
                <IonIcon icon={bookmark} slot="start" />
                {editInvoiceId ? 'Update Draft' : 'Save as Draft'}
              </IonButton>
              <IonButton
                onClick={handleSaveAndCollectPayment}
                disabled={cart.length === 0 || creating}
                color="success"
                expand="block"
              >
                <IonIcon icon={cash} slot="start" />
                Save & Collect
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
