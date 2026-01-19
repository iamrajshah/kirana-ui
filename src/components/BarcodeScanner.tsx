import React, { useEffect, useState } from 'react';
import { IonButton, IonIcon, isPlatform } from '@ionic/react';
import { camera } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

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
    if (isMobile) {
      checkPermission();
    }
    return () => {
      if (isScanning) {
        stopScan();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPermission = async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: false });
      setHasPermission(status.granted);
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setHasPermission(false);
    }
  };

  const requestPermission = async () => {
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
    if (!isMobile) {
      onError?.('Barcode scanning is only available on mobile devices');
      return;
    }

    try {
      // Always request permission explicitly before scanning
      const permissionStatus = await BarcodeScanner.checkPermission({ force: true });
      
      if (!permissionStatus.granted) {
        if (permissionStatus.denied) {
          onError?.('Camera permission denied. Please enable it in app settings.');
        } else {
          onError?.('Camera permission is required to scan barcodes');
        }
        setHasPermission(false);
        return;
      }

      setHasPermission(true);
      setIsScanning(true);
      
      // Prepare scanner
      await BarcodeScanner.prepare();
      
      // Make background of WebView transparent
      await BarcodeScanner.hideBackground();
      
      // Add scanning class to body for styling
      document.body.classList.add('scanner-active');
      
      // Start scanning
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

  if (!isMobile) {
    return (
      <IonButton
        expand="block"
        color="medium"
        disabled
      >
        <IonIcon slot="start" icon={camera} />
        Camera Scanner (Mobile Only)
      </IonButton>
    );
  }

  if (isScanning) {
    return (
      <div className="scanner-ui fixed inset-0 z-50 flex flex-col items-center justify-between p-6">
        <div className="w-full max-w-md mt-20">
          <div className="bg-black bg-opacity-70 rounded-lg p-4 shadow-lg">
            <p className="text-center text-white font-medium mb-2">
              Point camera at barcode
            </p>
            <p className="text-center text-gray-300 text-xs">
              Note: Emulators may not show camera. Use a real device for best results.
            </p>
          </div>
        </div>
        
        {/* Scanning frame with bright border */}
        <div 
          className="w-64 h-64 border-4 border-green-400 rounded-lg shadow-lg" 
          style={{ borderStyle: 'dashed' }}
        />
        
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
