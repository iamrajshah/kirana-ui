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
                  <Card className="bg-primary-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-700">
                        {formatCurrency(stats?.today_sales || 0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {t('dashboard.todaySales')}
                      </div>
                    </div>
                  </Card>
                </IonCol>

                <IonCol size="6">
                  <Card className="bg-warning-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-warning-700">
                        {formatNumber(stats?.pending_invoices || 0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {t('dashboard.pendingInvoices')}
                      </div>
                    </div>
                  </Card>
                </IonCol>

                <IonCol size="6">
                  <Card className="bg-danger-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-danger-700">
                        {formatNumber(stats?.low_stock_items || 0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {t('dashboard.lowStock')}
                      </div>
                    </div>
                  </Card>
                </IonCol>

                <IonCol size="6">
                  <Card className="bg-success-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-success-700">
                        {formatNumber(stats?.total_customers || 0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {t('dashboard.totalCustomers')}
                      </div>
                    </div>
                  </Card>
                </IonCol>

                <IonCol size="6">
                  <Card className="bg-warning-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-danger-700">
                        {formatCurrency(stats?.supplier_payables || 0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {t('dashboard.supplierPayables')}
                      </div>
                    </div>
                  </Card>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};
