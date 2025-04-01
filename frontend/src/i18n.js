import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resources from "./resources";

i18n.use(initReactI18next).init({
    resources,
    lng: "ru", // Default language
    fallbackLng: "en", // Fallback language
    interpolation: {
        escapeValue: false, // React already escapes values
    },
});

export default i18n;