import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map, PlusCircle, HandHeart, CheckCircle2, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav = ({
  onOpenSurplus,
  onOpenNeed,
  onOpenHITL,
  onOpenAuth,
  onOpenProfile,
  pendingCount = 0
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, currentSchool } = useAuth();

  const scrollToMap = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Map Tab */}
        <button
          onClick={scrollToMap}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-600 hover:text-amber-600 active:scale-95 transition-all"
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Map</span>
        </button>

        {/* Offer Surplus Tab */}
        <button
          onClick={onOpenSurplus}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-emerald-700 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-emerald-800 mt-0.5">Surplus</span>
        </button>

        {/* Request Need Tab */}
        <button
          onClick={onOpenNeed}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-blue-700 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
            <HandHeart className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-blue-800 mt-0.5">Need</span>
        </button>

        {/* Decisions (HITL) Tab */}
        <button
          onClick={onOpenHITL}
          className="relative flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-600 hover:text-amber-600 active:scale-95 transition-all"
        >
          <div className="relative">
            <CheckCircle2 className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-0.5">Decisions</span>
        </button>

        {/* Profile / Login Tab */}
        <button
          onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-600 hover:text-amber-600 active:scale-95 transition-all"
        >
          {isAuthenticated ? (
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black border border-amber-300">
              {currentSchool?.name?.substring(0, 1)?.toUpperCase() || 'S'}
            </div>
          ) : (
            <Building2 className="w-5 h-5" />
          )}
          <span className="text-[10px] font-bold mt-0.5">
            {isAuthenticated ? 'Profile' : 'Login'}
          </span>
        </button>

      </div>
    </nav>
  );
};
