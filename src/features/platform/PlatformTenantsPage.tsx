import React, { useCallback, useEffect, useState } from 'react';
import {
  IonBadge,
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { add, checkmarkCircle, close, logOut, pauseCircle, search } from 'ionicons/icons';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Input } from '@components';
import { platformApi, PlatformTenant } from '@core/api/platformApi';
import { ROUTES, STORAGE_KEYS } from '@core/constants';
import './platform.css';

const emptyForm = {
  shopName: '',
  ownerName: '',
  phone: '',
  email: '',
  temporaryPassword: '',
  gstNumber: '',
};

export const PlatformTenantsPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdCredentials, setCreatedCredentials] = useState<{
    shop: string;
    email: string;
    phone: string;
    password: string;
  } | null>(null);
  const [statusTarget, setStatusTarget] = useState<PlatformTenant | null>(null);
  const [error, setError] = useState('');

  const loadTenants = useCallback(async (term = '') => {
    setLoading(true);
    try {
      setTenants(await platformApi.listTenants(term));
    } catch (requestError) {
      if (!localStorage.getItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN)) {
        history.replace(ROUTES.PLATFORM_LOGIN);
        return;
      }
      setError(requestError instanceof Error ? requestError.message : t('platform.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [history, t]);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN)) {
      history.replace(ROUTES.PLATFORM_LOGIN);
      return;
    }
    void loadTenants();
  }, [history, loadTenants]);

  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const createTenant = async () => {
    if (saving) return;
    if (
      !form.shopName.trim() ||
      !form.ownerName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.temporaryPassword
    ) {
      setError(t('platform.requiredFields'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await platformApi.createTenant({
        ...form,
        gstNumber: form.gstNumber.trim() || undefined,
      });
      setCreatedCredentials({
        shop: form.shopName,
        email: form.email,
        phone: form.phone,
        password: form.temporaryPassword,
      });
      setForm(emptyForm);
      setShowCreate(false);
      await loadTenants(searchTerm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('platform.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tenant: PlatformTenant) => {
    try {
      await platformApi.updateTenantStatus(
        tenant.id,
        tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      );
      await loadTenants(searchTerm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('platform.statusFailed'));
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_ADMIN);
    history.replace(ROUTES.PLATFORM_LOGIN);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('platform.shops')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={logout} aria-label={t('platform.logout')}>
              <IonIcon icon={logOut} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="platform-page">
          <section className="platform-hero">
            <div>
              <p className="platform-eyebrow">{t('platform.controlPlane')}</p>
              <h1>{t('platform.manageShops')}</h1>
              <p>{t('platform.manageShopsDescription')}</p>
            </div>
            <IonButton onClick={() => setShowCreate(true)}>
              <IonIcon icon={add} slot="start" />
              {t('platform.createShop')}
            </IonButton>
          </section>

          <form
            className="platform-search"
            onSubmit={(event) => {
              event.preventDefault();
              void loadTenants(searchTerm);
            }}
          >
            <Input
              label={t('platform.search')}
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t('platform.searchPlaceholder')}
            />
            <IonButton type="submit" fill="outline">
              <IonIcon icon={search} slot="start" />
              {t('platform.searchAction')}
            </IonButton>
          </form>

          {loading ? (
            <div className="workspace-state" role="status">{t('common.loading')}</div>
          ) : tenants.length === 0 ? (
            <div className="workspace-state">{t('platform.noShops')}</div>
          ) : (
            <section className="platform-tenant-grid">
              {tenants.map((tenant) => (
                <IonCard key={tenant.id} className="platform-tenant-card">
                  <IonCardContent>
                    <div className="platform-card-heading">
                      <div>
                        <h2>{tenant.name}</h2>
                        <p>{tenant.owner?.name || t('common.notAvailable')}</p>
                      </div>
                      <IonBadge color={tenant.status === 'ACTIVE' ? 'success' : 'medium'}>
                        {tenant.status}
                      </IonBadge>
                    </div>
                    <p>{tenant.owner?.phone}</p>
                    <p>{tenant.owner?.email}</p>
                    <div className="platform-metrics">
                      <span>{t('platform.staffCount', { count: tenant.counts.users })}</span>
                      <span>{t('platform.productCount', { count: tenant.counts.products })}</span>
                      <span>{t('platform.billCount', { count: tenant.counts.invoices })}</span>
                    </div>
                    <div className="platform-progress-label">
                      <span>{t('platform.onboarding')}</span>
                      <strong>{tenant.onboarding.percent}%</strong>
                    </div>
                    <IonProgressBar value={tenant.onboarding.percent / 100} />
                    <div className="platform-step-list">
                      {Object.entries(tenant.onboarding.steps).map(([step, complete]) => (
                        <span key={step} className={complete ? 'complete' : ''}>
                          <IonIcon icon={complete ? checkmarkCircle : pauseCircle} />
                          {t(`platform.steps.${step}`)}
                        </span>
                      ))}
                    </div>
                    <IonButton
                      expand="block"
                      fill="outline"
                      color={tenant.status === 'ACTIVE' ? 'danger' : 'success'}
                      onClick={() => setStatusTarget(tenant)}
                    >
                      {tenant.status === 'ACTIVE'
                        ? t('platform.suspendShop')
                        : t('platform.reactivateShop')}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ))}
            </section>
          )}
        </main>

        <IonModal isOpen={showCreate} onDidDismiss={() => setShowCreate(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('platform.createShop')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCreate(false)}><IonIcon icon={close} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <Input label={t('platform.shopName')} value={form.shopName} onChange={(value) => setField('shopName', value)} required />
            <Input label={t('platform.ownerName')} value={form.ownerName} onChange={(value) => setField('ownerName', value)} required />
            <Input label={t('platform.phone')} value={form.phone} onChange={(value) => setField('phone', value)} type="tel" required />
            <Input label={t('platform.loginEmail')} value={form.email} onChange={(value) => setField('email', value)} type="email" required />
            <Input label={t('platform.temporaryPassword')} value={form.temporaryPassword} onChange={(value) => setField('temporaryPassword', value)} type="password" required />
            <Input label={t('platform.gstNumber')} value={form.gstNumber} onChange={(value) => setField('gstNumber', value)} />
            <p className="platform-form-note">{t('platform.passwordNote')}</p>
            <IonButton expand="block" disabled={saving} onClick={() => void createTenant()}>
              {saving ? t('common.creating') : t('platform.createShop')}
            </IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={!!createdCredentials} onDidDismiss={() => setCreatedCredentials(null)}>
          <IonHeader>
            <IonToolbar><IonTitle>{t('platform.shopCreated')}</IonTitle></IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="platform-credentials">
              <h2>{createdCredentials?.shop}</h2>
              <p>{t('platform.shareCredentials')}</p>
              <dl>
                <dt>{t('platform.loginEmail')}</dt><dd>{createdCredentials?.email}</dd>
                <dt>{t('platform.phone')}</dt><dd>{createdCredentials?.phone}</dd>
                <dt>{t('platform.temporaryPassword')}</dt><dd>{createdCredentials?.password}</dd>
              </dl>
              <IonButton expand="block" onClick={() => setCreatedCredentials(null)}>{t('common.close')}</IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={!!statusTarget}
          onDidDismiss={() => setStatusTarget(null)}
          header={
            statusTarget?.status === 'ACTIVE'
              ? t('platform.confirmSuspendTitle')
              : t('platform.confirmReactivateTitle')
          }
          message={t('platform.confirmStatusMessage', { shop: statusTarget?.name })}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            {
              text:
                statusTarget?.status === 'ACTIVE'
                  ? t('platform.suspendShop')
                  : t('platform.reactivateShop'),
              role: statusTarget?.status === 'ACTIVE' ? 'destructive' : undefined,
              handler: () => {
                if (statusTarget) void toggleStatus(statusTarget);
              },
            },
          ]}
        />

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} color="danger" duration={4000} />
      </IonContent>
    </IonPage>
  );
};
