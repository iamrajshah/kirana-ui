import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { createOutline, addCircleOutline } from 'ionicons/icons';
import { BarcodeLookupData } from '@core/types';
import { formatCurrency } from '@utils/helpers';
import { useTranslation } from 'react-i18next';

interface ProductPreviewCardProps {
  data: BarcodeLookupData;
  onUpdateInventory: () => void;
  onEditProduct: () => void;
}

export const ProductPreviewCard: React.FC<ProductPreviewCardProps> = ({
  data,
  onUpdateInventory,
  onEditProduct,
}) => {
  const { t } = useTranslation();
  return (
    <IonCard className="my-4">
      <IonCardHeader>
        <IonCardTitle className="text-lg">{t('foundation.barcode.foundTitle')}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {/* Product Info */}
        <div className="space-y-3">
          {data.image_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={data.image_url} 
                alt={data.name || t('foundation.barcode.imageAlt')}
                className="h-32 w-32 object-contain rounded"
              />
            </div>
          )}
          
          <div>
            <p className="text-xs text-gray-500">{t('products.productName')}</p>
            <p className="font-semibold">{data.name || t('foundation.barcode.notAvailable')}</p>
          </div>

          {data.brand && (
            <div>
              <p className="text-xs text-gray-500">{t('products.brand')}</p>
              <p className="font-medium">{data.brand}</p>
            </div>
          )}

          {data.quantity && (
            <div>
              <p className="text-xs text-gray-500">{t('foundation.barcode.quantitySize')}</p>
              <p className="font-medium">{data.quantity}</p>
            </div>
          )}

          {data.category_hint && (
            <div>
              <p className="text-xs text-gray-500">{t('products.category')}</p>
              <IonBadge color="primary">
                {data.category_hint.replace(/^[a-z]{2}:/i, '')}
              </IonBadge>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500">{t('foundation.barcode.barcode')}</p>
            <p className="font-mono text-sm">{data.barcode}</p>
          </div>

          {(data.mrp || data.selling_price) && (
            <div className="grid grid-cols-2 gap-3">
              {data.mrp && (
                <div>
                  <p className="text-xs text-gray-500">{t('foundation.barcode.mrp')}</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(data.mrp)}
                  </p>
                </div>
              )}
              {data.selling_price && (
                <div>
                  <p className="text-xs text-gray-500">{t('products.sellingPrice')}</p>
                  <p className="font-semibold text-lg text-green-600">
                    {formatCurrency(data.selling_price)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions - only show for local products */}
        <div className="mt-6 space-y-2">
          <IonButton
            expand="block"
            onClick={onUpdateInventory}
            fill="solid"
          >
            <IonIcon slot="start" icon={addCircleOutline} />
            {t('foundation.barcode.updateInventory')}
          </IonButton>
          <IonButton
            expand="block"
            onClick={onEditProduct}
            fill="outline"
          >
            <IonIcon slot="start" icon={createOutline} />
            {t('products.editProduct')}
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
