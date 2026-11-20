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
import { createLabelQr, type LabelQr } from './barcodeLabelQr';
import {
  BARCODE_LABELS_PER_PAGE,
  EXTENDED_LABELS_PER_PAGE,
  QR_LABELS_PER_PAGE,
  paginateBarcodeCopies,
} from './barcodePrintLayout';
import './product-barcode-label.css';

interface Props {
  isOpen: boolean;
  shopName: string;
  productName: string;
  variant: ProductVariant | null;
  onDismiss: () => void;
  isDemo?: boolean;
}

const MAX_LABEL_COPIES = 1000;
const LARGE_PRINT_JOB_THRESHOLD = 500;
const MAX_LABEL_DATE = '9999-12-31';
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseLabelDate = (value: string) => {
  if (!DATE_INPUT_PATTERN.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const todayInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

interface BarcodeLabelOptions {
  showPrice: boolean;
  showShopName: boolean;
  showMrp: boolean;
  showVariant: boolean;
  showSku: boolean;
  showPackedOn: boolean;
  showExpiry: boolean;
  showBarcodeNumber: boolean;
  packedOnDate: string;
  expiryDate: string;
  netWeight: string;
  batchNumber: string;
  qrUrl: string;
}

const LABEL_DEFAULTS_KEY = 'kirana_barcode_label_defaults_v1';
const savedToggleKeys = [
  'showPrice',
  'showShopName',
  'showMrp',
  'showVariant',
  'showSku',
  'showPackedOn',
  'showExpiry',
  'showBarcodeNumber',
] as const;
const createDefaultLabelOptions = (useSaved = true): BarcodeLabelOptions => {
  const defaults: BarcodeLabelOptions = {
    showPrice: true,
    showShopName: true,
    showMrp: true,
    showVariant: true,
    showSku: false,
    showPackedOn: false,
    showExpiry: false,
    showBarcodeNumber: true,
    packedOnDate: todayInputValue(),
    expiryDate: '',
    netWeight: '',
    batchNumber: '',
    qrUrl: '',
  };
  if (!useSaved) return defaults;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(LABEL_DEFAULTS_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const key of savedToggleKeys) {
        const value = (saved as Record<string, unknown>)[key];
        if (typeof value === 'boolean') defaults[key] = value;
      }
    }
  } catch {
    /* A damaged device preference must not prevent printing. */
  }
  return defaults;
};

const getDateValidationKey = ({
  showPackedOn,
  showExpiry,
  packedOnDate,
  expiryDate,
}: BarcodeLabelOptions) => {
  if (showExpiry && !parseLabelDate(expiryDate)) return 'products.expiryDateRequired';
  if (showPackedOn && !parseLabelDate(packedOnDate)) {
    return 'products.packedOnDateRequired';
  }
  if (showPackedOn && showExpiry && expiryDate < packedOnDate) {
    return 'products.expiryBeforePackedOn';
  }
  return '';
};

interface BarcodeLabelProps {
  barcode: string;
  productName: string;
  shopName: string;
  options: Pick<BarcodeLabelOptions, 'showPrice' | 'showShopName' | 'showBarcodeNumber'>;
  sellingPriceLabel: string;
  mrpPriceLabel: string;
  showMrp: boolean;
  variantLabel: string;
  details: string[];
  storePackedItemLabel: string;
  mrpLabel: string;
  barcodeAriaLabel: string;
  demoMarker?: string | null;
  qr?: LabelQr | null;
  format?: 'standard' | 'extended' | 'qr';
  qrLabel?: string;
}

const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  barcode,
  productName,
  shopName,
  options: { showPrice, showShopName, showBarcodeNumber },
  sellingPriceLabel,
  mrpPriceLabel,
  showMrp,
  variantLabel,
  details,
  storePackedItemLabel,
  mrpLabel,
  barcodeAriaLabel,
  demoMarker,
  qr,
  format = 'standard',
  qrLabel,
}) => {
  return (
    <div
      className={`product-barcode-label product-barcode-label--${format}${details.length ? ' product-barcode-label--with-details' : ''}`}
    >
      {demoMarker && <b className="product-barcode-demo-marker">{demoMarker}</b>}
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
      {details.length > 0 && (
        <div className="product-barcode-details">
          {details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      )}
      <Ean13Barcode value={barcode} ariaLabel={barcodeAriaLabel} showText={showBarcodeNumber} />
      {qr && (
        <svg
          className="product-label-qr"
          role="img"
          aria-label={qrLabel}
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          shapeRendering="crispEdges"
        >
          <rect width={qr.size} height={qr.size} fill="white" />
          <path d={qr.path} fill="black" />
        </svg>
      )}
    </div>
  );
};

export const ProductBarcodeLabelModal: React.FC<Props> = ({
  isOpen,
  shopName,
  productName,
  variant,
  onDismiss,
  isDemo = false,
}) => {
  const { t, i18n } = useTranslation();
  const existing = variant?.barcodes?.find(
    (barcode) => barcode.is_active && /^20\d{11}$/.test(barcode.barcode)
  );
  const [generated, setGenerated] = useState<StoreBarcodeInfo | null>(null);
  const [copiesInput, setCopiesInput] = useState('1');
  const [labelPreset, setLabelPreset] = useState('CUSTOM');
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [labelOptions, setLabelOptions] = useState(createDefaultLabelOptions);
  const [printJob, setPrintJob] = useState<{
    copies: number;
    labelProps: BarcodeLabelProps;
  } | null>(null);
  const [error, setError] = useState('');
  const [generateBarcode, { isLoading }] = useGenerateStoreBarcodeMutation();
  const barcode = generated?.barcode || existing?.barcode || '';
  const {
    showPrice,
    showShopName,
    showMrp,
    showVariant,
    showSku,
    showPackedOn,
    showExpiry,
    showBarcodeNumber,
    packedOnDate,
    expiryDate,
  } = labelOptions;
  const updateLabelOption = <Key extends keyof BarcodeLabelOptions>(
    key: Key,
    value: BarcodeLabelOptions[Key]
  ) => {
    setLabelPreset('CUSTOM');
    setDefaultsSaved(false);
    setLabelOptions((current) => ({ ...current, [key]: value }));
  };
  const labelQr = useMemo(() => createLabelQr(labelOptions.qrUrl), [labelOptions.qrUrl]);
  const qrInvalid = Boolean(labelOptions.qrUrl.trim()) && !labelQr;
  const labelFormat = labelOptions.qrUrl.trim()
    ? 'qr'
    : labelOptions.netWeight.trim() || labelOptions.batchNumber.trim()
      ? 'extended'
      : 'standard';
  const labelsPerPage =
    labelFormat === 'qr'
      ? QR_LABELS_PER_PAGE
      : labelFormat === 'extended'
        ? EXTENDED_LABELS_PER_PAGE
        : BARCODE_LABELS_PER_PAGE;
  const applyPreset = (preset: string) =>
    setLabelOptions({
      ...createDefaultLabelOptions(false),
      ...(preset === 'LOOSE'
        ? { showVariant: false, showMrp: false, showSku: true, netWeight: variant?.size || '' }
        : {}),
      ...(preset === 'PACKED' ? { showPackedOn: true, showExpiry: true } : {}),
    });
  const sellingPrice = Number(variant?.selling_price ?? variant?.price ?? 0);
  const hasMrp = variant?.mrp_price != null;
  const mrpPrice = Number(variant?.mrp_price ?? 0);
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
  const pageCount = copiesAreValid ? Math.ceil(copies / labelsPerPage) : 0;
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const locale = language === 'en' ? 'en-IN' : language;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [locale]
  );
  const dateValidationKey = getDateValidationKey(labelOptions);
  const datesAreValid = !dateValidationKey;
  const dateError = dateValidationKey ? t(dateValidationKey) : '';
  const packedOnDateValue = parseLabelDate(packedOnDate);
  const expiryDateValue = parseLabelDate(expiryDate);
  const details = [
    showSku && variant?.sku ? t('products.barcodeSkuDetail', { value: variant.sku }) : '',
    showPackedOn && packedOnDateValue
      ? t('products.barcodePackedOnDetail', {
          value: dateFormatter.format(packedOnDateValue),
        })
      : '',
    showExpiry && expiryDateValue
      ? t('products.barcodeExpiryDetail', {
          value: dateFormatter.format(expiryDateValue),
        })
      : '',
  ].filter(Boolean);
  if (labelOptions.netWeight.trim())
    details.push(`${t('products.labelNetWeight')}: ${labelOptions.netWeight.trim()}`);
  if (labelOptions.batchNumber.trim())
    details.push(`${t('products.labelBatch')}: ${labelOptions.batchNumber.trim()}`);
  const labelProps: BarcodeLabelProps = {
    qr: labelQr,
    format: labelFormat,
    qrLabel: t('products.labelQr'),
    barcode,
    productName,
    shopName,
    options: { showPrice, showShopName, showBarcodeNumber },
    sellingPriceLabel: formatCurrency(sellingPrice),
    mrpPriceLabel: formatCurrency(mrpPrice),
    showMrp: showPrice && showMrp && hasMrp && mrpPrice !== sellingPrice,
    variantLabel: showVariant ? variantLabel : '',
    details,
    storePackedItemLabel: t('products.storePackedItem'),
    mrpLabel: t('products.mrpShort'),
    barcodeAriaLabel: t('products.barcodeAriaLabel', { value: barcode }),
    demoMarker: isDemo ? 'DEMO — NOT A VALID BUSINESS DOCUMENT' : null,
  };
  const printPages = printJob
    ? paginateBarcodeCopies(
        printJob.copies,
        printJob.labelProps.format === 'qr'
          ? QR_LABELS_PER_PAGE
          : printJob.labelProps.format === 'extended'
            ? EXTENDED_LABELS_PER_PAGE
            : BARCODE_LABELS_PER_PAGE
      )
    : [];

  useEffect(() => {
    setGenerated(null);
    setCopiesInput('1');
    setLabelPreset('CUSTOM');
    setDefaultsSaved(false);
    setLabelOptions(createDefaultLabelOptions());
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
    if (!copiesAreValid || !datesAreValid || qrInvalid) return;
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
                aria-label={t('products.labelCopies')}
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

            <strong className="barcode-label-section-title">{t('products.labelContent')}</strong>
            <IonItem lines="full">
              <IonToggle
                checked={showShopName}
                onIonChange={(event) => updateLabelOption('showShopName', event.detail.checked)}
              >
                {t('products.showShopNameOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showPrice}
                onIonChange={(event) => updateLabelOption('showPrice', event.detail.checked)}
              >
                {t('products.showPriceOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showMrp}
                disabled={!showPrice || !hasMrp}
                onIonChange={(event) => updateLabelOption('showMrp', event.detail.checked)}
              >
                {t('products.showMrpOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showVariant}
                onIonChange={(event) => updateLabelOption('showVariant', event.detail.checked)}
              >
                {t('products.showVariantOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showSku}
                disabled={!variant?.sku}
                onIonChange={(event) => updateLabelOption('showSku', event.detail.checked)}
              >
                {t('products.showSkuOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showBarcodeNumber}
                onIonChange={(event) =>
                  updateLabelOption('showBarcodeNumber', event.detail.checked)
                }
              >
                {t('products.showBarcodeNumberOnLabel')}
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={showPackedOn}
                onIonChange={(event) => updateLabelOption('showPackedOn', event.detail.checked)}
              >
                {t('products.showPackedOnLabel')}
              </IonToggle>
            </IonItem>
            {showPackedOn && (
              <IonItem lines="full">
                <IonLabel position="stacked">{t('products.packedOnDate')}</IonLabel>
                <IonInput
                  aria-label={t('products.packedOnDate')}
                  type="date"
                  max={MAX_LABEL_DATE}
                  value={packedOnDate}
                  onIonInput={(event) =>
                    updateLabelOption('packedOnDate', event.detail.value ?? '')
                  }
                />
              </IonItem>
            )}
            <IonItem lines="full">
              <IonToggle
                checked={showExpiry}
                onIonChange={(event) => updateLabelOption('showExpiry', event.detail.checked)}
              >
                {t('products.showExpiryOnLabel')}
              </IonToggle>
            </IonItem>
            {showExpiry && (
              <IonItem lines="full">
                <IonLabel position="stacked">{t('products.expiryDate')}</IonLabel>
                <IonInput
                  aria-label={t('products.expiryDate')}
                  type="date"
                  min={showPackedOn ? packedOnDate : undefined}
                  max={MAX_LABEL_DATE}
                  value={expiryDate}
                  onIonInput={(event) => updateLabelOption('expiryDate', event.detail.value ?? '')}
                />
              </IonItem>
            )}
            {dateError && (
              <p className="barcode-label-error" role="alert">
                {dateError}
              </p>
            )}
            <div className="barcode-extra-fields">
              <label>
                {t('products.labelPreset')}
                <select
                  value={labelPreset}
                  onChange={(event) => {
                    setLabelPreset(event.target.value);
                    applyPreset(event.target.value);
                  }}
                >
                  <option value="CUSTOM" disabled>
                    {t('products.presetCustom')}
                  </option>
                  <option value="STANDARD">{t('products.presetStandard')}</option>
                  <option value="LOOSE">{t('products.presetLoose')}</option>
                  <option value="PACKED">{t('products.presetPacked')}</option>
                </select>
              </label>
              <label>
                {t('products.labelNetWeight')}
                <input
                  maxLength={16}
                  value={labelOptions.netWeight}
                  onChange={(event) => updateLabelOption('netWeight', event.target.value)}
                />
              </label>
              <label>
                {t('products.labelBatch')}
                <input
                  maxLength={24}
                  value={labelOptions.batchNumber}
                  onChange={(event) => updateLabelOption('batchNumber', event.target.value)}
                />
              </label>
              <label>
                {t('products.labelQrLink')}
                <input
                  type="url"
                  maxLength={180}
                  value={labelOptions.qrUrl}
                  onChange={(event) => updateLabelOption('qrUrl', event.target.value)}
                />
              </label>
              <button
                type="button"
                className="barcode-save-defaults"
                onClick={() => {
                  try {
                    localStorage.setItem(
                      LABEL_DEFAULTS_KEY,
                      JSON.stringify(
                        Object.fromEntries(savedToggleKeys.map((key) => [key, labelOptions[key]]))
                      )
                    );
                    setDefaultsSaved(true);
                  } catch {
                    setError(t('products.labelDefaultsFailed'));
                  }
                }}
              >
                {t('products.saveLabelDefaults')}
              </button>
              {defaultsSaved && <p role="status">{t('products.labelDefaultsSaved')}</p>}
              <p>
                {t('products.labelSizeInfo', {
                  width: 58,
                  height: labelFormat === 'qr' ? 65 : labelFormat === 'extended' ? 50 : 35,
                  count: labelsPerPage,
                })}
              </p>
              {qrInvalid && <p role="alert">{t('products.labelQrInvalid')}</p>}
            </div>
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
              <IonButton
                expand="block"
                onClick={handlePrint}
                disabled={!copiesAreValid || !datesAreValid || qrInvalid}
              >
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
              <section
                className={`barcode-print-page barcode-print-page--${printJob.labelProps.format || 'standard'}`}
                key={pageIndex}
              >
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
