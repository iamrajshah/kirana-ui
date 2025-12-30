import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonToast,
  IonBackButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
} from '@ionic/react';
import { save, person } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useUpdateProfileMutation } from '@core/api/userApi';
import { useAppSelector } from '@core/hooks';
import { useTranslation } from 'react-i18next';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [updateProfile, { isLoading: updating }] = useUpdateProfileMutation();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    console.log('💾 Updating profile...', { name, phone, email });

    if (!name.trim() && !phone.trim() && !email.trim()) {
      setErrorMessage('At least one field must be provided');
      setShowError(true);
      return;
    }

    try {
      const updateData: any = {};
      if (name.trim() !== user?.name) updateData.name = name.trim();
      if (phone.trim() !== user?.phone) updateData.phone = phone.trim();
      if (email.trim() !== user?.email) updateData.email = email.trim();

      if (Object.keys(updateData).length === 0) {
        setErrorMessage('No changes detected');
        setShowError(true);
        return;
      }

      await updateProfile(updateData).unwrap();

      console.log('✅ Profile updated successfully');
      setShowSuccess(true);
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      setErrorMessage(error?.data?.message || 'Failed to update profile');
      setShowError(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>My Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={person} style={{ marginRight: '8px' }} />
              Update Profile Information
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <Input
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
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
              placeholder="your.email@example.com"
            />
            
            <IonButton
              onClick={handleUpdateProfile}
              loading={updating}
              expand="block"
              style={{ marginTop: '20px' }}
            >
              <IonIcon icon={save} slot="start" />
              Update Profile
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Account Information</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="info-row">
              <span className="info-label">User ID:</span>
              <span className="info-value">{user?.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role:</span>
              <span className="info-value">{user?.roles?.[0] || 'USER'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Company:</span>
              <span className="info-value">{user?.tenant?.name || 'N/A'}</span>
            </div>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message="Profile updated successfully"
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
