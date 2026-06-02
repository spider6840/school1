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
  
  // Dashboard translation keys
  'Overview': { en: 'Overview', fr: 'Aperçu', ar: 'نظرة عامة' },
  'Subjects': { en: 'Subjects', fr: 'Matières', ar: 'المواد' },
  'Admissions': { en: 'Admissions', fr: 'Admissions', ar: 'القبول' },
  'Classes': { en: 'Classes', fr: 'Classes', ar: 'الصفوف' },
  'Attendance': { en: 'Attendance', fr: 'Présences', ar: 'الحضور' },
  'Homeworks': { en: 'Homeworks', fr: 'Devoirs', ar: 'الواجبات' },
  'Grading': { en: 'Grading', fr: 'Notes', ar: 'الدرجات' },
  'Messages': { en: 'Messages', fr: 'Messages', ar: 'الرسائل' },
  'My Profile': { en: 'My Profile', fr: 'Mon Profil', ar: 'ملفي الشخصي' },
  'School Settings': { en: 'School Settings', fr: 'Paramètres de l\'école', ar: 'إعدادات المدرسة' },
  'Platform Overview': { en: 'Platform Overview', fr: 'Aperçu de la plateforme', ar: 'نظرة عامة على المنصة' },
  'Tenant Schools': { en: 'Tenant Schools', fr: 'Écoles Clientes', ar: 'مدارس المستأجرين' },
  'Global Admins': { en: 'Global Admins', fr: 'Admins Globaux', ar: 'المسؤولون العامون' },
  'Global Settings': { en: 'Global Settings', fr: 'Paramètres Globaux', ar: 'الإعدادات العامة' },
  'Open Navigation Menu': { en: 'Open Navigation Menu', fr: 'Ouvrir le menu de navigation', ar: 'افتح قائمة التنقل' },
  'Manage assignments and submissions': { en: 'Manage assignments and submissions', fr: 'Gérez les devoirs et les soumissions', ar: 'إدارة الواجبات والتقديمات' },
  'Create Homework': { en: 'Create Homework', fr: 'Créer un devoir', ar: 'إنشاء واجب' },
  'Manage academic subjects & curriculum breakdown': { en: 'Manage academic subjects & curriculum breakdown', fr: 'Gérer les matières académiques et le programme', ar: 'إدارة المواد الأكاديمية وتوزيع المناهج' },
  'Add Subject': { en: 'Add Subject', fr: 'Ajouter une matière', ar: 'إضافة مادة' },
  'Manage your institution\'s profile, preferences, and branding.': { 
    en: 'Manage your institution\'s profile, preferences, and branding.', 
    fr: 'Gérez le profil, les préférences et la marque de votre institution.', 
    ar: 'إدارة ملف مؤسستك وتفضيلاتك وعلامتك التجارية.' 
  },
  'Manage your personal information and preferences.': {
    en: 'Manage your personal information and preferences.',
    fr: 'Gérez vos informations personnelles et vos préférences.',
    ar: 'إدارة معلوماتك الشخصية وتفضيلاتك.'
  },
  'Welcome back': { en: 'Welcome back', fr: 'Bon retour', ar: 'مرحباً بعودتك' },
  'Here\'s what\'s happening in your school today.': { 
    en: 'Here\'s what\'s happening in your school today.', 
    fr: 'Voici ce qui se passe dans votre école aujourd\'hui.', 
    ar: 'إليك ما يحدث في مدرستك اليوم.' 
  },
  'Active Students': { en: 'Active Students', fr: 'Élèves Actifs', ar: 'الطلاب النشطون' },
  'Staff Members': { en: 'Staff Members', fr: 'Membres du personnel', ar: 'أعضاء هيئة التدريس' },
  'Classes Today': { en: 'Classes Today', fr: 'Cours du jour', ar: 'حصص اليوم' },
  'Unread Messages': { en: 'Unread Messages', fr: 'Messages non lus', ar: 'رسائل غير مقروءة' },
  'Recent Activity': { en: 'Recent Activity', fr: 'Activité récente', ar: 'النشاط الأخير' },
  'New admission processed': { en: 'New admission processed', fr: 'Nouvelle admission traitée', ar: 'تمت معالجة قبول جديد' },
  '2 hours ago': { en: '2 hours ago', fr: 'Il y a 2 heures', ar: 'منذ ساعتين' },
  'Manage the platform\'s global branding and preferences.': {
    en: 'Manage the platform\'s global branding and preferences.',
    fr: 'Gérez la marque et les préférences globales de la plateforme.',
    ar: 'إدارة العلامة التجارية والتفضيلات العالمية للمنصة.'
  },
  'Subscriptions': { en: 'Subscriptions', fr: 'Inscriptions', ar: 'الاشتراكات' },
  'Users': { en: 'Users', fr: 'Utilisateurs', ar: 'المستخدمون' },
  'Accountant': { en: 'Accountant', fr: 'Comptable', ar: 'محاسب' },
  'Subscriptions & Payments': { en: 'Subscriptions & Payments', fr: 'Inscriptions & Paiements', ar: 'الاشتراكات والمدفوعات' },
  'Manage student inscriptions and financial tracking': { 
    en: 'Manage student inscriptions and financial tracking', 
    fr: 'Gérer les inscriptions des étudiants et le suivi financier', 
    ar: 'إدارة تسجيل الطلاب والتتبع المالي' 
  }
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
