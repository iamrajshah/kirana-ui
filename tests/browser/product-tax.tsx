import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IonApp, IonContent, IonModal, setupIonicReact } from '@ionic/react';
import { store } from '../../src/core/store';
import i18n from '../../src/core/i18n';
import ProductTaxWorkspace from '../../src/features/products/ProductTaxWorkspace';
import '@ionic/react/css/core.css';
import '@ionic/react/css/structure.css';
import '../../src/theme/variables.css';
import '../../src/index.css';
setupIonicReact({ mode: 'md' });
const params = new URLSearchParams(location.search);
document.body.classList.toggle('dark', params.get('theme') === 'dark');
function Fixture() {
  const modal = useRef<HTMLIonModalElement>(null);
  const [open, setOpen] = useState(true);
  return (
    <IonApp>
      <button type="button" onClick={() => setOpen(true)}>
        Open tax review
      </button>
      {open && (
        <IonModal
          ref={modal}
          className="product-tax-modal"
          isOpen
          backdropDismiss={false}
          canDismiss={(_data, role) => Promise.resolve(role === 'confirmed')}
          onDidPresent={() => {
            document.body.dataset.qaTaxModal = 'ready';
          }}
          onDidDismiss={() => {
            delete document.body.dataset.qaTaxModal;
            setOpen(false);
          }}
        >
          <IonContent>
            <ProductTaxWorkspace
              onClose={() => {
                void modal.current?.dismiss(undefined, 'confirmed');
              }}
            />
          </IonContent>
        </IonModal>
      )}
    </IonApp>
  );
}
void i18n.changeLanguage(params.get('lang') || 'en').then(() => {
  createRoot(document.getElementById('root')!).render(
    <Provider store={store}>
      <Fixture />
    </Provider>
  );
});
