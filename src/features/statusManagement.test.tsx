import React, { type PropsWithChildren } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from '../core/api/apiSlice';
import { categoryApi } from '../core/api/categoryApi';
import { UsersPage } from './users/UsersPage';
import { CategoriesPage } from './categories/CategoriesPage';

vi.mock('../core/api/apiSlice', async () => {
  const { createApi, fetchBaseQuery } = await import('@reduxjs/toolkit/query/react');
  return { apiSlice: createApi({
    baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost/api/v1' }),
    tagTypes: ['User', 'Category'],
    endpoints: () => ({}),
  }) };
});
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components/Input', () => ({ Input: () => null }));
vi.mock('@components/Select', () => ({ Select: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    ...Object.fromEntries(['IonPage', 'IonContent', 'IonList', 'IonItem', 'IonLabel',
      'IonCard', 'IonCardHeader', 'IonCardTitle', 'IonCardContent', 'IonHeader',
      'IonToolbar', 'IonTitle', 'IonButtons', 'IonBadge'].map(name => [name, Container])),
    IonButton: Container,
    IonModal: Container,
    IonToast: () => null,
    IonIcon: () => null,
    IonSpinner: () => null,
    IonToggle: ({ checked, onIonChange }: {
      checked: boolean;
      onIonChange: (event: { detail: { checked: boolean } }) => void;
    }) => <input type="checkbox" checked={checked}
      onChange={event => onIonChange({ detail: { checked: event.target.checked } })} />,
  };
});

function createTestStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}
const stores: ReturnType<typeof createTestStore>[] = [];
function makeStore() {
  const store = createTestStore();
  stores.push(store);
  return store;
}

let active: boolean;
let requests: Request[];
beforeEach(() => {
  // These synchronous response fixtures do not use cancellation. Avoid passing
  // jsdom's AbortSignal to Node's Request, which requires its own realm.
  const NativeRequest = Request;
  vi.stubGlobal('Request', class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, init ? { ...init, signal: undefined } : init);
    }
  });
  active = true;
  requests = [];
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    requests.push(request.clone());
    const url = new URL(request.url);
    if (request.method === 'PATCH') {
      active = (await request.json()).is_active;
      return new Response(JSON.stringify({ success: true, data: { id: '2', is_active: active } }));
    }
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const record = url.pathname.endsWith('/users')
      ? { id: '2', name: 'Test Manager', phone: '1234567890', roles: ['MANAGER'], is_active: active }
      : { id: 2, name: 'Test Category', is_active: active };
    return new Response(JSON.stringify({ success: true, data: active || includeInactive ? [record] : [] }));
  }));
});
afterEach(() => {
  cleanup();
  stores.splice(0).forEach(store => store.dispatch(apiSlice.util.resetApiState()));
  vi.unstubAllGlobals();
});

describe.each([
  { label: 'users', Page: UsersPage, name: 'Test Manager', activeLabel: 'common.active', inactiveLabel: 'common.inactive' },
  { label: 'categories', Page: CategoriesPage, name: 'Test Category', activeLabel: 'Active', inactiveLabel: 'Inactive' },
])('$label status management', ({ Page, name, activeLabel, inactiveLabel }) => {
  it('retains the record and synchronizes its status through deactivation and reactivation', async () => {
    render(<Provider store={makeStore()}><Page /></Provider>);
    await screen.findByText(name);
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(active).toBe(false));
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));
    expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(inactiveLabel)).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(active).toBe(true));
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true));
    expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(activeLabel)).toBeTruthy();
    const patches = requests.filter(request => request.method === 'PATCH');
    expect(await patches[0].json()).toEqual({ is_active: false });
    expect(await patches[1].json()).toEqual({ is_active: true });
  });

  it('shows initially inactive records so they can be reactivated', async () => {
    active = false;
    render(<Provider store={makeStore()}><Page /></Provider>);
    await screen.findByText(name);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(inactiveLabel)).toBeTruthy();
  });
});

it('keeps default category queries active-only for product selection', async () => {
  active = false;
  const result = await makeStore().dispatch(categoryApi.endpoints.getCategories.initiate()).unwrap();
  expect(result.data).toEqual([]);
  expect(new URL(requests[0].url).searchParams.has('includeInactive')).toBe(false);
});
