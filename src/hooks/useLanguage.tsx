import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Language = 'en' | 'fr' | 'ar';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

export const translations: Translations = {
  home: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  contact: { en: 'Contact', fr: 'Contact', ar: 'اتصل بنا' },
  memberSpace: { en: 'Member Space', fr: 'Espace Membre', ar: 'مساحة الأعضاء' },
  heroTitle: { en: 'Transform Your School Management', fr: 'Transformez la gestion de votre école', ar: 'حول إدارة مدرستك' },
  heroSub: { en: 'The all-in-one SaaS platform for modern education. Admissions, attendance, and grading simplified.', fr: 'La plateforme SaaS tout-en-un pour l\'éducation moderne. Admissions, présences et notes simplifiées.', ar: 'منصة SaaS المتكاملة للتعليم الحديث. القبول والحضور والدرجات أصبحت بسيطة.' },
  getStarted: { en: 'Get Started', fr: 'Commencer', ar: 'ابدأ الآن' },
  contactUs: { en: 'Contact Us', fr: 'Contactez-nous', ar: 'اتصل بنا' },
  featAdmissions: { en: 'Admissions', fr: 'Admissions', ar: 'القبول' },
  featAdmissionsDesc: { en: '500+ New Students', fr: 'Plus de 500 nouveaux élèves', ar: '+500 طالب جديد' },
  featGrading: { en: 'Grading', fr: 'Notes', ar: 'الدرجات' },
  featGradingDesc: { en: 'Instant Analytics', fr: 'Analyses instantanées', ar: 'تحليلات فورية' },
  featScheduling: { en: 'Scheduling', fr: 'Emploi du temps', ar: 'الجدولة' },
  featSchedulingDesc: { en: 'Dynamic Timetables', fr: 'Emplois du temps dynamiques', ar: 'جداول زمنية ديناميكية' },
  name: { en: 'Name', fr: 'Nom', ar: 'الاسم' },
  email: { en: 'Email', fr: 'Email', ar: 'البريد الإلكتروني' },
  message: { en: 'Message', fr: 'Message', ar: 'الرسالة' },
  send: { en: 'Send', fr: 'Envoyer', ar: 'إرسال' },
  theme: { en: 'Theme', fr: 'Thème', ar: 'المظهر' },
  language: { en: 'Language', fr: 'Langue', ar: 'اللغة' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      <div dir={dir}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
