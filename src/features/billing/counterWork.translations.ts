import i18n from 'i18next';
import translations from './counterWorkTranslations.json';
// Billing-specific messages load with the billing route, not the login bundle.
if (i18n.isInitialized) {
  for (const [language, values] of Object.entries(translations)) {
    i18n.addResourceBundle(language, 'translation', { counterWork: values }, true, false);
  }
}
