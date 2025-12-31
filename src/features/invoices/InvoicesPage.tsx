import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonIcon,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Navbar } from '@components/Navbar';
import { SearchBar, Loading, EmptyState } from '@components';
import { useGetInvoicesQuery } from '@core/api/invoiceApi';
import { formatCurrency, formatDateTime } from '@utils/helpers';
import { documentText } from 'ionicons/icons';
import './InvoicesPage.css';

export const InvoicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const history = useHistory();
  
  const { data, isLoading } = useGetInvoicesQuery({});
  
  const invoices = data?.data || [];

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

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((invoice) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.customer?.name?.toLowerCase().includes(searchLower) ||
      invoice.customer?.phone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <IonPage>
      <Navbar title="Invoices" />
      <IonContent>
        <div className="p-4">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Search by invoice number, customer name or phone" 
          />

          {isLoading ? (
            <Loading isOpen={isLoading} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              message={search ? "No invoices found matching your search" : "No invoices found"}
            />
          ) : (
            <IonList>
              {filteredInvoices.map((invoice) => (
                <IonCard 
                  key={invoice.id} 
                  className="invoice-card"
                  button
                  onClick={() => history.push(`/invoices/${invoice.id}`)}
                >
                  <IonCardHeader>
                    <div className="invoice-card-header">
                      <div>
                        <IonCardTitle className="invoice-number">
                          <IonIcon icon={documentText} style={{ marginRight: '8px' }} />
                          {invoice.invoice_number}
                        </IonCardTitle>
                        <p className="invoice-date">{formatDateTime(invoice.created_at)}</p>
                      </div>
                      <IonBadge color={getStatusColor(invoice.status)} mode="ios">
                        {invoice.status}
                      </IonBadge>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    {invoice.customer && (
                      <div className="customer-info">
                        <p className="customer-name">{invoice.customer.name}</p>
                        <p className="customer-phone">{invoice.customer.phone}</p>
                      </div>
                    )}
                    
                    <div className="invoice-amounts">
                      <div className="amount-row">
                        <span className="amount-label">Subtotal:</span>
                        <span className="amount-value">
                          {formatCurrency(invoice.total_amount - invoice.gst_amount)}
                        </span>
                      </div>
                      {invoice.gst_amount > 0 && (
                        <div className="amount-row">
                          <span className="amount-label">GST:</span>
                          <span className="amount-value">
                            {formatCurrency(invoice.gst_amount)}
                          </span>
                        </div>
                      )}
                      <div className="amount-row total-row">
                        <span className="amount-label">Total:</span>
                        <span className="amount-value total">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </div>
                    </div>

                    {invoice.invoice_url && (
                      <div className="invoice-actions">
                        <a 
                          href={invoice.invoice_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-invoice-link"
                        >
                          View Invoice
                        </a>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              ))}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
