import { API_BASE_URL, STORAGE_KEYS } from '@core/constants';

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
}

export interface PlatformTenant {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  owner: { id: string; name: string; email: string; phone: string } | null;
  counts: { users: number; products: number; invoices: number };
  onboarding: {
    completed: number;
    total: number;
    percent: number;
    steps: {
      ownerPasswordChanged: boolean;
      productsAdded: boolean;
      staffAdded: boolean;
      firstSaleCompleted: boolean;
    };
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Platform request failed');
  }
  return payload.data;
};

const platformRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = localStorage.getItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_ADMIN);
  }
  return parseResponse<T>(response);
};

export const platformApi = {
  async login(email: string, password: string) {
    return platformRequest<{ admin: PlatformAdmin; accessToken: string }>('/platform-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  listTenants(search = '') {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return platformRequest<PlatformTenant[]>(`/platform/tenants${query}`);
  },

  createTenant(input: {
    shopName: string;
    ownerName: string;
    phone: string;
    email: string;
    temporaryPassword: string;
    gstNumber?: string;
  }) {
    return platformRequest<{
      tenant: { id: string; name: string; status: string };
      owner: {
        id: string;
        name: string;
        email: string;
        phone: string;
        mustChangePassword: boolean;
      };
    }>('/platform/tenants', { method: 'POST', body: JSON.stringify(input) });
  },

  updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return platformRequest<{ id: string; name: string; status: 'ACTIVE' | 'SUSPENDED' }>(
      `/platform/tenants/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
  },
};
