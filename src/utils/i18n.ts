import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app": {
        "title": "Geobble",
        "tagline": "Exploring the world, one territory at a time."
      },
      "game": {
        "score": "Score",
        "streak": "Streak",
        "next": "Next",
        "loading": "Loading...",
        "error": "Error loading data"
      },
      "map": {
        "loading": "Loading world map..."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
