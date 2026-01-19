import React, { useState, useMemo } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonModal,
  IonButtons,
  IonButton,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonListHeader,
} from '@ionic/react';
import { create, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetInventoryQuery, useUpdateInventoryMutation } from '@core/api/inventoryApi';
import { SearchBar, Loading, EmptyState, Input, Button } from '@components';
import { formatNumber } from '@utils/helpers';
import type { Inventory } from '@core/types';

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetInventoryQuery({ search });
  const [updateInventory, { isLoading: updating }] = useUpdateInventoryMutation();

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inventory = data?.data || [];

  // Group inventory by category
  const groupedInventory = useMemo(() => {
    const groups: Record<string, Inventory[]> = {};
    
    inventory.forEach((item) => {
      const categoryName = item.variant?.product?.category?.name || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });
    
    return groups;
  }, [inventory]);

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

      await updateInventory({
        variant_id: selectedItem.variant_id,
        quantity: parseFloat(quantity),
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      }).unwrap();

      setShowSuccess(true);
      setShowModal(false);
      setSelectedItem(null);
    } catch (error: any) {
      console.error('❌ Error updating inventory:', error);
      setErrorMessage(error?.data?.message || 'Failed to update inventory');
      setShowError(true);
    }
  };

  return (
    <IonPage>
      <Navbar title={t('inventory.title')} />
      <IonContent>
        <div className="p-4">
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

          {isLoading ? (
            <Loading isOpen={isLoading} />
          ) : inventory.length === 0 ? (
            <EmptyState message={t('inventory.noInventoryItems')} />
          ) : (
            <>
              {categoryNames.map((categoryName) => (
                <div key={categoryName} style={{ marginBottom: '16px' }}>
                  <IonListHeader style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: 'var(--ion-color-primary)',
                    padding: '8px 16px',
                    background: 'var(--ion-color-light)',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    {categoryName}
                    <IonBadge 
                      color="primary" 
                      style={{ marginLeft: '8px' }}
                    >
                      {groupedInventory[categoryName].length}
                    </IonBadge>
                  </IonListHeader>
                  
                  <IonList>
                    {groupedInventory[categoryName].map((item) => (
                      <IonItem key={item.variant_id}>
                        <IonLabel>
                          <h2 className="font-semibold">{item.variant?.product?.name}</h2>
                          <p className="text-gray-600">SKU: {item.variant?.sku}</p>
                          <p className="text-sm">
                            {t('inventory.lowStockThreshold')}: {item.low_stock_threshold}
                          </p>
                        </IonLabel>
                        <div slot="end" className="flex items-center gap-2">
                          <div className="text-right">
                            <IonBadge color={item.is_low_stock ? 'danger' : 'success'} className="text-lg">
                              {formatNumber(item.quantity)}
                            </IonBadge>
                            {item.is_low_stock && (
                              <p className="text-xs text-danger mt-1">{t('inventory.lowStockWarning')}</p>
                            )}
                          </div>
                          <IonButton onClick={() => handleEditClick(item)} fill="clear">
                            <IonIcon icon={create} />
                          </IonButton>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>
                </div>
              ))}
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
                    <p className="text-gray-600">SKU: {selectedItem.variant?.sku}</p>
                  </div>

                  <Input
                    label={t('inventory.quantityRequired')}
                    type="number"
                    value={quantity}
                    onChange={setQuantity}
                    placeholder={t('inventory.enterQuantityPlaceholder')}
                  />

                  <Input
                    label={t('inventory.lowStockThresholdLabel')}
                    type="number"
                    value={lowStockThreshold}
                    onChange={setLowStockThreshold}
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
