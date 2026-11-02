import React, { useMemo, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { BillingSearchVariant } from '@core/api/productApi';
import { compileWhatsAppList, type CompiledWhatsAppLine } from './whatsappListCompiler';

interface Props {
  catalog: BillingSearchVariant[];
  onCancel: () => void;
  onConfirm: (items: Array<{ variant: BillingSearchVariant; quantity: number }>) => void;
}

export const WhatsAppPastePanel: React.FC<Props> = ({ catalog, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [lines, setLines] = useState<CompiledWhatsAppLine[]>([]);
  const catalogById = useMemo(
    () => new Map(catalog.map((variant) => [variant.id, variant])),
    [catalog]
  );
  const resolvedCount = lines.filter((line) => line.selectedVariantId).length;

  const compile = () => setLines(compileWhatsAppList(text, catalog));
  const updateLine = (id: string, changes: Partial<CompiledWhatsAppLine>) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...changes } : line)));
  const confirm = () => {
    const items = lines.flatMap((line) => {
      const variant = line.selectedVariantId ? catalogById.get(line.selectedVariantId) : undefined;
      return variant ? [{ variant, quantity: line.quantity }] : [];
    });
    onConfirm(items);
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('billing.whatsapp.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>{t('billing.whatsapp.description')}</p>
        <textarea
          aria-label={t('billing.whatsapp.listLabel')}
          className="min-h-40 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('billing.whatsapp.placeholder')}
          maxLength={5_000}
        />
        <div className="mt-3 flex gap-2">
          <IonButton expand="block" onClick={compile} disabled={!text.trim()}>
            {t('billing.whatsapp.review')}
          </IonButton>
          <IonButton fill="outline" onClick={onCancel}>
            {t('common.cancel')}
          </IonButton>
        </div>

        {lines.length > 0 && (
          <section className="mt-4 grid gap-3" aria-label={t('billing.whatsapp.reviewResults')}>
            {lines.map((line) => (
              <article key={line.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <strong>{line.source}</strong>
                <div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr]">
                  <label>
                    {t('billing.whatsapp.quantity')}
                    <input
                      className="mt-1 min-h-touch w-full rounded-lg border border-gray-300 px-2"
                      type="number"
                      min="1"
                      max="999"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.id, {
                          quantity: Math.max(1, Math.min(999, Number(event.target.value) || 1)),
                        })
                      }
                    />
                  </label>
                  <label>
                    {t('billing.whatsapp.product')}
                    <select
                      className="mt-1 min-h-touch w-full rounded-lg border border-gray-300 bg-white px-2"
                      value={line.selectedVariantId ?? ''}
                      onChange={(event) =>
                        updateLine(line.id, { selectedVariantId: event.target.value || null })
                      }
                    >
                      <option value="">{t('billing.whatsapp.unresolved')}</option>
                      {line.alternatives.map((variant) => (
                        <option value={variant.id} key={variant.id}>
                          {[variant.product_name, variant.brand, variant.size]
                            .filter(Boolean)
                            .join(' · ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            ))}
            <p>
              {t('billing.whatsapp.resolvedSummary', {
                resolved: resolvedCount,
                total: lines.length,
              })}
            </p>
            <IonButton expand="block" onClick={confirm} disabled={resolvedCount === 0}>
              {t('billing.whatsapp.addToBill')}
            </IonButton>
          </section>
        )}
      </IonContent>
    </>
  );
};
