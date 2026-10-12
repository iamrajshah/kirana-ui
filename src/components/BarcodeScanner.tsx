import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon, isPlatform } from '@ionic/react';
import { camera } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { useTranslation } from 'react-i18next';

interface BarcodeScannerComponentProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScannerComponent: React.FC<BarcodeScannerComponentProps> = ({
  onScan,
  onError,
}) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const isMountedRef = useRef(true);
  const scanActiveRef = useRef(false);
  const isMobile = isPlatform('capacitor');

  const checkPermission = useCallback(async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: false });
      if (isMountedRef.current) {
        setPermissionBlocked(Boolean(status.denied || status.restricted || status.unknown));
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      if (isMountedRef.current) setPermissionBlocked(true);
    }
  }, []);

  const stopScan = useCallback(async () => {
    if (!scanActiveRef.current) {
      if (isMountedRef.current) setIsScanning(false);
      return;
    }
    scanActiveRef.current = false;
    document.body.classList.remove('scanner-active');
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (error) {
      console.error('Error stopping scan:', error);
    } finally {
      if (isMountedRef.current) setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (isMobile) void checkPermission();
    return () => {
      isMountedRef.current = false;
      if (scanActiveRef.current) void stopScan();
    };
  }, [checkPermission, isMobile, stopScan]);

  const startScan = async () => {
    if (!isMobile) {
      onError?.(t('foundation.barcode.mobileOnlyError'));
      return;
    }

    try {
      // Always request permission explicitly before scanning
      const permissionStatus = await BarcodeScanner.checkPermission({ force: true });

      if (!permissionStatus.granted) {
        if (permissionStatus.denied) {
          onError?.(t('foundation.barcode.permissionDenied'));
        } else {
          onError?.(t('foundation.barcode.permissionRequired'));
        }
        if (isMountedRef.current) {
          setPermissionBlocked(
            Boolean(
              permissionStatus.denied || permissionStatus.restricted || permissionStatus.unknown
            )
          );
        }
        return;
      }

      if (!isMountedRef.current) return;
      setPermissionBlocked(false);
      scanActiveRef.current = true;
      setIsScanning(true);

      // Prepare scanner
      await BarcodeScanner.prepare();

      // Make background of WebView transparent
      await BarcodeScanner.hideBackground();

      // Add scanning class to body for styling
      document.body.classList.add('scanner-active');

      // Start scanning
      const result = await BarcodeScanner.startScan();

      if (isMountedRef.current && result.hasContent) {
        onScan(result.content || '');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      const err = error as Error;
      if (isMountedRef.current) {
        onError?.(err?.message || t('foundation.barcode.scanFailed'));
      }
    } finally {
      await stopScan();
    }
  };

  if (!isMobile) {
    return (
      <IonButton expand="block" color="medium" disabled>
        <IonIcon slot="start" icon={camera} />
        {t('foundation.barcode.mobileOnly')}
      </IonButton>
    );
  }

  if (isScanning) {
    return (
      <div className="scanner-ui fixed inset-0 z-50 flex flex-col items-center justify-between p-6">
        <div className="w-full max-w-md mt-20">
          <div className="bg-black bg-opacity-70 rounded-lg p-4 shadow-lg">
            <p className="text-center text-white font-medium mb-2">
              {t('foundation.barcode.pointCamera')}
            </p>
            <p className="text-center text-gray-300 text-xs">
              {t('foundation.barcode.emulatorNote')}
            </p>
          </div>
        </div>

        {/* Scanning frame with bright border */}
        <div
          className="w-64 h-64 border-4 border-green-400 rounded-lg shadow-lg"
          style={{ borderStyle: 'dashed' }}
        />

        <IonButton expand="block" color="danger" onClick={stopScan} className="w-full max-w-md">
          {t('foundation.barcode.cancelScan')}
        </IonButton>
      </div>
    );
  }

  return (
    <IonButton expand="block" onClick={startScan} disabled={permissionBlocked}>
      <IonIcon slot="start" icon={camera} />
      {permissionBlocked
        ? t('foundation.barcode.cameraPermissionRequired')
        : t('products.scanBarcode')}
    </IonButton>
  );
};
