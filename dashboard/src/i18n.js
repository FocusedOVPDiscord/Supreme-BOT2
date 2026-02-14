import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      settings: {
        title: "Settings",
        subtitle: "Customize your dashboard experience",
        theme: {
          title: "Theme",
          description: "Choose your preferred theme",
          dark: "Dark Mode",
          light: "Light Mode"
        },
        language: {
          title: "Language",
          description: "Select your language"
        },
        performance: {
          title: "Performance",
          description: "Adjust animations based on your device",
          low: "Low",
          medium: "Medium",
          high: "High",
          lowDesc: "Minimal animations",
          mediumDesc: "Balanced",
          highDesc: "Full effects",
          autoDetected: "Auto-detected",
          deviceInfo: "Device Information",
          ram: "RAM",
          cores: "CPU Cores",
          connection: "Connection",
          device: "Device Type",
          mobile: "Mobile",
          desktop: "Desktop"
        },
        active: "Active",
        resetDefaults: "Reset to Defaults"
      }
    }
  },
  fr: {
    translation: {
      settings: {
        title: "Paramètres",
        subtitle: "Personnalisez votre tableau de bord",
        theme: {
          title: "Thème",
          description: "Choisissez votre thème préféré",
          dark: "Mode Sombre",
          light: "Mode Clair"
        },
        language: {
          title: "Langue",
          description: "Sélectionnez votre langue"
        },
        performance: {
          title: "Performance",
          description: "Ajustez les animations selon votre appareil",
          low: "Faible",
          medium: "Moyen",
          high: "Élevé",
          lowDesc: "Animations minimales",
          mediumDesc: "Équilibré",
          highDesc: "Effets complets",
          autoDetected: "Détecté automatiquement",
          deviceInfo: "Informations sur l'appareil",
          ram: "RAM",
          cores: "Cœurs CPU",
          connection: "Connexion",
          device: "Type d'appareil",
          mobile: "Mobile",
          desktop: "Bureau"
        },
        active: "Actif",
        resetDefaults: "Réinitialiser"
      }
    }
  },
  ar: {
    translation: {
      settings: {
        title: "الإعدادات",
        subtitle: "خصص تجربة لوحة التحكم الخاصة بك",
        theme: {
          title: "المظهر",
          description: "اختر المظهر المفضل لديك",
          dark: "الوضع الداكن",
          light: "الوضع الفاتح"
        },
        language: {
          title: "اللغة",
          description: "اختر لغتك"
        },
        performance: {
          title: "الأداء",
          description: "اضبط الرسوم المتحركة حسب جهازك",
          low: "منخفض",
          medium: "متوسط",
          high: "عالي",
          lowDesc: "رسوم متحركة قليلة",
          mediumDesc: "متوازن",
          highDesc: "تأثيرات كاملة",
          autoDetected: "تم الكشف تلقائيًا",
          deviceInfo: "معلومات الجهاز",
          ram: "الذاكرة",
          cores: "أنوية المعالج",
          connection: "الاتصال",
          device: "نوع الجهاز",
          mobile: "جوال",
          desktop: "سطح المكتب"
        },
        active: "نشط",
        resetDefaults: "إعادة تعيين"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('supreme-bot-language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
