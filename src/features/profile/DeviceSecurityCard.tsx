import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import {
  useGetDevicesQuery,
  useLogoutMutation,
  useRevokeDeviceMutation,
} from '@core/api/authApi';
import { useGetUsersQuery } from '@core/api/userApi';
import { useAppDispatch, useAppSelector } from '@core/hooks';
import { logout, selectCurrentUser } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { apiErrorMessage } from '@core/services/notificationService';

export const DeviceSecurityCard: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const isOwner = user?.roles?.includes('OWNER') ?? false;
  const [selectedUserId, setSelectedUserId] = useState(user?.id ?? '');
  const [message, setMessage] = useState('');
  const { data: staff } = useGetUsersQuery(undefined, { skip: !isOwner });
  const isSelf = selectedUserId === user?.id;
  const devices = useGetDevicesQuery(
    isSelf ? undefined : { userId: selectedUserId },
    { skip: !selectedUserId }
  );
  const [revokeDevice, revokeState] = useRevokeDeviceMutation();
  const [logoutRequest, logoutState] = useLogoutMutation();

  useEffect(() => {
    if (user?.id && !selectedUserId) setSelectedUserId(user.id);
  }, [selectedUserId, user?.id]);

  const endLocalSession = () => {
    dispatch(logout());
    history.replace(ROUTES.LOGIN);
  };

  const signOut = async (scope: 'current' | 'all') => {
    setMessage('');
    try {
      await logoutRequest({
        scope,
        ...(scope === 'current' && refreshToken ? { refresh_token: refreshToken } : {}),
      }).unwrap();
      endLocalSession();
    } catch (error) {
      setMessage(apiErrorMessage(error, t('security.logoutFailed'), true));
    }
  };

  const revoke = async (deviceId: string, current?: boolean) => {
    setMessage('');
    try {
      await revokeDevice(deviceId).unwrap();
      if (current && isSelf) {
        endLocalSession();
        return;
      }
      await devices.refetch();
      setMessage(t('security.deviceRevoked'));
    } catch (error) {
      setMessage(apiErrorMessage(error, t('security.revokeFailed'), true));
    }
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{t('security.title')}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <p>{t('security.description')}</p>
        {isOwner && (
          <IonItem>
            <IonLabel>{t('security.staffMember')}</IonLabel>
            <IonSelect
              value={selectedUserId}
              onIonChange={(event) => setSelectedUserId(event.detail.value)}
            >
              {(staff?.data ?? [])
                .filter((member) => member.is_active)
                .map((member) => (
                  <IonSelectOption key={member.id} value={member.id}>
                    {member.name}
                  </IonSelectOption>
                ))}
            </IonSelect>
          </IonItem>
        )}
        {devices.isLoading ? (
          <IonSpinner aria-label={t('common.loading')} />
        ) : (
          <div className="space-y-3">
            {(devices.data?.data ?? []).map((device) => {
              const current = device.current;
              return (
                <div key={device.id} className="rounded border p-3">
                  <strong>{device.name}</strong>
                  {current && isSelf && <span> · {t('security.thisDevice')}</span>}
                  <div className="text-sm">
                    {t(`security.platform.${device.platform.toLowerCase()}`)} ·{' '}
                    {t('security.lastSeen', {
                      date: new Date(device.lastSeenAt).toLocaleString(),
                    })}
                  </div>
                  <IonButton
                    size="small"
                    fill="outline"
                    color="danger"
                    disabled={revokeState.isLoading}
                    onClick={() => void revoke(device.id, current)}
                  >
                    {t('security.revokeDevice')}
                  </IonButton>
                </div>
              );
            })}
            {!devices.data?.data.length && <p>{t('security.noDevices')}</p>}
          </div>
        )}
        {isSelf && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <IonButton
              fill="outline"
              disabled={logoutState.isLoading}
              onClick={() => void signOut('current')}
            >
              {t('security.logoutCurrent')}
            </IonButton>
            <IonButton
              color="danger"
              fill="outline"
              disabled={logoutState.isLoading}
              onClick={() => void signOut('all')}
            >
              {t('security.logoutAll')}
            </IonButton>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </IonCardContent>
    </IonCard>
  );
};
