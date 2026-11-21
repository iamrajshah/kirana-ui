import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { isNativeMobile } from '@core/auth/deviceIdentity';
import i18n from '@core/i18n';

const WorkspaceGate = lazy(() =>
  import('@core/workspace/WorkspaceGate').then((module) => ({ default: module.WorkspaceGate }))
);
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  isNativeMobile() ? (
    <App />
  ) : (
    <Suspense
      fallback={
        <div className="workspace-state" role="status">
          {i18n.t('common.loading')}
        </div>
      }
    >
      <WorkspaceGate>
        <App />
      </WorkspaceGate>
    </Suspense>
  )
);
