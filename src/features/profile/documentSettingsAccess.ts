import { hasPermission } from '@core/permissions/permissions';

export const canEditTenantDocumentSettings = (roles: string[]): boolean =>
  hasPermission(roles, 'SETTINGS_ALL');
