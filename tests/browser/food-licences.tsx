import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IonApp, IonContent, setupIonicReact } from '@ionic/react';
import { store } from '../../src/core/store';
import { setCredentials } from '../../src/core/auth/authSlice';
import i18n from '../../src/core/i18n';
import { FoodLicenceSettingsCard } from '../../src/features/food-licences/FoodLicenceSettingsCard';
import { FoodLicenceSelector } from '../../src/features/food-licences/FoodLicenceSelector';
import '@ionic/react/css/core.css';
import '../../src/theme/variables.css';
import '../../src/index.css';
setupIonicReact({ mode: 'md' });
const params = new URLSearchParams(location.search);
document.body.classList.toggle('dark', params.get('theme') === 'dark');
store.dispatch(
  setCredentials({
    tokens: {
      accessToken: 'synthetic-local-qa-access',
      refreshToken: 'synthetic-local-qa-refresh',
    },
    user: { id: '1', name: 'QA Owner', email: null, phone: '9000000001', roles: ['OWNER'] },
  })
);
document.body.dataset.fixtureRoles = JSON.stringify(store.getState().auth.user?.roles ?? null);
function Fixture() {
  const [value, setValue] = useState('');
  return (
    <IonApp>
      <IonContent>
        <main style={{ maxWidth: 1150, margin: '0 auto', padding: 12 }}>
          <FoodLicenceSettingsCard />
          <FoodLicenceSelector
            firmId="1"
            invoiceDate="2026-11-20"
            value={value}
            onChange={setValue}
          />
          <output data-testid="selected-licence">{value}</output>
        </main>
      </IonContent>
    </IonApp>
  );
}
void i18n.changeLanguage(params.get('lang') || 'en').then(() =>
  createRoot(document.getElementById('root')!).render(
    <Provider store={store}>
      <Fixture />
    </Provider>
  )
);
