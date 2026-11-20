import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReceiptSettingsPreview } from '../../src/features/profile/ReceiptSettingsPreview';
import type { ReceiptTemplate } from '../../src/core/types';
import i18n from '../../src/core/i18n';
import '../../src/theme/variables.css';
import '../../src/index.css';
const params = new URLSearchParams(location.search);
await i18n.changeLanguage('en');
const form = {
  supplier_name: 'Kirana neighbourhood shop',
  address_line1: 'Market Road',
  phone: '9000000000',
  receipt_template: (params.get('template') || 'CLASSIC') as ReceiptTemplate,
  default_paper_width: (params.get('paper') === '58' ? 'MM58' : 'MM80') as 'MM58' | 'MM80',
  logo_url: 'https://qa.kirana.invalid/shop-logo.png',
  footer: 'Thank you for shopping with us',
};
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 16, maxWidth: 960, margin: 'auto' }}>
    <ReceiptSettingsPreview form={form} />
  </main>
);
