import React, { useEffect, useState } from 'react';
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
import { BARCODE_LABELS_PER_PAGE, paginateBarcodeCopies } from './barcodePrintLayout';
import './product-barcode-label.css';

interface Props {
  isOpen: boolean;
  shopName: string;
  productName: string;
  variant: ProductVariant | null;
  onDismiss: () => void;
}

const MAX_LABEL_COPIES = 1000;
const LARGE_PRINT_JOB_THRESHOLD = 500;

interface BarcodeLabelProps {
  barcode: string;
  productName: string;
  shopName: string;
  showPrice: boolean;
  showShopName: boolean;
  sellingPriceLabel: string;
  mrpPriceLabel: string;
  showMrp: boolean;
  variantLabel: string;
  storePackedItemLabel: string;
  mrpLabel: string;
  barcodeAriaLabel: string;
}

const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  barcode,
  productName,
  shopName,
  showPrice,
  showShopName,
  sellingPriceLabel,
  mrpPriceLabel,
  showMrp,
  variantLabel,
  storePackedItemLabel,
  mrpLabel,
  barcodeAriaLabel,
}) => {
  return (
    <div className="product-barcode-label">
      <div className="product-barcode-label-header">
        <small className={showShopName ? 'product-barcode-shop-name' : 'product-barcode-kind'}>
          {showShopName ? shopName : storePackedItemLabel}
        </small>
      </div>
      <strong className="product-barcode-name">{productName}</strong>
      {variantLabel && <span className="product-barcode-variant">{variantLabel}</span>}
      {showPrice && (
        <div className="product-barcode-price">
          <b>{sellingPriceLabel}</b>
          {showMrp && (
            <span>
              {mrpLabel} {mrpPriceLabel}
            </span>
          )}
        </div>
      )}
      <Ean13Barcode value={barcode} ariaLabel={barcodeAriaLabel} />
    </div>
  );
};

export const ProductBarcodeLabelModal: React.FC<Props> = ({
  isOpen,
  shopName,
  productName,
  variant,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const existing = variant?.barcodes?.find(
    (barcode) => barcode.is_active && /^20\d{11}$/.test(barcode.barcode)
  );
  const [generated, setGenerated] = useState<StoreBarcodeInfo | null>(null);
  const [copiesInput, setCopiesInput] = useState('1');
  const [showPrice, setShowPrice] = useState(true);
  const [showShopName, setShowShopName] = useState(true);
  const [printJob, setPrintJob] = useState<{
    copies: number;
    labelProps: BarcodeLabelProps;
  } | null>(null);
  const [error, setError] = useState('');
  const [generateBarcode, { isLoading }] = useGenerateStoreBarcodeMutation();
  const barcode = generated?.barcode || existing?.barcode || '';
  const sellingPrice = Number(variant?.selling_price ?? variant?.price ?? 0);
  const mrpPrice = Number(variant?.mrp_price ?? variant?.price ?? 0);
  const variantLabel = [
    variant?.brand,
    variant?.size,
    variant?.packaging === 'LOOSE' ? t('products.packagingLoose') : variant?.packaging,
  ]
    .filter(Boolean)
    .join(' · ');
  const parsedCopies = Number(copiesInput);
  const copiesAreValid =
    /^\d+$/.test(copiesInput) &&
    Number.isInteger(parsedCopies) &&
    parsedCopies >= 1 &&
    parsedCopies <= MAX_LABEL_COPIES;
  const copies = copiesAreValid ? parsedCopies : 0;
  const pageCount = copiesAreValid ? Math.ceil(copies / BARCODE_LABELS_PER_PAGE) : 0;
  const labelProps: BarcodeLabelProps = {
    barcode,
    productName,
    shopName,
    showPrice,
    showShopName,
    sellingPriceLabel: formatCurrency(sellingPrice),
    mrpPriceLabel: formatCurrency(mrpPrice),
    showMrp: showPrice && mrpPrice !== sellingPrice,
    variantLabel,
    storePackedItemLabel: t('products.storePackedItem'),
    mrpLabel: t('products.mrpShort'),
    barcodeAriaLabel: t('products.barcodeAriaLabel', { value: barcode }),
  };
  const printPages = printJob ? paginateBarcodeCopies(printJob.copies) : [];

  useEffect(() => {
    setGenerated(null);
    setCopiesInput('1');
    setShowPrice(true);
    setShowShopName(true);
    setPrintJob(null);
    setError('');
  }, [variant?.id]);

  useEffect(() => {
    if (!printJob) return;

    const clearPrintJob = () => setPrintJob(null);
    const frame = window.requestAnimationFrame(() => window.print());
    window.addEventListener('afterprint', clearPrintJob, { once: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', clearPrintJob);
    };
  }, [printJob]);

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

  const handleDismiss = () => {
    setPrintJob(null);
    onDismiss();
  };

  const handlePrint = () => {
    if (!copiesAreValid) return;
    setPrintJob({ copies, labelProps });
  };

  return (
    <IonModal
      isOpen={isOpen}
      onWillDismiss={() => setPrintJob(null)}
      onDidDismiss={handleDismiss}
      className="product-barcode-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('products.barcodeLabelTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDismiss} aria-label={t('common.close')}>
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
                max={String(MAX_LABEL_COPIES)}
                value={copiesInput}
                onIonInput={(event) => setCopiesInput(event.detail.value ?? '')}
              />
            </IonItem>
            {!copiesAreValid && (
              <p className="barcode-label-error" role="alert">
                {t('products.barcodeCopiesRange', { max: MAX_LABEL_COPIES })}
              </p>
            )}
            {copiesAreValid && (
              <IonNote>{t('products.barcodePageEstimate', { count: pageCount })}</IonNote>
            )}
            {copies > LARGE_PRINT_JOB_THRESHOLD && (
              <IonNote color="warning">{t('products.barcodeLargePrintWarning')}</IonNote>
            )}
            <IonItem lines="full">
              <IonToggle
                checked={showShopName}
                onIonChange={(event) => setShowShopName(event.detail.checked)}
              >
                {t('products.showShopNameOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showPrice}
                onIonChange={(event) => setShowPrice(event.detail.checked)}
              >
                {t('products.showPriceOnLabel')}
              </IonToggle>
            </IonItem>
            <IonNote>{t('products.barcodePriceNote')}</IonNote>

            {error && (
              <p className="barcode-label-error" role="alert">
                {error}
              </p>
            )}

            {!barcode ? (
              <IonButton expand="block" onClick={handleGenerate} disabled={isLoading}>
                <IonIcon slot="start" icon={barcodeOutline} />
                {isLoading ? t('common.loading') : t('products.generateBarcode')}
              </IonButton>
            ) : (
              <IonButton expand="block" onClick={handlePrint} disabled={!copiesAreValid}>
                <IonIcon slot="start" icon={printOutline} />
                {t('products.printBarcodeLabels', { count: copies })}
              </IonButton>
            )}
          </section>

          <section className="barcode-label-preview" aria-label={t('products.labelPreview')}>
            <span>{t('products.labelPreview')}</span>
            {barcode ? (
              <BarcodeLabel {...labelProps} />
            ) : (
              <div className="barcode-label-empty">
                <IonIcon icon={barcodeOutline} />
                <p>{t('products.generateBarcodeHint')}</p>
              </div>
            )}
          </section>
        </div>
      </IonContent>

      {printJob &&
        createPortal(
          <div className="barcode-print-sheet" aria-hidden="true">
            {printPages.map((page, pageIndex) => (
              <section className="barcode-print-page" key={pageIndex}>
                {page.map((index) => (
                  <BarcodeLabel key={index} {...printJob.labelProps} />
                ))}
              </section>
            ))}
          </div>,
          document.body
        )}
    </IonModal>
  );
};
