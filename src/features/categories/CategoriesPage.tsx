import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonToast,
  IonBadge,
  IonToggle,
  IonSpinner,
} from '@ionic/react';
import { add, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { Input } from '@components/Input';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryStatusMutation,
} from '@core/api/categoryApi';
import './CategoriesPage.css';

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();

  const [showModal, setShowModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: categoriesResponse, isLoading } = useGetCategoriesQuery();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategoryStatus] = useUpdateCategoryStatusMutation();

  const categories = categoriesResponse?.data || [];

  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setErrorMessage('Category name is required');
      setShowError(true);
      return;
    }

    try {
      await createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      }).unwrap();

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating category:', error);
      setErrorMessage(error?.data?.message || 'Failed to create category');
      setShowError(true);
    }
  };

  const handleToggleStatus = async (categoryId: number, currentStatus: boolean) => {
    try {
      await updateCategoryStatus({
        id: categoryId,
        is_active: !currentStatus,
      }).unwrap();
    } catch (error: any) {
      console.error('Error updating category status:', error);
      setErrorMessage(error?.data?.message || 'Failed to update category status');
      setShowError(true);
    }
  };

  return (
    <IonPage>
      <Navbar title="Categories" />
      <IonContent className="ion-padding">
        {isLoading ? (
          <div className="loading-container">
            <IonSpinner />
            <p>Loading categories...</p>
          </div>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Category Management</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>Manage product categories. Categories help organize your inventory.</p>
                <IonButton expand="block" onClick={() => setShowModal(true)}>
                  <IonIcon slot="start" icon={add} />
                  Add Category
                </IonButton>
              </IonCardContent>
            </IonCard>

            {categories.length === 0 ? (
              <IonCard>
                <IonCardContent className="ion-text-center">
                  <p>No categories yet. Create your first category to get started.</p>
                </IonCardContent>
              </IonCard>
            ) : (
              <IonList>
                {categories.map((category) => (
                  <IonCard key={category.id}>
                    <IonItem lines="none">
                      <IonLabel>
                        <h2>{category.name}</h2>
                        {category.description && <p>{category.description}</p>}
                      </IonLabel>
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonBadge color={category.is_active ? 'success' : 'medium'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </IonBadge>
                        <IonToggle
                          checked={category.is_active}
                          onIonChange={() => handleToggleStatus(category.id, category.is_active)}
                        />
                      </div>
                    </IonItem>
                  </IonCard>
                ))}
              </IonList>
            )}
          </>
        )}

        {/* Add Category Modal */}
        {showModal && (
          <IonModal isOpen={true} onDidDismiss={() => setShowModal(false)}>
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Add Category</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowModal(false)}>
                      <IonIcon icon={close} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
                <Input
                  label="Category Name"
                  value={categoryName}
                  onChange={setCategoryName}
                  placeholder="Enter category name"
                  required
                />
                <Input
                  label="Description (Optional)"
                  value={categoryDescription}
                  onChange={setCategoryDescription}
                  placeholder="Enter description"
                />
                <IonButton
                  expand="block"
                  onClick={handleCreateCategory}
                  disabled={creating || !categoryName.trim()}
                  className="ion-margin-top"
                >
                  {creating ? 'Creating...' : 'Create Category'}
                </IonButton>
              </IonContent>
            </IonPage>
          </IonModal>
        )}

        {/* Success Toast */}
        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message="Category created successfully!"
          duration={2000}
          color="success"
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showError}
          onDidDismiss={() => setShowError(false)}
          message={errorMessage}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};
