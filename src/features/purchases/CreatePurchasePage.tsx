import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BillingSearchVariant } from '@core/api/productApi';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonBadge,
} from '@ionic/react';
import { add, remove, trash, checkmarkCircle } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { Navbar } from '@components/Navbar';

import { useGetSuppliersQuery } from '../../core/api/supplierApi';
import { useCreatePurchaseMutation } from '../../core/api/purchaseApi';
import { useGetFirmsQuery } from '../../core/api/firmApi';
import {
  useLazyGetProductPurchaseCostsQuery,
  useLazySearchVariantsQuery,
} from '../../core/api/productApi';
import { SearchBar, Input, Button, EmptyState } from '../../components';
import { formatCurrency, debounce } from '@utils/helpers';
import notificationService from '@core/services/notificationService';
import { ROUTES } from '@core/constants';
import {
  GST_RATE_QUICK_PICKS,
  isValidGstRate,
  optionalHsnCodeIsSupported,
} from '@core/constants/gstMasterData';
import { reconcilePurchaseFirmId, resolvePurchaseFirmId } from './purchaseFirmSelection';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';
import { hasPermission } from '@core/permissions/permissions';
import { addCalendarDays, canReceiveExpiryDate, kolkataCalendarDate } from './purchaseExpiryDates';
import { calculatePurchaseTaxTotals } from './purchaseImportCalculation';
import './CreatePurchasePage.css';

interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  purchase_mode: 'UNIT' | 'PACK';
  purchase_unit_label: string;
  units_per_purchase_unit: number;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  gst_rate: number;
  hsn_code: string;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const CreatePurchasePage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const currentUser = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const canTrackExpiry = canUseCommercialFeature(
    currentUser?.roles ?? [],
    commercialAccess,
    'EXPIRY_TRACKING'
  );
  const canReadPurchaseCost =
    Boolean(commercialAccess) &&
    hasPermission(currentUser?.roles ?? [], 'PRODUCT_UPDATE') &&
    canUseCommercialFeature(currentUser?.roles ?? [], commercialAccess, 'LIVE_MARGIN_PREVIEW');
  const costScope = `${currentUser?.tenant?.id ?? ''}:${currentUser?.id ?? ''}`;
  const currentCostAccess = useRef({ scope: costScope, allowed: canReadPurchaseCost });
  currentCostAccess.current = { scope: costScope, allowed: canReadPurchaseCost };
  const pendingAdditions = useRef(new Map<string, { quantity: number; scope: string }>());
  const [pendingAdditionCount, setPendingAdditionCount] = useState(0);

  const [searchVariants, { data: variantsData, isLoading: searchLoading }] =
    useLazySearchVariantsQuery();
  const [loadPurchaseCosts] = useLazyGetProductPurchaseCostsQuery();
  const { data: suppliersData } = useGetSuppliersQuery({});
  const { data: firmsData, isLoading: firmsLoading } = useGetFirmsQuery({ active: true });
  const [createPurchase, { isLoading: creating }] = useCreatePurchaseMutation();

  const suppliers = useMemo(() => suppliersData?.data || [], [suppliersData]);
  const variants = variantsData?.data || [];
  const firms = useMemo(() => firmsData?.data.firms || [], [firmsData]);

  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const currentCart = useRef(cart);
  currentCart.current = cart;
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedFirmId, setSelectedFirmId] = useState('');
  const [firmWasOverridden, setFirmWasOverridden] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(kolkataCalendarDate());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  useEffect(() => {
    const additions = pendingAdditions.current;
    additions.clear();
    setPendingAdditionCount(0);
    return () => additions.clear();
  }, [costScope]);

  useEffect(() => {
    if (!selectedSupplierId || firms.length === 0) return;
    const supplier = suppliers.find((item) => item.id === selectedSupplierId);
    if (supplier) {
      setSelectedFirmId((currentFirmId) =>
        reconcilePurchaseFirmId(supplier, firms, currentFirmId, firmWasOverridden)
      );
    }
  }, [firmWasOverridden, firms, selectedSupplierId, suppliers]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const term = supplierSearch.trim().toLowerCase();
    return !term || supplier.name.toLowerCase().includes(term) || supplier.phone?.includes(term);
  });
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);

  // Debounced search
  const handleSearch = debounce((term: string) => {
    if (term.length >= 2) {
      searchVariants({ search: term });
    }
  }, 300);

  const addToCart = async (variant: BillingSearchVariant) => {
    setSearchTerm('');
    const existing = currentCart.current.find((item) => item.variant_id === variant.id);
    if (existing) {
      setCart((items) =>
        items.map((item) =>
          item.variant_id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }
    const waiting = pendingAdditions.current.get(variant.id);
    if (waiting) {
      waiting.quantity += 1;
      return;
    }

    const addition = { quantity: 1, scope: costScope };
    pendingAdditions.current.set(variant.id, addition);
    setPendingAdditionCount(pendingAdditions.current.size);
    let unitPrice = variant.price ?? 0;
    try {
      if (canReadPurchaseCost && variant.product_id) {
        try {
          const costs = await loadPurchaseCosts(variant.product_id, true).unwrap();
          const cost = costs.data.find((item) => item.variant_id === variant.id)?.purchase_price;
          if (
            cost !== null &&
            cost !== undefined &&
            Number.isFinite(cost) &&
            cost >= 0 &&
            currentCostAccess.current.allowed
          )
            unitPrice = cost;
        } catch {
          // Keep the editable existing fallback when private cost is unavailable.
        }
      }
      if (
        pendingAdditions.current.get(variant.id) !== addition ||
        currentCostAccess.current.scope !== addition.scope
      )
        return;

      // Resolve the private per-unit cost before exposing pack/price controls.
      // Repeated selections only increase quantity; an existing edited price wins.
      setCart((items) =>
        items.some((item) => item.variant_id === variant.id)
          ? items.map((item) =>
              item.variant_id === variant.id
                ? { ...item, quantity: item.quantity + addition.quantity }
                : item
            )
          : [
              ...items,
              {
                variant_id: variant.id,
                quantity: addition.quantity,
                unit_price: unitPrice,
                product_name: variant.product_name || 'Unknown Product',
                sku: variant.sku || '',
                purchase_mode: 'UNIT',
                purchase_unit_label: 'Box',
                units_per_purchase_unit: 20,
                batch_number: '',
                manufacturing_date: '',
                expiry_date: '',
                gst_rate: Number(variant.gst_percent ?? 0),
                hsn_code: variant.hsn_code ?? '',
              },
            ]
      );
    } finally {
      if (pendingAdditions.current.get(variant.id) === addition) {
        pendingAdditions.current.delete(variant.id);
        setPendingAdditionCount(pendingAdditions.current.size);
      }
    }
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart(cart.map((item) => (item.variant_id === variantId ? { ...item, quantity } : item)));
  };

  const updatePrice = (variantId: string, unit_price: number) => {
    setCart(cart.map((item) => (item.variant_id === variantId ? { ...item, unit_price } : item)));
  };

  const updateTaxField = (
    variantId: string,
    field: 'gst_rate' | 'hsn_code',
    value: number | string
  ) => {
    setCart(
      cart.map((item) => (item.variant_id === variantId ? { ...item, [field]: value } : item))
    );
  };

  const updateBatchField = (
    variantId: string,
    field: 'batch_number' | 'manufacturing_date' | 'expiry_date',
    value: string
  ) => {
    setCart(
      cart.map((item) => (item.variant_id === variantId ? { ...item, [field]: value } : item))
    );
  };

  const updatePurchaseUnitLabel = (variantId: string, purchaseUnitLabel: string) => {
    setCart(
      cart.map((item) =>
        item.variant_id === variantId ? { ...item, purchase_unit_label: purchaseUnitLabel } : item
      )
    );
  };

  const updatePurchaseMode = (variantId: string, purchaseMode: CartItem['purchase_mode']) => {
    setCart(
      cart.map((item) => {
        if (item.variant_id !== variantId || item.purchase_mode === purchaseMode) return item;
        const conversion = Math.max(2, item.units_per_purchase_unit);
        return {
          ...item,
          purchase_mode: purchaseMode,
          unit_price: roundMoney(
            purchaseMode === 'PACK' ? item.unit_price * conversion : item.unit_price / conversion
          ),
        };
      })
    );
  };

  const updateUnitsPerPurchaseUnit = (variantId: string, nextConversion: number) => {
    const conversion = Math.max(2, Math.min(10_000, nextConversion || 2));
    setCart(
      cart.map((item) => {
        if (item.variant_id !== variantId) return item;
        const unitCost =
          item.purchase_mode === 'PACK'
            ? item.unit_price / item.units_per_purchase_unit
            : item.unit_price;
        return {
          ...item,
          units_per_purchase_unit: conversion,
          unit_price:
            item.purchase_mode === 'PACK' ? roundMoney(unitCost * conversion) : item.unit_price,
        };
      })
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId));
  };

  const calculatedTotals = calculatePurchaseTaxTotals(
    cart.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      gstRate: item.gst_rate,
    })),
    pricesIncludeTax
  );

  const calculatePending = () => {
    const paid = parseFloat(paymentAmount) || 0;
    return calculatedTotals.total - paid;
  };

  const handleCreatePurchase = async () => {
    // Validation
    if (!selectedSupplierId) {
      notificationService.warning(t('purchases.selectSupplier'));
      setShowSupplierModal(true);
      return;
    }

    if (!invoiceNumber.trim()) {
      notificationService.warning(t('purchases.enterInvoiceNumber'));
      return;
    }

    if (!selectedFirmId) {
      notificationService.warning(t('purchases.selectFirm'));
      return;
    }

    if (cart.length === 0) {
      notificationService.warning(t('purchases.addProducts'));
      return;
    }

    if (
      cart.some(
        (item) =>
          item.purchase_mode === 'PACK' &&
          (!item.purchase_unit_label.trim() || item.units_per_purchase_unit < 2)
      )
    ) {
      notificationService.warning(t('purchases.invalidPackConversion'));
      return;
    }

    const invalidDateItem = cart.find(
      (item) =>
        item.expiry_date && item.manufacturing_date && item.manufacturing_date > item.expiry_date
    );
    if (invalidDateItem) {
      notificationService.warning(
        t('expiry.manufacturingAfterExpiry', { product: invalidDateItem.product_name })
      );
      return;
    }

    const expiredItem = cart.find((item) => !canReceiveExpiryDate(item.expiry_date));
    if (expiredItem) {
      notificationService.warning(
        t('expiry.cannotReceiveExpired', { product: expiredItem.product_name })
      );
      return;
    }

    try {
      const items = cart.map((item) => ({
        variant_id: parseInt(item.variant_id),
        quantity: item.quantity,
        unit_price: item.unit_price,
        ...(item.purchase_mode === 'PACK'
          ? {
              units_per_purchase_unit: item.units_per_purchase_unit,
              purchase_unit_label: item.purchase_unit_label.trim(),
            }
          : {}),
        ...(canTrackExpiry && item.batch_number.trim()
          ? { batch_number: item.batch_number.trim() }
          : {}),
        ...(canTrackExpiry && item.manufacturing_date
          ? { manufacturing_date: item.manufacturing_date }
          : {}),
        ...(canTrackExpiry && item.expiry_date ? { expiry_date: item.expiry_date } : {}),
        gst_rate: item.gst_rate,
        ...(item.hsn_code.trim() ? { hsn_code: item.hsn_code.trim() } : {}),
      }));

      await createPurchase({
        supplier_id: parseInt(selectedSupplierId),
        firm_id: parseInt(selectedFirmId),
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        items,
        payment_amount: parseFloat(paymentAmount) || 0,
        payment_mode: paymentMode as 'CASH' | 'UPI' | 'CARD' | 'BANK',
        prices_include_tax: pricesIncludeTax,
        ...(selectedSupplier?.state_code
          ? { place_of_supply_code: selectedSupplier.state_code }
          : {}),
      }).unwrap();

      notificationService.success(t('purchases.purchaseCreated'));

      // Reset form
      setCart([]);
      setSelectedSupplierId('');
      setSelectedFirmId('');
      setFirmWasOverridden(false);
      setInvoiceNumber('');
      setInvoiceDate(kolkataCalendarDate());
      setPaymentAmount('');
      setPaymentMode('CASH');
      setPricesIncludeTax(true);
      setSearchTerm('');
      setSupplierSearch('');

      setTimeout(() => history.push(ROUTES.PURCHASES), 1000);
    } catch (error: unknown) {
      notificationService.handleApiError(error);
    }
  };

  // Check if form is valid
  const hasValidPurchaseUnits = cart.every(
    (item) =>
      item.purchase_mode === 'UNIT' ||
      (item.purchase_unit_label.trim() && item.units_per_purchase_unit >= 2)
  );
  const hasValidTaxFields = cart.every(
    (item) =>
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.unit_price > 0 &&
      isValidGstRate(item.gst_rate) &&
      optionalHsnCodeIsSupported(item.hsn_code)
  );
  const isFormValid =
    selectedSupplierId &&
    selectedFirmId &&
    invoiceNumber.trim() &&
    cart.length > 0 &&
    pendingAdditionCount === 0 &&
    hasValidPurchaseUnits &&
    hasValidTaxFields;

  const subtotal = calculatedTotals.subtotal;
  const total = calculatedTotals.total;
  const pending = calculatePending();

  return (
    <IonPage>
      <Navbar title={t('purchases.createPurchase')} backHref={ROUTES.PURCHASES} />
      <IonContent className="detail-workspace">
        {/* Supplier & Invoice Info */}
        <IonCard>
          <IonCardContent>
            <div style={{ marginBottom: '16px' }}>
              <Button onClick={() => setShowSupplierModal(true)} fullWidth>
                {selectedSupplierId
                  ? `${t('purchases.selectSupplierSelected')} ${suppliers.find((s) => s.id === selectedSupplierId)?.name}`
                  : t('purchases.selectSupplierButton')}
              </Button>
            </div>

            <Input
              label={t('purchases.invoiceNumberLabel')}
              value={invoiceNumber}
              onChange={setInvoiceNumber}
              placeholder={t('purchases.enterSupplierInvoiceNumber')}
              required
            />

            {selectedSupplier && (
              <section
                className="purchase-place-of-supply"
                aria-label={t('purchases.placeOfSupply')}
              >
                <strong>{t('purchases.placeOfSupply')}</strong>
                {selectedSupplier.state_code ? (
                  <p>
                    {selectedSupplier.state || t('common.notAvailable')} (
                    {selectedSupplier.state_code})
                    {selectedSupplier.gstin
                      ? ` · ${t('suppliers.gstin')}: ${selectedSupplier.gstin}`
                      : ''}
                  </p>
                ) : (
                  <p className="purchase-tax-warning" role="status">
                    {t('purchases.incompleteSupplierTaxIdentity')}
                  </p>
                )}
              </section>
            )}

            <fieldset className="purchase-tax-treatment">
              <legend>{t('purchases.taxTreatment')}</legend>
              <label>
                <input
                  type="radio"
                  name="purchase-tax-treatment"
                  value="INCLUSIVE"
                  checked={pricesIncludeTax}
                  onChange={() => setPricesIncludeTax(true)}
                />
                {t('purchases.pricesIncludeTax')}
              </label>
              <label>
                <input
                  type="radio"
                  name="purchase-tax-treatment"
                  value="EXCLUSIVE"
                  checked={!pricesIncludeTax}
                  onChange={() => setPricesIncludeTax(false)}
                />
                {t('purchases.pricesExcludeTax')}
              </label>
            </fieldset>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                {t('purchases.purchaseFirm')}
              </label>
              <IonSelect
                aria-label={t('purchases.purchaseFirm')}
                value={selectedFirmId}
                disabled={firmsLoading}
                placeholder={t('purchases.selectFirmPlaceholder')}
                onIonChange={(event) => {
                  setSelectedFirmId(event.detail.value);
                  setFirmWasOverridden(true);
                }}
                interface="popover"
              >
                {firms.map((firm) => (
                  <IonSelectOption key={firm.id} value={firm.id}>
                    {firm.display_name}
                  </IonSelectOption>
                ))}
              </IonSelect>
              {selectedSupplierId &&
                suppliers.find((supplier) => supplier.id === selectedSupplierId)
                  ?.default_purchase_firm && (
                  <IonText color="medium">
                    <small>{t('purchases.supplierDefaultFirm')}</small>
                  </IonText>
                )}
            </div>

            <Input
              label={t('purchases.invoiceDateLabel')}
              value={invoiceDate}
              onChange={setInvoiceDate}
              type="date"
              placeholder={t('purchases.invoiceDateFormat')}
            />
          </IonCardContent>
        </IonCard>

        {/* Product Search */}
        <IonCard>
          <IonCardContent>
            <SearchBar
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                handleSearch(val);
              }}
              placeholder={t('purchases.searchProductsAdd')}
            />

            {searchLoading && (
              <IonText color="medium">
                <p>{t('purchases.searching')}</p>
              </IonText>
            )}
            {pendingAdditionCount > 0 && (
              <IonText color="medium">
                <p role="status">{t('common.loading')}</p>
              </IonText>
            )}

            {searchTerm.length >= 2 && variants.length > 0 && (
              <IonList>
                {variants.map((variant) => (
                  <IonItem key={variant.id} button onClick={() => void addToCart(variant)}>
                    <IonLabel>
                      <h3>{variant.product_name}</h3>
                      <p>{variant.sku}</p>
                      <p>{formatCurrency(variant.price || 0)}</p>
                    </IonLabel>
                    <IonIcon icon={add} slot="end" color="primary" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        {/* Cart Items */}
        {cart.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                {t('purchases.items')} ({cart.length})
                <IonBadge color="primary" style={{ marginLeft: '8px' }}>
                  {formatCurrency(subtotal)}
                </IonBadge>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {cart.map((item) => (
                  <IonItem key={item.variant_id}>
                    <IonLabel>
                      <h3>{item.product_name}</h3>
                      <p>{item.sku}</p>

                      <div className="purchase-unit-editor">
                        <label>
                          {t('purchases.enteredAs')}
                          <select
                            aria-label={`${item.product_name} ${t('purchases.enteredAs')}`}
                            value={item.purchase_mode}
                            onChange={(event) =>
                              updatePurchaseMode(
                                item.variant_id,
                                event.target.value as 'UNIT' | 'PACK'
                              )
                            }
                          >
                            <option value="UNIT">{t('purchases.individualUnits')}</option>
                            <option value="PACK">{t('purchases.boxOrPack')}</option>
                          </select>
                        </label>
                        {item.purchase_mode === 'PACK' && (
                          <div className="purchase-unit-conversion">
                            <label>
                              {t('purchases.packLabel')}
                              <input
                                aria-label={`${item.product_name} ${t('purchases.packLabel')}`}
                                value={item.purchase_unit_label}
                                maxLength={30}
                                onChange={(event) =>
                                  updatePurchaseUnitLabel(item.variant_id, event.target.value)
                                }
                              />
                            </label>
                            <label>
                              {t('purchases.unitsPerPack')}
                              <input
                                aria-label={`${item.product_name} ${t('purchases.unitsPerPack')}`}
                                type="number"
                                min="2"
                                max="10000"
                                value={item.units_per_purchase_unit}
                                onChange={(event) =>
                                  updateUnitsPerPurchaseUnit(
                                    item.variant_id,
                                    Number(event.target.value)
                                  )
                                }
                              />
                            </label>
                            <p className="purchase-unit-preview">
                              {t('purchases.stockConversionPreview', {
                                count: item.quantity,
                                label: item.purchase_unit_label || t('purchases.boxOrPack'),
                                factor: item.units_per_purchase_unit,
                                units: item.quantity * item.units_per_purchase_unit,
                              })}
                            </p>
                            <p className="purchase-unit-cost-preview">
                              {t('purchases.packCostPreview', {
                                packPrice: formatCurrency(item.unit_price),
                                label: item.purchase_unit_label || t('purchases.boxOrPack'),
                                unitPrice: formatCurrency(
                                  item.unit_price / item.units_per_purchase_unit
                                ),
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {canTrackExpiry && (
                        <fieldset className="purchase-batch-editor">
                          <legend>{t('expiry.batchDetails')}</legend>
                          <label>
                            <span>{t('expiry.batch')}</span>
                            <input
                              value={item.batch_number}
                              maxLength={80}
                              onChange={(event) =>
                                updateBatchField(
                                  item.variant_id,
                                  'batch_number',
                                  event.target.value
                                )
                              }
                              placeholder={t('expiry.batchPlaceholder')}
                            />
                          </label>
                          <label>
                            <span>{t('expiry.manufacturingDate')}</span>
                            <input
                              type="date"
                              value={item.manufacturing_date}
                              max={item.expiry_date || undefined}
                              onChange={(event) =>
                                updateBatchField(
                                  item.variant_id,
                                  'manufacturing_date',
                                  event.target.value
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>{t('expiry.expiryDate')}</span>
                            <input
                              type="date"
                              value={item.expiry_date}
                              min={
                                item.manufacturing_date &&
                                item.manufacturing_date > addCalendarDays(kolkataCalendarDate(), 1)
                                  ? item.manufacturing_date
                                  : addCalendarDays(kolkataCalendarDate(), 1)
                              }
                              onChange={(event) =>
                                updateBatchField(item.variant_id, 'expiry_date', event.target.value)
                              }
                            />
                          </label>
                          {item.expiry_date &&
                            item.expiry_date <= addCalendarDays(kolkataCalendarDate(), 30) && (
                              <p className="purchase-batch-warning" role="status">
                                {t('expiry.nearExpiryPurchaseWarning')}
                              </p>
                            )}
                        </fieldset>
                      )}

                      <div className="purchase-tax-line-editor">
                        <label>
                          <span>{t('purchases.gstRate')}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            list={`gst-rate-options-${item.variant_id}`}
                            aria-label={`${item.product_name} ${t('purchases.gstRate')}`}
                            value={item.gst_rate}
                            onChange={(event) =>
                              updateTaxField(
                                item.variant_id,
                                'gst_rate',
                                Number(event.target.value)
                              )
                            }
                          />
                          <datalist id={`gst-rate-options-${item.variant_id}`}>
                            {GST_RATE_QUICK_PICKS.map((rate) => (
                              <option key={rate} value={rate} />
                            ))}
                          </datalist>
                        </label>
                        <label>
                          <span>{t('purchases.hsnCode')}</span>
                          <input
                            aria-label={`${item.product_name} ${t('purchases.hsnCode')}`}
                            value={item.hsn_code}
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(event) =>
                              updateTaxField(
                                item.variant_id,
                                'hsn_code',
                                event.target.value.replace(/\D/g, '').slice(0, 8)
                              )
                            }
                            placeholder={t('purchases.hsnPlaceholder')}
                          />
                        </label>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          marginTop: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="purchase-quantity-label">
                            {item.purchase_mode === 'PACK'
                              ? t('purchases.packQuantity')
                              : t('purchases.unitQuantity')}
                          </span>
                          <IonButton
                            size="small"
                            fill="clear"
                            onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                          >
                            <IonIcon icon={remove} />
                          </IonButton>
                          <IonText>
                            <strong>{item.quantity}</strong>
                          </IonText>
                          <IonButton
                            size="small"
                            fill="clear"
                            onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                          >
                            <IonIcon icon={add} />
                          </IonButton>
                        </div>

                        <label className="purchase-price-field" style={{ flex: 1 }}>
                          <span>
                            {item.purchase_mode === 'PACK'
                              ? t('purchases.pricePerPack')
                              : t('purchases.unitPrice')}
                          </span>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              updatePrice(item.variant_id, parseFloat(e.target.value) || 0)
                            }
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid var(--ion-color-medium)',
                              borderRadius: '4px',
                            }}
                            placeholder={t('purchases.unitPrice')}
                            aria-label={
                              item.purchase_mode === 'PACK'
                                ? `${item.product_name} ${t('purchases.pricePerPack')}`
                                : `${item.product_name} ${t('purchases.unitPrice')}`
                            }
                          />
                        </label>
                      </div>

                      <p style={{ marginTop: '8px', color: 'var(--ion-color-primary)' }}>
                        {t('purchases.lineTotal')}{' '}
                        {formatCurrency(
                          calculatePurchaseTaxTotals(
                            [
                              {
                                quantity: item.quantity,
                                unitPrice: item.unit_price,
                                gstRate: item.gst_rate,
                              },
                            ],
                            pricesIncludeTax
                          ).total
                        )}
                      </p>
                    </IonLabel>

                    <IonButton
                      fill="clear"
                      slot="end"
                      onClick={() => removeFromCart(item.variant_id)}
                    >
                      <IonIcon icon={trash} color="danger" />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Payment & Summary */}
        {cart.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('purchases.paymentDetails')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ marginBottom: '16px' }}>
                <IonText color="medium">
                  <p>{t('purchases.subtotal')}</p>
                </IonText>
                <IonText>
                  <h2 style={{ margin: 0 }}>{formatCurrency(subtotal)}</h2>
                </IonText>
                <IonText color="medium">
                  <p>
                    {t('purchases.taxAmount')}: {formatCurrency(calculatedTotals.tax)}
                  </p>
                </IonText>
                <IonText>
                  <h2>
                    {t('purchases.totalAmount')}: {formatCurrency(total)}
                  </h2>
                </IonText>
                {!selectedSupplier?.state_code && (
                  <p className="purchase-tax-warning" role="status">
                    {t('purchases.taxJurisdictionIncomplete')}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ fontWeight: '500' }}>{t('purchases.paymentAmountLabel')}</label>
                  <IonButton
                    size="small"
                    fill="outline"
                    onClick={() => setPaymentAmount(total.toString())}
                  >
                    {t('purchases.payFull')}
                  </IonButton>
                </div>
                <Input
                  label=""
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  type="number"
                  placeholder="0.00"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('purchases.paymentModeLabel')}
                </label>
                <IonSelect
                  value={paymentMode}
                  onIonChange={(e) => setPaymentMode(e.detail.value)}
                  interface="popover"
                  style={{
                    border: '1px solid var(--ion-color-medium)',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  <IonSelectOption value="CASH">{t('purchases.cash')}</IonSelectOption>
                  <IonSelectOption value="UPI">{t('purchases.upi')}</IonSelectOption>
                  <IonSelectOption value="CARD">{t('purchases.card')}</IonSelectOption>
                  <IonSelectOption value="BANK">
                    {t('purchases.bankTransferOption')}
                  </IonSelectOption>
                </IonSelect>
              </div>

              {pending > 0 && (
                <div className="purchase-pending-notice" role="status">
                  <p>
                    {t('purchases.pendingAmount')} <strong>{formatCurrency(pending)}</strong>
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreatePurchase}
                loading={creating}
                disabled={!isFormValid}
                fullWidth
                size="large"
              >
                <IonIcon icon={checkmarkCircle} slot="start" />
                {t('purchases.createPurchaseButton')}
              </Button>
            </IonCardContent>
          </IonCard>
        )}

        {cart.length === 0 && (
          <EmptyState message={t('purchases.addProductsMessage')} icon="cart" />
        )}

        {/* Supplier Selection Modal */}
        {showSupplierModal && (
          <IonModal isOpen={true} onDidDismiss={() => setShowSupplierModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('purchases.selectSupplierTitle')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowSupplierModal(false)}>
                    {t('purchases.close')}
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <div className="ion-padding-horizontal ion-padding-top">
                <SearchBar
                  value={supplierSearch}
                  onChange={setSupplierSearch}
                  placeholder={t('suppliers.searchSuppliers')}
                />
              </div>
              <IonList>
                {filteredSuppliers.map((supplier) => (
                  <IonItem
                    key={supplier.id}
                    button
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setFirmWasOverridden(false);
                      const defaultFirmId = resolvePurchaseFirmId(supplier, firms);
                      setSelectedFirmId(defaultFirmId);
                      setShowSupplierModal(false);
                    }}
                    color={selectedSupplierId === supplier.id ? 'light' : undefined}
                  >
                    <IonLabel>
                      <h2>{supplier.name}</h2>
                      <p>{supplier.phone}</p>
                    </IonLabel>
                    {selectedSupplierId === supplier.id && (
                      <IonIcon icon={checkmarkCircle} slot="end" color="success" />
                    )}
                  </IonItem>
                ))}
              </IonList>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CreatePurchasePage;
