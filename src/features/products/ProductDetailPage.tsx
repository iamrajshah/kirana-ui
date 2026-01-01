import React, { useState } from 'react';
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
  IonButton,
  IonIcon,
  IonModal,
  IonToast,
} from '@ionic/react';
import { pencil, close } from 'ionicons/icons';
import { useParams } from 'react-router';
import { useGetProductByIdQuery, useUpdateProductMutation } from '@core/api/productApi';
import { useGetCategoriesQuery } from '@core/api/categoryApi';
import { Loading, EmptyState, Input, Select, Button } from '@components';
import { formatCurrency } from '@utils/helpers';
import type { ProductVariant } from '@core/types';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetProductByIdQuery(id);
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  const categories = categoriesData?.data || [];

  const handleEditClick = () => {
    if (data?.data) {
      setEditName(data.data.name);
      setEditCategoryId(typeof data.data.category_id === 'string' ? parseInt(data.data.category_id) : data.data.category_id);
      setShowEditModal(true);
    }
  };

  const handleUpdateProduct = async () => {
    try {
      await updateProduct({
        id,
        data: {
          name: editName,
          category_id: editCategoryId,
        },
      }).unwrap();

      setShowSuccess(true);
      setShowEditModal(false);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setErrorMessage(error?.data?.message || 'Failed to update product');
      setShowError(true);
    }
  };

  if (isLoading) {
    return <Loading isOpen={true} />;
  }

  if (!data?.data || error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/products" />
            </IonButtons>
            <IonTitle>Product Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <EmptyState message="Product not found" />
        </IonContent>
      </IonPage>
    );
  }

  const product = data.data;
  const variants = product.variants || product.product_variants || [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/products" />
          </IonButtons>
          <IonTitle>{product.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleEditClick}>
              <IonIcon slot="icon-only" icon={pencil} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Product Info</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Category</h3>
                    <p>{product.category?.name || 'Uncategorized'}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>Status</IonLabel>
                  <IonBadge slot="end" color={product.is_active ? 'success' : 'danger'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </IonBadge>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          {variants && variants.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Variants ({variants.length})
              </h2>
              {variants.map((variant: ProductVariant) => (
                <IonCard key={variant.id}>
                  <IonCardHeader>
                    <IonCardTitle>
                      {variant.brand || 'Variant'} - {variant.size || ''}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      {variant.packaging && (
                        <IonItem>
                          <IonLabel>Packaging</IonLabel>
                          <IonLabel slot="end">{variant.packaging}</IonLabel>
                        </IonItem>
                      )}
                      <IonItem>
                        <IonLabel>Price</IonLabel>
                        <IonLabel slot="end" style={{ fontWeight: 'bold' }}>
                          {formatCurrency(Number(variant.price))}
                        </IonLabel>
                      </IonItem>
                      {variant.gst_percent && (
                        <IonItem>
                          <IonLabel>GST</IonLabel>
                          <IonLabel slot="end">{variant.gst_percent}%</IonLabel>
                        </IonItem>
                      )}
                      {variant.sku && (
                        <IonItem>
                          <IonLabel>SKU</IonLabel>
                          <IonLabel slot="end">{variant.sku}</IonLabel>
                        </IonItem>
                      )}
                      {variant.inventory && (
                        <IonItem>
                          <IonLabel>Stock</IonLabel>
                          <IonBadge
                            slot="end"
                            color={
                              (variant.inventory.quantity || 0) <= (variant.inventory.low_stock_threshold || 5)
                                ? 'danger'
                                : 'success'
                            }
                          >
                            {variant.inventory.quantity || 0} units
                          </IonBadge>
                        </IonItem>
                      )}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {(!variants || variants.length === 0) && (
            <IonCard>
              <IonCardContent>
                <EmptyState message="No variants found for this product" />
              </IonCardContent>
            </IonCard>
          )}
        </div>

        <IonToast
          isOpen={showSuccess}
          message="Product updated successfully"
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

        {showEditModal && (
          <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Edit Product</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowEditModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <div style={{ padding: '16px' }}>
                <Input
                  label="Product Name *"
                  value={editName}
                  onChange={setEditName}
                  placeholder="Enter product name"
                />

                <Select
                  label="Category"
                  value={editCategoryId?.toString() || ''}
                  onChange={(value) => setEditCategoryId(value ? parseInt(value) : null)}
                  options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                  placeholder="Select category"
                />

                <div style={{ marginTop: '24px' }}>
                  <Button
                    onClick={handleUpdateProduct}
                    disabled={updating || !editName.trim()}
                    loading={updating}
                  >
                    Update Product
                  </Button>
                </div>
              </div>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};
