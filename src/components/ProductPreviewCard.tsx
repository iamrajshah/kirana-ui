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
  return (
    <IonCard className="my-4">
      <IonCardHeader>
        <IonCardTitle className="text-lg">Product Found</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {/* Product Info */}
        <div className="space-y-3">
          {data.image_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={data.image_url} 
                alt={data.name || 'Product'}
                className="h-32 w-32 object-contain rounded"
              />
            </div>
          )}
          
          <div>
            <p className="text-xs text-gray-500">Product Name</p>
            <p className="font-semibold">{data.name || 'N/A'}</p>
          </div>

          {data.brand && (
            <div>
              <p className="text-xs text-gray-500">Brand</p>
              <p className="font-medium">{data.brand}</p>
            </div>
          )}

          {data.quantity && (
            <div>
              <p className="text-xs text-gray-500">Quantity/Size</p>
              <p className="font-medium">{data.quantity}</p>
            </div>
          )}

          {data.category_hint && (
            <div>
              <p className="text-xs text-gray-500">Category</p>
              <IonBadge color="primary">
                {data.category_hint.replace(/^[a-z]{2}:/i, '')}
              </IonBadge>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500">Barcode</p>
            <p className="font-mono text-sm">{data.barcode}</p>
          </div>

          {(data.mrp || data.selling_price) && (
            <div className="grid grid-cols-2 gap-3">
              {data.mrp && (
                <div>
                  <p className="text-xs text-gray-500">MRP</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(data.mrp)}
                  </p>
                </div>
              )}
              {data.selling_price && (
                <div>
                  <p className="text-xs text-gray-500">Selling Price</p>
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
            Update Inventory
          </IonButton>
          <IonButton
            expand="block"
            onClick={onEditProduct}
            fill="outline"
          >
            <IonIcon slot="start" icon={createOutline} />
            Edit Product
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
