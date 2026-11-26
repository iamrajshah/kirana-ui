import { SelectionControl, SelectionOption } from '@components/SelectionControl';
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
  IonToggle,
} from '@ionic/react';
import { save, person, language as languageIcon, contrast } from 'ionicons/icons';
import { Input } from '@components/Input';
import { useUpdateProfileMutation } from '@core/api/userApi';
import { useAppSelector } from '@core/hooks';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/useTheme';
import { DocumentSettingsCard } from './DocumentSettingsCard';
import { FoodLicenceSettingsCard } from '../food-licences/FoodLicenceSettingsCard';
import { FirmSettingsCard } from './FirmSettingsCard';
import { canEditTenantDocumentSettings } from './documentSettingsAccess';
import './ProfilePage.css';
import { DeviceSecurityCard } from './DeviceSecurityCard';
import { StorefrontSettingsCard } from './StorefrontSettingsCard';
import { selectCommercialAccess } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial';

export const ProfilePage: React.FC<{ shopSettings?: boolean }> = ({ shopSettings = false }) => {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const { theme, toggleTheme } = useTheme();
  const roles = user?.roles || [];
  const canManageTenantSettings =
    canEditTenantDocumentSettings(roles) &&
    canUseCommercialFeature(roles, commercialAccess, 'FIRMS_SETTINGS');
  const canManageFirms =
    roles.includes('OWNER') && canUseCommercialFeature(roles, commercialAccess, 'FIRMS_SETTINGS');
  const canManageStorefront =
    roles.includes('OWNER') && canUseCommercialFeature(roles, commercialAccess, 'ONLINE_ORDERS');

  const [settingsSection, setSettingsSection] = useState('documents');
  const settingsSections = [
    ...(canManageTenantSettings ? [{ id: 'documents', label: t('documentSettings.title') }] : []),
    ...(canManageFirms ? [{ id: 'firms', label: t('firms.title') }] : []),
    ...(canManageFirms && canUseCommercialFeature(roles, commercialAccess, 'FOOD_LICENCES')
      ? [{ id: 'licences', label: t('foodLicences.title') }]
      : []),
    ...(canManageStorefront ? [{ id: 'storefront', label: t('storefrontSettings.title') }] : []),
  ];
  const activeSection = settingsSections.some((section) => section.id === settingsSection)
    ? settingsSection
    : settingsSections[0]?.id;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

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
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (updateInFlight.current) return;

    if (!name.trim() && !phone.trim()) {
      setErrorMessage(t('foundation.profile.oneFieldRequired'));
      setShowError(true);
      return;
    }

    try {
      updateInFlight.current = true;
      const updateData: { name?: string; phone?: string } = {};
      if (name.trim() !== user?.name) updateData.name = name.trim();
      if (phone.trim() !== user?.phone) updateData.phone = phone.trim();

      if (Object.keys(updateData).length === 0) {
        setErrorMessage(t('foundation.profile.noChanges'));
        setShowError(true);
        return;
      }

      await updateProfile(updateData).unwrap();

      setShowSuccess(true);
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
          <IonTitle>{t(shopSettings ? 'profile.settings' : 'profile.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!shopSettings && (
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
                value={user?.email || ''}
                onChange={() => undefined}
                type="email"
                placeholder={t('profile.emailPlaceholder')}
                disabled
              />
              <p className="text-sm" style={{ color: 'var(--ion-color-medium)' }}>
                {t('profile.emailReadOnly')}
              </p>

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
        )}

        {!shopSettings && (canManageTenantSettings || canManageFirms || canManageStorefront) && (
          <IonButton routerLink="/settings">{t('profile.settings')}</IonButton>
        )}
        {shopSettings && (
          <>
            <div className="shop-settings-tabs" role="tablist" aria-label={t('profile.settings')}>
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === section.id}
                  tabIndex={activeSection === section.id ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const index = settingsSections.findIndex((item) => item.id === section.id);
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? settingsSections.length - 1
                          : (index +
                              (event.key === 'ArrowRight' ? 1 : -1) +
                              settingsSections.length) %
                            settingsSections.length;
                    setSettingsSection(settingsSections[next].id);
                    document.getElementById(`settings-tab-${settingsSections[next].id}`)?.focus();
                  }}
                  aria-controls={`settings-${section.id}`}
                  id={`settings-tab-${section.id}`}
                  onClick={() => setSettingsSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
            <section
              role="tabpanel"
              id="settings-documents"
              aria-labelledby="settings-tab-documents"
              hidden={activeSection !== 'documents'}
            >
              {canManageTenantSettings && <DocumentSettingsCard />}
            </section>
            <section
              role="tabpanel"
              id="settings-firms"
              aria-labelledby="settings-tab-firms"
              hidden={activeSection !== 'firms'}
            >
              {canManageFirms && <FirmSettingsCard />}
            </section>
            <section
              role="tabpanel"
              id="settings-licences"
              aria-labelledby="settings-tab-licences"
              hidden={activeSection !== 'licences'}
            >
              {canManageFirms &&
                canUseCommercialFeature(roles, commercialAccess, 'FOOD_LICENCES') && (
                  <FoodLicenceSettingsCard />
                )}
            </section>
            <section
              role="tabpanel"
              id="settings-storefront"
              aria-labelledby="settings-tab-storefront"
              hidden={activeSection !== 'storefront'}
            >
              {canManageStorefront && <StorefrontSettingsCard />}
            </section>
          </>
        )}
        {!shopSettings && (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{t('profile.settings')}</IonCardTitle>
              </IonCardHeader>
              <IonItem>
                <IonIcon icon={languageIcon} slot="start" />
                <IonLabel>{t('profile.language')}</IonLabel>
                <SelectionControl
                  aria-label={t('profile.selectLanguage')}
                  value={i18n.language}
                  placeholder={t('profile.selectLanguage')}
                  onIonChange={(e) => handleLanguageChange(e.detail.value)}
                  interface="action-sheet"
                  interfaceOptions={{
                    header: t('profile.selectLanguage'),
                    cssClass: 'language-selector-sheet',
                  }}
                >
                  {languages.map((lang) => (
                    <SelectionOption key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectionOption>
                  ))}
                </SelectionControl>
              </IonItem>

              <IonItem>
                <IonIcon icon={contrast} slot="start" />
                <IonLabel>{t('profile.theme')}</IonLabel>
                <IonToggle checked={theme === 'dark'} onIonChange={toggleTheme} slot="end">
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
                  <span className="info-value">
                    {user?.roles?.[0] || t('common.defaultUserRole')}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('profile.company')}:</span>
                  <span className="info-value">
                    {user?.tenant?.name || t('common.notAvailable')}
                  </span>
                </div>
              </IonCardContent>
            </IonCard>

            <DeviceSecurityCard />
          </>
        )}

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

export const ShopSettingsPage: React.FC = () => <ProfilePage shopSettings />;
