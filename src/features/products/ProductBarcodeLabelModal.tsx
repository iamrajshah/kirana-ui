import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { barcodeOutline, close, printOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGenerateStoreBarcodeMutation } from '@core/api/productApi';
import type { ProductVariant, StoreBarcodeInfo } from '@core/types';
import { formatCurrency } from '@utils/helpers';
import { apiErrorMessage } from '@core/services/notificationService';
import { Ean13Barcode } from './Ean13Barcode';
import { paginateBarcodeCopies } from './barcodePrintLayout';
import './product-barcode-label.css';

interface Props {
  isOpen: boolean;
  productName: string;
  variant: ProductVariant | null;
  onDismiss: () => void;
}

export const ProductBarcodeLabelModal: React.FC<Props> = ({
  isOpen,
  productName,
  variant,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const existing = variant?.barcodes?.find(
    (barcode) => barcode.is_active && /^20\d{11}$/.test(barcode.barcode)
  );
  const [generated, setGenerated] = useState<StoreBarcodeInfo | null>(null);
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [error, setError] = useState('');
  const [generateBarcode, { isLoading }] = useGenerateStoreBarcodeMutation();
  const barcode = generated?.barcode || existing?.barcode || '';
  const sellingPrice = Number(variant?.selling_price ?? variant?.price ?? 0);
  const variantLabel = [variant?.brand, variant?.size, variant?.packaging === 'LOOSE' ? t('products.packagingLoose') : variant?.packaging]
    .filter(Boolean)
    .join(' · ');
  const printPages = useMemo(() => paginateBarcodeCopies(copies), [copies]);

  useEffect(() => {
    setGenerated(null);
    setCopies(1);
    setShowPrice(true);
    setError('');
  }, [variant?.id]);

  const handleGenerate = async () => {
    if (!variant) return;
    setError('');
    try {
      const response = await generateBarcode({ variantId: variant.id }).unwrap();
      setGenerated(response.data);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('products.barcodeGenerateFailed')));
    }
  };

  const handleCopies = (value: string | null | undefined) => {
    const parsed = Number(value);
    setCopies(Number.isFinite(parsed) ? Math.min(50, Math.max(1, Math.floor(parsed))) : 1);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="product-barcode-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('products.barcodeLabelTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss} aria-label={t('common.close')}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="barcode-label-workspace">
          <section className="barcode-label-settings">
            <div className="barcode-label-heading">
              <IonIcon icon={barcodeOutline} />
              <div>
                <strong>{productName}</strong>
                <p>{variantLabel || t('products.defaultVariant')}</p>
              </div>
            </div>

            <IonItem lines="full">
              <IonLabel position="stacked">{t('products.labelCopies')}</IonLabel>
              <IonInput
                type="number"
                min="1"
                max="50"
                value={copies}
                onIonInput={(event) => handleCopies(event.detail.value)}
              />
            </IonItem>
            <IonItem lines="full">
              <IonToggle checked={showPrice} onIonChange={(event) => setShowPrice(event.detail.checked)}>
                {t('products.showPriceOnLabel')}
              </IonToggle>
            </IonItem>
            <IonNote>{t('products.barcodePriceNote')}</IonNote>

            {error && <p className="barcode-label-error" role="alert">{error}</p>}

            {!barcode ? (
              <IonButton expand="block" onClick={handleGenerate} disabled={isLoading}>
                <IonIcon slot="start" icon={barcodeOutline} />
                {isLoading ? t('common.loading') : t('products.generateBarcode')}
              </IonButton>
            ) : (
              <IonButton expand="block" onClick={() => window.print()}>
                <IonIcon slot="start" icon={printOutline} />
                {t('products.printBarcodeLabels', { count: copies })}
              </IonButton>
            )}
          </section>

          <section className="barcode-label-preview" aria-label={t('products.labelPreview')}>
            <span>{t('products.labelPreview')}</span>
            {barcode ? (
              <div className="product-barcode-label">
                <small>{t('products.storePackedItem')}</small>
                <strong>{productName}</strong>
                {variantLabel && <span>{variantLabel}</span>}
                {showPrice && <b>{formatCurrency(sellingPrice)}</b>}
                <Ean13Barcode
                  value={barcode}
                  ariaLabel={t('products.barcodeAriaLabel', { value: barcode })}
                />
              </div>
            ) : (
              <div className="barcode-label-empty">
                <IonIcon icon={barcodeOutline} />
                <p>{t('products.generateBarcodeHint')}</p>
              </div>
            )}
          </section>
        </div>

      </IonContent>

      {barcode && createPortal(
        <div className="barcode-print-sheet" aria-hidden="true">
          {printPages.map((page, pageIndex) => (
            <section className="barcode-print-page" key={pageIndex}>
              {page.map((index) => (
                <div className="product-barcode-label" key={index}>
                  <small>{t('products.storePackedItem')}</small>
                  <strong>{productName}</strong>
                  {variantLabel && <span>{variantLabel}</span>}
                  {showPrice && <b>{formatCurrency(sellingPrice)}</b>}
                  <Ean13Barcode
                    value={barcode}
                    ariaLabel={t('products.barcodeAriaLabel', { value: barcode })}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>,
        document.body
      )}
    </IonModal>
  );
};
