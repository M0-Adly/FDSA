import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // ── Core UI ───────────────────────────────────────────────────────────────
      app_title:          'National Crisis Management System',
      system_hierarchy:   'System Hierarchy',
      click_to_select:    'Click a department node to view details.',
      system_ready:       'System Ready',
      system_ready_desc:  'Select a District or Department from the hierarchy tree to monitor real-time status.',
      stats:              'System Statistics',
      ongoing:            'Ongoing',
      pending:            'Pending',
      resolved:           'Resolved',
      back:               'Back',

      // ── T1: Max Emergency Mode ────────────────────────────────────────────────
      crisis_on:           'MAX EMERGENCY ON',
      crisis_off:          'MAX EMERGENCY',
      mass_crisis_banner:  'Critical Alert: Maximum Emergency Mode Active • ALL LIMITS OVERRIDDEN • Priority Forced to 5',

      // ── Controls ──────────────────────────────────────────────────────────────
      escalate_all:   'Escalate All',
      escalate_desc:  'Pending reports waiting > 3 sim steps are transferred to the same dept in the other district.',
      undo:           'Undo',
      sim_step:       'Sim Step',
      export_json:    'Export JSON',
      sim_step_plus:  '+1 Sim Step',
      language:       'AR',
      undo_tooltip:   'Undo: {{action}} #{{id}}',
      undo_nothing:   'Nothing to undo',

      // ── Department ────────────────────────────────────────────────────────────
      no_units:          '⚠ NO UNITS AVAILABLE',
      resources:         'Resources',
      // T4: active reports + capacity
      active_reports:    'Active Reports',
      capacity:          'Capacity',
      mark_resolved:     'MARK RESOLVED',
      no_backlog:        'No Backlog',
      clear:             'Clear',
      step:              'Step',
      solved_in:         'steps',
      district_dashboard:'Dashboard',
      district_subtitle: 'Overview of all 5 critical departments in this jurisdiction.',
      resolved_dept_hint:'Showing last 10. See all →',

      // ── T3: Records page ──────────────────────────────────────────────────────
      records_title:      'Records Archive',
      records_subtitle:   'All resolved reports across all districts and departments.',
      records_search:     'Search ID, type, description…',
      records_col_type:   'Type',
      records_col_desc:   'Description',
      records_col_priority:'Priority',
      records_col_dept:   'Department',
      records_col_step:   'Timestamp',
      records_col_duration:'Duration',
      no_resolved:        'No resolved reports match this filter.',
      filter_all:         'All Time',
      filter_daily:       'Daily',
      filter_weekly:      'Weekly',
      filter_monthly:     'Monthly',

      // ── File Report ───────────────────────────────────────────────────────────
      dispatch_incident:  'DISPATCH INCIDENT',
      no_secondary:       'No Secondary Support',
      secondary_police:   'Police Dept (same district)',
      secondary_ambulance:'Ambulance (same district)',
      secondary_fire:     'Fire Dept (same district)',
      support_note:       '* Supporting dept is notified only — no duplicate report is created.',
      incident_description:'Incident Description',
      describe_emergency: 'Describe the emergency...',
      support_dept:       'Support Department (optional)',
      dispatching_to:     'Dispatching to',
      ics_score_label:    'ICS Score',
      priority_label:     'Priority',
      adjust:             '← Adjust',
      cancel:             'Cancel',

      // ── T6 & T7: Transfer / Force ongoing ────────────────────────────────────
      transfer_to_other:   'Transfer to Other District',
      transfer_hint:       'Sibling dept',
      force_ongoing:       'Force Ongoing',
      force_ongoing_full:  'Cannot promote: max 3 ongoing reports allowed.',

      // ── Districts / Departments ───────────────────────────────────────────────
      districts: { d1: 'First District', d2: 'Second District' },
      departments: {
        fire:        'Fire Dept',
        police:      'Police Dept',
        ambulance:   'Ambulance',
        water:       'Water Co.',
        electricity: 'Electricity Co.',
      },
      actions: { file: 'File Report', resolve: 'Resolve', transfer: 'Transfer' },

      // ── T2: Governorate banner — Aswan ────────────────────────────────────────
      governorate_name:   'Aswan Governorate',
      governorate_vision: 'A resilient community protected by swift and coordinated emergency response.',

      // ── Chatbot ───────────────────────────────────────────────────────────────
      chatbot: {
        title:        'ARIA Assistant',
        placeholder:  'Ask ARIA something...',
        send:         'Send',
        greeting:     'Hello! I am ARIA. Ask me about system stats, pending reports, or highest priority issues.',
        fallback:     "I didn't catch that. Try: 'How many pending reports in First District?' or 'What is the highest priority report?'",
        pending_d1:    'There are {{count}} pending reports in the First District.',
        pending_d2:    'There are {{count}} pending reports in the Second District.',
        pending_total: 'Total pending reports: {{count}}',
        highest_report:'Highest priority report is #{{id}} in {{dept}} with Priority {{priority}}.',
        no_pending:    'There are no pending reports in the system.',
        sim_status:    'Current simulation step: {{step}}.',
      },

      // ── Audit ─────────────────────────────────────────────────────────────────
      audit: {
        title:          'System Audit Trail',
        empty:          'No logs captured yet.',
        initialized:    'System Initialized',
        report_filed:   'New report filed in {{dept}} (ICS: {{score}})',
        report_resolved:'Report #{{id}} resolved',
        escalated:      'Global escalation triggered',
        undone:         'Last action undone',
        transferred:    'Report #{{id}} transferred to {{dept}}',
        aging:          'System Aging: Priorities increased for pending reports',
        mass_on:        'MAXIMUM EMERGENCY MODE ACTIVATED',
        mass_off:       'Maximum Emergency Mode Deactivated',
      },

      // ── ICS ───────────────────────────────────────────────────────────────────
      ics: {
        form_title:    'Priority Scoring Matrix',
        form_subtitle: 'ICS-201 INCIDENT ASSESSMENT FORM',
        form_desc:     'Rate each criterion 1–5. The weighted score determines response tier (Red / Orange / Yellow) within 60 seconds.',
        live_score:    'Live Score',
        review:        'Review Assessment',
        confirm:       'Confirm & Dispatch Report',
        result_title:  'Assessment Breakdown',
        immediate:     'Immediate',
        urgent:        'Urgent',
        non_urgent:    'Non-Urgent',
        response:      'Response',
        score_label:   'Score {{score}}/{{max}} ({{pct}}%) · Dispatches with Priority {{priority}}',
        criteria: {
          lifeThreat:     { label: 'Immediate Threat to Life',     weight: '×5', help: 'How many lives are at immediate risk within the next 5–10 minutes?', levels: ['No risk','Minimal','Moderate','Serious','Critical / Multiple fatalities imminent'] },
          escalationRate: { label: 'Rate of Escalation',          weight: '×4', help: 'Will the situation double in damage or danger every 15 minutes?',    levels: ['Static / contained','Slow spread','Moderate spread','Rapid escalation','Exponential / uncontrollable'] },
          potentialScale: { label: 'Potential Scale',             weight: '×3', help: 'Number of people, critical infrastructure, or economic impact at risk.',levels: ['< 5 people','5–25 people','25–100 people','100–500 people','> 500 people or national infrastructure'] },
          selfResponse:   { label: 'Available Self‑Response',     weight: '×2', help: 'Does the site already have fire suppression, security, or medical staff?',levels: ['Full on‑site team','Partial coverage','Limited equipment','Minimal','None – fully dependent on response'] },
          facilityType:   { label: 'Criticality of Facility',     weight: '×3', help: 'Is this a hospital, power plant, government building, or critical asset?',levels: ['Residential / low impact','Commercial','Industrial','Public service (schools, transit)','Critical: Hospital / Power / Gov'] },
        },
      },
    },
  },

  ar: {
    translation: {
      // ── Core UI ───────────────────────────────────────────────────────────────
      app_title:          'النظام الوطني لإدارة الأزمات',
      system_hierarchy:   'هيكل النظام',
      click_to_select:    'انقر على عقدة قسم لعرض التفاصيل.',
      system_ready:       'النظام جاهز',
      system_ready_desc:  'اختر منطقة أو قسماً من شجرة الهيكل لمتابعة الحالة الفورية.',
      stats:              'إحصائيات النظام',
      ongoing:            'جارٍ التنفيذ',
      pending:            'قيد الانتظار',
      resolved:           'تم الحل',
      back:               'رجوع',

      // ── T1: وضع الطوارئ القصوى ────────────────────────────────────────────────
      crisis_on:          'الطوارئ القصوى: مفعّل',
      crisis_off:         'الطوارئ القصوى',
      mass_crisis_banner: 'تنبيه حرج: وضع الطوارئ القصوى مفعّل • تجاوز جميع الحدود • الأولوية مرفوعة إلى 5',

      // ── Controls ──────────────────────────────────────────────────────────────
      escalate_all:  'تصعيد الكل',
      escalate_desc: 'البلاغات المنتظرة أكثر من 3 خطوات تُنقل إلى نفس القسم في المنطقة الأخرى.',
      undo:          'تراجع',
      sim_step:      'خطوة المحاكاة',
      export_json:   'تصدير JSON',
      sim_step_plus: '+١ خطوة',
      language:      'EN',
      undo_tooltip:  'تراجع: {{action}} #{{id}}',
      undo_nothing:  'لا يوجد ما يمكن التراجع عنه',

      // ── Department ────────────────────────────────────────────────────────────
      no_units:          '⚠ لا توجد وحدات متاحة',
      resources:         'الموارد',
      active_reports:    'البلاغات النشطة',
      capacity:          'الطاقة الكلية',
      mark_resolved:     'تأكيد الحل',
      no_backlog:        'لا يوجد انتظار',
      clear:             'خالٍ',
      step:              'خطوة',
      solved_in:         'خطوات',
      district_dashboard:'لوحة البيانات',
      district_subtitle: 'نظرة عامة على الأقسام الخمسة في هذه المنطقة.',
      resolved_dept_hint:'عرض آخر 10. انظر الكل ←',

      // ── T3: Records ───────────────────────────────────────────────────────────
      records_title:       'أرشيف السجلات',
      records_subtitle:    'جميع البلاغات المحلولة عبر كل المناطق والأقسام.',
      records_search:      'بحث: ID، النوع، الوصف…',
      records_col_type:    'النوع',
      records_col_desc:    'الوصف',
      records_col_priority:'الأولوية',
      records_col_dept:    'القسم',
      records_col_step:    'الطابع الزمني',
      records_col_duration:'المدة',
      no_resolved:         'لا توجد بلاغات محلولة لهذا الفلتر.',
      filter_all:          'كل الوقت',
      filter_daily:        'يومي',
      filter_weekly:       'أسبوعي',
      filter_monthly:      'شهري',

      // ── File Report ───────────────────────────────────────────────────────────
      dispatch_incident:   'إرسال البلاغ',
      no_secondary:        'لا دعم ثانوي',
      secondary_police:    'إدارة الشرطة (نفس المنطقة)',
      secondary_ambulance: 'الإسعاف (نفس المنطقة)',
      secondary_fire:      'إدارة الإطفاء (نفس المنطقة)',
      support_note:        '* يتلقى القسم الداعم إشعاراً فقط — لا يُنشأ بلاغ مكرر.',
      incident_description:'وصف الحادث',
      describe_emergency:  'اكتب وصف الطارئ...',
      support_dept:        'قسم الدعم (اختياري)',
      dispatching_to:      'إرسال إلى',
      ics_score_label:     'نقاط ICS',
      priority_label:      'الأولوية',
      adjust:              '→ تعديل',
      cancel:              'إلغاء',

      // ── T6 & T7 ───────────────────────────────────────────────────────────────
      transfer_to_other:  'نقل إلى المنطقة الأخرى',
      transfer_hint:      'القسم المقابل',
      force_ongoing:      'تفعيل فوري',
      force_ongoing_full: 'لا يمكن الترقية: الحد الأقصى 3 بلاغات جارية.',

      // ── Districts / Departments ───────────────────────────────────────────────
      districts: { d1: 'المنطقة الأولى', d2: 'المنطقة الثانية' },
      departments: {
        fire:        'إدارة الإطفاء',
        police:      'إدارة الشرطة',
        ambulance:   'الإسعاف',
        water:       'شركة المياه',
        electricity: 'شركة الكهرباء',
      },
      actions: { file: 'تقديم بلاغ', resolve: 'حل البلاغ', transfer: 'نقل' },

      // ── T2: محافظة أسوان ──────────────────────────────────────────────────────
      governorate_name:   'محافظة أسوان',
      governorate_vision: 'مجتمع صامد محمي باستجابة طوارئ سريعة ومنسقة.',

      // ── Chatbot ───────────────────────────────────────────────────────────────
      chatbot: {
        title:        'المساعد ARIA',
        placeholder:  'اسأل ARIA عن شيء...',
        send:         'إرسال',
        greeting:     'مرحباً! أنا أريا. اسألني عن إحصائيات النظام أو البلاغات قيد الانتظار أو الأعلى أولوية.',
        fallback:     'لم أفهم. جرب: "كم عدد البلاغات في المنطقة الأولى؟"',
        pending_d1:    'يوجد {{count}} بلاغ قيد الانتظار في المنطقة الأولى.',
        pending_d2:    'يوجد {{count}} بلاغ قيد الانتظار في المنطقة الثانية.',
        pending_total: 'إجمالي البلاغات قيد الانتظار: {{count}}',
        highest_report:'أعلى بلاغ أولوية هو #{{id}} في {{dept}} بأولوية {{priority}}.',
        no_pending:    'لا توجد بلاغات قيد الانتظار.',
        sim_status:    'خطوة المحاكاة الحالية: {{step}}.',
      },

      // ── Audit ─────────────────────────────────────────────────────────────────
      audit: {
        title:          'سجل نشاط النظام',
        empty:          'لا توجد سجلات بعد.',
        initialized:    'تم تهيئة النظام',
        report_filed:   'بلاغ جديد في {{dept}} (ICS: {{score}})',
        report_resolved:'تم حل البلاغ #{{id}}',
        escalated:      'تم تفعيل التصعيد الشامل',
        undone:         'تم التراجع عن آخر إجراء',
        transferred:    'نُقل البلاغ #{{id}} إلى {{dept}}',
        aging:          'تحديث تلقائي: تمت زيادة أولوية البلاغات المتأخرة',
        mass_on:        'تم تفعيل وضع الطوارئ القصوى',
        mass_off:       'تم إلغاء وضع الطوارئ القصوى',
      },

      // ── ICS ───────────────────────────────────────────────────────────────────
      ics: {
        form_title:    'مصفوفة تقييم الأولوية',
        form_subtitle: 'نموذج تقييم الحادث ICS-201',
        form_desc:     'قيّم كل معيار من 1 إلى 5. تحدد الدرجة المرجّحة مستوى الاستجابة خلال 60 ثانية.',
        live_score:    'الدرجة المباشرة',
        review:        'مراجعة التقييم',
        confirm:       'تأكيد وإرسال البلاغ',
        result_title:  'تفصيل التقييم',
        immediate:     'فوري',
        urgent:        'عاجل',
        non_urgent:    'غير عاجل',
        response:      'استجابة',
        score_label:   'الدرجة {{score}}/{{max}} ({{pct}}%) · يُرسَل بأولوية {{priority}}',
        criteria: {
          lifeThreat:     { label: 'التهديد الفوري للأرواح',         weight: '×5', help: 'كم عدد الأرواح في خطر خلال 5–10 دقائق؟',                levels: ['لا خطر','ضئيل','متوسط','خطير','حرج / وفيات متعددة وشيكة'] },
          escalationRate: { label: 'معدل التصاعد',                   weight: '×4', help: 'هل سيتضاعف الضرر كل 15 دقيقة؟',                          levels: ['ثابت','انتشار بطيء','انتشار متوسط','تصاعد سريع','تصاعد هائل'] },
          potentialScale: { label: 'النطاق المحتمل',                  weight: '×3', help: 'عدد الأشخاص أو البنية التحتية في خطر.',                  levels: ['أقل من 5','5–25','25–100','100–500','أكثر من 500 أو بنية وطنية'] },
          selfResponse:   { label: 'القدرة الذاتية على الاستجابة',   weight: '×2', help: 'هل يوجد فرق إطفاء أو أمن في الموقع؟',                    levels: ['فريق متكامل','تغطية جزئية','معدات محدودة','الحد الأدنى','لا يوجد'] },
          facilityType:   { label: 'أهمية المنشأة',                  weight: '×3', help: 'هل هي مستشفى أم محطة طاقة أم مبنى حكومي؟',               levels: ['سكني','تجاري','صناعي','خدمة عامة','حيوي: مستشفى / طاقة / حكومة'] },
        },
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
