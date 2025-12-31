import React from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBackButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useParams } from 'react-router';
import { useGetCustomerByIdQuery, useGetCustomerLedgerQuery } from '@core/api/customerApi';
import { Loading, EmptyState } from '@components';
import { formatCurrency, formatDateTime } from '@utils/helpers';
import './CustomerLedgerPage.css';

export const CustomerLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  console.log('CustomerLedgerPage - Customer ID:', id);
  
  const { data: customerData, isLoading: loadingCustomer, error: customerError } = useGetCustomerByIdQuery(id);
  const { data: ledgerData, isLoading: loadingLedger, error: ledgerError } = useGetCustomerLedgerQuery({ id });

  console.log('Customer Data:', customerData);
  console.log('Ledger Data:', ledgerData);
  console.log('Errors:', { customerError, ledgerError });

  const customer = customerData?.data;
  const ledger = ledgerData?.data?.ledger || [];
  const summary = ledgerData?.data?.summary;

  if (loadingCustomer || loadingLedger) {
    return <Loading isOpen={true} />;
  }

  if (!customer) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/customers" />
            </IonButtons>
            <IonTitle>Customer Ledger</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <EmptyState message="Customer not found" />
        </IonContent>
      </IonPage>
    );
  }

  // Separate debit and credit entries
  const debitEntries = ledger.filter(entry => entry.amount > 0);
  const creditEntries = ledger.filter(entry => entry.amount < 0);

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'medium';
      case 'INVOICE':
        return 'danger';
      case 'PAYMENT':
        return 'success';
      case 'CREDIT_NOTE':
        return 'warning';
      case 'ADJUSTMENT':
        return 'tertiary';
      default:
        return 'medium';
    }
  };

  const getEntryTypeLabel = (type: string) => {
    return type.replace('_', ' ');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customers" />
          </IonButtons>
          <IonTitle>Customer Ledger</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Customer Info Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{customer.name}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ marginBottom: '12px' }}>
              <strong>Phone:</strong> {customer.phone}
            </div>
            {customer.email && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Email:</strong> {customer.email}
              </div>
            )}
            {summary && (
              <div className="ledger-summary">
                <IonGrid>
                  <IonRow>
                    <IonCol size="4">
                      <div className="summary-item">
                        <div className="summary-label">Total Debit</div>
                        <div className="summary-value debit">{formatCurrency(summary.totalDebit)}</div>
                      </div>
                    </IonCol>
                    <IonCol size="4">
                      <div className="summary-item">
                        <div className="summary-label">Total Credit</div>
                        <div className="summary-value credit">{formatCurrency(summary.totalCredit)}</div>
                      </div>
                    </IonCol>
                    <IonCol size="4">
                      <div className="summary-item">
                        <div className="summary-label">Balance</div>
                        <div className={`summary-value balance ${summary.balance >= 0 ? 'debit' : 'credit'}`}>
                          {formatCurrency(Math.abs(summary.balance))}
                        </div>
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {ledger.length === 0 ? (
          <EmptyState message="No transactions found" />
        ) : (
          <IonGrid>
            <IonRow>
              {/* Debit Column (Credit Given) */}
              <IonCol size="12" sizeMd="6">
                <IonCard className="ledger-card debit-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      Debit (Credit Given)
                      <IonBadge color="danger" style={{ marginLeft: '8px' }}>
                        {formatCurrency(summary?.totalDebit || 0)}
                      </IonBadge>
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {debitEntries.length === 0 ? (
                      <EmptyState message="No debit entries" />
                    ) : (
                      <IonList>
                        {debitEntries.map((entry) => (
                          <IonItem key={entry.id} className="ledger-item">
                            <IonLabel>
                              <div className="entry-header">
                                <IonBadge color={getEntryTypeColor(entry.entry_type)} mode="ios">
                                  {getEntryTypeLabel(entry.entry_type)}
                                </IonBadge>
                                <span className="entry-date">{formatDateTime(entry.created_at)}</span>
                              </div>
                              <p className="entry-description">{entry.description}</p>
                              {entry.reference_id && (
                                <p className="entry-reference">Ref: #{entry.reference_id}</p>
                              )}
                            </IonLabel>
                            <div slot="end" className="entry-amount debit-amount">
                              {formatCurrency(entry.amount)}
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>

              {/* Credit Column (Credit Received) */}
              <IonCol size="12" sizeMd="6">
                <IonCard className="ledger-card credit-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      Credit (Payments Received)
                      <IonBadge color="success" style={{ marginLeft: '8px' }}>
                        {formatCurrency(summary?.totalCredit || 0)}
                      </IonBadge>
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {creditEntries.length === 0 ? (
                      <EmptyState message="No credit entries" />
                    ) : (
                      <IonList>
                        {creditEntries.map((entry) => (
                          <IonItem key={entry.id} className="ledger-item">
                            <IonLabel>
                              <div className="entry-header">
                                <IonBadge color={getEntryTypeColor(entry.entry_type)} mode="ios">
                                  {getEntryTypeLabel(entry.entry_type)}
                                </IonBadge>
                                <span className="entry-date">{formatDateTime(entry.created_at)}</span>
                              </div>
                              <p className="entry-description">{entry.description}</p>
                              {entry.reference_id && (
                                <p className="entry-reference">Ref: #{entry.reference_id}</p>
                              )}
                            </IonLabel>
                            <div slot="end" className="entry-amount credit-amount">
                              {formatCurrency(Math.abs(entry.amount))}
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}
      </IonContent>
    </IonPage>
  );
};
