// Role-based menu permissions
export const ROLE_PERMISSIONS = {
  OWNER: [
    'dashboard',
    'billing',
    'customers',
    'products',
    'inventory',
    'payments',
    'reports',
    'users',
    'import-export',
  ],
  MANAGER: [
    'dashboard',
    'billing',
    'customers',
    'products',
    'inventory',
    'payments',
    'reports',
    'import-export',
  ],
  CASHIER: [
    'dashboard',
    'billing',
    'customers',
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
