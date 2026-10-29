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
  IonToast,
} from '@ionic/react';
import { logOutOutline, person, lockClosed, chevronDown } from 'ionicons/icons';
import { useAppSelector, useAppDispatch } from '../core/hooks';
import { selectCurrentUser, logout } from '@core/auth/authSlice';
import { useLogoutMutation } from '@core/api/authApi';
import { useHistory } from 'react-router';
import { ROUTES } from '@core/constants';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '@core/services/notificationService';
import './Navbar.css';

interface NavbarProps {
  title: string;
  backHref?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title, backHref }) => {
  const user = useAppSelector(selectCurrentUser);
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [showPopover, setShowPopover] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [logoutRequest, logoutState] = useLogoutMutation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const pendingAccountRoute = useRef<string | null>(null);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logoutRequest({
        scope: 'current',
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      }).unwrap();
      dispatch(logout());
      history.replace(ROUTES.LOGIN);
    } catch (error) {
      setLogoutError(apiErrorMessage(error, t('security.logoutFailed'), true));
    }
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopover(true);
  };

  const navigateToProfile = () => {
    pendingAccountRoute.current = ROUTES.PROFILE;
    setShowPopover(false);
  };

  const navigateToChangePassword = () => {
    pendingAccountRoute.current = ROUTES.CHANGE_PASSWORD;
    setShowPopover(false);
  };

  const handlePopoverDismiss = () => {
    setShowPopover(false);
    const route = pendingAccountRoute.current;
    pendingAccountRoute.current = null;
    if (route) history.push(route);
  };

  return (
    <IonHeader className="bazaar-navbar">
      <IonToolbar className="bazaar-navbar__toolbar">
        <IonButtons slot="start">
          {backHref ? <IonBackButton defaultHref={backHref} /> : <IonMenuButton />}
        </IonButtons>
        <IonTitle className="bazaar-navbar__title px-1 sm:px-4">
          <span>{title}</span>
        </IonTitle>
        {user && (
          <div
            slot="end"
            className="bazaar-navbar__account mr-1 flex items-center gap-1 sm:mr-3 sm:gap-2"
          >
            <div
              ref={popoverRef}
              onClick={handleUserClick}
              className="bazaar-navbar__store hidden cursor-pointer rounded px-2 py-1 text-right transition-colors sm:block"
            >
              <div className="bazaar-navbar__store-name">
                {user.tenant?.name || t('common.store')}
              </div>
              <div className="bazaar-navbar__user-name">
                {user.name || user.email}
                <IonIcon icon={chevronDown} />
              </div>
            </div>
            <IonButtons>
              <IonButton
                onClick={handleUserClick}
                fill="clear"
                aria-label={t('profile.accountMenu')}
                className="bazaar-navbar__profile min-h-touch min-w-touch"
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
        onDidDismiss={handlePopoverDismiss}
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
          <IonItem
            button={true}
            detail={false}
            disabled={logoutState.isLoading}
            onClick={() => void handleLogout()}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>{t('auth.logout')}</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>
      <IonToast
        isOpen={Boolean(logoutError)}
        onDidDismiss={() => setLogoutError('')}
        message={logoutError}
        duration={3000}
        color="danger"
      />
    </IonHeader>
  );
};
