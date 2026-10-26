import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { add, calendar, checkmarkCircle, close, eye, key, logOut, moon, pauseCircle, search, sunny } from 'ionicons/icons';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Input } from '@components';
import { platformApi, PlatformTenant, PlatformTenantDetails } from '@core/api/platformApi';
import { ROUTES, STORAGE_KEYS } from '@core/constants';
import { useTheme } from '../../contexts/useTheme';
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
  const { theme, toggleTheme } = useTheme();
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
  const [detailTarget, setDetailTarget] = useState<PlatformTenant | null>(null);
  const [tenantDetails, setTenantDetails] = useState<PlatformTenantDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetCredentials, setPasswordResetCredentials] = useState<{
    shop: string;
    email: string | null;
    phone: string | null;
    password: string;
  } | null>(null);
  const [statusTarget, setStatusTarget] = useState<PlatformTenant | null>(null);
  const [error, setError] = useState('');
  const detailRequest = useRef<AbortController | null>(null);

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

  const loadTenantDetails = useCallback(async (tenantId: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetailLoading(true);
    setDetailError('');
    try {
      setTenantDetails(await platformApi.getTenantDetails(tenantId, controller.signal));
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setDetailError(
        requestError instanceof Error ? requestError.message : t('platform.detailsFailed')
      );
    } finally {
      if (detailRequest.current === controller) setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => () => detailRequest.current?.abort(), []);

  const openTenantDetails = (tenant: PlatformTenant) => {
    setDetailTarget(tenant);
    setTenantDetails(null);
    setDetailError('');
    setShowPasswordReset(false);
    setTemporaryPassword('');
    void loadTenantDetails(tenant.id);
  };

  const closeTenantDetails = () => {
    detailRequest.current?.abort();
    detailRequest.current = null;
    setDetailTarget(null);
    setTenantDetails(null);
    setDetailError('');
    setShowPasswordReset(false);
    setTemporaryPassword('');
  };

  const resetOwnerPassword = async () => {
    if (!detailTarget || resettingPassword || temporaryPassword.length < 8) return;
    setResettingPassword(true);
    setError('');
    try {
      const result = await platformApi.resetOwnerPassword(detailTarget.id, temporaryPassword);
      setPasswordResetCredentials({
        shop: result.tenant.name,
        email: result.owner.email,
        phone: result.owner.phone,
        password: temporaryPassword,
      });
      setShowPasswordReset(false);
      setTemporaryPassword('');
      await Promise.all([loadTenantDetails(detailTarget.id), loadTenants(searchTerm)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('platform.passwordResetFailed'));
    } finally {
      setResettingPassword(false);
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
            <IonButton
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('profile.lightMode') : t('profile.darkMode')}
            >
              <IonIcon icon={theme === 'dark' ? sunny : moon} />
            </IonButton>
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
                    <dl className="platform-card-contact">
                      <div><dt>{t('platform.ownerPhone')}</dt><dd>{tenant.owner?.phone || t('common.notAvailable')}</dd></div>
                      <div><dt>{t('platform.ownerEmail')}</dt><dd>{tenant.owner?.email || t('common.notAvailable')}</dd></div>
                      <div><dt>{t('platform.createdOn')}</dt><dd>{new Date(tenant.createdAt).toLocaleDateString()}</dd></div>
                    </dl>
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
                      onClick={() => openTenantDetails(tenant)}
                    >
                      <IonIcon icon={eye} slot="start" />
                      {t('platform.viewDetails')}
                    </IonButton>
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

        <IonModal isOpen={!!detailTarget} onDidDismiss={closeTenantDetails}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{detailTarget?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeTenantDetails} aria-label={t('common.close')}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {detailLoading ? (
              <div className="workspace-state" role="status">{t('common.loading')}</div>
            ) : detailError || !tenantDetails ? (
              <div className="workspace-state" role="alert">
                <p>{detailError || t('platform.detailsFailed')}</p>
                {detailTarget && (
                  <IonButton onClick={() => void loadTenantDetails(detailTarget.id)}>
                    {t('common.retry')}
                  </IonButton>
                )}
              </div>
            ) : (
              <div className="platform-detail-shell">
                <section className="platform-detail-summary">
                  <div className="platform-card-heading">
                    <div>
                      <p className="platform-eyebrow">{t('platform.shopDetails')}</p>
                      <h2>{tenantDetails.name}</h2>
                    </div>
                    <IonBadge color={tenantDetails.status === 'ACTIVE' ? 'success' : 'medium'}>
                      {tenantDetails.status}
                    </IonBadge>
                  </div>
                  <dl className="platform-detail-grid">
                    <div><dt>{t('platform.shopId')}</dt><dd>{tenantDetails.id}</dd></div>
                    <div><dt>{t('platform.ownerName')}</dt><dd>{tenantDetails.contact.ownerName || t('common.notAvailable')}</dd></div>
                    <div><dt>{t('platform.shopPhone')}</dt><dd>{tenantDetails.contact.phone}</dd></div>
                    <div><dt>{t('platform.shopEmail')}</dt><dd>{tenantDetails.contact.email || t('common.notAvailable')}</dd></div>
                    <div><dt>{t('platform.gstNumberLabel')}</dt><dd>{tenantDetails.contact.gstNumber || t('common.notAvailable')}</dd></div>
                    <div><dt>{t('platform.createdOn')}</dt><dd><IonIcon icon={calendar} /> {new Date(tenantDetails.createdAt).toLocaleString()}</dd></div>
                  </dl>
                  <div className="platform-metrics">
                    <span>{t('platform.staffCount', { count: tenantDetails.counts.users })}</span>
                    <span>{t('platform.productCount', { count: tenantDetails.counts.products })}</span>
                    <span>{t('platform.billCount', { count: tenantDetails.counts.invoices })}</span>
                  </div>
                </section>

                <section>
                  <div className="platform-detail-heading">
                    <div>
                      <p className="platform-eyebrow">{t('platform.staffAccounts')}</p>
                      <h2>{t('platform.peopleWithAccess')}</h2>
                    </div>
                    <IonButton fill="outline" onClick={() => setShowPasswordReset(true)}>
                      <IonIcon icon={key} slot="start" />
                      {t('platform.resetOwnerPassword')}
                    </IonButton>
                  </div>
                  <div className="platform-staff-list">
                    {tenantDetails.staff.map((staff) => (
                      <article key={staff.id} className="platform-staff-row">
                        <div>
                          <strong>{staff.name || t('common.notAvailable')}</strong>
                          <span>{staff.roles.join(', ') || t('common.notAvailable')}</span>
                        </div>
                        <div>
                          <span>{staff.email || t('common.notAvailable')}</span>
                          <span>{staff.phone || t('common.notAvailable')}</span>
                        </div>
                        <div className="platform-staff-status">
                          <IonBadge color={staff.active ? 'success' : 'medium'}>
                            {staff.active ? t('platform.active') : t('platform.inactive')}
                          </IonBadge>
                          {staff.roles.includes('OWNER') && (
                            <span>{staff.mustChangePassword
                              ? t('platform.passwordChangePending')
                              : t('platform.passwordChanged')}</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {showPasswordReset && (
                  <section className="platform-reset-panel">
                    <h2>{t('platform.resetOwnerPassword')}</h2>
                    <p>{t('platform.resetPasswordWarning')}</p>
                    <Input
                      label={t('platform.newTemporaryPassword')}
                      value={temporaryPassword}
                      onChange={setTemporaryPassword}
                      type="password"
                      required
                    />
                    <p className="platform-form-note">{t('platform.passwordRequirements')}</p>
                    <div className="platform-reset-actions">
                      <IonButton fill="clear" onClick={() => setShowPasswordReset(false)}>
                        {t('common.cancel')}
                      </IonButton>
                      <IonButton
                        color="warning"
                        disabled={resettingPassword || temporaryPassword.length < 8}
                        onClick={() => void resetOwnerPassword()}
                      >
                        {resettingPassword ? t('platform.resettingPassword') : t('platform.confirmPasswordReset')}
                      </IonButton>
                    </div>
                  </section>
                )}
              </div>
            )}
          </IonContent>
        </IonModal>

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

        <IonModal isOpen={!!passwordResetCredentials} onDidDismiss={() => setPasswordResetCredentials(null)}>
          <IonHeader>
            <IonToolbar><IonTitle>{t('platform.passwordResetSuccess')}</IonTitle></IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="platform-credentials">
              <h2>{passwordResetCredentials?.shop}</h2>
              <p>{t('platform.shareResetCredentials')}</p>
              <dl>
                <dt>{t('platform.loginEmail')}</dt><dd>{passwordResetCredentials?.email || t('common.notAvailable')}</dd>
                <dt>{t('platform.phone')}</dt><dd>{passwordResetCredentials?.phone || t('common.notAvailable')}</dd>
                <dt>{t('platform.temporaryPassword')}</dt><dd>{passwordResetCredentials?.password}</dd>
              </dl>
              <IonButton expand="block" onClick={() => setPasswordResetCredentials(null)}>{t('common.close')}</IonButton>
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
