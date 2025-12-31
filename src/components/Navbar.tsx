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
} from '@ionic/react';
import { logOutOutline, personCircleOutline, person, lockClosed, chevronDown } from 'ionicons/icons';
import { useAppSelector, useAppDispatch } from '../core/hooks';
import { selectCurrentUser, logout } from '@core/auth/authSlice';
import { useHistory } from 'react-router';
import { ROUTES } from '@core/constants';

interface NavbarProps {
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const user = useAppSelector(selectCurrentUser);
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
        <IonTitle>{title}</IonTitle>
        {user && (
          <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '16px' }}>
            <div 
              ref={popoverRef}
              onClick={handleUserClick}
              style={{ 
                cursor: 'pointer',
                textAlign: 'right',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {user.tenant?.name || 'Store'}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--ion-color-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px'
              }}>
                {user.name || user.email}
                <IonIcon icon={chevronDown} style={{ fontSize: '12px' }} />
              </div>
            </div>
            <IonButtons>
              <IonButton onClick={navigateToProfile} fill="clear" size="small">
                <IonIcon slot="icon-only" icon={person} />
              </IonButton>
              <IonButton onClick={navigateToChangePassword} fill="clear" size="small">
                <IonIcon slot="icon-only" icon={lockClosed} />
              </IonButton>
              <IonButton onClick={handleLogout} fill="clear" size="small">
                <IonIcon slot="icon-only" icon={logOutOutline} />
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
            <IonLabel>My Profile</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} onClick={navigateToChangePassword}>
            <IonIcon icon={lockClosed} slot="start" />
            <IonLabel>Change Password</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>
    </IonHeader>
  );
};
