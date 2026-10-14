import React, { useState, useEffect, useRef } from 'react';
import { apiErrorMessage } from '@core/services/notificationService';
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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/react';
import { save, person, language as languageIcon, contrast } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useUpdateProfileMutation } from '@core/api/userApi';
import { useAppSelector } from '@core/hooks';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { ROUTES } from '@core/constants';
import { useTheme } from '../../contexts/useTheme';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const user = useAppSelector((state) => state.auth.user);
  const { theme, toggleTheme } = useTheme();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const updateInFlight = useRef(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (updateInFlight.current) return;

    if (!name.trim() && !phone.trim() && !email.trim()) {
      setErrorMessage(t('foundation.profile.oneFieldRequired'));
      setShowError(true);
      return;
    }

    try {
      updateInFlight.current = true;
      const updateData: { name?: string; phone?: string; email?: string } = {};
      if (name.trim() !== user?.name) updateData.name = name.trim();
      if (phone.trim() !== user?.phone) updateData.phone = phone.trim();
      if (email.trim() !== user?.email) updateData.email = email.trim();

      if (Object.keys(updateData).length === 0) {
        setErrorMessage(t('foundation.profile.noChanges'));
        setShowError(true);
        return;
      }

      await updateProfile(updateData).unwrap();

      setShowSuccess(true);
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        history.push(ROUTES.DASHBOARD);
      }, 1000);
    } catch (error: unknown) {
      console.error('❌ Error updating profile:', error);
      setErrorMessage(apiErrorMessage(error, t('foundation.profile.updateFailed')));
      setShowError(true);
    } finally {
      updateInFlight.current = false;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('profile.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={person} style={{ marginRight: '8px' }} />
              {t('profile.updateProfileInformation')}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <Input
              label={t('profile.name')}
              value={name}
              onChange={setName}
              placeholder={t('profile.name')}
              required
            />
            <Input
              label={t('profile.phone')}
              value={phone}
              onChange={setPhone}
              type="tel"
              placeholder={t('foundation.profile.phoneExample')}
              required
            />
            <Input
              label={t('profile.email')}
              value={email}
              onChange={setEmail}
              type="email"
              placeholder={t('profile.emailPlaceholder')}
            />
            
            <IonButton
              onClick={handleUpdateProfile}
              disabled={isLoading}
              expand="block"
              style={{ marginTop: '20px' }}
            >
              <IonIcon icon={save} slot="start" />
              {t('profile.updateProfile')}
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonItem>
            <IonIcon icon={languageIcon} slot="start" />
            <IonLabel>{t('profile.language')}</IonLabel>
            <IonSelect
              value={i18n.language}
              placeholder={t('profile.selectLanguage')}
              onIonChange={(e) => handleLanguageChange(e.detail.value)}
              interface="action-sheet"
              interfaceOptions={{
                header: t('profile.selectLanguage'),
                cssClass: 'language-selector-sheet'
              }}
            >
              {languages.map((lang) => (
                <IonSelectOption key={lang.code} value={lang.code}>
                  {lang.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonIcon icon={contrast} slot="start" />
            <IonLabel>{t('profile.theme')}</IonLabel>
            <IonToggle
              checked={theme === 'dark'}
              onIonChange={toggleTheme}
              slot="end"
            >
              {theme === 'dark' ? t('profile.darkMode') : t('profile.lightMode')}
            </IonToggle>
          </IonItem>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('profile.accountInformation')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="info-row">
              <span className="info-label">{t('profile.userId')}:</span>
              <span className="info-value">{user?.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('profile.role')}:</span>
              <span className="info-value">{user?.roles?.[0] || t('common.defaultUserRole')}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('profile.company')}:</span>
              <span className="info-value">{user?.tenant?.name || t('common.notAvailable')}</span>
            </div>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message={t('profile.updatedSuccess')}
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
