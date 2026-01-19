import React, { useEffect, useState } from 'react';
import { IonButton, IonIcon, isPlatform } from '@ionic/react';
import { camera } from 'ionicons/icons';

// Capacitor BarcodeScanner plugin (optional - will be installed separately)
// @ts-ignore - Plugin may not be installed yet
let BarcodeScanner: any = null;
try {
  BarcodeScanner = require('@capacitor-community/barcode-scanner').BarcodeScanner;
} catch (e) {
  console.warn('Barcode scanner plugin not installed');
}

interface BarcodeScannerComponentProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScannerComponent: React.FC<BarcodeScannerComponentProps> = ({
  onScan,
  onError,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const isMobile = isPlatform('capacitor');

  useEffect(() => {
    if (isMobile && BarcodeScanner) {
      checkPermission();
    }
    return () => {
      if (isScanning && BarcodeScanner) {
        stopScan();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPermission = async () => {
    if (!BarcodeScanner) return;
    try {
      const status = await BarcodeScanner.checkPermission({ force: false });
      setHasPermission(status.granted);
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setHasPermission(false);
    }
  };

  const requestPermission = async () => {
    if (!BarcodeScanner) return;
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      setHasPermission(status.granted);
      if (!status.granted) {
        onError?.('Camera permission denied');
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      onError?.('Failed to request camera permission');
      setHasPermission(false);
    }
  };

  const startScan = async () => {
    if (!isMobile || !BarcodeScanner) {
      onError?.('Barcode scanning is only available on mobile devices with the plugin installed');
      return;
    }

    if (hasPermission === false) {
      await requestPermission();
      return;
    }

    if (hasPermission === null) {
      await checkPermission();
      return;
    }

    try {
      setIsScanning(true);
      
      // Make background of WebView transparent
      await BarcodeScanner.hideBackground();
      
      // Add scanning class to body for styling
      document.body.classList.add('scanner-active');
      
      const result = await BarcodeScanner.startScan();
      
      if (result.hasContent) {
        onScan(result.content || '');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      const err = error as Error;
      onError?.(err?.message || 'Failed to scan barcode');
    } finally {
      stopScan();
    }
  };

  const stopScan = async () => {
    if (!BarcodeScanner) return;
    try {
      document.body.classList.remove('scanner-active');
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (error) {
      console.error('Error stopping scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (!isMobile || !BarcodeScanner) {
    return (
      <IonButton
        expand="block"
        color="medium"
        disabled
      >
        <IonIcon slot="start" icon={camera} />
        {!isMobile ? 'Camera Scanner (Mobile Only)' : 'Install Barcode Scanner Plugin'}
      </IonButton>
    );
  }

  if (isScanning) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-transparent">
        <div className="w-full max-w-md mt-20">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <p className="text-center text-gray-800 font-medium">
              Point camera at barcode
            </p>
          </div>
        </div>
        
        {/* Scanning frame */}
        <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50" />
        
        <IonButton
          expand="block"
          color="danger"
          onClick={stopScan}
          className="w-full max-w-md"
        >
          Cancel Scan
        </IonButton>
      </div>
    );
  }

  return (
    <IonButton
      expand="block"
      onClick={startScan}
      disabled={hasPermission === false}
    >
      <IonIcon slot="start" icon={camera} />
      {hasPermission === false ? 'Camera Permission Required' : 'Scan Barcode'}
    </IonButton>
  );
};
