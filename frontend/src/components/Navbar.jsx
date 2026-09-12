import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Building2, PlusCircle, HandHeart, CheckCircle2, LogOut, Radio, Menu, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import { LanguageSelector } from './LanguageSelector';

export const Navbar = ({
  onOpenSurplus,
  onOpenNeed,
  onOpenHITL,
  onOpenAuth,
  onOpenProfile,
  pendingCount = 0
}) => {
  const { t } = useTranslation();
  const { currentSchool, isAuthenticated, logout } = useAuth();
  const { connected } = useStream();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Area */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-amber-500/15">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                {t('navbar.title')}<span className="text-amber-600">.</span>{t('navbar.agent')}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                {t('navbar.track')}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 font-medium">
              {t('navbar.tagline')}
            </p>
          </div>
        </div>

        {/* Center / Right Control Panel */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          
          {/* Subtle Clean Live Status Pill */}
          <div
            title="Real-time Server-Sent Events & Amazon Bedrock Nova Pro active"
            className="hidden sm:flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-600 cursor-default transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
            <span className="font-semibold text-slate-700">Live</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">AI Ready</span>
          </div>

          {/* Extensible Language Dropdown List */}
          <LanguageSelector />

          {/* HITL Decision Button with Counter Badge */}
          <button
            onClick={onOpenHITL}
            title={t('hitl.title')}
            className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <span className="hidden md:inline">{t('navbar.agentDecisions')}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white animate-bounce shadow-2xs">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Primary Action: Offer Surplus */}
          <button
            onClick={onOpenSurplus}
            className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('navbar.reportSurplus')}</span>
          </button>

          {/* Secondary Action: Request Item */}
          <button
            onClick={onOpenNeed}
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
          >
            <HandHeart className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navbar.requestNeed')}</span>
          </button>

          {/* School Profile / Sign In */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-1 pl-1 sm:pl-2 sm:border-l sm:border-slate-200">
              <button
                onClick={onOpenProfile}
                title="School Profile & Capacity"
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs border border-amber-300">
                  {(currentSchool?.name || 'Okul').substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                    {currentSchool?.name || 'Okul'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {currentSchool?.district || 'İstanbul'}
                  </div>
                </div>
              </button>
              <button
                onClick={logout}
                title={t('navbar.logout')}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{t('navbar.schoolLogin')}</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer (When hamburger clicked on mobile) */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/98 backdrop-blur-xl border-t border-slate-200 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              <span>{connected ? 'Live Connected' : 'Connecting...'}</span>
            </div>
            <span className="text-emerald-700 font-semibold">AWS Bedrock Active</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { onOpenSurplus(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('navbar.reportSurplus')}</span>
            </button>
            <button
              onClick={() => { onOpenNeed(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
            >
              <HandHeart className="w-4 h-4" />
              <span>{t('navbar.requestNeed')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
