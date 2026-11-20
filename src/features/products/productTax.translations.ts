import i18n from 'i18next';
import en from './tax-locales/en.json';
import hi from './tax-locales/hi.json';
import mr from './tax-locales/mr.json';
import gu from './tax-locales/gu.json';

// This module is loaded with the workspace, after app i18n initialization.
// The menu title and missing-value label remain in the small shared catalogue.
if (i18n.isInitialized) {
  for (const [language, values] of Object.entries({ en, hi, mr, gu })) {
    i18n.addResourceBundle(language, 'translation', { taxWorkspace: values }, true, false);
  }
}
