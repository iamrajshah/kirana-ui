// Role-based menu permissions
export const ROLE_PERMISSIONS = {
  OWNER: [
    'dashboard',
    'billing',
    'customers',
    'suppliers',
    'purchases',
    'products',
    'inventory',
    'invoices',
    'payments',
    'reports',
    'users',
    'import-export',
  ],
  MANAGER: [
    'dashboard',
    'billing',
    'customers',
    'suppliers',
    'purchases',
    'products',
    'inventory',
    'invoices',
    'payments',
    'reports',
    'import-export',
  ],
  CASHIER: [
    'dashboard',
    'billing',
    'customers',
    'invoices',
    'payments',
  ],
};

export const hasAccessToTab = (userRoles: string[], tabName: string): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  // Check if user has any role that grants access to this tab
  return userRoles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    return permissions?.includes(tabName) || false;
  });
};
