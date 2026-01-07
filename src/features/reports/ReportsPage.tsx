import React, { useState, useEffect } from 'react';
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
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { statsChartOutline } from 'ionicons/icons';
import {
  useGetSalesReportQuery,
  useGetOutstandingCustomersQuery,
  useGetInventorySummaryQuery,
  useGetDailyCashbookQuery,
  useGetProfitLossQuery,
  useGetTopSellingQuery,
  useGetSupplierOutstandingQuery,
  useGetPurchaseRegisterQuery,
  useGetTopPayablesQuery,
  useGetSupplierLedgerSummaryQuery,
  useGetPurchaseTrendQuery,
} from '@core/api/reportsApi';
import { Loading, EmptyState } from '@components';
import { formatCurrency, formatNumber } from '@utils/helpers';

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('sales');
  
  // Pagination state
  const [supplierOutstandingPage, setSupplierOutstandingPage] = useState(1);
  const [purchaseRegisterPage, setPurchaseRegisterPage] = useState(1);
  const [supplierLedgerPage, setSupplierLedgerPage] = useState(1);
  
  // Accumulated data
  const [allSupplierOutstanding, setAllSupplierOutstanding] = useState<any[]>([]);
  const [allPurchaseRegister, setAllPurchaseRegister] = useState<any[]>([]);
  const [allSupplierLedger, setAllSupplierLedger] = useState<any[]>([]);
  
  // Reset pagination when report changes
  useEffect(() => {
    setSupplierOutstandingPage(1);
    setPurchaseRegisterPage(1);
    setSupplierLedgerPage(1);
    setAllSupplierOutstanding([]);
    setAllPurchaseRegister([]);
    setAllSupplierLedger([]);
  }, [selectedReport]);

  // All Reports Data
  const { data: salesData, isLoading: salesLoading } = useGetSalesReportQuery({ groupBy: 'day' });
  const { data: outstandingData, isLoading: outstandingLoading } = useGetOutstandingCustomersQuery();
  const { data: inventoryData, isLoading: inventoryLoading } = useGetInventorySummaryQuery();
  const { data: cashbookData, isLoading: cashbookLoading } = useGetDailyCashbookQuery();
  const { data: profitLossData, isLoading: profitLossLoading } = useGetProfitLossQuery();
  const { data: topSellingData, isLoading: topSellingLoading } = useGetTopSellingQuery({ limit: 20 });
  
  const { data: supplierOutstandingData, isLoading: supplierOutstandingLoading } = useGetSupplierOutstandingQuery(
    { page: supplierOutstandingPage, limit: 50 },
    { skip: selectedReport !== 'supplierOutstanding' }
  );
  const { data: purchaseRegisterData, isLoading: purchaseRegisterLoading } = useGetPurchaseRegisterQuery(
    { page: purchaseRegisterPage, limit: 50 },
    { skip: selectedReport !== 'purchaseRegister' }
  );
  const { data: topPayablesData, isLoading: topPayablesLoading } = useGetTopPayablesQuery({ limit: 10 });
  const { data: supplierLedgerData, isLoading: supplierLedgerLoading } = useGetSupplierLedgerSummaryQuery(
    { page: supplierLedgerPage, limit: 50 },
    { skip: selectedReport !== 'supplierLedger' }
  );
  const { data: purchaseTrendData, isLoading: purchaseTrendLoading } = useGetPurchaseTrendQuery({ months: 12 });
  
  // Accumulate data when new page loads
  useEffect(() => {
    if (supplierOutstandingData?.data) {
      setAllSupplierOutstanding(prev => {
        if (supplierOutstandingPage === 1) return supplierOutstandingData.data;
        return [...prev, ...supplierOutstandingData.data];
      });
    }
  }, [supplierOutstandingData, supplierOutstandingPage]);
  
  useEffect(() => {
    if (purchaseRegisterData?.data) {
      setAllPurchaseRegister(prev => {
        if (purchaseRegisterPage === 1) return purchaseRegisterData.data;
        return [...prev, ...purchaseRegisterData.data];
      });
    }
  }, [purchaseRegisterData, purchaseRegisterPage]);
  
  useEffect(() => {
    if (supplierLedgerData?.data) {
      setAllSupplierLedger(prev => {
        if (supplierLedgerPage === 1) return supplierLedgerData.data;
        return [...prev, ...supplierLedgerData.data];
      });
    }
  }, [supplierLedgerData, supplierLedgerPage]);
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

  const renderSupplierOutstanding = () => {
    if (supplierOutstandingLoading && supplierOutstandingPage === 1) return <Loading isOpen={true} />;
    
    const suppliers = allSupplierOutstanding;
    const pagination = supplierOutstandingData?.pagination;
    const hasMore = pagination ? pagination.page < pagination.totalPages : false;
    
    if (suppliers.length === 0 && !supplierOutstandingLoading) return <EmptyState message="No outstanding suppliers found" />;

    const totalOutstanding = suppliers.reduce((sum: number, s: any) => sum + s.outstanding_balance, 0);

    const loadMore = async (e: CustomEvent) => {
      if (hasMore) {
        setSupplierOutstandingPage(prev => prev + 1);
      }
      (e.target as HTMLIonInfiniteScrollElement).complete();
    };

    return (
      <div>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="flex justify-between mb-2">
              <span>Total Suppliers with Outstanding:</span>
              <strong>{pagination?.total || suppliers.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total Outstanding Amount:</span>
              <strong>{formatCurrency(totalOutstanding)}</strong>
            </div>
          </IonCardContent>
        </IonCard>

        <IonList>
          {suppliers.map((supplier: any) => (
            <IonItem key={supplier.id}>
              <IonLabel>
                <h2 className="font-semibold">{supplier.name}</h2>
                <p className="text-sm text-gray-600">{supplier.phone}</p>
                <p className="text-xs text-gray-500">
                  {supplier.total_invoices} invoice(s) · Last: {new Date(supplier.last_transaction_date).toLocaleDateString()}
                </p>
              </IonLabel>
              <div slot="end" className="text-right">
                <strong className="text-lg" style={{ color: 'var(--ion-color-danger)' }}>
                  {formatCurrency(supplier.outstanding_balance)}
                </strong>
              </div>
            </IonItem>
          ))}
        </IonList>
        
        <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
          <IonInfiniteScrollContent loadingText="Loading more suppliers..." />
        </IonInfiniteScroll>
      </div>
    );
  };

  const renderPurchaseRegister = () => {
    if (purchaseRegisterLoading && purchaseRegisterPage === 1) return <Loading isOpen={true} />;
    
    const purchases = allPurchaseRegister;
    const summary = (purchaseRegisterData as any)?.summary;
    const pagination = purchaseRegisterData?.pagination;
    const hasMore = pagination ? pagination.page < pagination.totalPages : false;
    
    if (purchases.length === 0 && !purchaseRegisterLoading) return <EmptyState message="No purchases found" />;

    const loadMore = async (e: CustomEvent) => {
      if (hasMore) {
        setPurchaseRegisterPage(prev => prev + 1);
      }
      (e.target as HTMLIonInfiniteScrollElement).complete();
    };

    return (
      <div>
        {summary && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Purchase Summary</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="flex justify-between mb-2">
                <span>Total Purchases:</span>
                <strong>{summary.total_count || 0}</strong>
              </div>
              <div className="flex justify-between mb-2">
                <span>Total Amount:</span>
                <strong>{formatCurrency(summary.total_amount || 0)}</strong>
              </div>
              <div className="flex justify-between mb-2">
                <span>Paid Amount:</span>
                <strong style={{ color: 'var(--ion-color-success)' }}>{formatCurrency(summary.total_paid || 0)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pending Amount:</span>
                <strong style={{ color: 'var(--ion-color-danger)' }}>{formatCurrency(summary.total_pending || 0)}</strong>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        <IonList>
          {purchases.map((purchase: any) => (
            <IonItem key={purchase.id} button routerLink={`/purchase/${purchase.id}`}>
              <IonLabel>
                <h2 className="font-semibold">{purchase.invoice_number}</h2>
                <p className="text-sm text-gray-600">{purchase.supplier_name} · {purchase.supplier_phone}</p>
                <p className="text-xs text-gray-500">
                  {new Date(purchase.invoice_date).toLocaleDateString()} · {purchase.item_count} item(s)
                </p>
              </IonLabel>
              <div slot="end" className="text-right">
                <div className="font-bold text-lg">
                  {formatCurrency(purchase.total_amount)}
                </div>
                {purchase.pending_amount > 0 && (
                  <div className="text-sm" style={{ color: 'var(--ion-color-danger)' }}>
                    Pending: {formatCurrency(purchase.pending_amount)}
                  </div>
                )}
                <div className="text-xs mt-1" style={{ 
                  color: purchase.status === 'PAID' ? 'var(--ion-color-success)' : 
                         purchase.status === 'PARTIAL' ? 'var(--ion-color-warning)' : 
                         'var(--ion-color-danger)'
                }}>
                  {purchase.status}
                </div>
              </div>
            </IonItem>
          ))}
        </IonList>
        
        <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
          <IonInfiniteScrollContent loadingText="Loading more purchases..." />
        </IonInfiniteScroll>
      </div>
    );
  };

  const renderTopPayables = () => {
    if (topPayablesLoading) return <Loading isOpen={true} />;
    
    const suppliers = topPayablesData?.data || [];
    
    if (suppliers.length === 0) return <EmptyState message="No payables found" />;

    return (
      <IonList>
        {suppliers.map((supplier: any, index: number) => (
          <IonItem key={supplier.id}>
            <div slot="start" style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              background: index < 3 ? 'var(--ion-color-danger)' : 'var(--ion-color-medium)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {index + 1}
            </div>
            <IonLabel>
              <h2 className="font-semibold">{supplier.name}</h2>
              <p className="text-sm text-gray-600">{supplier.phone}</p>
              <p className="text-xs text-gray-500">
                {supplier.unpaid_invoices} unpaid invoice(s) · Last: {new Date(supplier.latest_invoice_date).toLocaleDateString()}
              </p>
            </IonLabel>
            <div slot="end" className="text-right">
              <strong className="text-lg" style={{ color: 'var(--ion-color-danger)' }}>
                {formatCurrency(supplier.outstanding_amount)}
              </strong>
            </div>
          </IonItem>
        ))}
      </IonList>
    );
  };

  const renderSupplierLedgerSummary = () => {
    if (supplierLedgerLoading && supplierLedgerPage === 1) return <Loading isOpen={true} />;
    
    const ledgers = allSupplierLedger;
    const meta = supplierLedgerData?.meta;
    const hasMore = meta ? (meta.page || 1) * (meta.limit || 50) < (meta.total || 0) : false;
    
    if (ledgers.length === 0 && !supplierLedgerLoading) return <EmptyState message="No ledger data found" />;

    const loadMore = async (e: CustomEvent) => {
      if (hasMore) {
        setSupplierLedgerPage(prev => prev + 1);
      }
      (e.target as HTMLIonInfiniteScrollElement).complete();
    };

    return (
      <div>
        <IonList>
          {ledgers.map((ledger: any) => (
            <IonItem key={ledger.supplier_id}>
              <IonLabel>
                <h2 className="font-semibold">{ledger.supplier_name}</h2>
                <p className="text-sm text-gray-600">{ledger.supplier_phone}</p>
                <p className="text-xs text-gray-500">
                  {ledger.transaction_count} transaction(s)
                </p>
              </IonLabel>
              <div slot="end" className="text-right">
                <div className="text-sm text-gray-600">
                  Purchases: {formatCurrency(ledger.total_credit || 0)}
                </div>
                <div className="text-sm" style={{ color: 'var(--ion-color-success)' }}>
                  Payments: {formatCurrency(ledger.total_debit || 0)}
                </div>
                <strong className="text-lg" style={{ 
                  color: ledger.balance > 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' 
                }}>
                  Balance: {formatCurrency(Math.abs(ledger.balance))}
                </strong>
              </div>
            </IonItem>
          ))}
        </IonList>
        
        <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
          <IonInfiniteScrollContent loadingText="Loading more ledgers..." />
        </IonInfiniteScroll>
      </div>
    );
  };

  const renderPurchaseTrend = () => {
    if (purchaseTrendLoading) return <Loading isOpen={true} />;
    
    const trends = purchaseTrendData?.data || [];
    
    if (trends.length === 0) return <EmptyState message="No trend data available" />;

    const totalAmount = trends.reduce((sum: number, t: any) => sum + t.total_amount, 0);
    const totalCount = trends.reduce((sum: number, t: any) => sum + t.purchase_count, 0);

    return (
      <div>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Purchase Trend Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="flex justify-between mb-2">
              <span>Total Purchases ({trends.length} months):</span>
              <strong>{totalCount}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          </IonCardContent>
        </IonCard>

        <IonList>
          {trends.map((trend: any, index: number) => (
            <IonItem key={index}>
              <IonLabel>
                <h2 className="font-semibold">{trend.month} {trend.year}</h2>
                <p className="text-sm text-gray-600">
                  {trend.purchase_count} purchase(s) · Avg: {formatCurrency(trend.avg_purchase_value)}
                </p>
              </IonLabel>
              <div slot="end" className="text-right">
                <strong className="text-lg">{formatCurrency(trend.total_amount)}</strong>
              </div>
            </IonItem>
          ))}
        </IonList>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (profitLossLoading) return <Loading isOpen={true} />;
    
    const data = profitLossData?.data;
    
    if (!data) return <EmptyState message="No profit/loss data available" />;

    const totalRevenue = data.revenue?.net_revenue || 0;
    const totalCost = 0; // Backend doesn't provide cost data currently
    const grossProfit = totalRevenue - totalCost;
    const cashInHand = data.summary?.cash_in_hand || 0;
    const receivables = data.summary?.receivables || 0;

    return (
      <div>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Revenue Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Gross Revenue</span>
                <strong style={{ color: 'var(--ion-color-success)' }}>
                  {formatCurrency(data.revenue?.gross_revenue || 0)}
                </strong>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">GST Collected</span>
                <strong>
                  {formatCurrency(data.revenue?.gst_collected || 0)}
                </strong>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Net Revenue</span>
                <strong style={{ color: 'var(--ion-color-success)' }}>
                  {formatCurrency(data.revenue?.net_revenue || 0)}
                </strong>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Collections</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Total Payments</span>
                <strong style={{ color: 'var(--ion-color-success)' }}>
                  {formatCurrency(data.collections?.total_payments || 0)}
                </strong>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Outstanding Amount</span>
                <strong style={{ color: 'var(--ion-color-danger)' }}>
                  {formatCurrency(data.collections?.outstanding_amount || 0)}
                </strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Collection Efficiency</span>
                <strong>
                  {data.collections?.collection_efficiency || 0}%
                </strong>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Cash in Hand</span>
                <strong style={{ color: 'var(--ion-color-success)' }}>
                  {formatCurrency(cashInHand)}
                </strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Receivables</span>
                <strong style={{ color: 'var(--ion-color-warning)' }}>
                  {formatCurrency(receivables)}
                </strong>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </div>
    );
  };

  return (
    <IonPage>
      <Navbar title="Reports" />
      <IonContent>
        <div className="p-4">
          {/* Report Selector Dropdown */}
          <IonCard className="mb-4">
            <IonCardContent>
              <IonItem lines="none">
                <IonIcon icon={statsChartOutline} slot="start" className="text-xl" />
                <IonSelect
                  value={selectedReport}
                  placeholder="Select Report"
                  onIonChange={(e) => setSelectedReport(e.detail.value)}
                  interface="action-sheet"
                  interfaceOptions={{
                    header: 'Select Report Type',
                    subHeader: 'Choose a report to view'
                  }}
                >
                  <IonSelectOption value="sales">Sales Report</IonSelectOption>
                  <IonSelectOption value="outstanding">Outstanding Customers</IonSelectOption>
                  <IonSelectOption value="inventory">Inventory Summary</IonSelectOption>
                  <IonSelectOption value="cashbook">Daily Cashbook</IonSelectOption>
                  <IonSelectOption value="profitLoss">Profit & Loss</IonSelectOption>
                  <IonSelectOption value="topSelling">Top Selling Products</IonSelectOption>
                  <IonSelectOption value="supplierOutstanding">Supplier Outstanding</IonSelectOption>
                  <IonSelectOption value="purchaseRegister">Purchase Register</IonSelectOption>
                  <IonSelectOption value="topPayables">Top Payables</IonSelectOption>
                  <IonSelectOption value="supplierLedger">Supplier Ledger Summary</IonSelectOption>
                  <IonSelectOption value="purchaseTrend">Purchase Trend</IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonCardContent>
          </IonCard>

          {/* Report Content */}
          <div className="mt-4">
            {selectedReport === 'sales' && renderSalesReport()}
            {selectedReport === 'outstanding' && renderOutstandingCustomers()}
            {selectedReport === 'inventory' && renderInventorySummary()}
            {selectedReport === 'cashbook' && renderCashbook()}
            {selectedReport === 'profitLoss' && renderProfitLoss()}
            {selectedReport === 'topSelling' && renderTopSelling()}
            {selectedReport === 'supplierOutstanding' && renderSupplierOutstanding()}
            {selectedReport === 'purchaseRegister' && renderPurchaseRegister()}
            {selectedReport === 'topPayables' && renderTopPayables()}
            {selectedReport === 'supplierLedger' && renderSupplierLedgerSummary()}
            {selectedReport === 'purchaseTrend' && renderPurchaseTrend()}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};
