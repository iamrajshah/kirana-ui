import React, { useState } from 'react';
import { apiErrorMessage } from '@core/services/notificationService';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
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
import { Navbar } from '@components/Navbar';
import { useTranslation } from 'react-i18next';
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

  const {
    data: categoriesResponse,
    isLoading,
    isError,
    refetch,
  } = useGetCategoriesQuery({ includeInactive: true });
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategoryStatus] = useUpdateCategoryStatusMutation();

  const categories = categoriesResponse?.data || [];

  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setErrorMessage(t('categories.nameRequired'));
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
    } catch (error: unknown) {
      console.error('Error creating category:', error);
      setErrorMessage(apiErrorMessage(error, t('categories.createFailed')));
      setShowError(true);
    }
  };

  const handleToggleStatus = async (categoryId: number, currentStatus: boolean) => {
    try {
      await updateCategoryStatus({
        id: categoryId,
        is_active: !currentStatus,
      }).unwrap();
    } catch (error: unknown) {
      console.error('Error updating category status:', error);
      setErrorMessage(apiErrorMessage(error, t('categories.updateFailed')));
      setShowError(true);
    }
  };

  return (
    <IonPage>
      <Navbar title={t('workspace.categories')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('workspace.categories')}</h1>
              <p>{t('categories.description')}</p>
            </div>
            <div className="workspace-actions">
              <IonButton onClick={() => setShowModal(true)}>
                <IonIcon slot="start" icon={add} />
                {t('categories.add')}
              </IonButton>
            </div>
          </div>
          {isLoading ? (
            <div className="loading-container">
              <IonSpinner />
              <p>{t('categories.loading')}</p>
            </div>
          ) : isError ? (
            <div className="workspace-state">
              <p>{t('categories.loadFailed')}</p>
              <IonButton onClick={() => refetch()}>{t('dashboard.retry')}</IonButton>
            </div>
          ) : (
            <>
              {categories.length === 0 ? (
                <div className="workspace-state">{t('categories.empty')}</div>
              ) : (
                <IonList className="workspace-grid">
                  {categories.map((category) => (
                    <IonCard key={category.id} className="workspace-record">
                      <IonItem lines="none">
                        <IonLabel>
                          <h2>{category.name}</h2>
                          {category.description && <p>{category.description}</p>}
                        </IonLabel>
                        <div
                          slot="end"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <IonBadge color={category.is_active ? 'success' : 'medium'}>
                            {category.is_active ? t('common.active') : t('common.inactive')}
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
                    <IonTitle>{t('categories.add')}</IonTitle>
                    <IonButtons slot="end">
                      <IonButton onClick={() => setShowModal(false)}>
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
                  <IonButton
                    expand="block"
                    onClick={handleCreateCategory}
                    disabled={creating || !categoryName.trim()}
                    className="ion-margin-top"
                  >
                    {creating ? t('common.creating') : t('categories.create')}
                  </IonButton>
                </IonContent>
              </IonPage>
            </IonModal>
          )}

          {/* Success Toast */}
          <IonToast
            isOpen={showSuccess}
            onDidDismiss={() => setShowSuccess(false)}
            message={t('categories.created')}
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
        </div>
      </IonContent>
    </IonPage>
  );
};
