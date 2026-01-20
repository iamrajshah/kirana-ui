import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonToast,
  IonPage,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useCreateCategoryMutation } from '@core/api/categoryApi';

interface AddCategoryModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onCategoryCreated?: (category: any) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onDidDismiss,
  onCategoryCreated,
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCategoryName('');
      setCategoryDescription('');
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setErrorMessage('Category name is required');
      setShowError(true);
      return;
    }

    try {
      const result = await createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      }).unwrap();

      // Notify parent component
      if (onCategoryCreated && result.data) {
        onCategoryCreated(result.data);
      }

      // Close modal
      onDidDismiss();
    } catch (error: any) {
      console.error('Error creating category:', error);
      setErrorMessage(error?.data?.message || 'Failed to create category');
      setShowError(true);
    }
  };

  return (
    <>
      {isOpen && (
        <IonModal isOpen={true} onDidDismiss={onDidDismiss}>
          <IonPage>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Add Category</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={onDidDismiss}>
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

      {/* Error Toast */}
      <IonToast
        isOpen={showError}
        onDidDismiss={() => setShowError(false)}
        message={errorMessage}
        duration={3000}
        color="danger"
      />
    </>
  );
};
