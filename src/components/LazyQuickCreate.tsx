import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
const Party = lazy(() =>
  import('./QuickPartyCreate').then((module) => ({ default: module.QuickPartyCreate }))
);
const Product = lazy(() =>
  import('./QuickProductCreate').then((module) => ({ default: module.QuickProductCreate }))
);
function Pending() {
  const { t } = useTranslation();
  return <p role="status">{t('common.loading')}</p>;
}
export function LazyQuickPartyCreate(props: React.ComponentProps<typeof Party>) {
  return (
    <Suspense fallback={<Pending />}>
      <Party {...props} />
    </Suspense>
  );
}
export function LazyQuickProductCreate(props: React.ComponentProps<typeof Product>) {
  return (
    <Suspense fallback={<Pending />}>
      <Product {...props} />
    </Suspense>
  );
}
