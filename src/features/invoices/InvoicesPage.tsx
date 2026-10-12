import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonBadge,
  IonCard,
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
import { SearchBar, Loading, EmptyState, Button } from '@components';
import { useGetInvoicesQuery } from '@core/api/invoiceApi';
import { formatCurrency } from '@utils/helpers';
import { documentText } from 'ionicons/icons';
import type { InvoiceStatus } from '@core/types';
import './InvoicesPage.css';
import { useTranslation } from 'react-i18next';

export const InvoicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const { t, i18n } = useTranslation();
  
  const [allInvoices, setAllInvoices] = useState<unknown[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const take = 50;
  const history = useHistory();
  
  // Load all invoices without status filter - filter locally instead
  const { data, isLoading, isFetching, isError, refetch } = useGetInvoicesQuery({
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

  const statusLabels: Record<string, string> = {
    DRAFT: t('invoices.draft'),
    FINALIZED: t('invoices.finalized'),
    UNPAID: t('invoices.unpaid'),
    PARTIAL: t('invoices.partial'),
    PAID: t('invoices.paid'),
    CANCELLED: t('invoices.cancelled'),
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
      <Navbar title={t('invoices.title')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('invoices.title')}</h1>
              <p>{t('invoices.pageHint')}</p>
            </div>
          </div>
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder={t('invoices.searchPlaceholder')} 
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
                <IonLabel>{t('invoices.all')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="DRAFT">
                <IonLabel>{t('invoices.draft')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="UNPAID">
                <IonLabel>{t('invoices.unpaid')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PARTIAL">
                <IonLabel>{t('invoices.partial')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PAID">
                <IonLabel>{t('invoices.paid')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="CANCELLED">
                <IonLabel>{t('invoices.cancelled')}</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {isLoading && allInvoices.length === 0 ? (
            <Loading isOpen={isLoading} />
          ) : isError && allInvoices.length === 0 ? (
            <div className="workspace-state">
              <p>{t('invoices.loadError')}</p>
              <Button onClick={() => refetch()} variant="outline">{t('common.retry')}</Button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              message={search || statusFilter !== 'ALL' ? t('invoices.noInvoicesSearch') : t('invoices.noInvoicesFound')}
            />
          ) : (
            <>
              <IonList className="ion-no-padding workspace-grid invoice-grid">
                <>
                {filteredInvoices.reduce((acc: React.ReactNode[], invoice, index) => {
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
                  
                  const currentDate = new Date(inv.created_at).toLocaleDateString(i18n?.language || 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  
                  const prevInv = index > 0 ? filteredInvoices[index - 1] as typeof inv : null;
                  const prevDate = prevInv ? new Date(prevInv.created_at).toLocaleDateString(i18n?.language || 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : null;
                  
                  if (currentDate !== prevDate) {
                    acc.push(
                      <div key={`divider-${currentDate}`} className="invoice-date-divider">
                        {currentDate}
                      </div>
                    );
                  }
                  
                  acc.push(
                    <IonCard 
                      key={inv.id} 
                      className="workspace-record invoice-record"
                      button
                      onClick={() => history.push(`/invoices/${inv.id}`)}
                      aria-label={`${inv.invoice_number}, ${statusLabels[inv.status] || inv.status}`}
                    >
                      <IonCardContent>
                        {/* Header: Invoice # and Status */}
                        <div className="invoice-record-header">
                          <div className="invoice-record-identity">
                            <IonIcon icon={documentText} color="primary" />
                            <h3>{inv.invoice_number}</h3>
                            <span className="invoice-record-time">
                              {new Date(inv.created_at).toLocaleTimeString(i18n?.language || 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <IonBadge color={getStatusColor(inv.status)} mode="ios">
                            {statusLabels[inv.status] || inv.status}
                          </IonBadge>
                        </div>
                        
                        {/* Customer Info - Single Line */}
                        {inv.customer && (
                          <div className="invoice-record-customer">
                            {inv.customer.name} • {inv.customer.phone}
                          </div>
                        )}
                        
                        {/* Amount Summary - Compact */}
                        <div className="invoice-record-amounts">
                          <span className="invoice-record-total">
                            {formatCurrency(inv.total_amount || 0)}
                          </span>
                          
                          {inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && (inv.balance_amount && inv.balance_amount > 0 || (inv.total_amount || 0) - (inv.paid_amount || 0) > 0) ? (
                            <span className="invoice-record-due">
                              {t('invoices.due')}: {formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))}
                            </span>
                          ) : inv.status === 'PAID' ? (
                            <span className="invoice-record-paid">
                              {t('invoices.paidCheck')}
                            </span>
                          ) : null}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  );
                  
                  return acc;
                }, [] as React.ReactNode[])}
                </>
              </IonList>

            <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
              <IonInfiniteScrollContent loadingText={t('invoices.loadingMore')} />
            </IonInfiniteScroll>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
