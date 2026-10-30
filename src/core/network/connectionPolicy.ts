export interface NetworkConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

export const getBrowserConnection = (): NetworkConnectionInfo | undefined => {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkConnectionInfo }).connection;
};

export const isConstrainedConnection = (
  connection: NetworkConnectionInfo | null | undefined
): boolean => {
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
};
