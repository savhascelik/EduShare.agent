import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Building2, PlusCircle, HandHeart, CheckCircle2, LogOut, Radio, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';

export const Navbar = ({
  onOpenSurplus,
  onOpenNeed,
  onOpenHITL,
  onOpenAuth,
  onOpenProfile,
  pendingCount = 0
}) => {
  const { t, i18n } = useTranslation();
  const { currentSchool, isAuthenticated, logout } = useAuth();
  const { connected } = useStream();

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'tr' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const isEnglish = i18n.language?.startsWith('en');

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Track Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                {t('navbar.title')}<span className="text-amber-600">.</span>{t('navbar.agent')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {t('navbar.track')}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t('navbar.tagline')}
            </p>
          </div>
        </div>

        {/* Live SSE & Bedrock Status */}
        <div className="hidden lg:flex items-center space-x-4 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
            <span className="font-medium">{t('navbar.liveStream')}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium text-slate-700">{t('navbar.bedrockActive')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Language Switcher Toggle Button */}
          <button
            onClick={toggleLanguage}
            title={isEnglish ? "Türkçe'ye Geç" : "Switch to English"}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs"
          >
            <Languages className="w-4 h-4 text-amber-600" />
            <span className="uppercase">{isEnglish ? 'EN' : 'TR'}</span>
          </button>

          {/* HITL Decision Drawer Button with Badge */}
          <button
            onClick={onOpenHITL}
            className="relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">{t('navbar.agentDecisions')}</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-bounce shadow-sm">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Report Surplus Button */}
          <button
            onClick={onOpenSurplus}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('navbar.reportSurplus')}</span>
          </button>

          {/* Report Need Button */}
          <button
            onClick={onOpenNeed}
            className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all"
          >
            <HandHeart className="w-4 h-4 text-slate-600" />
            <span>{t('navbar.requestNeed')}</span>
          </button>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <button
                onClick={onOpenProfile}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  {currentSchool.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {currentSchool.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentSchool.district} • {currentSchool.student_count} {t('navbar.students')}
                  </div>
                </div>
              </button>
              <button
                onClick={logout}
                title={t('navbar.logout')}
                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              <span>{t('navbar.schoolLogin')}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
