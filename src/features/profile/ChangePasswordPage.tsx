import React, { useState } from 'react';
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
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { save, lockClosed, checkmarkCircle } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useChangePasswordMutation } from '@core/api/userApi';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { ROUTES } from '@core/constants';
import './ChangePasswordPage.css';

export const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [changePassword, { isLoading: changing }] = useChangePasswordMutation();

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const isLongEnough = password.length >= 8;

    return {
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      isLongEnough,
      isValid: hasUpperCase && hasLowerCase && hasNumber && isLongEnough,
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    console.log('🔒 Changing password...');

    if (!currentPassword.trim()) {
      setErrorMessage('Current password is required');
      setShowError(true);
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('New password is required');
      setShowError(true);
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMessage('New password does not meet requirements');
      setShowError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      setShowError(true);
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password must be different from current password');
      setShowError(true);
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      console.log('✅ Password changed successfully');
      setShowSuccess(true);
      resetForm();
      
      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        history.push(ROUTES.DASHBOARD);
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      setErrorMessage(error?.data?.message || 'Failed to change password');
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
          <IonTitle>Change Password</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={lockClosed} style={{ marginRight: '8px' }} />
              Update Your Password
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <Input
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
              placeholder="Enter current password"
              required
            />
            <Input
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              placeholder="Enter new password"
              required
            />
            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              placeholder="Confirm new password"
              required
            />
            
            <IonButton
              onClick={handleChangePassword}
              loading={changing}
              expand="block"
              style={{ marginTop: '20px' }}
              disabled={!passwordValidation.isValid || newPassword !== confirmPassword}
            >
              <IonIcon icon={save} slot="start" />
              Change Password
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Password Requirements</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList lines="none">
              <IonItem className={passwordValidation.isLongEnough ? 'valid' : 'invalid'}>
                <IonIcon
                  icon={checkmarkCircle}
                  slot="start"
                  color={passwordValidation.isLongEnough ? 'success' : 'medium'}
                />
                <IonLabel>At least 8 characters</IonLabel>
              </IonItem>
              <IonItem className={passwordValidation.hasUpperCase ? 'valid' : 'invalid'}>
                <IonIcon
                  icon={checkmarkCircle}
                  slot="start"
                  color={passwordValidation.hasUpperCase ? 'success' : 'medium'}
                />
                <IonLabel>One uppercase letter</IonLabel>
              </IonItem>
              <IonItem className={passwordValidation.hasLowerCase ? 'valid' : 'invalid'}>
                <IonIcon
                  icon={checkmarkCircle}
                  slot="start"
                  color={passwordValidation.hasLowerCase ? 'success' : 'medium'}
                />
                <IonLabel>One lowercase letter</IonLabel>
              </IonItem>
              <IonItem className={passwordValidation.hasNumber ? 'valid' : 'invalid'}>
                <IonIcon
                  icon={checkmarkCircle}
                  slot="start"
                  color={passwordValidation.hasNumber ? 'success' : 'medium'}
                />
                <IonLabel>One number</IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message="Password changed successfully"
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
