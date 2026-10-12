import React, { useState, useRef } from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonBackButton,
} from '@ionic/react';
import { logOutOutline, person, lockClosed, chevronDown } from 'ionicons/icons';
import { useAppSelector, useAppDispatch } from '../core/hooks';
import { selectCurrentUser, logout } from '@core/auth/authSlice';
import { useHistory } from 'react-router';
import { ROUTES } from '@core/constants';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  title: string;
  backHref?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title, backHref }) => {
  const user = useAppSelector(selectCurrentUser);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    history.replace(ROUTES.LOGIN);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopover(true);
  };

  const navigateToProfile = () => {
    setShowPopover(false);
    history.push(ROUTES.PROFILE);
  };

  const navigateToChangePassword = () => {
    setShowPopover(false);
    history.push(ROUTES.CHANGE_PASSWORD);
  };

  return (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          {backHref ? <IonBackButton defaultHref={backHref} /> : <IonMenuButton />}
        </IonButtons>
        <IonTitle className="px-1 sm:px-4">{title}</IonTitle>
        {user && (
          <div slot="end" className="mr-1 flex items-center gap-1 sm:mr-3 sm:gap-2">
            <div
              ref={popoverRef}
              onClick={handleUserClick}
              className="hidden cursor-pointer rounded px-2 py-1 text-right transition-colors sm:block"
              style={{
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {user.tenant?.name || 'Store'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--ion-color-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                }}
              >
                {user.name || user.email}
                <IonIcon icon={chevronDown} style={{ fontSize: '12px' }} />
              </div>
            </div>
            <IonButtons>
              <IonButton
                onClick={handleUserClick}
                fill="clear"
                aria-label={t('profile.accountMenu')}
                className="min-h-touch min-w-touch"
              >
                <IonIcon slot="icon-only" icon={person} />
              </IonButton>
            </IonButtons>
          </div>
        )}
      </IonToolbar>

      <IonPopover
        isOpen={showPopover}
        trigger={undefined}
        reference="event"
        onDidDismiss={() => setShowPopover(false)}
      >
        <IonList>
          <IonItem button={true} detail={false} onClick={navigateToProfile}>
            <IonIcon icon={person} slot="start" />
            <IonLabel>{t('profile.title')}</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} onClick={navigateToChangePassword}>
            <IonIcon icon={lockClosed} slot="start" />
            <IonLabel>{t('profile.changePassword')}</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} onClick={handleLogout}>
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>{t('auth.logout')}</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>
    </IonHeader>
  );
};
