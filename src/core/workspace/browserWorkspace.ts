import { isNativeMobile } from '@core/auth/deviceIdentity';
import { WorkspaceLease } from './workspaceLease';

// Native WebViews are independent licensed devices, not browser tabs.
export const browserWorkspace = isNativeMobile() ? null : new WorkspaceLease(navigator.locks);

export const runInActiveWorkspace = async <T>(request: () => Promise<T>): Promise<T> => {
  const lease = browserWorkspace?.isStarted() ? browserWorkspace : null;
  const finish = lease?.beginRequest();
  if (lease && !finish) throw new Error('This POS tab is inactive.');
  try {
    return await request();
  } finally {
    finish?.();
  }
};
