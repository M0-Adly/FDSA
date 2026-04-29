'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Portal Names
    portal_name: "CrisisCommand",
    secure_portal: "Government Secure Portal",
    citizen_portal: "Citizen Portal",
    admin_portal: "Admin Console",
    
    // Navigation
    dashboard: "Dashboard",
    profile: "Profile",
    logout: "Logout",
    command_center: "Command Center",
    admin_panel: "Admin Panel",
    system_records: "System Records",
    
    // Citizen Dashboard
    welcome: "Welcome",
    citizen_access: "Citizen Access",
    my_reports: "My Reports",
    new_report: "New Report",
    total_reports: "Total Reports",
    ongoing: "Ongoing",
    resolved: "Resolved",
    pending_approval: "Account Pending Approval",
    account_rejected: "Account Rejected",
    no_reports: "No reports found",
    submit_first: "Submit your first emergency report",
    
    // Status & Filters
    status: "Status",
    priority: "Priority",
    all: "All",
    active: "Active",
    awaiting_confirmation: "Awaiting Confirmation",
    fully_resolved: "Fully Resolved",
    resolution_pending: "Resolution Pending Approval",
    
    // Actions
    confirm_fixed: "Confirm it's Fixed",
    not_fixed: "Not Resolved",
    submit_report: "Submit Report",
    back_to_overview: "Back to Overview",
    resolve: "Resolve",
    start: "Start",
    transfer: "Transfer",
    escalate: "Escalate",
    global_escalation: "Global Escalation",
    
    // Form Fields
    district: "District",
    department: "Department",
    description: "Description",
    priority_level: "Priority Level",
    select_district: "Select a district...",
    select_dept: "Select department...",
    
    // Admin Dashboard
    system_hierarchy: "System Hierarchy",
    ongoing_responses: "Ongoing Responses",
    pending_queue: "Pending Queue",
    system_live: "System Live",
    sim_step: "Sim Step",
    active_label: "Active",
    queue_clear: "Queue is clear",
    no_active: "No active emergencies",
    
    // General
    loading: "Loading...",
    success_submit: "Report submitted successfully!",
    error_submit: "Error submitting report",
    confirmed_msg: "Resolution confirmed! Thank you.",
    reopened_msg: "Report reopened for further action.",
    admin_console: "Admin Console",
    staff_provisioning: "Staff Provisioning System",
    deploy_account: "Deploy New Government Account",
    government_id: "Government ID",
    officer_name: "Officer Full Name",
    security_clearance: "Security Clearance (Password)",
    authorize_account: "Authorize Account",
    pending_approvals: "Pending Citizen Approvals",
    approve_account: "Approve Account",
    reject: "Reject",
    registration_date: "Registration Date",
    auth_email: "Auth Email",
    national_id_image: "National ID Image",
    no_image: "No image uploaded",
    click_view_full: "Click to view full size",
    success_deploy: "Employee credentials deployed successfully!",
  },
  ar: {
    // Portal Names
    portal_name: "بوابة القيادة",
    secure_portal: "البوابة الحكومية الآمنة",
    citizen_portal: "بوابة المواطن",
    admin_portal: "لوحة تحكم النظام",
    
    // Navigation
    dashboard: "لوحة التحكم",
    profile: "الملف الشخصي",
    logout: "تسجيل الخروج",
    command_center: "مركز القيادة",
    admin_panel: "لوحة الإدارة",
    system_records: "سجلات النظام",
    
    // Citizen Dashboard
    welcome: "مرحباً",
    citizen_access: "دخول المواطنين",
    my_reports: "بلاغاتي",
    new_report: "بلاغ جديد",
    total_reports: "إجمالي البلاغات",
    ongoing: "قيد التنفيذ",
    resolved: "تم الحل",
    pending_approval: "الحساب في انتظار الموافقة",
    account_rejected: "تم رفض الحساب",
    no_reports: "لا توجد بلاغات حالياً",
    submit_first: "قم بإرسال أول بلاغ طوارئ",
    
    // Status & Filters
    status: "الحالة",
    priority: "الأولوية",
    all: "الكل",
    active: "نشط",
    awaiting_confirmation: "في انتظار التأكيد",
    fully_resolved: "تم الحل نهائياً",
    resolution_pending: "بانتظار تأكيد المواطن",
    
    // Actions
    confirm_fixed: "تأكيد الإصلاح",
    not_fixed: "لم يتم الإصلاح",
    submit_report: "إرسال البلاغ",
    back_to_overview: "العودة للعرض العام",
    resolve: "حل البلاغ",
    start: "بدء التنفيذ",
    transfer: "تحويل البلاغ",
    escalate: "تصعيد",
    global_escalation: "تصعيد شامل للمنظومة",
    
    // Form Fields
    district: "الحي / المنطقة",
    department: "الجهة المختصة",
    description: "تفاصيل البلاغ",
    priority_level: "مستوى الأهمية",
    select_district: "اختر المنطقة...",
    select_dept: "اختر الجهة...",
    
    // Admin Dashboard
    system_hierarchy: "الهيكل الإداري",
    ongoing_responses: "بلاغات قيد المعالجة",
    pending_queue: "قائمة الانتظار",
    system_live: "النظام متصل",
    sim_step: "خطوة المحاكاة",
    active_label: "نشط",
    queue_clear: "قائمة الانتظار فارغة",
    no_active: "لا توجد بلاغات نشطة حالياً",
    
    // General
    loading: "جاري التحميل...",
    success_submit: "تم إرسال البلاغ بنجاح!",
    error_submit: "خطأ في إرسال البلاغ",
    confirmed_msg: "تم تأكيد الحل بنجاح. شكراً لك.",
    reopened_msg: "تمت إعادة فتح البلاغ لمزيد من الإجراءات.",
    admin_console: "كونسول الإدارة",
    staff_provisioning: "نظام تعيين الموظفين والكوادر",
    deploy_account: "إنشاء حساب حكومي جديد",
    government_id: "الرقم الوظيفي / الحكومي",
    officer_name: "اسم الضابط / الموظف بالكامل",
    security_clearance: "التصريح الأمني (كلمة المرور)",
    authorize_account: "اعتماد الحساب",
    pending_approvals: "طلبات اعتماد المواطنين المعلقة",
    approve_account: "اعتماد الحساب",
    reject: "رفض",
    registration_date: "تاريخ التسجيل",
    auth_email: "البريد الإلكتروني للمنظومة",
    national_id_image: "صورة الهوية الوطنية",
    no_image: "لم يتم رفع صورة",
    click_view_full: "اضغط للعرض بالحجم الكامل",
    success_deploy: "تم نشر بيانات الموظف بنجاح في النظام!",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language;
    if (saved) setLanguage(saved);
    
    // Update document direction
    document.dir = saved === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = saved || 'en';
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('lang', lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      <div className={language === 'ar' ? 'font-arabic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
