import React, { useEffect, useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { barcodeOutline, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

export type UnknownBarcodeProductInput = {
  name: string;
  sellingPrice: number;
  openingStock: number;
};

type UnknownBarcodeResolutionProps = {
  barcode: string;
  canCreate: boolean;
  isCreating: boolean;
  onCreate: (input: UnknownBarcodeProductInput) => Promise<void>;
  onDismiss: () => void;
};

export const UnknownBarcodeResolution: React.FC<UnknownBarcodeResolutionProps> = ({
  barcode,
  canCreate,
  isCreating,
  onCreate,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('0');

  useEffect(() => {
    setName('');
    setSellingPrice('');
    setOpeningStock('0');
  }, [barcode]);

  const parsedPrice = Number(sellingPrice);
  const parsedStock = Number(openingStock);
  const canSubmit =
    name.trim().length > 0 &&
    sellingPrice.trim().length > 0 &&
    openingStock.trim().length > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    Number.isInteger(parsedStock) &&
    parsedStock >= 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isCreating) return;
    await onCreate({
      name: name.trim(),
      sellingPrice: parsedPrice,
      openingStock: parsedStock,
    });
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950/40 p-3">
      <IonCard className="m-0 w-full max-w-lg rounded-3xl shadow-2xl">
        <IonCardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <IonIcon icon={barcodeOutline} className="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="unknown-barcode-title" className="text-xl font-black text-gray-900">
                {t('billing.unknownBarcode.title')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{t('billing.unknownBarcode.subtitle')}</p>
            </div>
            <button
              type="button"
              aria-label={t('billing.unknownBarcode.close')}
              className="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-gray-600"
              disabled={isCreating}
              onClick={onDismiss}
            >
              <IonIcon icon={close} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t('billing.unknownBarcode.barcode')}
            </p>
            <p className="mt-1 break-all font-mono text-base font-bold text-gray-900">{barcode}</p>
          </div>

          {!canCreate ? (
            <div className="mt-4">
              <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                {t('billing.unknownBarcode.managerRequired')}
              </p>
              <IonButton
                expand="block"
                fill="outline"
                className="mt-4 min-h-touch"
                onClick={onDismiss}
              >
                {t('billing.unknownBarcode.backToBill')}
              </IonButton>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={submit}>
              <label
                htmlFor="unknown-barcode-product-name"
                className="block text-sm font-bold text-gray-700"
              >
                {t('billing.unknownBarcode.productName')}
                <input
                  id="unknown-barcode-product-name"
                  aria-label={t('billing.unknownBarcode.productName')}
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('billing.unknownBarcode.productNamePlaceholder')}
                  className="mt-1 min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-sky-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="unknown-barcode-selling-price"
                  className="block text-sm font-bold text-gray-700"
                >
                  {t('billing.unknownBarcode.sellingPrice')}
                  <div className="mt-1 flex min-h-touch items-center rounded-xl border border-gray-300 px-3 focus-within:border-sky-500">
                    <span className="mr-1">₹</span>
                    <input
                      id="unknown-barcode-selling-price"
                      aria-label={t('billing.unknownBarcode.sellingPrice')}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={sellingPrice}
                      onChange={(event) => setSellingPrice(event.target.value)}
                      className="w-full border-0 bg-transparent text-base outline-none"
                    />
                  </div>
                </label>
                <label
                  htmlFor="unknown-barcode-opening-stock"
                  className="block text-sm font-bold text-gray-700"
                >
                  {t('billing.unknownBarcode.openingStock')}
                  <input
                    id="unknown-barcode-opening-stock"
                    aria-label={t('billing.unknownBarcode.openingStock')}
                    required
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={openingStock}
                    onChange={(event) => setOpeningStock(event.target.value)}
                    className="mt-1 min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-sky-500"
                  />
                </label>
              </div>

              <p className="text-xs text-gray-500">
                {t('billing.unknownBarcode.savedForNextTime')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <IonButton
                  type="button"
                  fill="outline"
                  className="min-h-touch"
                  disabled={isCreating}
                  onClick={onDismiss}
                >
                  {t('billing.unknownBarcode.cancel')}
                </IonButton>
                <IonButton
                  type="submit"
                  className="min-h-touch"
                  disabled={!canSubmit || isCreating}
                >
                  {isCreating
                    ? t('billing.unknownBarcode.creating')
                    : t('billing.unknownBarcode.createAndAdd')}
                </IonButton>
              </div>
            </form>
          )}
        </IonCardContent>
      </IonCard>
    </div>
  );
};
