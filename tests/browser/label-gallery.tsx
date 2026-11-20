import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IonApp, setupIonicReact } from '@ionic/react';
import { store } from '../../src/core/store';
import { ProductBarcodeLabelModal } from '../../src/features/products/ProductBarcodeLabelModal';
import '../../src/core/i18n';
import '@ionic/react/css/core.css';
import '@ionic/react/css/structure.css';
import '../../src/theme/variables.css';
import '../../src/index.css';
setupIonicReact({ mode: 'md' });
const variant = {
  id: 'fixture',
  product_id: 'fixture-product',
  brand: 'Shop packed',
  size: '5 kg',
  sku: 'QA-RICE',
  price: 50,
  selling_price: 50,
  mrp_price: 60,
  is_active: true,
  barcodes: [{ id: 'fixture-barcode', barcode: '2001173897723', is_active: true }],
};
createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <IonApp>
      <ProductBarcodeLabelModal
        isOpen
        shopName="Kirana sample shop"
        productName="Loose rice"
        variant={variant}
        onDismiss={() => {}}
      />
    </IonApp>
  </Provider>
);
