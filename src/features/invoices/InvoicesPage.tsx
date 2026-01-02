import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Navbar } from '@components/Navbar';
import { SearchBar, Loading, EmptyState } from '@components';
import { useGetInvoicesQuery } from '@core/api/invoiceApi';
import { formatCurrency, formatDateTime } from '@utils/helpers';
import { documentText } from 'ionicons/icons';
import type { InvoiceStatus } from '@core/types';
import './InvoicesPage.css';

export const InvoicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [allInvoices, setAllInvoices] = useState<unknown[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const take = 50;
  const history = useHistory();
  
  // Load all invoices without status filter - filter locally instead
  const { data, isLoading, isFetching } = useGetInvoicesQuery({ 
    skip, 
    take
  });

  // Accumulate invoices as they're fetched
  useEffect(() => {
    if (data?.data) {
      if (skip === 0) {
        setAllInvoices(data.data);
      } else {
        setAllInvoices(prev => {
          const existingIds = new Set(prev.map((inv: unknown) => (inv as { id: string }).id));
          const newInvoices = data.data.filter((inv: unknown) => !existingIds.has((inv as { id: string }).id));
          return [...prev, ...newInvoices];
        });
      }
    }
  }, [data, skip]);

  const total = data?.pagination?.total || 0;
  const currentBatchSize = data?.data?.length || 0;
  const hasMore = allInvoices.length < total && currentBatchSize === take;

  const loadMore = async (e: CustomEvent) => {
    if (hasMore && !isFetching) {
      setSkip(prev => prev + take);
    }
    setTimeout(() => {
      (e.target as HTMLIonInfiniteScrollElement).complete();
    }, 100);
  };

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

  // Filter invoices based on search and status locally
  const filteredInvoices = allInvoices.filter((invoice) => {
    const inv = invoice as { status: string; invoice_number: string; customer?: { name?: string; phone?: string } };
    
    // Status filter
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(searchLower) ||
      inv.customer?.name?.toLowerCase().includes(searchLower) ||
      inv.customer?.phone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <IonPage>
      <Navbar title="Invoices" />
      <IonContent>
        <div className="p-4 max-w-4xl mx-auto">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Search by invoice number, customer name or phone" 
          />

          {/* Status Filter */}
          <div className="mt-3 mb-3">
            <IonSegment
              key={statusFilter}
              value={statusFilter}
              onIonChange={(e) => setStatusFilter((e.detail.value as InvoiceStatus | 'ALL') || 'ALL')}
              scrollable
            >
              <IonSegmentButton value="ALL">
                <IonLabel>All</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="DRAFT">
                <IonLabel>Draft</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="UNPAID">
                <IonLabel>Unpaid</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PARTIAL">
                <IonLabel>Partial</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PAID">
                <IonLabel>Paid</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="CANCELLED">
                <IonLabel>Cancelled</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {isLoading && allInvoices.length === 0 ? (
            <Loading isOpen={isLoading} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              message={search ? "No invoices found matching your search" : "No invoices found"}
            />
          ) : (
            <>
              <IonList className="ion-no-padding">
                {filteredInvoices.reduce((acc: any[], invoice, index) => {
                  const inv = invoice as {
                    id: string;
                    invoice_number: string;
                    created_at: string;
                    status: string;
                    customer?: { name?: string; phone?: string };
                    total_amount?: number;
                    discount_amount?: number;
                    paid_amount?: number;
                    balance_amount?: number;
                    finalized_at?: string;
                    cancelled_at?: string;
                  };
                  
                  const currentDate = new Date(inv.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  
                  const prevInv = index > 0 ? filteredInvoices[index - 1] as typeof inv : null;
                  const prevDate = prevInv ? new Date(prevInv.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : null;
                  
                  if (currentDate !== prevDate) {
                    acc.push(
                      <div key={`divider-${currentDate}`} className="sticky top-0 z-10 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                        {currentDate}
                      </div>
                    );
                  }
                  
                  acc.push(
                    <IonCard 
                      key={inv.id} 
                      className="m-2 shadow-sm"
                      button
                      onClick={() => history.push(`/invoices/${inv.id}`)}
                    >
                      <IonCardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <IonIcon icon={documentText} className="text-primary flex-shrink-0" />
                              <h3 className="text-sm font-semibold truncate">{inv.invoice_number}</h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{new Date(inv.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <IonBadge color={getStatusColor(inv.status)} mode="ios" className="text-xs">
                            {inv.status}
                          </IonBadge>
                        </div>
                        
                        {inv.customer && (
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <p className="text-sm font-medium truncate">{inv.customer.name}</p>
                            <p className="text-xs text-gray-500">{inv.customer.phone}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Total:</span>
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(inv.total_amount || 0)}
                          </span>
                        </div>
                        
                        {((inv.paid_amount && inv.paid_amount > 0) || inv.status === 'PAID' || inv.status === 'PARTIAL') && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">Paid:</span>
                            <span className="text-xs text-success">{formatCurrency(inv.paid_amount || 0)}</span>
                          </div>
                        )}
                        
                        {inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && (inv.balance_amount && inv.balance_amount > 0 || (inv.total_amount || 0) - (inv.paid_amount || 0) > 0) && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs font-semibold text-danger">Balance:</span>
                            <span className="text-xs font-semibold text-danger">
                              {formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))}
                            </span>
                          </div>
                        )}
                      </IonCardContent>
                    </IonCard>
                  );
                  
                  return acc;
                }, [])}
              </IonList>

            <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
              <IonInfiniteScrollContent loadingText="Loading more invoices..." />
            </IonInfiniteScroll>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
