'use client';

import { useLanguage } from './LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
      title={language === 'en' ? 'Switch to Arabic' : 'تغيير للإنجليزية'}
    >
      <span className="text-lg">{language === 'en' ? '🇪🇬' : '🇺🇸'}</span>
      <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-white">
        {language === 'en' ? 'Arabic' : 'English'}
      </span>
    </button>
  );
}
