import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonToast,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { downloadOutline, cash, closeCircle, checkmarkCircle, create } from 'ionicons/icons';
import { 
  useGetInvoiceByIdQuery, 
  useFinalizeInvoiceMutation,
  useCancelInvoiceMutation 
} from '../../core/api/invoiceApi';
import { useTranslation } from 'react-i18next';

import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { PaymentModal } from '@components';
import { formatDateTime, formatCurrency, generateIdempotencyKey } from '@utils/helpers';
import notificationService from '@core/services/notificationService';
import type { PaymentMode } from '@core/types';
import './InvoiceDetailPage.css';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const history = useHistory();
  const { data, isLoading, error, refetch } = useGetInvoiceByIdQuery(id);
  const [finalizeInvoice, { isLoading: finalizing }] = useFinalizeInvoiceMutation();
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  console.log('showPaymentModal state:', showPaymentModal);

  const invoice = data?.data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'UNPAID':
        return 'danger';
      case 'PARTIAL':
        return 'warning';
      case 'DRAFT':
        return 'medium';
      case 'FINALIZED':
        return 'primary';
      case 'CANCELLED':
        return 'dark';
      default:
        return 'medium';
    }
  };

  const handleFinalizeInvoice = async () => {
    try {
      await finalizeInvoice(id).unwrap();
      setToastMessage('Invoice finalized successfully!');
      setShowSuccessToast(true);
      refetch();
    } catch (error: any) {
      setToastMessage(error?.data?.message || 'Failed to finalize invoice');
      setShowErrorToast(true);
    }
  };

  const handleCancelInvoice = async () => {
    try {
      await cancelInvoice({ id, reason: cancelReason || 'Cancelled by user' }).unwrap();
      setToastMessage('Invoice cancelled successfully');
      setShowSuccessToast(true);
      setShowCancelAlert(false);
      setCancelReason('');
      refetch();
    } catch (error: any) {
      setToastMessage(error?.data?.message || 'Failed to cancel invoice');
      setShowErrorToast(true);
    }
  };

  const handlePayment = async (amount: number, mode: PaymentMode, reference?: string) => {
    console.log('DEBUG handlePayment called:', { amount, mode, reference, invoice });
    if (!invoice?.customer) {
      console.error('No customer found on invoice');
      return;
    }

    try {
      // Finalize invoice if it's in DRAFT status
      if (invoice.status === 'DRAFT') {
        console.log('Finalizing draft invoice...');
        await finalizeInvoice(id).unwrap();
      }

      console.log('Creating payment...');
      await createPayment({
        customer_id: invoice.customer.id,
        invoice_id: id,
        amount,
        payment_mode: mode,
        reference_note: reference,
        idempotency_key: generateIdempotencyKey(),
      }).unwrap();

      console.log('Payment successful');
      setToastMessage('Payment recorded successfully!');
      setShowSuccessToast(true);
      setShowPaymentModal(false);
      refetch();
    } catch (error: any) {
      console.error('Payment error:', error);
      setToastMessage(error?.data?.message || 'Payment failed');
      setShowErrorToast(true);
      throw error;
    }
  };

  const calculateBalance = () => {
    if (!invoice) return 0;
    return (invoice.total_amount || 0) - (invoice.paid_amount || 0);
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/invoices" />
            </IonButtons>
            <IonTitle>Invoice Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !invoice) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/invoices" />
            </IonButtons>
            <IonTitle>Invoice Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonCard>
            <IonCardContent>
              <p>Invoice not found or error loading invoice details.</p>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  console.log('Invoice Detail Page - Invoice:', invoice);
  console.log('Invoice Status:', invoice.status);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/invoices" />
          </IonButtons>
          <IonTitle>Invoice Details</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="max-w-4xl mx-auto">
        {/* Invoice Header */}
        <IonCard>
          <IonCardHeader>
            <div className="flex justify-between items-start">
              <div>
                <IonCardTitle className="text-lg">{invoice.invoice_number}</IonCardTitle>
                <p className="text-sm text-gray-500">{formatDateTime(invoice.created_at)}</p>
                {invoice.finalized_at && (
                  <p className="text-xs text-gray-500">
                    Finalized: {formatDateTime(invoice.finalized_at)}
                  </p>
                )}
                {invoice.cancelled_at && (
                  <p className="text-xs text-danger">
                    Cancelled: {formatDateTime(invoice.cancelled_at)}
                  </p>
                )}
              </div>
              <IonBadge color={getStatusColor(invoice.status)} mode="ios">
                {invoice.status}
              </IonBadge>
            </div>
          </IonCardHeader>
        </IonCard>

        {/* Customer Information */}
        {invoice.customer && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="text-base">Customer Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div>
                <p className="font-semibold">{invoice.customer.name}</p>
                <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                {invoice.customer.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Invoice Items */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle className="text-base">Items</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {invoice.items && invoice.items.length > 0 ? (
              <div className="space-y-2">
                {invoice.items.map((item: any) => (
                  <div key={item.id} className="border-b pb-2 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.variant?.product?.name || 'Unknown Product'}
                        </p>
                        {item.variant?.sku && (
                          <p className="text-xs text-gray-500">SKU: {item.variant.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency((item.unit_price || item.price) * item.quantity)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>{item.quantity} × {formatCurrency(item.unit_price || item.price)}</span>
                      {item.discount_amount > 0 && (
                        <span className="text-danger">Disc: -{formatCurrency(item.discount_amount)}</span>
                      )}
                    </div>
                    {item.final_price && (
                      <div className="text-xs text-right font-semibold text-primary">
                        Final: {formatCurrency(item.final_price)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No items found</p>
            )}
          </IonCardContent>
        </IonCard>

        {/* Amount Summary */}
        <IonCard>
          <IonCardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal_amount || 0)}</span>
              </div>
              
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              
              {invoice.gst_amount > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>{formatCurrency(invoice.gst_amount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total Amount:</span>
                <span>{formatCurrency(invoice.total_amount || 0)}</span>
              </div>

              {invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && (
                <>
                  {invoice.paid_amount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Paid:</span>
                      <span>{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                  )}
                  
                  <div className={`flex justify-between font-semibold ${calculateBalance() > 0 ? 'text-danger' : 'text-success'}`}>
                    <span>Balance:</span>
                    <span>{formatCurrency(calculateBalance())}</span>
                  </div>
                </>
              )}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2 pb-4">
          {invoice.status === 'DRAFT' && (
            <>
              <IonButton
                expand="block"
                onClick={() => history.push(`/billing?edit=${invoice.id}`)}
                color="medium"
                fill="outline"
              >
                <IonIcon icon={create} slot="start" />
                Edit Draft
              </IonButton>
              
              <IonButton
                expand="block"
                onClick={() => {
                  console.log('Finalize & Collect Payment button clicked');
                  setShowPaymentModal(true);
                }}
                disabled={finalizing}
                color="primary"
              >
                <IonIcon icon={checkmarkCircle} slot="start" />
                Finalize & Collect Payment
              </IonButton>
            </>
          )}

          {(invoice.status === 'UNPAID' || invoice.status === 'PARTIAL') && (
            <IonButton
              expand="block"
              onClick={() => setShowPaymentModal(true)}
              color="success"
            >
              <IonIcon icon={cash} slot="start" />
              Add Payment
            </IonButton>
          )}

          {invoice.status === 'DRAFT' && (
            <IonButton
              expand="block"
              onClick={() => {
                console.log('Cancel Invoice button clicked');
                setShowCancelAlert(true);
              }}
              disabled={cancelling}
              color="danger"
              fill="outline"
            >
              <IonIcon icon={closeCircle} slot="start" />
              Cancel Invoice
            </IonButton>
          )}
        </div>

        {/* Payment Modal */}
        {invoice && (
          <>
            {console.log('Rendering PaymentModal with isOpen:', showPaymentModal)}
            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => {
                console.log('PaymentModal onClose called');
                setShowPaymentModal(false);
              }}
              onPayment={handlePayment}
              invoiceAmount={Number(invoice.total_amount) || 0}
              paidAmount={Number(invoice.paid_amount) || 0}
              isLoading={isCreatingPayment || finalizing}
            />
          </>
        )}

        {/* Cancel Alert */}
        <IonAlert
          isOpen={showCancelAlert}
          onDidDismiss={() => {
            setShowCancelAlert(false);
            setCancelReason('');
          }}
          header="Cancel Invoice"
          message="Are you sure you want to cancel this invoice? This action cannot be undone."
          inputs={[
            {
              name: 'reason',
              type: 'textarea',
              placeholder: 'Reason for cancellation (optional)',
              value: cancelReason,
            },
          ]}
          buttons={[
            {
              text: 'No',
              role: 'cancel',
            },
            {
              text: 'Yes, Cancel',
              role: 'destructive',
              handler: (data) => {
                setCancelReason(data.reason || '');
                handleCancelInvoice();
              },
            },
          ]}
        />        
        {/* Success Toast */}
        <IonToast
          isOpen={showSuccessToast}
          onDidDismiss={() => setShowSuccessToast(false)}
          message={toastMessage}
          duration={2000}
          color="success"
          position="top"
        />
        
        {/* Error Toast */}
        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message={toastMessage}
          duration={3000}
          color="danger"
          position="top"
        />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default InvoiceDetailPage;
