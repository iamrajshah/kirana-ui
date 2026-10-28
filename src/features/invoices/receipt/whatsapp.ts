import type { ReceiptViewModel } from './types';

export const normalizeIndianWhatsAppPhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
};

export const buildWhatsAppReceiptMessage = (receipt: ReceiptViewModel) => {
  const due = Number(receipt.payment.remaining);
  const lines = [
    `Namaste from ${receipt.supplier.name}.`,
    `${receipt.title} ${receipt.invoiceNumber}: ₹${receipt.totals.total}.`,
    due > 0 ? `Amount received: ₹${receipt.payment.paid}. Balance due: ₹${receipt.payment.remaining}.` : 'Payment received in full. Thank you!',
  ];
  if (receipt.totals.mrpSavings && Number(receipt.totals.mrpSavings) > 0) {
    lines.push(`You saved ₹${receipt.totals.mrpSavings} on MRP.`);
  }
  return lines.join('\n');
};

export const openWhatsAppReceipt = (receipt: ReceiptViewModel): boolean => {
  if (receipt.customer.kind !== 'named' || !receipt.customer.phone) return false;
  const phone = normalizeIndianWhatsAppPhone(receipt.customer.phone);
  if (!phone) return false;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppReceiptMessage(receipt))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
