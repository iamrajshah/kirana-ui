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
import { useHistory, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems } from '@core/navigation/navigation';
import './SideMenu.css';

export const SideMenu: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const items = getNavigationItems(user?.roles || []);
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <IonMenu contentId="main-content" type="overlay" className="workspace-menu">
      <IonHeader>
        <IonToolbar className="workspace-menu-toolbar">
          <IonTitle>
            <span className="workspace-menu-brand" aria-label={t('common.appName')}>
              <span className="workspace-menu-brand__mark" aria-hidden="true">
                क
              </span>
              <span className="workspace-menu-brand__copy">
                <strong>{t('common.appName')}</strong>
                <small>{user?.tenant?.name || t('common.store')}</small>
              </span>
            </span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {groups.map((group) => {
          const entries = items.filter((item) => item.group === group);
          if (entries.length === 0) return null;
          return (
            <IonList key={group} className="workspace-menu-group">
              <div className="workspace-menu-heading">{t(`workspace.${group}`)}</div>
              {entries.map((item) => (
                <IonMenuToggle key={item.id} autoHide={false}>
                  <IonItem
                    button
                    detail={false}
                    aria-current={location.pathname === item.href ? 'page' : undefined}
                    className={
                      location.pathname === item.href ? 'workspace-menu-active' : undefined
                    }
                    onClick={() => history.push(item.href)}
                  >
                    <IonIcon icon={item.icon} slot="start" />
                    <IonLabel>{t(item.labelKey)}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              ))}
            </IonList>
          );
        })}
      </IonContent>
    </IonMenu>
  );
};
