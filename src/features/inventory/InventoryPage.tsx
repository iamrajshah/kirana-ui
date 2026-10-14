import React, { useState, useMemo } from 'react';
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
} from '@ionic/react';
import { create, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetInventoryQuery, useUpdateInventoryMutation } from '@core/api/inventoryApi';
import { SearchBar, Loading, EmptyState, Input, Button } from '@components';
import { formatNumber } from '@utils/helpers';
import type { Inventory } from '@core/types';
import '../products/stock-workspace.css';

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useGetInventoryQuery({ search });
  const [updateInventory, { isLoading: updating }] = useUpdateInventoryMutation();

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inventory = useMemo(() => data?.data ?? [], [data?.data]);

  // Group inventory by category
  const groupedInventory = useMemo(() => {
    const groups: Record<string, Inventory[]> = {};

    inventory.forEach((item) => {
      const categoryName = item.variant?.product?.category?.name || t('products.uncategorized');
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });

    return groups;
  }, [inventory, t]);

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
            <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />
          </div>

          {isLoading && inventory.length === 0 ? (
            <Loading isOpen={isLoading} />
          ) : isError && inventory.length === 0 ? (
            <div className="workspace-state" role="alert">
              <p>{t('inventory.loadError')}</p>
              <Button onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : inventory.length === 0 ? (
            <EmptyState message={t('inventory.noInventoryItems')} />
          ) : (
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
