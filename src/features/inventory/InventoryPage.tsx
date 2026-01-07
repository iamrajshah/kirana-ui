import React, { useState } from 'react';
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
        setErrorMessage('Valid quantity is required');
        setShowError(true);
        return;
      }

      console.log('📦 Updating inventory:', {
        variant_id: selectedItem.variant_id,
        quantity: parseFloat(quantity),
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      });

      await updateInventory({
        variant_id: selectedItem.variant_id,
        quantity: parseFloat(quantity),
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      }).unwrap();

      console.log('✅ Inventory updated successfully');

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
            <EmptyState message="No inventory items found" />
          ) : (
            <IonList>
              {inventory.map((item) => (
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
          )}
        </div>

        {showModal && selectedItem && (
          <IonModal isOpen={true} onDidDismiss={() => setShowModal(false)}>
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Update Inventory</IonTitle>
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
                    label="Quantity *"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />

                  <Input
                    label="Low Stock Threshold"
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="Enter low stock threshold"
                  />

                  <div className="mt-6">
                    <Button
                      onClick={handleUpdateInventory}
                      disabled={updating || !quantity}
                      isLoading={updating}
                    >
                      Update Inventory
                    </Button>
                  </div>
                </div>
              </IonContent>
            </IonPage>
          </IonModal>
        )}

        <IonToast
          isOpen={showSuccess}
          message="Inventory updated successfully"
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
