import React, { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage } from '@core/services/notificationService';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonBadge,
  IonIcon,
  IonModal,
  IonButtons,
  IonButton,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { create, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetInventoryQuery, useUpdateInventoryMutation } from '@core/api/inventoryApi';
import { SearchBar, Loading, EmptyState, Input, Button } from '@components';
import { formatNumber } from '@utils/helpers';
import type { Inventory } from '@core/types';
import { filterInventory } from '@utils/localSearch';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import { useRequestSettledInfiniteScroll } from '@hooks/useRequestSettledInfiniteScroll';
import '../products/stock-workspace.css';

const PAGE_SIZE = 50;

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [querySearch, setQuerySearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [allInventory, setAllInventory] = useState<Inventory[]>([]);
  const [totalInventory, setTotalInventory] = useState(0);
  const {
    currentData: pageData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetInventoryQuery({
    skip,
    take: PAGE_SIZE,
    ...(querySearch ? { search: querySearch } : {}),
  });
  const [updateInventory, { isLoading: updating }] = useUpdateInventoryMutation();
  const beginLoadMore = useRequestSettledInfiniteScroll({
    currentData: pageData,
    isError,
    isFetching,
    requestKey: `${querySearch}:${skip}`,
  });

  useEffect(() => {
    if (debouncedSearch === querySearch) return;
    setSkip(0);
    setAllInventory([]);
    setTotalInventory(0);
    setQuerySearch(debouncedSearch);
  }, [debouncedSearch, querySearch]);

  useEffect(() => {
    if (!pageData?.data) return;
    setTotalInventory(pageData.meta.total);
    if (skip === 0) {
      setAllInventory(pageData.data);
      return;
    }

    setAllInventory((current) => {
      const existingVariantIds = new Set(current.map((item) => item.variant_id));
      return [
        ...current,
        ...pageData.data.filter((item) => !existingVariantIds.has(item.variant_id)),
      ];
    });
  }, [pageData, skip]);

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const visibleInventory = useMemo(
    () => filterInventory(allInventory, search),
    [allInventory, search]
  );
  const hasMore = allInventory.length < totalInventory;

  const loadMore = (event: CustomEvent) => {
    if (!beginLoadMore(event, hasMore && !isFetching)) return;
    setSkip((current) => current + PAGE_SIZE);
  };

  // Group inventory by category
  const groupedInventory = useMemo(() => {
    const groups: Record<string, Inventory[]> = {};

    visibleInventory.forEach((item) => {
      const categoryName = item.variant?.product?.category?.name || t('products.uncategorized');
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });

    return groups;
  }, [visibleInventory, t]);

  const categoryNames = useMemo(() => {
    return Object.keys(groupedInventory).sort();
  }, [groupedInventory]);

  const handleEditClick = (item: Inventory) => {
    setSelectedItem(item);
    setQuantity(item.quantity.toString());
    setLowStockThreshold(item.low_stock_threshold.toString());
    setShowModal(true);
  };

  const handleUpdateInventory = async () => {
    try {
      if (!selectedItem) return;

      if (!quantity || parseFloat(quantity) < 0) {
        setErrorMessage(t('inventory.validQuantityRequired'));
        setShowError(true);
        return;
      }

      if (lowStockThreshold && parseFloat(lowStockThreshold) < 0) {
        setErrorMessage(t('inventory.validThresholdRequired'));
        setShowError(true);
        return;
      }

      await updateInventory({
        variant_id: selectedItem.variant_id,
        quantity: parseFloat(quantity),
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      }).unwrap();

      // Quantity is part of the server sort order. Restart from page zero so an
      // edited row cannot leave the accumulated offset window out of order.
      setAllInventory([]);
      setTotalInventory(0);
      setSkip(0);

      setShowSuccess(true);
      setShowModal(false);
      setSelectedItem(null);
    } catch (error: unknown) {
      console.error('❌ Error updating inventory:', error);
      setErrorMessage(apiErrorMessage(error, t('inventory.failedToUpdate')));
      setShowError(true);
    }
  };

  return (
    <IonPage>
      <Navbar title={t('inventory.title')} />
      <IonContent>
        <div className="workspace-page stock-page">
          <div className="workspace-header">
            <h1>{t('inventory.title')}</h1>
          </div>
          <div className="stock-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('common.search')}
              debounce={0}
            />
          </div>

          {(isLoading || isFetching) && allInventory.length === 0 ? (
            <Loading isOpen={true} />
          ) : isError && allInventory.length === 0 ? (
            <div className="workspace-state" role="alert">
              <p>{t('inventory.loadError')}</p>
              <Button onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : visibleInventory.length === 0 ? (
            <EmptyState message={t('inventory.noInventoryItems')} />
          ) : (
            <>
              <div>
                {categoryNames.map((categoryName) => (
                  <section key={categoryName} className="stock-category">
                    <h2 className="stock-category-heading">
                      {categoryName}
                      <IonBadge color="primary">{groupedInventory[categoryName].length}</IonBadge>
                    </h2>
                    <div className="stock-card-grid">
                      {groupedInventory[categoryName].map((item) => (
                        <article key={item.variant_id} className="workspace-record stock-card">
                          <div className="stock-card-top">
                            <div>
                              <h2>{item.variant?.product?.name}</h2>
                              <p>
                                {t('products.sku')}: {item.variant?.sku}
                              </p>
                            </div>
                            <div>
                              <p>{t('inventory.onHand')}</p>
                              <IonBadge
                                color={item.is_low_stock ? 'danger' : 'success'}
                                className="text-lg"
                              >
                                {formatNumber(item.quantity)}
                              </IonBadge>
                            </div>
                          </div>
                          <div className="stock-card-bottom">
                            <div>
                              <p>
                                {t('inventory.lowStockThreshold')}: {item.low_stock_threshold}
                              </p>
                              {item.is_low_stock && (
                                <p className="stock-warning">{t('inventory.lowStockWarning')}</p>
                              )}
                            </div>
                            <IonButton
                              onClick={() => handleEditClick(item)}
                              fill="outline"
                              aria-label={t('common.edit')}
                            >
                              <IonIcon slot="start" icon={create} />
                              {t('common.edit')}
                            </IonButton>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {isError && allInventory.length > 0 && (
                <div className="workspace-state" role="alert">
                  <p>{t('common.loadMoreError')}</p>
                  <Button onClick={() => refetch()} variant="outline">
                    {t('common.retry')}
                  </Button>
                </div>
              )}
              <IonInfiniteScroll
                threshold="50%"
                onIonInfinite={loadMore}
                disabled={!hasMore || isError}
              >
                <IonInfiniteScrollContent loadingText={t('inventory.loadingMore')} />
              </IonInfiniteScroll>
            </>
          )}
        </div>

        {showModal && selectedItem && (
          <IonModal isOpen={true} onDidDismiss={() => setShowModal(false)}>
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('inventory.updateInventoryTitle')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowModal(false)}>
                      <IonIcon icon={close} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-lg">{selectedItem.variant?.product?.name}</h2>
                    <p className="text-gray-600">
                      {t('products.sku')}: {selectedItem.variant?.sku}
                    </p>
                  </div>

                  <Input
                    label={t('inventory.quantityRequired')}
                    type="number"
                    value={quantity}
                    onChange={setQuantity}
                    min={0}
                    inputMode="decimal"
                    placeholder={t('inventory.enterQuantityPlaceholder')}
                  />

                  <Input
                    label={t('inventory.lowStockThresholdLabel')}
                    type="number"
                    value={lowStockThreshold}
                    onChange={setLowStockThreshold}
                    min={0}
                    inputMode="numeric"
                    placeholder={t('inventory.enterLowStockPlaceholder')}
                  />

                  <div className="mt-6">
                    <Button
                      onClick={handleUpdateInventory}
                      disabled={updating || !quantity}
                      loading={updating}
                    >
                      {t('inventory.updateInventoryButton')}
                    </Button>
                  </div>
                </div>
              </IonContent>
            </IonPage>
          </IonModal>
        )}

        <IonToast
          isOpen={showSuccess}
          message={t('inventory.inventoryUpdatedSuccess')}
          duration={2000}
          color="success"
          onDidDismiss={() => setShowSuccess(false)}
        />

        <IonToast
          isOpen={showError}
          message={errorMessage}
          duration={3000}
          color="danger"
          onDidDismiss={() => setShowError(false)}
        />
      </IonContent>
    </IonPage>
  );
};
