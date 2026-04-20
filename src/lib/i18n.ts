import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app_title": "National Crisis Management System",
      "stats": "System Statistics",
      "ongoing": "Ongoing",
      "pending": "Pending",
      "resolved": "Resolved",
      "escalate_all": "Escalate All",
      "undo": "Undo",
      "sim_step": "Sim Step",
      "districts": {
        "d1": "First District",
        "d2": "Second District"
      },
      "departments": {
        "fire": "Fire Dept",
        "police": "Police Dept",
        "ambulance": "Ambulance",
        "water": "Water Co.",
        "electricity": "Electricity Co."
      },
      "actions": {
        "file": "File New Report",
        "resolve": "Resolve",
        "transfer": "Transfer"
      },
      "chatbot": {
        "title": "ARIA Assistant",
        "placeholder": "Ask ARIA something...",
        "send": "Send"
      },
      "priority": "Priority",
      "type": "Type",
      "description": "Description",
      "submit": "Submit"
    }
  },
  ar: {
    translation: {
      "app_title": "النظام الوطني لإدارة الأزمات",
      "stats": "إحصائيات النظام",
      "ongoing": "جاري",
      "pending": "قيد الانتظار",
      "resolved": "تم الحل",
      "escalate_all": "تصعيد الكل",
      "undo": "تراجع",
      "sim_step": "خطوة المحاكاة",
      "districts": {
        "d1": "المنطقة الأولى",
        "d2": "المنطقة الثانية"
      },
      "departments": {
        "fire": "إدارة الإطفاء",
        "police": "إدارة الشرطة",
        "ambulance": "الإسعاف",
        "water": "شركة المياه",
        "electricity": "شركة الكهرباء"
      },
      "actions": {
        "file": "تقديم بلاغ جديد",
        "resolve": "حل",
        "transfer": "نقل"
      },
      "chatbot": {
        "title": "المساعد ARIA",
        "placeholder": "اسأل ARIA عن شيء...",
        "send": "إرسال"
      },
      "priority": "الأولوية",
      "type": "النوع",
      "description": "الوصف",
      "submit": "إرسال"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
