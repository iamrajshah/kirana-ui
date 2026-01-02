import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';
import type { PaymentMode } from '@core/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayment: (amount: number, mode: PaymentMode, reference?: string) => void | Promise<void>;
  invoiceAmount: number;
  paidAmount?: number;
  isLoading?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayment,
  invoiceAmount,
  paidAmount = 0,
  isLoading = false,
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [amount, setAmount] = useState<string>('');
  const [reference, setReference] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');

  const balanceAmount = invoiceAmount - paidAmount;

  const handleSubmit = async () => {
    const payAmount = paymentType === 'full' ? balanceAmount : parseFloat(amount) || 0;
    
    if (payAmount <= 0) {
      return;
    }

    if (payAmount > balanceAmount) {
      return;
    }

    try {
      await onPayment(payAmount, paymentMode, reference || undefined);
      
      // Reset form
      setAmount('');
      setReference('');
      setPaymentType('full');
      setPaymentMode('CASH');
      
      // Close modal on success
      onClose();
    } catch (error) {
      // Error will be handled by parent component
      console.error('Payment error:', error);
    }
  };

  const paymentModeOptions = [
    { value: 'CASH' as PaymentMode, label: 'Cash' },
    { value: 'UPI' as PaymentMode, label: 'UPI' },
    { value: 'CARD' as PaymentMode, label: 'Card' },
    { value: 'BANK' as PaymentMode, label: 'Bank Transfer' },
  ];

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Collect Payment</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Invoice Summary */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: '#666' }}>Total Amount:</span>
              <span className="font-semibold">{formatCurrency(invoiceAmount)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#666' }}>Paid Amount:</span>
                <span style={{ color: '#22c55e', fontWeight: '500' }}>
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#ddd' }}>
              <span>Balance Amount:</span>
              <span style={{ color: '#3880ff' }}>{formatCurrency(balanceAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Type Selector */}
        <div className="mb-4">
          <IonSegment
            key={paymentType}
            value={paymentType}
            onIonChange={(e) => setPaymentType(e.detail.value as 'full' | 'partial')}
            color="primary"
          >
            <IonSegmentButton value="full">
              <IonLabel>Full Payment</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="partial">
              <IonLabel>Partial Payment</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Payment Amount */}
        {paymentType === 'full' ? (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#e3f2fd' }}>
            <p className="text-sm mb-1" style={{ color: '#666' }}>
              Paying Full:
            </p>
            <p className="text-2xl font-bold" style={{ color: '#3880ff' }}>
              {formatCurrency(balanceAmount)}
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <Input
              label="Partial Amount"
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
            />
            {parseFloat(amount) > balanceAmount && (
              <p className="text-sm mt-1" style={{ color: '#eb445a' }}>
                Amount cannot exceed balance amount
              </p>
            )}
          </div>
        )}

        {/* Payment Mode */}
        <div className="mb-4">
          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={(val) => setPaymentMode(val as PaymentMode)}
            options={paymentModeOptions}
          />
        </div>

        {/* Reference Note */}
        {(paymentMode === 'UPI' || paymentMode === 'CARD' || paymentMode === 'BANK') && (
          <div className="mb-4">
            <Input
              label="Reference Number"
              value={reference}
              onChange={setReference}
              placeholder={
                paymentMode === 'UPI'
                  ? 'UPI Transaction ID'
                  : paymentMode === 'CARD'
                  ? 'Last 4 digits / Approval Code'
                  : 'Bank Reference Number'
              }
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button
            fullWidth
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (paymentType === 'partial' && (!amount || parseFloat(amount) <= 0)) ||
              (paymentType === 'partial' && parseFloat(amount) > balanceAmount)
            }
            loading={isLoading}
          >
            Collect Payment
          </Button>
        </div>
      </IonContent>
    </IonModal>
  );
};
