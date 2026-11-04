import React, { type PropsWithChildren } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from '@core/api/apiSlice';
import { productApi } from '@core/api/productApi';
import CreatePurchasePage from './CreatePurchasePage';

const policy = vi.hoisted(() => ({ role: 'OWNER', margin: true }));
vi.mock('@core/hooks', () => ({
  useAppSelector: () => ({
    id: '7',
    tenant: { id: '2' },
    roles: [policy.role],
    state: 'ACTIVE',
    entitlements: policy.margin ? ['LIVE_MARGIN_PREVIEW'] : [],
    featureRoles: { LIVE_MARGIN_PREVIEW: ['OWNER', 'CASHIER'] },
  }),
}));
vi.mock('react-router', () => ({ useHistory: () => ({ push: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/supplierApi', () => ({ useGetSuppliersQuery: () => ({ data: { data: [] } }) }));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({ data: { data: { firms: [] } }, isLoading: false }),
}));
vi.mock('@core/api/purchaseApi', () => ({
  useCreatePurchaseMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@core/services/notificationService', () => {
  const service = { warning: vi.fn(), success: vi.fn(), error: vi.fn(), handleApiError: vi.fn() };
  return { default: service, notificationService: service };
});
vi.mock('@components', () => ({
  SearchBar: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input
      aria-label="Product search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  Input: ({
    label,
    value,
    onChange,
  }: {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <input aria-label={label} value={value} onChange={(event) => onChange?.(event.target.value)} />
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  EmptyState: () => null,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    ...Object.fromEntries(
      [
        'IonPage',
        'IonHeader',
        'IonToolbar',
        'IonTitle',
        'IonContent',
        'IonButtons',
        'IonCard',
        'IonCardHeader',
        'IonCardTitle',
        'IonCardContent',
        'IonList',
        'IonLabel',
        'IonText',
        'IonSelect',
        'IonSelectOption',
        'IonModal',
        'IonBadge',
      ].map((name) => [name, Container])
    ),
    IonIcon: () => null,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
    IonItem: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
      >
        {children}
      </div>
    ),
  };
});

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const fixtures = [
  { id: '1', product_id: '3', product_name: 'Salt', sku: 'SALT', price: 50, gst_percent: 0 },
  { id: '2', product_id: '4', product_name: 'Sugar', sku: 'SUGAR', price: 30, gst_percent: 0 },
];
const createStore = () =>
  configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: () => ({
        user: { id: '7' },
        accessToken: 'test',
        refreshToken: 'test-refresh',
        sessionVersion: 1,
      }),
    },
    middleware: (defaults) => defaults().concat(apiSlice.middleware),
  });
let store: ReturnType<typeof createStore>;
let costReply: (productId: string) => Promise<Response>;
let requests: string[];
const NativeRequest = Request;

beforeEach(() => {
  localStorage.clear();
  policy.role = 'OWNER';
  policy.margin = true;
  store = createStore();
  requests = [];
  costReply = async (id) =>
    json({ data: [{ variant_id: id === '3' ? '1' : '2', purchase_price: id === '3' ? 40 : 20 }] });
  vi.stubGlobal(
    'Request',
    class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, init ? { ...init, signal: undefined } : init);
      }
    }
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      );
      requests.push(url.pathname);
      if (url.pathname.endsWith('/products/search')) {
        const term = url.searchParams.get('q') || '';
        return json({
          data: fixtures.filter((item) => item.product_name.toLowerCase().includes(term)),
        });
      }
      const productId = url.pathname.match(/\/products\/(\d+)\/purchase-costs$/)?.[1];
      return productId ? costReply(productId) : json({ message: 'Unexpected test request' }, 500);
    })
  );
});
afterEach(async () => {
  cleanup();
  const running = store.dispatch(apiSlice.util.getRunningQueriesThunk());
  running.forEach((query) => query.abort());
  await Promise.allSettled(running);
  store.dispatch(apiSlice.util.resetApiState());
  vi.unstubAllGlobals();
});
const page = () => (
  <Provider store={store}>
    <CreatePurchasePage />
  </Provider>
);
const selectProduct = async (name = 'Salt', term = 'sa') => {
  fireEvent.change(screen.getByLabelText('Product search'), { target: { value: term } });
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
};
const price = (name = 'Salt') =>
  screen.getByRole('spinbutton', { name: `${name} purchases.unitPrice` }) as HTMLInputElement;
const privateRequests = () => requests.filter((url) => url.endsWith('/purchase-costs'));

describe('purchase prefill with the real product API hooks', () => {
  it('combines cost-free search with authorized private costs without altering the shared cache', async () => {
    render(page());
    await selectProduct();
    await waitFor(() => expect(price().value).toBe('40'));
    expect(privateRequests()).toEqual(['/api/v1/products/3/purchase-costs']);
    const shared = productApi.endpoints.searchVariants.select({ search: 'sa' })(
      store.getState()
    ).data;
    expect(shared?.data[0]).not.toHaveProperty('purchase_price');
    expect(shared?.data[0].price).toBe(50);
  });

  it.each([
    ['MANAGER', true],
    ['CASHIER', true],
    ['OWNER', false],
  ] as const)('does not fetch private costs for %s with margin=%s', async (role, margin) => {
    policy.role = role;
    policy.margin = margin;
    render(page());
    await selectProduct();
    await waitFor(() => expect(price().value).toBe('50'));
    expect(privateRequests()).toEqual([]);
  });

  it('waits for cost before pack controls and combines repeated pending selections once', async () => {
    let finish!: (value: Response) => void;
    costReply = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    render(page());
    await selectProduct();
    await waitFor(() => expect(privateRequests()).toHaveLength(1));
    expect(screen.queryByRole('spinbutton', { name: /Salt purchases.unitPrice/ })).toBeNull();
    await selectProduct();
    expect(privateRequests()).toHaveLength(1);
    await act(async () => finish(json({ data: [{ variant_id: '1', purchase_price: 40 }] })));
    await waitFor(() => expect(price().value).toBe('40'));
    expect(
      screen.getByText('purchases.unitQuantity').parentElement?.querySelector('strong')?.textContent
    ).toBe('2');
    fireEvent.change(screen.getByRole('combobox', { name: /Salt purchases.enteredAs/ }), {
      target: { value: 'PACK' },
    });
    expect(
      (screen.getByRole('spinbutton', { name: /Salt purchases.pricePerPack/ }) as HTMLInputElement)
        .value
    ).toBe('800');
  });

  it('keeps a typed price when another private response arrives and when the item is selected again', async () => {
    let finish!: (value: Response) => void;
    costReply = (id) =>
      id === '3'
        ? Promise.resolve(json({ data: [{ variant_id: '1', purchase_price: 40 }] }))
        : new Promise((resolve) => {
            finish = resolve;
          });
    render(page());
    await selectProduct();
    await waitFor(() => expect(price().value).toBe('40'));
    fireEvent.change(price(), { target: { value: '37' } });
    await selectProduct('Sugar', 'su');
    await waitFor(() => expect(privateRequests()).toHaveLength(2));
    await selectProduct();
    expect(privateRequests()).toHaveLength(2);
    await act(async () => finish(json({ data: [{ variant_id: '2', purchase_price: 20 }] })));
    await waitFor(() => expect(price('Sugar').value).toBe('20'));
    expect(price().value).toBe('37');
  });

  it.each(['missing', 'failed'] as const)(
    'keeps the editable fallback for %s private cost',
    async (kind) => {
      costReply = async () =>
        kind === 'failed'
          ? json({ message: 'Unavailable' }, 500)
          : json({ data: [{ variant_id: '1', purchase_price: null }] });
      render(page());
      await selectProduct();
      await waitFor(() => expect(price().value).toBe('50'));
      fireEvent.change(price(), { target: { value: '38' } });
      expect(price().value).toBe('38');
    }
  );
});
