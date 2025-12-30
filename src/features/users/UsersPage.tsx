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
} from '@ionic/react';
import { add, close, person, shield } from 'ionicons/icons';
import { Navbar } from '@components/Navbar';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserStatusMutation } from '@core/api/userApi';
import './UsersPage.css';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CASHIER', label: 'Cashier' },
];

export const UsersPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'CASHIER'>('CASHIER');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: usersResponse, isLoading } = useGetUsersQuery();
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
    console.log('👤 Creating user...', { name, phone, email, role });

    if (!name.trim()) {
      setErrorMessage('Name is required');
      setShowError(true);
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Phone is required');
      setShowError(true);
      return;
    }

    if (!password.trim() || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
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

      console.log('✅ User created successfully');
      setShowSuccess(true);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error creating user:', error);
      setErrorMessage(error?.data?.message || 'Failed to create user');
      setShowError(true);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus({
        id: userId,
        is_active: !currentStatus,
      }).unwrap();
      console.log('✅ User status updated');
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      setErrorMessage(error?.data?.message || 'Failed to update user status');
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
      <Navbar title="Users" />
      <IonContent className="ion-padding">
        {isLoading ? (
          <div className="loading-container">
            <p>Loading users...</p>
          </div>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>User Management</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>Manage users and their roles. Only OWNER can create new users.</p>
              </IonCardContent>
            </IonCard>

            <IonList>
              {users.map((user) => (
                <IonCard key={user.id}>
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
                <p>No users found</p>
              </div>
            )}
          </>
        )}

        <IonButton
          expand="block"
          onClick={() => {
            console.log('➕ Add user button clicked');
            setShowModal(true);
          }}
          style={{ marginTop: '20px' }}
        >
          <IonIcon icon={add} slot="start" />
          Create User
        </IonButton>

        {showModal && (
          <IonModal
            isOpen={true}
            onDidDismiss={() => {
              console.log('🚪 User modal dismissed');
              setShowModal(false);
            }}
          >
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Create New User</IonTitle>
                  <IonButtons slot="end">
                    <IonButton
                      onClick={() => {
                        console.log('❌ Close button clicked');
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
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Enter user name"
                  required
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  placeholder="+1234567890"
                  required
                />
                <Input
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  placeholder="user@example.com"
                />
                <Input
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  placeholder="Min 8 characters"
                  required
                />
                <Select
                  label="Role"
                  value={role}
                  onChange={(value) => setRole(value as 'MANAGER' | 'CASHIER')}
                  options={ROLE_OPTIONS}
                  required
                />
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '8px' }}>
                  Password must be at least 8 characters with uppercase, lowercase, and number.
                </p>
                <IonButton
                  onClick={() => {
                    console.log('💾 Save user button clicked');
                    handleCreateUser();
                  }}
                  disabled={creating}
                  expand="block"
                  style={{ marginTop: '20px' }}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </IonButton>
              </IonContent>
            </IonPage>
          </IonModal>
        )}

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message="User created successfully"
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
      </IonContent>
    </IonPage>
  );
};
