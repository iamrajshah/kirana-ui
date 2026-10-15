export const TENANT_BACKUP_MAX_BYTES = 25 * 1024 * 1024;

export const canRestoreBackup = (
  currentShopName: string,
  confirmation: string,
  acknowledged: boolean
): boolean => acknowledged && confirmation.trim() === currentShopName;

export const isSupportedBackupFile = (file: Pick<File, 'name' | 'size'>): boolean =>
  file.name.toLowerCase().endsWith('.json') && file.size <= TENANT_BACKUP_MAX_BYTES;
