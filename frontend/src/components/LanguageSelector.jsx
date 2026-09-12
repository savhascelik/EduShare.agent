import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

export const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = i18n.language ? i18n.language.split('-')[0] : 'en';
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        aria-expanded={isOpen}
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">{currentLang.code}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Language
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLangCode === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-amber-50/80 transition-colors ${
                    isSelected ? 'bg-amber-50/60 font-bold text-amber-900' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <div>
                      <span className="block font-medium">{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 block">{lang.name}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
