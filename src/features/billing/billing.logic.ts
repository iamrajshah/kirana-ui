export interface BillingCartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_type: 'amount' | 'percent';
}

export const buildInvoiceItems = (cart: BillingCartItem[]) =>
  cart.map((item) => {
    const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
    const discountAmount =
      item.discount_type === 'percent'
        ? (lineSubtotal * Number(item.discount_amount || 0)) / 100
        : Number(item.discount_amount || 0);

    return {
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.unit_price,
      discount_amount: discountAmount,
    };
  });

export const calculateBillingTotals = (
  cart: BillingCartItem[],
  billDiscount: number,
  billDiscountType: 'amount' | 'percent',
  gstAmount: number
) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );
  const billDiscountAmount =
    billDiscountType === 'percent'
      ? (subtotal * Number(billDiscount || 0)) / 100
      : Number(billDiscount || 0);

  return {
    subtotal,
    billDiscountAmount,
    total: Math.max(0, subtotal - billDiscountAmount) + Number(gstAmount || 0),
  };
};
