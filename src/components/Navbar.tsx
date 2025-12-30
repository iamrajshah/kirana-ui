import React, { useState } from 'react';
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
  const [popoverEvent, setPopoverEvent] = useState<any>(undefined);

  const handleLogout = () => {
    dispatch(logout());
    history.replace(ROUTES.LOGIN);
  };

  const handleUserClick = (e: any) => {
    setPopoverEvent(e.nativeEvent);
    setShowPopover(true);
  };

  const navigateToProfile = () => {
    setShowPopover(false);
    history.push('/profile');
  };

  const navigateToChangePassword = () => {
    setShowPopover(false);
    history.push('/change-password');
  };

  return (
    <IonHeader>
      <IonToolbar>
        <IonTitle>{title}</IonTitle>
        {user && (
          <div slot="end" className="flex items-center gap-3 mr-4">
            <div 
              className="text-right cursor-pointer" 
              onClick={handleUserClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="font-semibold text-sm">
                {user.tenant?.name || 'Store'}
              </div>
              <div className="text-gray-500 flex items-center justify-end" style={{ fontSize: '11px' }}>
                {user.name || user.email}
                <IonIcon icon={chevronDown} style={{ marginLeft: '4px', fontSize: '12px' }} />
              </div>
            </div>
            <IonButtons>
              <IonButton onClick={handleLogout} fill="clear" size="small">
                <IonIcon slot="icon-only" icon={logOutOutline} />
              </IonButton>
            </IonButtons>
          </div>
        )}
      </IonToolbar>
      
      <IonPopover
        isOpen={showPopover}
        event={popoverEvent}
        onDidDismiss={() => setShowPopover(false)}
      >
        <IonList>
          <IonItem button onClick={navigateToProfile}>
            <IonIcon icon={person} slot="start" />
            <IonLabel>My Profile</IonLabel>
          </IonItem>
          <IonItem button onClick={navigateToChangePassword}>
            <IonIcon icon={lockClosed} slot="start" />
            <IonLabel>Change Password</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>
    </IonHeader>
  );
};
