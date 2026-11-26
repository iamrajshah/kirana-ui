import React, { useState, useEffect } from 'react';
import { apiErrorMessage } from '@core/services/notificationService';
import type { Category } from '@core/api/categoryApi';
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
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useCreateCategoryMutation } from '@core/api/categoryApi';
import { useTranslation } from 'react-i18next';

interface AddCategoryModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onCategoryCreated?: (category: Category) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onDidDismiss,
  onCategoryCreated,
}) => {
  const { t } = useTranslation();
  const [hsn, setHsn] = useState('');
  const [gst, setGst] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCategoryName('');
      setHsn('');
      setGst('');
      setCategoryDescription('');
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setErrorMessage(t('categories.nameRequired'));
      setShowError(true);
      return;
    }

    try {
      const result = await createCategory({
        name: categoryName.trim(),
        default_hsn_code: hsn.trim() || null,
        default_gst_percent: gst === '' ? null : Number(gst),
        description: categoryDescription.trim() || undefined,
      }).unwrap();

      // Notify parent component
      if (onCategoryCreated && result.data) {
        onCategoryCreated(result.data);
      }

      // Close modal
      onDidDismiss();
    } catch (error: unknown) {
      console.error('Error creating category:', error);
      setErrorMessage(apiErrorMessage(error, t('categories.createFailed')));
      setShowError(true);
    }
  };

  return (
    <>
      {isOpen && (
        <IonModal isOpen={true} onDidDismiss={onDidDismiss}>
          <div className="ion-page">
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('categories.add')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={onDidDismiss}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <Input
                label={t('categories.name')}
                value={categoryName}
                onChange={setCategoryName}
                placeholder={t('categories.namePlaceholder')}
                required
              />
              <Input
                label={t('categories.optionalDescription')}
                value={categoryDescription}
                onChange={setCategoryDescription}
                placeholder={t('categories.descriptionPlaceholder')}
              />
              <Input
                label={t('taxFields.hsnCode')}
                value={hsn}
                onChange={setHsn}
                maxLength={8}
                inputMode="numeric"
              />
              <Input
                label={t('products.gstLabel')}
                value={gst}
                onChange={setGst}
                type="number"
                min={0}
                max={100}
              />
              <IonButton
                expand="block"
                onClick={handleCreateCategory}
                disabled={creating || !categoryName.trim()}
                className="ion-margin-top"
              >
                {creating ? t('common.creating') : t('categories.create')}
              </IonButton>
            </IonContent>
          </div>
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
