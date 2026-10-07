import React from 'react';
import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useGetDashboardStatsQuery } from '@core/api/dashboardApi';
import { Card, Loading } from '@components';
import { Navbar } from '@components/Navbar';
import { formatCurrency, formatNumber } from '@utils/helpers';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetDashboardStatsQuery();

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refetch();
    event.detail.complete();
  };

  const stats = data?.data;

  return (
    <IonPage>
      <Navbar title={t('dashboard.title')} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <Loading isOpen={isLoading} />
        ) : (
          <div className="p-4">
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-primary-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-primary)' }}>
                          {formatCurrency(stats?.today_sales || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.todaySales')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-warning-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-warning)' }}>
                          {formatNumber(stats?.pending_invoices || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.pendingInvoices')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-danger-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-danger)' }}>
                          {formatNumber(stats?.low_stock_items || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.lowStock')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-success-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-success)' }}>
                          {formatNumber(stats?.total_customers || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.totalCustomers')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-warning-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-danger)' }}>
                          {formatCurrency(stats?.supplier_payables || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.supplierPayables')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div style={{ backgroundColor: 'var(--ion-color-success-tint)' }}>
                    <Card>
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: 'var(--ion-color-success)' }}>
                          {formatCurrency(stats?.customer_receivables || 0)}
                        </div>
                        <div className="text-sm mt-2" style={{ color: 'var(--ion-text-color)' }}>
                          {t('dashboard.customerReceivables')}
                        </div>
                      </div>
                    </Card>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};
