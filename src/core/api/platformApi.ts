import { API_BASE_URL, STORAGE_KEYS } from '@core/constants';

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  scopes?: string[];
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

export interface PlatformTenantDetails {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  contact: {
    ownerName: string | null;
    phone: string;
    email: string | null;
    gstNumber: string | null;
  };
  counts: { users: number; products: number; invoices: number };
  staff: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    active: boolean;
    mustChangePassword: boolean;
    createdAt: string | null;
    roles: string[];
  }>;
  commercial: null | {
    subscriptionId: string;
    plan: { code: string; name: string; version: number };
    state: string;
    billingCycle: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | null;
    startsAt: string;
    endsAt: string | null;
    demoExpiresAt: string | null;
    graceExpiresAt: string | null;
    usage: { staff: number; firms: number };
    limits: { staff: number | null; firms: number | null };
    pendingPlan: { code: string; version: number } | null;
    pendingConflicts: unknown;
    history: Array<{
      id: string;
      from: string | null;
      to: string;
      reason: string | null;
      occurredAt: string;
    }>;
  };
  auditHistory: Array<{ id: string; action: string; occurredAt: string; metadata: unknown }>;
}

export interface PlatformPlan {
  code: 'DEMO' | 'STARTER' | 'PRO' | 'BUSINESS';
  name: string;
  description: string | null;
  version: number | null;
  quarterlyPricePaise: number | null;
  halfYearlyPricePaise: number | null;
  yearlyPricePaise: number | null;
  limits: { staff: number | null; firms: number | null };
  entitlements: string[];
}

export interface PlatformLead {
  id: string;
  status: string;
  email: string | null;
  phone: string | null;
  shopName: string | null;
  source: string | null;
  identity: {
    id: string;
    name: string | null;
    provider: string | null;
    lastSignInAt: string | null;
  };
  demo: null | {
    status: string;
    stage: string;
    createdAt: string;
    completedAt: string | null;
    expiresAt: string | null;
  };
  milestones: Array<{ code: string; firstObservedAt: string }>;
}

export interface PlatformLeadDetails extends Omit<PlatformLead, 'identity' | 'demo'> {
  identity: {
    id: string;
    name: string | null;
    email: string;
    status: string;
    providers: Array<{ provider: string; lastSeenAt: string | null }>;
    memberships: Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      tenantStatus: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      active: boolean;
    }>;
  };
  demo: null | {
    id: string;
    tenantId: string;
    status: string;
    stage: string;
    createdAt: string;
    completedAt: string | null;
    expiresAt: string | null;
    subscriptionHistory: Array<{
      from: string | null;
      to: string;
      reason: string | null;
      occurredAt: string;
    }>;
  };
  milestones: Array<{ code: string; firstObservedAt: string; metadata: unknown }>;
  conversions: Array<{
    id: string;
    status: string;
    paidTenant: { id: string; name: string; status: string } | null;
    completedAt: string | null;
  }>;
  deletionRequests: Array<{
    id: string;
    status: string;
    requestedAt: string;
    resolvedAt: string | null;
    notes: string | null;
  }>;
}

export interface DowngradePreview {
  targetPlan: string;
  canActivate: boolean;
  conflicts: Array<{
    type: string;
    current?: number;
    limit?: number;
    excess?: number;
    feature?: string;
  }>;
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

  async reauthenticate(password: string) {
    const data = await platformRequest<{ accessToken: string; reauthenticatedAt: string }>(
      '/platform-auth/reauthenticate',
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
    localStorage.setItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN, data.accessToken);
    return data;
  },

  listTenants(search = '') {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return platformRequest<PlatformTenant[]>(`/platform/tenants${query}`);
  },

  getTenantDetails(id: string, signal?: AbortSignal) {
    return platformRequest<PlatformTenantDetails>(`/platform/tenants/${id}`, { signal });
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

  resetOwnerPassword(id: string, temporaryPassword: string) {
    return platformRequest<{
      tenant: { id: string; name: string };
      owner: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        mustChangePassword: boolean;
      };
    }>(`/platform/tenants/${id}/owner-password`, {
      method: 'PATCH',
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  listLeads(search = '') {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return platformRequest<PlatformLead[]>(`/platform/leads${query}`);
  },

  getLeadDetails(id: string) {
    return platformRequest<PlatformLeadDetails>(`/platform/leads/${id}`);
  },

  listPlans() {
    return platformRequest<PlatformPlan[]>('/platform/plans');
  },

  createPlanVersion(
    code: 'STARTER' | 'PRO' | 'BUSINESS',
    input: {
      monthlyPricePaise: number;
      quarterlyPricePaise: number;
      halfYearlyPricePaise: number;
      yearlyPricePaise: number;
      staffLimit: number | null;
      firmLimit: number | null;
      entitlements: string[];
      effectiveAt?: string;
    }
  ) {
    return platformRequest<{
      id: string;
      planCode: string;
      version: number;
      effectiveAt: string;
      catalogueHash: string;
    }>(`/platform/plans/${code}/versions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  activateLead(
    id: string,
    input: {
      planCode: 'STARTER' | 'PRO' | 'BUSINESS';
      billingCycle: 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
      shopName: string;
      ownerName: string;
      phone: string;
      email: string;
      gstNumber?: string;
    }
  ) {
    return platformRequest<{ idempotent: boolean; conversionId: string; tenant: { id: string } }>(
      `/platform/leads/${id}/activate`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  previewSubscriptionChange(id: string, planCode: string) {
    return platformRequest<DowngradePreview>(
      `/platform/tenants/${id}/subscription/preview?planCode=${encodeURIComponent(planCode)}`
    );
  },

  changeSubscription(id: string, planCode: string, billingCycle: 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY') {
    return platformRequest<{ applied: boolean; subscriptionId: string; conflicts: unknown[] }>(
      `/platform/tenants/${id}/subscription`,
      {
        method: 'PATCH',
        body: JSON.stringify({ planCode, billingCycle }),
      }
    );
  },

  transitionSubscription(id: string, state: string, reason: string, graceExpiresAt?: string) {
    return platformRequest<{ id: string; state: string; graceExpiresAt: string | null }>(
      `/platform/tenants/${id}/lifecycle`,
      {
        method: 'PATCH',
        body: JSON.stringify({ state, reason, graceExpiresAt }),
      }
    );
  },

  repairIdentityMembership(identityId: string, userId: string, tenantId: string, reason: string) {
    return platformRequest<{
      identityId: string;
      userId: string;
      tenantId: string;
      sessionsRevoked: boolean;
    }>(`/platform/identities/${identityId}/repair`, {
      method: 'POST',
      body: JSON.stringify({ userId, tenantId, reason }),
    });
  },

  decideDeletionRequest(
    id: string,
    decision: 'IN_REVIEW' | 'COMPLETED' | 'REJECTED' | 'CANCELLED',
    notes: string
  ) {
    return platformRequest<{ id: string; status: string; resolvedAt: string | null }>(
      `/platform/deletion-requests/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ decision, notes }),
      }
    );
  },

  previewDemoCleanup() {
    return platformRequest<
      Array<{
        id: string;
        tenantId: string;
        identityId: string;
        status: string;
        purgeAfter: string | null;
      }>
    >('/platform/maintenance/demo-cleanup');
  },

  executeDemoCleanup(provisioningIds: string[]) {
    return platformRequest<{ purged: Array<{ id: string; tenantId: string }> }>(
      '/platform/maintenance/demo-cleanup',
      {
        method: 'POST',
        body: JSON.stringify({ provisioningIds, confirmation: 'PURGE DEMO OPERATIONAL DATA' }),
      }
    );
  },
};
