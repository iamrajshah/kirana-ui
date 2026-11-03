import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/react';
import {
  addCircleOutline,
  cameraOutline,
  checkmarkCircleOutline,
  cloudUploadOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { ROUTES } from '@core/constants';
import {
  type PurchaseImportDraft,
  type PurchaseImportLine,
  useConfirmPurchaseImportMutation,
  useExtractPurchaseBillMutation,
} from '@core/api/purchaseImportApi';
import { useGetSuppliersQuery } from '@core/api/supplierApi';
import { useGetFirmsQuery } from '@core/api/firmApi';
import { useLazySearchVariantsQuery } from '@core/api/productApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { formatCurrency } from '@utils/helpers';
import { attemptPurchaseBillImageOcr, type PurchaseBillOcrProgress } from './purchaseBillOcr';
import { reconcilePurchaseFirmId, resolvePurchaseFirmId } from './purchaseFirmSelection';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';
import { calculatePurchaseImportTotals } from './purchaseImportCalculation';
import { addCalendarDays, canReceiveExpiryDate, kolkataCalendarDate } from './purchaseExpiryDates';
import './PurchaseBillImportPage.css';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

type EditableDraft = PurchaseImportDraft & { items: PurchaseImportLine[] };

const PurchaseBillImportPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const currentUser = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const canTrackExpiry = canUseCommercialFeature(
    currentUser?.roles ?? [],
    commercialAccess,
    'EXPIRY_TRACKING'
  );
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ocrController = useRef<AbortController | null>(null);
  const manualLineSequence = useRef(0);
  const [extractBill, { isLoading: isExtracting }] = useExtractPurchaseBillMutation();
  const [confirmImport, { isLoading: isConfirming }] = useConfirmPurchaseImportMutation();
  const [searchVariants, { data: variantResults, isFetching: isSearching }] =
    useLazySearchVariantsQuery();
  const { data: suppliersResponse } = useGetSuppliersQuery({ limit: 100, isActive: true });
  const { data: firmsResponse } = useGetFirmsQuery({ active: true });
  const suppliers = useMemo(() => suppliersResponse?.data ?? [], [suppliersResponse?.data]);
  const firms = useMemo(() => firmsResponse?.data.firms ?? [], [firmsResponse?.data.firms]);
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedFirmId, setSelectedFirmId] = useState('');
  const [firmWasOverridden, setFirmWasOverridden] = useState(false);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [confirmedMismatch, setConfirmedMismatch] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK'>('CASH');
  const [mappingLineId, setMappingLineId] = useState<string | null>(null);
  const [mappingSearch, setMappingSearch] = useState('');
  const [error, setError] = useState('');
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<PurchaseBillOcrProgress | null>(null);

  const calculated = useMemo(() => {
    return calculatePurchaseImportTotals(draft?.items ?? [], pricesIncludeTax);
  }, [draft?.items, pricesIncludeTax]);
  const amount = calculated.total;
  const extractedTotal = draft?.totalAmount;
  const materialMismatch =
    typeof extractedTotal === 'number' &&
    Math.abs(extractedTotal - calculated.total) > Math.max(1, extractedTotal * 0.01);

  useEffect(() => {
    if (!selectedSupplierId || firms.length === 0) return;
    const supplier = suppliers.find((item) => item.id === selectedSupplierId);
    if (!supplier) return;
    setSelectedFirmId((currentFirmId) =>
      reconcilePurchaseFirmId(supplier, firms, currentFirmId, firmWasOverridden)
    );
  }, [firmWasOverridden, firms, selectedSupplierId, suppliers]);

  const updateDraft = (patch: Partial<EditableDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setConfirmedReview(false);
    setConfirmedMismatch(false);
  };

  const updateLine = (lineId: string, patch: Partial<PurchaseImportLine>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.lineId === lineId ? { ...item, ...patch } : item
            ),
          }
        : current
    );
    setConfirmedReview(false);
    setConfirmedMismatch(false);
  };

  const addLine = () => {
    const lineId = `manual-${Date.now()}-${manualLineSequence.current++}`;
    setDraft((current) =>
      current
        ? {
            ...current,
            items: [
              ...current.items,
              {
                lineId,
                productName: '',
                quantity: 1,
                unitPrice: 0,
                purchaseMode: 'UNIT',
                purchaseUnitLabel: 'Box',
                unitsPerPurchaseUnit: 20,
              },
            ],
          }
        : current
    );
    setMappingLineId(lineId);
    setMappingSearch('');
    setConfirmedReview(false);
    setConfirmedMismatch(false);
  };

  const removeLine = (lineId: string) => {
    setDraft((current) =>
      current
        ? { ...current, items: current.items.filter((item) => item.lineId !== lineId) }
        : current
    );
    if (mappingLineId === lineId) {
      setMappingLineId(null);
      setMappingSearch('');
    }
    setConfirmedReview(false);
    setConfirmedMismatch(false);
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!ACCEPTED_FILE_TYPES.has(file.type)) {
      setError(t('purchaseImport.unsupportedFile'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('purchaseImport.fileTooLarge'));
      return;
    }

    let extractedText: string | undefined;
    let ocrConfidence: number | undefined;
    let localWarning: string | undefined;
    try {
      if (file.type.startsWith('image/')) {
        const controller = new AbortController();
        ocrController.current = controller;
        setOcrProgress({ status: 'loading', progress: 0 });
        try {
          const result = await attemptPurchaseBillImageOcr(file, {
            signal: controller.signal,
            onProgress: setOcrProgress,
          });
          if (result.status === 'CANCELLED') {
            setError(t('purchaseImport.ocrCancelled'));
            return;
          }
          if (result.status === 'TEXT') {
            extractedText = result.text;
            ocrConfidence = result.confidence;
          } else {
            localWarning = t(
              result.status === 'NO_TEXT'
                ? 'purchaseImport.ocrNoText'
                : 'purchaseImport.ocrUnavailable'
            );
          }
        } finally {
          ocrController.current = null;
          setOcrProgress(null);
        }
      }

      const response = await extractBill({
        document: file,
        ...(extractedText
          ? {
              extractedText,
              extractionSource: 'CLIENT_EXTRACTED_TEXT' as const,
              ocrConfidence,
            }
          : {}),
      }).unwrap();
      const extracted = response.data;
      setDraft({
        ...extracted,
        warnings: localWarning ? [localWarning, ...extracted.warnings] : extracted.warnings,
        items: extracted.items.map((item) => ({
          ...item,
          purchaseMode: item.purchaseMode ?? 'UNIT',
          purchaseUnitLabel: item.purchaseUnitLabel ?? 'Box',
          unitsPerPurchaseUnit: item.unitsPerPurchaseUnit ?? 20,
        })),
      });
      setSelectedSupplierId(extracted.supplier?.id ?? '');
      const extractedSupplier = suppliers.find((item) => item.id === extracted.supplier?.id);
      setSelectedFirmId(
        extractedSupplier
          ? resolvePurchaseFirmId(extractedSupplier, firms)
          : (firms.find((firm) => firm.is_default_sales)?.id ?? firms[0]?.id ?? '')
      );
      setFirmWasOverridden(false);
      setPricesIncludeTax(true);
      setConfirmedMismatch(false);
      setPaymentAmount('0');
      setConfirmedReview(false);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('purchaseImport.extractFailed'), true));
    }
  };

  const beginMapping = (line: PurchaseImportLine) => {
    const query = line.productName || line.rawText || '';
    setMappingLineId(line.lineId);
    setMappingSearch(query);
    if (query.trim().length >= 2) void searchVariants({ search: query.trim() });
  };

  const validItems =
    draft?.items.length &&
    draft.items.every(
      (item) =>
        Number(item.variantId) > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unitPrice) &&
        item.unitPrice > 0 &&
        (item.gstRate == null ||
          (Number.isFinite(item.gstRate) && item.gstRate >= 0 && item.gstRate <= 28)) &&
        (!item.hsnCode?.trim() || /^\d{4,8}$/.test(item.hsnCode.trim())) &&
        (item.purchaseMode !== 'PACK' ||
          (Boolean(item.purchaseUnitLabel?.trim()) &&
            Number.isInteger(item.unitsPerPurchaseUnit) &&
            Number(item.unitsPerPurchaseUnit) >= 2)) &&
        (!canTrackExpiry ||
          ((!item.manufacturingDate ||
            !item.expiryDate ||
            item.manufacturingDate <= item.expiryDate) &&
            canReceiveExpiryDate(item.expiryDate ?? '')))
    );
  const canConfirm = Boolean(
    draft &&
    validItems &&
    selectedSupplierId &&
    selectedFirmId &&
    draft.invoiceNumber?.trim() &&
    draft.invoiceDate &&
    confirmedReview &&
    (!materialMismatch || confirmedMismatch) &&
    Number(paymentAmount || 0) >= 0 &&
    Number(paymentAmount || 0) <= calculated.total &&
    !isConfirming
  );

  const confirm = async () => {
    if (!draft || !canConfirm) return;
    setError('');
    try {
      const response = await confirmImport({
        draftId: draft.draftId,
        supplier_id: Number(selectedSupplierId),
        firm_id: Number(selectedFirmId),
        invoice_number: draft.invoiceNumber?.trim() ?? '',
        invoice_date: draft.invoiceDate ?? '',
        items: draft.items.map((item) => ({
          variant_id: Number(item.variantId),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          ...(typeof item.gstRate === 'number' ? { gst_rate: item.gstRate } : {}),
          ...(item.hsnCode?.trim() ? { hsn_code: item.hsnCode.trim() } : {}),
          ...(item.purchaseMode === 'PACK'
            ? {
                units_per_purchase_unit: Number(item.unitsPerPurchaseUnit),
                purchase_unit_label: item.purchaseUnitLabel?.trim() ?? '',
              }
            : {}),
          ...(canTrackExpiry && item.batchNumber?.trim()
            ? { batch_number: item.batchNumber.trim() }
            : {}),
          ...(canTrackExpiry && item.manufacturingDate
            ? { manufacturing_date: item.manufacturingDate }
            : {}),
          ...(canTrackExpiry && item.expiryDate ? { expiry_date: item.expiryDate } : {}),
        })),
        payment_amount: Math.max(0, Number(paymentAmount) || 0),
        payment_mode: paymentMode,
        prices_include_tax: pricesIncludeTax,
        acknowledge_total_mismatch: confirmedMismatch,
      }).unwrap();
      history.replace(`/purchases/${response.data.purchase.id}`);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('purchaseImport.confirmFailed'), true));
    }
  };

  return (
    <IonPage>
      <Navbar title={t('purchaseImport.title')} backHref={ROUTES.PURCHASES} />
      <IonContent>
        <main className="workspace-page purchase-import-page">
          <header className="workspace-header">
            <div>
              <h1>{t('purchaseImport.title')}</h1>
              <p>{t('purchaseImport.subtitle')}</p>
            </div>
          </header>

          {!draft && (
            <section className="workspace-record purchase-import-upload">
              <IonIcon icon={cloudUploadOutline} />
              <h2>{t('purchaseImport.uploadHeading')}</h2>
              <p>{t('purchaseImport.uploadHint')}</p>
              <div className="purchase-import-upload__actions">
                <IonButton onClick={() => cameraInput.current?.click()}>
                  <IonIcon slot="start" icon={cameraOutline} />
                  {t('purchaseImport.takePhoto')}
                </IonButton>
                <IonButton fill="outline" onClick={() => fileInput.current?.click()}>
                  <IonIcon slot="start" icon={cloudUploadOutline} />
                  {t('purchaseImport.chooseFile')}
                </IonButton>
              </div>
              <input
                ref={cameraInput}
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
              <input
                ref={fileInput}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
              {(isExtracting || ocrProgress) && (
                <div className="purchase-import-progress" role="status">
                  <IonProgressBar
                    type={ocrProgress ? 'determinate' : 'indeterminate'}
                    value={ocrProgress?.progress}
                  />
                  <p>
                    {ocrProgress
                      ? t('purchaseImport.ocrProgress', {
                          count: Math.round(ocrProgress.progress * 100),
                        })
                      : t('purchaseImport.extracting')}
                  </p>
                  {ocrProgress && (
                    <IonButton
                      size="small"
                      fill="clear"
                      color="danger"
                      onClick={() => ocrController.current?.abort()}
                    >
                      {t('common.cancel')}
                    </IonButton>
                  )}
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="workspace-state purchase-import-error" role="alert">
              {error}
            </div>
          )}

          {draft && (
            <>
              <section className="workspace-record purchase-import-review-heading">
                <div>
                  <h2>{t('purchaseImport.reviewHeading')}</h2>
                  <p>{t('purchaseImport.reviewHint')}</p>
                </div>
                <IonBadge color={draft.status === 'READY' ? 'success' : 'warning'}>
                  {t(`purchaseImport.status.${draft.status}`)}
                </IonBadge>
              </section>

              {draft.warnings.length > 0 && (
                <section className="purchase-import-warnings" role="status">
                  <strong>{t('purchaseImport.checkWarnings')}</strong>
                  <ul>
                    {draft.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="workspace-record purchase-import-metadata">
                <label>
                  <span>{t('purchases.selectSupplierTitle')}</span>
                  <IonSelect
                    value={selectedSupplierId}
                    interface="popover"
                    onIonChange={(event) => {
                      setSelectedSupplierId(event.detail.value);
                      setFirmWasOverridden(false);
                      setConfirmedReview(false);
                      setConfirmedMismatch(false);
                    }}
                  >
                    {suppliers.map((supplier) => (
                      <IonSelectOption key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </label>
                <label>
                  <span>{t('purchases.purchaseFirm')}</span>
                  <IonSelect
                    value={selectedFirmId}
                    interface="popover"
                    onIonChange={(event) => {
                      setSelectedFirmId(event.detail.value);
                      setFirmWasOverridden(true);
                      setConfirmedReview(false);
                      setConfirmedMismatch(false);
                    }}
                  >
                    {firms.map((firm) => (
                      <IonSelectOption key={firm.id} value={firm.id}>
                        {firm.display_name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </label>
                <label>
                  <span>{t('purchases.invoiceNumberLabel')}</span>
                  <input
                    value={draft.invoiceNumber ?? ''}
                    onChange={(event) => updateDraft({ invoiceNumber: event.target.value })}
                  />
                </label>
                <label>
                  <span>{t('purchases.invoiceDateLabel')}</span>
                  <input
                    type="date"
                    value={draft.invoiceDate ?? ''}
                    onChange={(event) => updateDraft({ invoiceDate: event.target.value })}
                  />
                </label>
                <label>
                  <span>{t('purchaseImport.taxTreatment')}</span>
                  <IonSelect
                    value={pricesIncludeTax ? 'INCLUSIVE' : 'EXCLUSIVE'}
                    interface="popover"
                    onIonChange={(event) => {
                      setPricesIncludeTax(event.detail.value === 'INCLUSIVE');
                      setConfirmedReview(false);
                      setConfirmedMismatch(false);
                    }}
                  >
                    <IonSelectOption value="INCLUSIVE">
                      {t('purchaseImport.taxInclusive')}
                    </IonSelectOption>
                    <IonSelectOption value="EXCLUSIVE">
                      {t('purchaseImport.taxExclusive')}
                    </IonSelectOption>
                  </IonSelect>
                </label>
              </section>

              <section className="purchase-import-lines">
                <div className="purchase-import-lines__toolbar">
                  <div>
                    <h2>{t('purchaseImport.itemsHeading')}</h2>
                    <p>{t('purchaseImport.itemsHint')}</p>
                  </div>
                  <IonButton fill="outline" onClick={addLine}>
                    <IonIcon slot="start" icon={addCircleOutline} />
                    {t('purchaseImport.addItem')}
                  </IonButton>
                </div>
                {draft.items.length === 0 && (
                  <div className="workspace-state purchase-import-lines__empty" role="status">
                    {t('purchaseImport.noItems')}
                  </div>
                )}
                {draft.items.map((item, index) => (
                  <article key={item.lineId} className="workspace-record purchase-import-line">
                    <div className="purchase-import-line__heading">
                      <div>
                        <span>{t('purchaseImport.line', { count: index + 1 })}</span>
                        <h3>
                          {item.productName || item.rawText || t('purchaseImport.unknownItem')}
                        </h3>
                      </div>
                      <div className="purchase-import-line__actions">
                        {typeof item.confidence === 'number' && (
                          <IonBadge color={item.confidence >= 0.8 ? 'success' : 'warning'}>
                            {t('purchaseImport.confidence', {
                              count: Math.round(item.confidence * 100),
                            })}
                          </IonBadge>
                        )}
                        <IonButton
                          color="danger"
                          fill="clear"
                          size="small"
                          onClick={() => removeLine(item.lineId)}
                        >
                          <IonIcon slot="start" icon={trashOutline} />
                          {t('purchaseImport.removeItem')}
                        </IonButton>
                      </div>
                    </div>

                    <div className="purchase-import-line__mapping">
                      <div>
                        <span>{t('purchaseImport.mappedProduct')}</span>
                        <strong>
                          {item.variantId
                            ? `${item.productName} · ${item.sku ?? ''}`
                            : t('purchaseImport.notMapped')}
                        </strong>
                      </div>
                      <IonButton fill="outline" size="small" onClick={() => beginMapping(item)}>
                        {item.variantId
                          ? t('purchaseImport.changeMapping')
                          : t('purchaseImport.mapProduct')}
                      </IonButton>
                    </div>

                    {mappingLineId === item.lineId && (
                      <div className="purchase-import-search">
                        <input
                          autoFocus
                          value={mappingSearch}
                          placeholder={t('purchaseImport.searchProduct')}
                          onChange={(event) => {
                            const value = event.target.value;
                            setMappingSearch(value);
                            if (value.trim().length >= 2)
                              void searchVariants({ search: value.trim() });
                          }}
                        />
                        {isSearching ? (
                          <IonSpinner />
                        ) : (
                          <div className="purchase-import-search__results">
                            {(variantResults?.data ?? []).map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => {
                                  updateLine(item.lineId, {
                                    variantId: variant.id,
                                    productName: variant.product_name ?? item.productName,
                                    sku: variant.sku,
                                    gstRate: variant.gst_percent ?? undefined,
                                    hsnCode: variant.hsn_code ?? undefined,
                                  });
                                  setMappingLineId(null);
                                }}
                              >
                                <strong>{variant.product_name}</strong>
                                <span>{variant.sku}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="purchase-import-line__fields">
                      <label>
                        <span>{t('expiry.quantity')}</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateLine(item.lineId, { quantity: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label>
                        <span>{t('purchaseImport.purchaseMode')}</span>
                        <IonSelect
                          value={item.purchaseMode ?? 'UNIT'}
                          interface="popover"
                          onIonChange={(event) =>
                            updateLine(item.lineId, {
                              purchaseMode: event.detail.value as 'UNIT' | 'PACK',
                            })
                          }
                        >
                          <IonSelectOption value="UNIT">
                            {t('purchaseImport.purchaseUnit')}
                          </IonSelectOption>
                          <IonSelectOption value="PACK">
                            {t('purchaseImport.purchasePack')}
                          </IonSelectOption>
                        </IonSelect>
                      </label>
                      {item.purchaseMode === 'PACK' && (
                        <>
                          <label>
                            <span>{t('purchaseImport.packLabel')}</span>
                            <input
                              value={item.purchaseUnitLabel ?? ''}
                              maxLength={30}
                              onChange={(event) =>
                                updateLine(item.lineId, {
                                  purchaseUnitLabel: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>{t('purchaseImport.unitsPerPack')}</span>
                            <input
                              type="number"
                              min="2"
                              step="1"
                              value={item.unitsPerPurchaseUnit ?? 20}
                              onChange={(event) =>
                                updateLine(item.lineId, {
                                  unitsPerPurchaseUnit: Number(event.target.value),
                                })
                              }
                            />
                            <small>
                              {t('purchaseImport.stockUnits', {
                                count:
                                  Number(item.quantity) * Number(item.unitsPerPurchaseUnit ?? 0),
                              })}
                            </small>
                          </label>
                        </>
                      )}
                      <label>
                        <span>{t('purchases.unitPrice')}</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateLine(item.lineId, { unitPrice: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label>
                        <span>{t('purchaseImport.taxRate')}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.gstRate ?? ''}
                          onChange={(event) =>
                            updateLine(item.lineId, {
                              gstRate: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>{t('purchaseImport.hsnCode')}</span>
                        <input
                          value={item.hsnCode ?? ''}
                          onChange={(event) =>
                            updateLine(item.lineId, { hsnCode: event.target.value })
                          }
                        />
                      </label>
                      {canTrackExpiry && (
                        <>
                          <label>
                            <span>{t('expiry.batch')}</span>
                            <input
                              value={item.batchNumber ?? ''}
                              onChange={(event) =>
                                updateLine(item.lineId, { batchNumber: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            <span>{t('expiry.manufacturingDate')}</span>
                            <input
                              type="date"
                              value={item.manufacturingDate ?? ''}
                              max={item.expiryDate ?? undefined}
                              onChange={(event) =>
                                updateLine(item.lineId, {
                                  manufacturingDate: event.target.value || null,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>{t('expiry.expiryDate')}</span>
                            <input
                              type="date"
                              value={item.expiryDate ?? ''}
                              min={
                                item.manufacturingDate &&
                                item.manufacturingDate > addCalendarDays(kolkataCalendarDate(), 1)
                                  ? item.manufacturingDate
                                  : addCalendarDays(kolkataCalendarDate(), 1)
                              }
                              onChange={(event) =>
                                updateLine(item.lineId, {
                                  expiryDate: event.target.value || null,
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                    <strong className="purchase-import-line__total">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </strong>
                  </article>
                ))}
              </section>

              <section className="workspace-record purchase-import-confirm">
                <div className="purchase-import-reconciliation">
                  <div className="purchase-import-reconciliation__heading">
                    <strong>{t('purchaseImport.amountReview')}</strong>
                    <span>{t('purchaseImport.amountReviewHint')}</span>
                  </div>
                  <div className="purchase-import-reconciliation__labels" aria-hidden="true">
                    <span />
                    <strong>{t('purchaseImport.supplierBill')}</strong>
                    <strong>{t('purchaseImport.calculated')}</strong>
                  </div>
                  {(
                    [
                      ['purchases.subtotal', draft.subtotal, calculated.subtotal],
                      ['purchaseImport.taxAmount', draft.taxAmount, calculated.tax],
                      ['purchases.totalAmount', draft.totalAmount, calculated.total],
                    ] as const
                  ).map(([label, extracted, reviewed]) => (
                    <div className="purchase-import-reconciliation__row" key={label}>
                      <span>{t(label)}</span>
                      <span>
                        {typeof extracted === 'number'
                          ? formatCurrency(extracted)
                          : t('purchaseImport.notDetected')}
                      </span>
                      <strong>{formatCurrency(reviewed)}</strong>
                    </div>
                  ))}
                </div>
                {materialMismatch && (
                  <div className="purchase-import-mismatch" role="alert">
                    <strong>{t('purchaseImport.materialMismatch')}</strong>
                    <p>
                      {t('purchaseImport.materialMismatchHint', {
                        bill: formatCurrency(extractedTotal ?? 0),
                        calculated: formatCurrency(calculated.total),
                      })}
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmedMismatch}
                        onChange={(event) => setConfirmedMismatch(event.target.checked)}
                      />
                      <span>{t('purchaseImport.confirmMismatch')}</span>
                    </label>
                  </div>
                )}
                <div className="purchase-import-payment">
                  <label>
                    <span>{t('purchases.paymentAmountLabel')}</span>
                    <input
                      type="number"
                      min="0"
                      max={amount}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>{t('purchases.paymentModeLabel')}</span>
                    <IonSelect
                      value={paymentMode}
                      interface="popover"
                      onIonChange={(event) => setPaymentMode(event.detail.value)}
                    >
                      {(['CASH', 'UPI', 'CARD', 'BANK'] as const).map((mode) => (
                        <IonSelectOption key={mode} value={mode}>
                          {t(`purchaseImport.paymentMode.${mode}`)}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </label>
                </div>
                <label className="purchase-import-review-check">
                  <input
                    type="checkbox"
                    checked={confirmedReview}
                    onChange={(event) => setConfirmedReview(event.target.checked)}
                  />
                  <span>{t('purchaseImport.confirmReview')}</span>
                </label>
                {!validItems && (
                  <p className="purchase-import-validation" role="alert">
                    {t('purchaseImport.mappingRequired')}
                  </p>
                )}
                {Number(paymentAmount || 0) > calculated.total && (
                  <p className="purchase-import-validation" role="alert">
                    {t('purchaseImport.paymentExceedsTotal')}
                  </p>
                )}
                <IonButton expand="block" disabled={!canConfirm} onClick={() => void confirm()}>
                  <IonIcon slot="start" icon={checkmarkCircleOutline} />
                  {isConfirming
                    ? t('purchaseImport.confirming')
                    : t('purchaseImport.confirmPurchase')}
                </IonButton>
                <p className="purchase-import-mutation-note">
                  {t('purchaseImport.noMutationBeforeConfirm')}
                </p>
              </section>
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default PurchaseBillImportPage;
