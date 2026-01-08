import React from 'react';
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
} from '@ionic/react';
import {
  briefcase,
  cardOutline,
  receipt,
  statsChart,
  personAdd,
  swapHorizontal,
  home,
  cart,
  people,
  cube,
  layers,
  cash,
} from 'ionicons/icons';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasAccessToTab } from '@core/permissions/rolePermissions';
import './SideMenu.css';

export const SideMenu: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];

  const handleNavigation = (path: string) => {
    history.push(path);
  };

  return (
    <IonMenu contentId="main-content" type="overlay">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Menu</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {/* Quick access to main tabs */}
          {hasAccessToTab(userRoles, 'dashboard') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.DASHBOARD)}>
                <IonIcon icon={home} slot="start" />
                <IonLabel>{t('dashboard.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'billing') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.BILLING)}>
                <IonIcon icon={cart} slot="start" />
                <IonLabel>{t('billing.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'customers') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.CUSTOMERS)}>
                <IonIcon icon={people} slot="start" />
                <IonLabel>{t('customers.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'products') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.PRODUCTS)}>
                <IonIcon icon={cube} slot="start" />
                <IonLabel>{t('products.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'payments') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.PAYMENTS)}>
                <IonIcon icon={cash} slot="start" />
                <IonLabel>{t('payments.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'inventory') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.INVENTORY)}>
                <IonIcon icon={layers} slot="start" />
                <IonLabel>{t('inventory.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {/* Additional features */}
          {hasAccessToTab(userRoles, 'suppliers') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.SUPPLIERS)}>
                <IonIcon icon={briefcase} slot="start" />
                <IonLabel>{t('suppliers.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'purchases') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.PURCHASES)}>
                <IonIcon icon={cardOutline} slot="start" />
                <IonLabel>{t('purchases.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'invoices') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.INVOICES)}>
                <IonIcon icon={receipt} slot="start" />
                <IonLabel>{t('invoices.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'reports') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.REPORTS)}>
                <IonIcon icon={statsChart} slot="start" />
                <IonLabel>{t('reports.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'users') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.USERS)}>
                <IonIcon icon={personAdd} slot="start" />
                <IonLabel>{t('users.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}

          {hasAccessToTab(userRoles, 'import-export') && (
            <IonMenuToggle>
              <IonItem button onClick={() => handleNavigation(ROUTES.IMPORT_EXPORT)}>
                <IonIcon icon={swapHorizontal} slot="start" />
                <IonLabel>{t('importExport.title')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};
