import React, { useState } from 'react';
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
} from '@ionic/react';
import { add, close, person, shield } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserStatusMutation,
} from '@core/api/userApi';
import './UsersPage.css';

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const ROLE_OPTIONS = [
    { value: 'MANAGER', label: t('users.manager') },
    { value: 'CASHIER', label: t('users.cashier') },
  ];

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'CASHIER'>('CASHIER');

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    data: usersResponse,
    isLoading,
    isError,
    refetch,
  } = useGetUsersQuery({ includeInactive: true });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();

  const users = usersResponse?.data || [];

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setRole('CASHIER');
  };

  const handleCreateUser = async () => {
    if (!name.trim()) {
      setErrorMessage(t('users.nameRequired'));
      setShowError(true);
      return;
    }

    if (!phone.trim()) {
      setErrorMessage(t('users.phoneRequired'));
      setShowError(true);
      return;
    }

    if (!password.trim() || password.length < 8) {
      setErrorMessage(t('users.passwordRequirement'));
      setShowError(true);
      return;
    }

    try {
      await createUser({
        name,
        phone,
        email: email.trim() || undefined,
        password,
        role,
      }).unwrap();

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error creating user:', error);
      setErrorMessage(error?.data?.message || t('users.failedToCreateUser'));
      setShowError(true);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus({
        id: userId,
        is_active: !currentStatus,
      }).unwrap();
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      setErrorMessage(error?.data?.message || t('users.failedToUpdateUserStatus'));
      setShowError(true);
    }
  };

  const getRoleBadgeColor = (roles: string[]) => {
    if (roles.includes('OWNER')) return 'danger';
    if (roles.includes('MANAGER')) return 'warning';
    return 'primary';
  };

  return (
    <IonPage>
      <Navbar title={t('users.title')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('users.userManagement')}</h1>
              <p>{t('users.managementDescription')}</p>
            </div>
            <div className="workspace-actions">
              <IonButton onClick={() => setShowModal(true)}>
                <IonIcon icon={add} slot="start" />
                {t('users.addUser')}
              </IonButton>
            </div>
          </div>
          {isLoading ? (
            <div className="loading-container">
              <p>{t('common.loading')}</p>
            </div>
          ) : isError ? (
            <div className="workspace-state">
              <p>{t('users.loadFailed')}</p>
              <IonButton onClick={() => refetch()}>{t('common.retry')}</IonButton>
            </div>
          ) : (
            <>
              <IonList className="workspace-grid">
                {users.map((user) => (
                  <IonCard key={user.id} className="workspace-record">
                    <IonItem lines="none">
                      <IonIcon icon={person} slot="start" />
                      <IonLabel>
                        <h2>{user.name}</h2>
                        <p>{user.phone}</p>
                        {user.email && <p>{user.email}</p>}
                      </IonLabel>
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonBadge color={getRoleBadgeColor(user.roles)}>
                          <IonIcon icon={shield} style={{ marginRight: '4px' }} />
                          {user.roles[0] || 'USER'}
                        </IonBadge>
                        <IonBadge color={user.is_active ? 'success' : 'medium'}>
                          {user.is_active ? t('common.active') : t('common.inactive')}
                        </IonBadge>
                        <IonToggle
                          checked={user.is_active}
                          onIonChange={() => handleToggleStatus(user.id, user.is_active)}
                        />
                      </div>
                    </IonItem>
                  </IonCard>
                ))}
              </IonList>

              {users.length === 0 && (
                <div className="empty-state">
                  <IonIcon icon={person} style={{ fontSize: '64px', opacity: 0.3 }} />
                  <p>{t('users.noUsers')}</p>
                </div>
              )}
            </>
          )}

          {showModal && (
            <IonModal isOpen={true} onDidDismiss={() => setShowModal(false)}>
              <IonPage>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle>{t('users.createNewUser')}</IonTitle>
                    <IonButtons slot="end">
                      <IonButton
                        onClick={() => {
                          setShowModal(false);
                        }}
                      >
                        <IonIcon icon={close} />
                      </IonButton>
                    </IonButtons>
                  </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding">
                  <Input
                    label={t('users.userName')}
                    value={name}
                    onChange={setName}
                    placeholder={t('users.enterUserName')}
                    required
                  />
                  <Input
                    label={t('users.userPhone')}
                    value={phone}
                    onChange={setPhone}
                    type="tel"
                    placeholder={t('users.phonePlaceholder')}
                    required
                  />
                  <Input
                    label={t('users.userEmail')}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder={t('users.emailPlaceholder')}
                  />
                  <Input
                    label={t('users.password')}
                    value={password}
                    onChange={setPassword}
                    type="password"
                    placeholder={t('users.passwordPlaceholder')}
                    required
                  />
                  <Select
                    label={t('users.role')}
                    value={role}
                    onChange={(value) => setRole(value as 'MANAGER' | 'CASHIER')}
                    options={ROLE_OPTIONS}
                    required
                  />
                  <p
                    style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '8px' }}
                  >
                    {t('users.passwordRequirement')}
                  </p>
                  <IonButton
                    onClick={handleCreateUser}
                    disabled={creating}
                    expand="block"
                    style={{ marginTop: '20px' }}
                  >
                    {creating ? t('common.creating') : t('users.createUser')}
                  </IonButton>
                </IonContent>
              </IonPage>
            </IonModal>
          )}

          <IonToast
            isOpen={showSuccess}
            onDidDismiss={() => setShowSuccess(false)}
            message={t('users.userCreated')}
            duration={2000}
            color="success"
          />

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
