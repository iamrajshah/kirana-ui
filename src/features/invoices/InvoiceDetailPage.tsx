import React from 'react';
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
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { downloadOutline } from 'ionicons/icons';
import { useGetInvoiceByIdQuery } from '../../core/api/invoiceApi';
import { formatDateTime } from '@utils/helpers';
import './InvoiceDetailPage.css';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetInvoiceByIdQuery(id);

  const invoice = data?.data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'UNPAID':
        return 'danger';
      case 'PARTIAL':
        return 'warning';
      default:
        return 'medium';
    }
  };

  const handleDownloadPdf = () => {
    if (invoice?.invoice_url) {
      window.open(invoice.invoice_url, '_blank');
    }
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/invoices" />
          </IonButtons>
          <IonTitle>Invoice Details</IonTitle>
          {invoice.invoice_url && (
            <IonButtons slot="end">
              <IonButton onClick={handleDownloadPdf}>
                <IonIcon slot="start" icon={downloadOutline} />
                Download PDF
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Invoice Header */}
        <IonCard>
          <IonCardHeader>
            <div className="invoice-header">
              <div>
                <IonCardTitle>{invoice.invoice_number}</IonCardTitle>
                <p className="invoice-date">{formatDateTime(invoice.created_at)}</p>
              </div>
              <IonBadge color={getStatusColor(invoice.status)}>{invoice.status}</IonBadge>
            </div>
          </IonCardHeader>
        </IonCard>

        {/* Customer Information */}
        {invoice.customer && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Customer Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem lines="none">
                  <IonLabel>
                    <h2>{invoice.customer.name}</h2>
                    <p>{invoice.customer.phone}</p>
                    {invoice.customer.email && <p>{invoice.customer.email}</p>}
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Invoice Items */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Items</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {invoice.items && invoice.items.length > 0 ? (
              <div className="items-table">
                {/* Table Header */}
                <IonGrid className="items-header">
                  <IonRow>
                    <IonCol size="5">
                      <strong>Product</strong>
                    </IonCol>
                    <IonCol size="2" className="ion-text-center">
                      <strong>Qty</strong>
                    </IonCol>
                    <IonCol size="2.5" className="ion-text-end">
                      <strong>Price</strong>
                    </IonCol>
                    <IonCol size="2.5" className="ion-text-end">
                      <strong>Total</strong>
                    </IonCol>
                  </IonRow>
                </IonGrid>

                {/* Table Body */}
                {invoice.items.map((item: any) => (
                  <IonGrid key={item.id} className="item-row">
                    <IonRow>
                      <IonCol size="5">
                        <div className="product-info">
                          <div className="product-name">
                            {item.variant?.product?.name || 'Unknown Product'}
                          </div>
                          {item.variant?.sku && (
                            <div className="product-sku">SKU: {item.variant.sku}</div>
                          )}
                        </div>
                      </IonCol>
                      <IonCol size="2" className="ion-text-center">
                        {item.quantity}
                      </IonCol>
                      <IonCol size="2.5" className="ion-text-end">
                        ₹{Number(item.price).toFixed(2)}
                      </IonCol>
                      <IonCol size="2.5" className="ion-text-end">
                        ₹{Number(item.total).toFixed(2)}
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                ))}
              </div>
            ) : (
              <p>No items found</p>
            )}
          </IonCardContent>
        </IonCard>

        {/* Amount Summary */}
        <IonCard>
          <IonCardContent>
            <div className="amount-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{(Number(invoice.total_amount) - Number(invoice.gst_amount)).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>GST:</span>
                <span>₹{Number(invoice.gst_amount).toFixed(2)}</span>
              </div>
              <div className="summary-row total-row">
                <span>Total Amount:</span>
                <span>₹{Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default InvoiceDetailPage;
