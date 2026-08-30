import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: {
          "welcome": "Bienvenue sur la plateforme Ebeno",
          "login": "Connexion",
          "logout": "Déconnexion"
        }
      }
    },
    lng: "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
