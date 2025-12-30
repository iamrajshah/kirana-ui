import React, { useState } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import {
  useGetSalesReportQuery,
  useGetOutstandingCustomersQuery,
  useGetInventorySummaryQuery,
  useGetDailyCashbookQuery,
  useGetTopSellingQuery,
} from '@core/api/reportsApi';
import { Loading, EmptyState } from '@components';
import { formatCurrency, formatNumber } from '@utils/helpers';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string>('sales');

  const handleSegmentChange = (e: CustomEvent) => {
    const value = e.detail.value;
    console.log('Segment changed to:', value);
    if (value) {
      setSelectedReport(value);
    }
  };

  console.log('Current selectedReport:', selectedReport);

  const { data: salesData, isLoading: salesLoading } = useGetSalesReportQuery({
    groupBy: 'day',
  });
  const { data: outstandingData, isLoading: outstandingLoading } = useGetOutstandingCustomersQuery();
  const { data: inventoryData, isLoading: inventoryLoading } = useGetInventorySummaryQuery();
  const { data: cashbookData, isLoading: cashbookLoading } = useGetDailyCashbookQuery();
  const { data: topSellingData, isLoading: topSellingLoading } = useGetTopSellingQuery({ limit: 10 });

  const renderSalesReport = () => {
    if (salesLoading) return <Loading isOpen={true} />;
    
    // Backend returns { breakdown: [...] } when groupBy is provided
    const salesBreakdown = salesData?.data?.breakdown || [];
    
    if (salesBreakdown.length === 0) return <EmptyState message="No sales data" />;

    return (
      <IonList>
        {salesBreakdown.map((item: any, index: number) => (
          <IonItem key={index}>
            <IonLabel>
              <h2 className="font-semibold">{item.date}</h2>
              <p className="text-sm text-gray-600">Invoices: {item.invoice_count}</p>
              <p className="text-sm text-gray-600">GST: {formatCurrency(item.total_gst)}</p>
            </IonLabel>
            <div slot="end" className="text-right">
              <div className="font-bold text-lg">{formatCurrency(item.total_sales)}</div>
              <p className="text-xs text-gray-600">Paid: {item.paid_count} | Unpaid: {item.unpaid_count}</p>
            </div>
          </IonItem>
        ))}
      </IonList>
    );
  };

  const renderOutstandingCustomers = () => {
    if (outstandingLoading) return <Loading isOpen={true} />;
    
    // Backend returns { summary: {...}, customers: [...] }
    const customers = outstandingData?.data?.customers || [];
    const summary = outstandingData?.data?.summary;
    
    if (customers.length === 0) return <EmptyState message="No outstanding balances" />;

    return (
      <div>
        {summary && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                Total Outstanding: {formatCurrency(summary.total_outstanding)}
              </IonCardTitle>
            </IonCardHeader>
          </IonCard>
        )}
        <IonList>
          {customers.map((customer: any) => (
            <IonItem key={customer.id}>
              <IonLabel>
                <h2 className="font-semibold">{customer.name}</h2>
                <p className="text-sm text-gray-600">{customer.phone}</p>
                {customer.email && <p className="text-sm text-gray-600">{customer.email}</p>}
              </IonLabel>
              <IonBadge slot="end" color="danger" className="text-lg">
                {formatCurrency(customer.outstanding_balance)}
              </IonBadge>
            </IonItem>
          ))}
        </IonList>
      </div>
    );
  };

  const renderInventorySummary = () => {
    if (inventoryLoading) return <Loading isOpen={true} />;
    
    // Backend returns { summary: {...}, items: [...] }
    const inventory = inventoryData?.data?.items || [];
    const summary = inventoryData?.data?.summary;
    
    if (inventory.length === 0) return <EmptyState message="No inventory data" />;

    const lowStockItems = inventory.filter((item: any) => item.is_low_stock);

    return (
      <div>
        {summary && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Inventory Summary</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="font-bold text-lg">{summary.total_items}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="font-bold text-lg text-danger">{summary.low_stock_items}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="font-bold text-lg text-danger">{summary.out_of_stock_items}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="font-bold text-lg">{formatCurrency(summary.total_inventory_value)}</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        )}
        {lowStockItems.length > 0 && (
          <IonCard color="danger">
            <IonCardHeader>
              <IonCardTitle>Low Stock Alert ({lowStockItems.length} items)</IonCardTitle>
            </IonCardHeader>
          </IonCard>
        )}
        <IonList>
          {inventory.map((item: any) => (
            <IonItem key={item.variant_id}>
              <IonLabel>
                <h2 className="font-semibold">{item.product_name}</h2>
                <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                <p className="text-sm text-gray-600">Value: {formatCurrency(item.stock_value)}</p>
              </IonLabel>
              <div slot="end" className="text-right">
                <IonBadge color={item.is_low_stock ? 'danger' : 'success'} className="text-lg">
                  {formatNumber(item.quantity)}
                </IonBadge>
                <p className="text-xs text-gray-600 mt-1">Threshold: {item.low_stock_threshold}</p>
              </div>
            </IonItem>
          ))}
        </IonList>
      </div>
    );
  };

  const renderCashbook = () => {
    if (cashbookLoading) return <Loading isOpen={true} />;
    
    // Backend returns { date, summary: {...}, breakdown: [...] }
    const cashbook = cashbookData?.data;
    if (!cashbook) return <EmptyState message="No cashbook data" />;

    const breakdown = cashbook.breakdown || [];
    const summary = cashbook.summary;

    // Create a map for easy access
    const paymentMap = breakdown.reduce((acc: any, item: any) => {
      acc[item.payment_mode] = item.total_amount;
      return acc;
    }, {});

    return (
      <div className="p-4">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Date: {cashbook.date}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {summary && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Total Transactions: {summary.total_transactions}</p>
              </div>
            )}
            <IonList>
              {breakdown.map((item: any) => (
                <IonItem key={item.payment_mode}>
                  <IonLabel>{item.payment_mode}</IonLabel>
                  <div slot="end" className="text-right">
                    <div className="font-semibold">{formatCurrency(item.total_amount)}</div>
                    <div className="text-xs text-gray-600">{item.transaction_count} txns</div>
                  </div>
                </IonItem>
              ))}
              {summary && (
                <IonItem>
                  <IonLabel className="font-bold">Total Collection</IonLabel>
                  <div slot="end" className="font-bold text-lg text-primary">
                    {formatCurrency(summary.total_collection)}
                  </div>
                </IonItem>
              )}
            </IonList>
          </IonCardContent>
        </IonCard>
      </div>
    );
  };

  const renderTopSelling = () => {
    if (topSellingLoading) return <Loading isOpen={true} />;
    
    // Backend returns { products: [...] }
    const products = topSellingData?.data?.products || [];
    if (products.length === 0) return <EmptyState message="No sales data" />;

    return (
      <IonList>
        {products.map((product: any, index: number) => (
          <IonItem key={product.variant_id}>
            <IonLabel>
              <div className="flex items-center gap-2">
                <IonBadge color="primary">#{index + 1}</IonBadge>
                <div>
                  <h2 className="font-semibold">{product.product_name}</h2>
                  <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  <p className="text-sm text-gray-600">Qty Sold: {formatNumber(product.total_sold)}</p>
                </div>
              </div>
            </IonLabel>
            <div slot="end" className="text-right">
              <div className="font-bold text-lg">{formatCurrency(product.total_revenue)}</div>
            </div>
          </IonItem>
        ))}
      </IonList>
    );
  };

  return (
    <IonPage>
      <Navbar title="Reports" />
      <IonContent>
        <div className="p-4">
          <IonSegment 
            value={selectedReport}
            onIonChange={handleSegmentChange}
            mode="md"
          >
            <IonSegmentButton value="sales">
              <IonLabel>SALES</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="outstanding">
              <IonLabel>OUTSTANDING</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="inventory">
              <IonLabel>INVENTORY</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="cashbook">
              <IonLabel>CASHBOOK</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="topselling">
              <IonLabel>TOP SELLING</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <div className="mt-4">
            {selectedReport === 'sales' && renderSalesReport()}
            {selectedReport === 'outstanding' && renderOutstandingCustomers()}
            {selectedReport === 'inventory' && renderInventorySummary()}
            {selectedReport === 'cashbook' && renderCashbook()}
            {selectedReport === 'topselling' && renderTopSelling()}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};
