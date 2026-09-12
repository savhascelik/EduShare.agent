import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Sparkles, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Search, 
  Calculator, 
  ShieldCheck, 
  Clock, 
  ChevronUp, 
  ChevronDown, 
  Trash2,
  Radio,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useStream } from '../context/StreamContext';
import { useAuth } from '../context/AuthContext';

export const LiveReasoningPulse = ({ pendingCount = 0 }) => {
  const { t, i18n } = useTranslation();
  const { subscribe } = useStream();
  const { currentSchool, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [pulseFilter, setPulseFilter] = useState('all'); // 'all' | 'school'
  const [isSweeping, setIsSweeping] = useState(false);
  const [lastPing, setLastPing] = useState(new Date());

  // Fetch initial pulse logs and listen to real-time SSE stream
  useEffect(() => {
    fetchPulse();

    const unsubscribe = subscribe((event) => {
      if (event.type === 'AGENT_PULSE' && event.payload) {
        setLogs((prev) => [event.payload, ...prev.slice(0, 29)]);
        setLastPing(new Date());
      }
    });

    const interval = setInterval(fetchPulse, 12000);
    return () => {
      clearInterval(interval);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribe]);

  const fetchPulse = async () => {
    try {
      const data = await api.getPulse();
      if (Array.isArray(data)) {
        setLogs(data.reverse()); // most recent first
        setLastPing(new Date());
      }
    } catch (err) {
      console.warn('Failed to fetch agent pulse:', err);
    }
  };

  const handleSweepNow = async () => {
    setIsSweeping(true);
    try {
      await api.triggerSweep();
      setTimeout(async () => {
        await fetchPulse();
        setIsSweeping(false);
      }, 1500);
    } catch (err) {
      console.error('Sweep trigger error:', err);
      setIsSweeping(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (pulseFilter === 'all' || !currentSchool) return logs;
    const sName = (currentSchool.name || '').toLowerCase();
    const sDistrict = (currentSchool.district || '').toLowerCase();
    const sId = currentSchool.id;

    return logs.filter((log) => {
      const p = log.params || {};
      const fromName = (p.from_school || p.from_school_name || '').toLowerCase();
      const toName = (p.to_school || p.to_school_name || '').toLowerCase();
      const rawLower = (log.raw_text || '').toLowerCase();

      return (
        p.from_school_id === sId ||
        p.to_school_id === sId ||
        p.school_id === sId ||
        (sName && (fromName.includes(sName) || toName.includes(sName) || rawLower.includes(sName))) ||
        (sDistrict && (rawLower.includes(sDistrict) || fromName.includes(sDistrict) || toName.includes(sDistrict)))
      );
    });
  }, [logs, pulseFilter, currentSchool]);

  const renderStepMessage = (log) => {
    const key = log.step_key;
    const p = log.params || {};

    // Use i18n translation key if available with dynamic parameters
    const translationKey = `pulse.steps.${key}`;
    const translated = t(translationKey, {
      defaultValue: log.raw_text || key,
      region: p.region || 'us-east-1',
      category: p.category || '',
      savings: p.savings_tl ? Number(p.savings_tl).toLocaleString(i18n.language) : '',
      co2: p.co2_kg ? Number(p.co2_kg).toFixed(1) : '',
      item: p.item || '',
      from_school: p.from_school || '',
      to_school: p.to_school || '',
      distance: p.distance_km || '',
      count: p.matched_candidates || p.available_count || ''
    });

    return translated;
  };

  const getStepIcon = (log) => {
    switch (log.type) {
      case 'tool_call':
        if (log.tool === 'query_nearby_needs') return <Search className="w-3.5 h-3.5 text-blue-500" />;
        if (log.tool === 'calculate_impact_metrics') return <Calculator className="w-3.5 h-3.5 text-emerald-500" />;
        return <Cpu className="w-3.5 h-3.5 text-purple-500" />;
      case 'decision':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'thinking':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-sky-500" />;
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Floating Pulse Button (Bottom Right) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-full shadow-lg border transition-all ${
            isOpen 
              ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/20' 
              : 'bg-white/95 backdrop-blur-md text-slate-800 border-slate-200/80 hover:border-emerald-300 hover:shadow-xl shadow-slate-200/50'
          }`}
        >
          {/* Radar Ping Animation */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          <span className="text-xs font-bold tracking-tight">
            {t('pulse.floatingBadge')}
          </span>

          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/60 hidden xs:inline-block">
            Nova Pro
          </span>

          {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronUp className="w-3.5 h-3.5 opacity-70" />}
        </motion.button>
      </div>

      {/* Slide-out Pulse Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-32 sm:bottom-20 right-4 sm:right-6 z-40 w-[92vw] sm:w-[420px] max-h-[70vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200/80 bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {t('pulse.modalTitle')}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {t('pulse.activeState')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs: [🌐 Tüm Ağ | 🏫 Okulum] */}
            {isAuthenticated && currentSchool && (
              <div className="px-3 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setPulseFilter('all')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    pulseFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🌐</span>
                  <span>{t('pulse.tabs.allNetwork')}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                    {logs.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPulseFilter('school')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    pulseFilter === 'school'
                      ? 'bg-white text-emerald-800 shadow-xs border border-emerald-300'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🏫</span>
                  <span className="truncate max-w-[120px]">{t('pulse.tabs.mySchool')}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    {filteredLogs.length}
                  </span>
                </button>
              </div>
            )}

            {/* Architecture Metrics Strip */}
            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">{t('pulse.model')}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400">{t('pulse.latency')}</span>
              </div>
              <button
                onClick={handleSweepNow}
                disabled={isSweeping}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSweeping ? 'animate-spin' : ''}`} />
                <span>{isSweeping ? t('pulse.sweeping') : t('pulse.sweepNow')}</span>
              </button>
            </div>

            {/* Live Feed List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[44vh]">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {pulseFilter === 'school' ? t('pulse.noSchoolLogs') : t('pulse.noLogs')}
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2.5 rounded-2xl bg-white border border-slate-150 hover:border-slate-300 transition-all shadow-2xs text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="p-1 rounded-lg bg-slate-100">
                          {getStepIcon(log)}
                        </span>
                        <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider">
                          {log.tool || log.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium leading-relaxed text-[11.5px] pl-0.5">
                      {renderStepMessage(log)}
                    </p>

                    {/* Parameters Badges if available */}
                    {log.params && (log.params.savings_tl || log.params.distance_km || log.params.co2_kg) && (
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-semibold">
                        {log.params.savings_tl && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₺{Number(log.params.savings_tl).toLocaleString(i18n.language)}
                          </span>
                        )}
                        {log.params.co2_kg && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                            {Number(log.params.co2_kg).toFixed(1)} kg CO2
                          </span>
                        )}
                        {log.params.distance_km && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            {log.params.distance_km} km
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer with Heartbeat Info */}
            <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">{t('pulse.engineStatus')}:</span>
                <span className="text-emerald-700 font-bold">{t('pulse.running')}</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title={t('pulse.clearLogs')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
