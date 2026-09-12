import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamProvider, useStream } from './context/StreamContext';
import api from './services/api';

import { Navbar } from './components/Navbar';
import { HeroMetrics } from './components/HeroMetrics';
import { TransferMap } from './components/TransferMap';
import { HITLDrawer } from './components/HITLDrawer';
import { SurplusModal } from './components/SurplusModal';
import { NeedModal } from './components/NeedModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { RecentActivityFeed } from './components/RecentActivityFeed';
import { MobileBottomNav } from './components/MobileBottomNav';

function MainApp() {
  const { t } = useTranslation();
  const { currentSchool, isAuthenticated } = useAuth();
  const { subscribe } = useStream();

  // Data states
  const [stats, setStats] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [surplusItems, setSurplusItems] = useState([]);
  const [needRequests, setNeedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSurplusOpen, setIsSurplusOpen] = useState(false);
  const [isNeedOpen, setIsNeedOpen] = useState(false);
  const [isHITLOpen, setIsHITLOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Load All Data
  const loadDashboardData = useCallback(async () => {
    try {
      const [
        statsData,
        transfersData,
        schoolsData,
        tasksData,
        surplusData,
        needsData
      ] = await Promise.all([
        api.getStats().catch(() => null),
        api.getTransfers().catch(() => []),
        api.getSchools().catch(() => []),
        api.getTasks().catch(() => []),
        api.getSurplus().catch(() => []),
        api.getNeeds().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      if (transfersData) setTransfers(transfersData);
      if (schoolsData) setSchools(schoolsData);
      if (tasksData) setTasks(tasksData);
      if (surplusData) setSurplusItems(surplusData);
      if (needsData) setNeedRequests(needsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log('[Real-time Event Received]:', event);
      if (event.type === 'NEW_HITL_TASK') {
        api.getTasks().then((tList) => setTasks(tList));
        setIsHITLOpen(true);
      } else if (event.type === 'TRANSFER_APPROVED' || event.type === 'TRANSFER_REJECTED') {
        loadDashboardData();
      }
    });
    return unsubscribe;
  }, [subscribe, loadDashboardData]);

  const pendingApprovalsCount = tasks.filter(
    (tItem) => tItem.status === 'AWAITING_HUMAN_APPROVAL'
  ).length;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Navbar */}
      <Navbar
        onOpenSurplus={() => setIsSurplusOpen(true)}
        onOpenNeed={() => setIsNeedOpen(true)}
        onOpenHITL={() => setIsHITLOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        pendingCount={pendingApprovalsCount}
      />

      {/* Main Content Area (extra bottom padding for mobile bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6 pb-24 md:pb-10">
        
        {/* Banner Alert for Pending HITL Tasks */}
        {pendingApprovalsCount > 0 && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div>
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                  {t('hitl.bannerTitle')}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-snug">
                  {t('hitl.bannerText', { count: pendingApprovalsCount })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsHITLOpen(true)}
              className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all shrink-0 self-start sm:self-center"
            >
              {t('hitl.reviewDecisions')}
            </button>
          </div>
        )}

        {/* Rolling Impact Metrics */}
        <HeroMetrics stats={stats} />

        {/* Section Heading */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('map.title')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('map.subtitle')}
            </p>
          </div>
        </div>

        {/* Interactive Leaflet Map with Item Badges, Smart Clustering & Filter Panel */}
        <TransferMap
          schools={schools}
          transfers={transfers}
          surplusItems={surplusItems}
          needRequests={needRequests}
          onOpenSurplus={() => setIsSurplusOpen(true)}
          onOpenNeed={() => setIsNeedOpen(true)}
        />

        {/* Activity & Inventory Feed */}
        <RecentActivityFeed
          transfers={transfers}
          surplusItems={surplusItems}
          needRequests={needRequests}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-6 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            {t('footer.tagline')}
          </p>
          <p className="text-[11px] text-slate-400">
            {t('footer.credits')}
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Fixed for phones) */}
      <MobileBottomNav
        onOpenSurplus={() => setIsSurplusOpen(true)}
        onOpenNeed={() => setIsNeedOpen(true)}
        onOpenHITL={() => setIsHITLOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        pendingCount={pendingApprovalsCount}
      />

      {/* Modals & Drawers */}
      <HITLDrawer
        isOpen={isHITLOpen}
        onClose={() => setIsHITLOpen(false)}
        tasks={tasks}
        onTaskProcessed={() => loadDashboardData()}
      />

      <SurplusModal
        isOpen={isSurplusOpen}
        onClose={() => setIsSurplusOpen(false)}
        onItemCreated={() => loadDashboardData()}
        onRequireAuth={() => setIsAuthOpen(true)}
      />

      <NeedModal
        isOpen={isNeedOpen}
        onClose={() => setIsNeedOpen(false)}
        onNeedCreated={() => loadDashboardData()}
        onRequireAuth={() => setIsAuthOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={() => loadDashboardData()}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={() => loadDashboardData()}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StreamProvider>
        <MainApp />
      </StreamProvider>
    </AuthProvider>
  );
}
