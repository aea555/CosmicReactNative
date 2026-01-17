import * as Localization from 'expo-localization';
import i18n from 'i18next';
import 'intl-pluralrules';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import tr from './locales/tr';

const resources = {
    en: { translation: en },
    tr: { translation: tr },
};

// Get device locale and check if it's Turkish
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
const defaultLanguage = deviceLocale === 'tr' ? 'tr' : 'en';

i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false, // React already escapes values
    },
});

export default i18n;
