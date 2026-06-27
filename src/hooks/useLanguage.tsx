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
  'Payments': { en: 'Payments', fr: 'Paiements', ar: 'المدفوعات' },
  'Manage and track all financial transactions': {
    en: 'Manage and track all financial transactions',
    fr: 'Gérer et suivre toutes les transactions financières',
    ar: 'إدارة وتتبع جميع المعاملات المالية'
  },
  'cash': { en: 'Cash', fr: 'Espèces', ar: 'نقداً' },
  'check': { en: 'Check', fr: 'Chèque', ar: 'شيك' },
  'transfer': { en: 'Bank Transfer', fr: 'Virement', ar: 'حوالة مصرفية' },
  'pending': { en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' },
  'sent_to_bank': { en: 'Sent to Bank', fr: 'Envoyé à la banque', ar: 'أرسل إلى البنك' },
  'paid': { en: 'Paid', fr: 'Payé', ar: 'مدفوع' },
  'unpaid': { en: 'Unpaid', fr: 'Non payé', ar: 'غير مدفوع' },
  'Pending': { en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' },
  'Sent to Bank': { en: 'Sent to Bank', fr: 'Envoyé à la banque', ar: 'أرسل إلى البنك' },
  'Paid': { en: 'Paid', fr: 'Payé', ar: 'مدفوع' },
  'Unpaid': { en: 'Unpaid', fr: 'Non payé', ar: 'غير مدفوع' },
  'Cancel': { en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' },
  'Save': { en: 'Save', fr: 'Enregistrer', ar: 'حفظ' },
  'Type': { en: 'Type', fr: 'Type', ar: 'النوع' },
  'Amount': { en: 'Amount', fr: 'Montant', ar: 'المبلغ' },
  'Reference/Check N°': { en: 'Reference/Check N°', fr: 'Référence/N° Chèque', ar: 'المرجع/رقم الشيك' },
  'Due Date': { en: 'Due Date', fr: 'Date limite', ar: 'تاريخ الاستحقاق' },
  'Status': { en: 'Status', fr: 'Statut', ar: 'الحالة' },
  'Student': { en: 'Student', fr: 'Étudiant', ar: 'طالب' },
  'Type & Ref': { en: 'Type & Ref', fr: 'Type & Réf', ar: 'النوع والمرجع' },
  'Actions': { en: 'Actions', fr: 'Actions', ar: 'إجراءات' },
  'Class': { en: 'Class', fr: 'Classe', ar: 'قسم' },
  'Season': { en: 'Season', fr: 'Saison', ar: 'موسم' },
  'Required Services': { en: 'Required Services', fr: 'Services Requis', ar: 'الخدمات المطلوبة' },
  'Education': { en: 'Education', fr: 'Scolarité', ar: 'تمدرس' },
  'Canteen': { en: 'Canteen', fr: 'Cantine', ar: 'مقصف' },
  'Transport': { en: 'Transport', fr: 'Transport', ar: 'نقل' },
  'Auto-activate without payment (Director Override)': { en: 'Auto-activate without payment (Director Override)', fr: 'Auto-activation sans paiement (Dérogation)', ar: 'التفعيل التلقائي بدون دفع' },
  'Create Inscription': { en: 'Create Inscription', fr: 'Créer l\'inscription', ar: 'إنشاء تسجيل' },
  'Mark as Paid': { en: 'Mark as Paid', fr: 'Marquer comme payé', ar: 'حدد كمدفوع' },
  'Select...': { en: 'Select...', fr: 'Sélectionner...', ar: 'اختر...' },
  'Select... (Must have parent)': { en: 'Select... (Must have parent)', fr: 'Sélectionner... (Doit avoir un parent)', ar: 'اختر... (يجب أن يكون لديه ولي أمر)' },
  'No Parent': { en: 'No Parent', fr: 'Pas de parent', ar: 'لا يوجد ولي أمر' },
  'Log Payment': { en: 'Log Payment', fr: 'Enregistrer le paiement', ar: 'تسجيل الدفع' },
  'Loading...': { en: 'Loading...', fr: 'Chargement...', ar: 'جاري التحميل...' },
  'No payments found': { en: 'No payments found', fr: 'Aucun paiement trouvé', ar: 'لم يتم العثور على مدفوعات' },
  'Full Meals': { en: 'Full Meals', fr: 'Repas Complets', ar: 'وجبات كاملة' },
  'Lunch Only': { en: 'Lunch Only', fr: 'Déjeuner Uniquement', ar: 'غداء فقط' },
  'Breakfast Only': { en: 'Breakfast Only', fr: 'Petit Déjeuner Uniquement', ar: 'إفطار فقط' },
  'Round Trip': { en: 'Round Trip', fr: 'Aller-Retour', ar: 'ذهاب وإياب' },
  'Morning Coming': { en: 'Morning Coming', fr: 'Aller (Matin)', ar: 'ذهاب (الصباح)' },
  'Return Home': { en: 'Return Home', fr: 'Retour (Soir)', ar: 'عودة (المساء)' },
  'Total Inscriptions': { en: 'Total Inscriptions', fr: 'Total des Inscriptions', ar: 'إجمالي التسجيلات' },
  'Total Revenue': { en: 'Total Revenue', fr: 'Revenu Total', ar: 'إجمالي الإيرادات' },
  'Inscriptions': { en: 'Inscriptions', fr: 'Inscriptions', ar: 'تسجيلات' },
  'Global platform 360 overview.': { en: 'Global platform 360 overview.', fr: 'Vue d\'ensemble 360 de la plateforme mondiale.', ar: 'نظرة عامة 360 للمنصة العالمية.' },
  'Required Services & Discounts': { en: 'Required Services & Discounts', fr: 'Services Requis et Réductions', ar: 'الخدمات المطلوبة والخصومات' },
  'Discount': { en: 'Discount', fr: 'Réduction', ar: 'خصم' },
  'No classes found.': { en: 'No classes found.', fr: 'Aucune classe trouvée.', ar: 'لم يتم العثور على أي قسم.' },
  'Uncategorized': { en: 'Uncategorized', fr: 'Non catégorisé', ar: 'غير مصنف' },
  'Edit Class': { en: 'Edit Class', fr: 'Modifier la classe', ar: 'تعديل القسم' },
  'New Class': { en: 'New Class', fr: 'Nouvelle classe', ar: 'قسم جديد' },
  'Class Name': { en: 'Class Name', fr: 'Nom de la classe', ar: 'اسم القسم' },
  'Level': { en: 'Level', fr: 'Niveau', ar: 'المستوى' },
  'Nursery': { en: 'Nursery', fr: 'Maternelle', ar: 'حضانة' },
  'Primary': { en: 'Primary', fr: 'Primaire', ar: 'ابتدائي' },
  'Middle School': { en: 'Middle School', fr: 'Collège', ar: 'إعدادي' },
  'High School': { en: 'High School', fr: 'Lycée', ar: 'ثانوي' },
  'Service Prices': { en: 'Service Prices', fr: 'Prix des services', ar: 'أسعار الخدمات' },
  'Save Changes': { en: 'Save Changes', fr: 'Enregistrer', ar: 'حفظ التغييرات' },
  'Create': { en: 'Create', fr: 'Créer', ar: 'إنشاء' },
  'Organize your school into groups and classes.': { en: 'Organize your school into groups and classes.', fr: 'Organisez votre école en groupes et classes.', ar: 'نظم مدرستك في مجموعات وأقسام.' },
  'Class Management': { en: 'Class Management', fr: 'Gestion des classes', ar: 'إدارة الفصول' },
  'Create Class': { en: 'Create Class', fr: 'Créer une classe', ar: 'إنشاء قسم' },
  'Paid Month/Period': { en: 'Paid Month/Period', fr: 'Mois/Période payé', ar: 'الشهر/الفترة المدفوعة' },
  'Payer Name': { en: 'Payer Name', fr: 'Nom du payeur', ar: 'اسم الدافع' },
  'Print Receipt': { en: 'Print Receipt', fr: 'Imprimer le reçu', ar: 'طباعة الإيصال' },
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
