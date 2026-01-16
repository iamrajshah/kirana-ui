// Permission checking utilities
// Mirrors backend permission structure from auth.middleware.ts

export const ROLE_PERMISSIONS = {
  OWNER: [
    'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE',
    'BILL_CREATE', 'BILL_VIEW', 'BILL_UPDATE', 'BILL_DELETE',
    'CUSTOMER_CREATE', 'CUSTOMER_VIEW', 'CUSTOMER_UPDATE', 'CUSTOMER_DELETE',
    'SUPPLIER_CREATE', 'SUPPLIER_VIEW', 'SUPPLIER_UPDATE', 'SUPPLIER_MANAGE', 'SUPPLIER_DELETE',
    'PURCHASE_CREATE', 'PURCHASE_VIEW', 'PURCHASE_UPDATE', 'PURCHASE_DELETE',
    'PRODUCT_CREATE', 'PRODUCT_VIEW', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
    'REPORT_VIEW', 'SETTINGS_ALL', 'IMPORT_DATA', 'EXPORT_DATA'
  ],
  MANAGER: [
    'BILL_CREATE', 'BILL_VIEW', 'BILL_UPDATE',
    'CUSTOMER_CREATE', 'CUSTOMER_VIEW', 'CUSTOMER_UPDATE',
    'SUPPLIER_CREATE', 'SUPPLIER_VIEW', 'SUPPLIER_UPDATE', 'SUPPLIER_MANAGE',
    'PURCHASE_CREATE', 'PURCHASE_VIEW', 'PURCHASE_UPDATE',
    'PRODUCT_CREATE', 'PRODUCT_VIEW', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
    'REPORT_VIEW', 'IMPORT_DATA', 'EXPORT_DATA'
  ],
  CASHIER: [
    'BILL_CREATE', 'BILL_VIEW',
    'CUSTOMER_VIEW',
    'SUPPLIER_VIEW',
    'PURCHASE_VIEW',
    'PRODUCT_VIEW'
  ]
};

export const hasPermission = (userRoles: string[], permission: string): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  // Check if user has any role that grants this permission
  return userRoles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    return permissions?.includes(permission) || false;
  });
};
