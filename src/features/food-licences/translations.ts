import i18n from 'i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
if (i18n.isInitialized) {
  for (const [language, values] of Object.entries({ en, hi, mr, gu })) {
    i18n.addResourceBundle(language, 'translation', { foodLicences: values }, true, false);
  }
}
