import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Building2, PlusCircle, HandHeart, CheckCircle2, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import { LanguageSelector } from './LanguageSelector';
import api from '../services/api';

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
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      api.getQuota().then((q) => setQuota(q)).catch(() => {});
    } else {
      setQuota(null);
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Brand Area - Sleek and Compact */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
              {t('navbar.title')}<span className="text-amber-600">.</span>{t('navbar.agent')}
            </span>
            <span className="hidden 2xl:inline-flex px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {t('navbar.track')}
            </span>
          </div>
        </div>

        {/* Desktop & Tablet Control Panel */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Subtle Live SSE Pill (Large screens only) */}
          <div
            title="Real-time Server-Sent Events & Amazon Bedrock Active"
            className="hidden xl:flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 text-[11px] text-slate-600 cursor-default"
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
            <span className="font-semibold text-slate-700">Live</span>
          </div>

          {/* Compact Language Dropdown */}
          <LanguageSelector />

          {/* HITL Decision Button with Counter Badge (Desktop / Tablet) */}
          <button
            onClick={onOpenHITL}
            title={t('hitl.title')}
            className="relative hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden lg:inline">{t('navbar.agentDecisions')}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white animate-bounce shadow-2xs">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Mobile Decision Icon Quick Access (When pending decisions exist) */}
          {pendingCount > 0 && (
            <button
              onClick={onOpenHITL}
              title={t('hitl.title')}
              className="sm:hidden relative p-1.5 text-amber-700 bg-amber-50 rounded-lg border border-amber-200 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span className="absolute -top-1 -right-1 px-1 py-0.1 text-[9px] font-black rounded-full bg-rose-500 text-white">
                {pendingCount}
              </span>
            </button>
          )}

          {/* Primary Action: Offer Surplus (hidden on mobile, in drawer) */}
          <button
            onClick={onOpenSurplus}
            className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('navbar.reportSurplus')}</span>
          </button>

          {/* Secondary Action: Request Item (hidden on tablet/mobile, in drawer) */}
          <button
            onClick={onOpenNeed}
            className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
          >
            <HandHeart className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navbar.requestNeed')}</span>
          </button>

          {/* Localized AI Quota Badge (Desktop) */}
          {isAuthenticated && quota && (
            <div
              title={t('navbar.aiQuotaTooltip', {
                remaining: quota.remaining,
                limit: quota.limit,
                global_used: quota.global_used ?? 0,
                global_limit: quota.global_limit ?? 300
              })}
              className="hidden lg:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>{t('navbar.aiQuotaCompact')}: <strong className="text-emerald-700 font-mono">{quota.remaining}/{quota.limit}</strong></span>
            </div>
          )}

          {/* School Profile / Sign In (Desktop / Tablet) */}
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-slate-200">
              <button
                onClick={onOpenProfile}
                title={`${currentSchool?.name || 'Okul'} (${currentSchool?.district || 'İstanbul'})`}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px] border border-amber-300">
                  {(currentSchool?.name || 'Okul').substring(0, 2).toUpperCase()}
                </div>
                <span className="hidden 2xl:inline text-xs font-bold text-slate-800 truncate max-w-[90px]">
                  {currentSchool?.name || 'Okul'}
                </span>
              </button>
              <button
                onClick={logout}
                title={t('navbar.logout')}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{t('navbar.schoolLogin')}</span>
            </button>
          )}

          {/* Mobile Menu Hamburger (Visible ONLY on mobile screens < 640px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer (When hamburger toggled on small screens) */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/98 backdrop-blur-xl border-t border-slate-200 px-4 py-3.5 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          
          {/* School Profile or Login in Mobile Drawer */}
          {isAuthenticated ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div 
                  onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}
                  className="flex items-center space-x-2 cursor-pointer flex-1"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs border border-amber-300 shrink-0">
                    {(currentSchool?.name || 'Okul').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentSchool?.name || 'Okul'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {currentSchool?.district || 'İstanbul'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  title={t('navbar.logout')}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center space-x-1 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">{t('navbar.logout')}</span>
                </button>
              </div>

              {/* AI Quota in Mobile Drawer */}
              {quota && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('navbar.aiQuota')}:</span>
                  </div>
                  <span className="font-bold text-emerald-700 font-mono">
                    {quota.remaining} / {quota.limit}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-2xs"
            >
              <Building2 className="w-4 h-4" />
              <span>{t('navbar.schoolLogin')}</span>
            </button>
          )}

          {/* Quick Actions in Mobile Drawer */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { onOpenSurplus(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('navbar.reportSurplus')}</span>
            </button>
            <button
              onClick={() => { onOpenNeed(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 text-white font-bold text-xs shadow-2xs"
            >
              <HandHeart className="w-4 h-4" />
              <span>{t('navbar.requestNeed')}</span>
            </button>
          </div>

          {/* HITL Decisions Row in Mobile Drawer */}
          <button
            onClick={() => { onOpenHITL(); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-xs shadow-2xs"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>{t('navbar.agentDecisions')}</span>
            </div>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                {pendingCount}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-normal">0</span>
            )}
          </button>

          {/* Mobile SSE Connection Status */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              <span>{connected ? 'Live Connected' : 'Connecting...'}</span>
            </div>
            <span className="text-emerald-700 font-semibold">AWS Bedrock Active</span>
          </div>

        </div>
      )}
    </header>
  );
};
