import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Sparkles, ArrowRight, ShieldCheck, Coins, Leaf, MapPin, Loader2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const HITLDrawer = ({
  isOpen,
  onClose,
  tasks = [],
  onTaskProcessed
}) => {
  const { t, i18n } = useTranslation();
  const { user: currentSchool } = useAuth();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
  const currencySymbol = i18n.language?.startsWith('en') ? '$' : '₺';

  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [approvedProtocols, setApprovedProtocols] = useState({});

  const handleApprove = async (taskId) => {
    setProcessingId(taskId);
    setError(null);
    try {
      const res = await api.approveTask(taskId);
      const protocol = res?.transfer?.protocol_code;
      if (protocol) {
        setApprovedProtocols(prev => ({ ...prev, [taskId]: protocol }));
      }
      setTimeout(() => {
        onTaskProcessed && onTaskProcessed(taskId, 'APPROVED');
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (taskId) => {
    setProcessingId(taskId);
    setError(null);
    try {
      await api.rejectTask(taskId);
      onTaskProcessed && onTaskProcessed(taskId, 'REJECTED');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Rejection failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdraw = async (taskId) => {
    setProcessingId(taskId);
    setError(null);
    try {
      await api.withdrawTask(taskId);
      onTaskProcessed && onTaskProcessed(taskId, 'WITHDRAWN');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Withdrawal failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingTasks = tasks.filter((tItem) => tItem.status === 'AWAITING_HUMAN_APPROVAL');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {t('hitl.title')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {t('hitl.subtitle')} ({pendingTasks.length})
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Body Cards List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mb-1">
                    {t('hitl.noTasksTitle')}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {t('hitl.noTasksDesc')}
                  </p>
                </div>
              ) : (
                pendingTasks.map((task) => {
                  const card = task.match_payload || {};
                  const isProcessing = processingId === task.id;
                  const protocolCode = approvedProtocols[task.id] || card.protocol_code;

                  const isRecipient = currentSchool && card.to_school_id === currentSchool.id;
                  const isDonor = currentSchool && card.from_school_id === currentSchool.id;
                  const isInitiator = currentSchool && task.initiator_school_id === currentSchool.id;

                  const initiatorType = task.initiator_type || card.initiator_type || 'AI';
                  const initiatorBadge = initiatorType === 'SCHOOL_RECIPIENT' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                      {t('hitl.initiatorPeerRequest')}
                    </span>
                  ) : initiatorType === 'SCHOOL_DONOR' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {t('hitl.initiatorPeerOffer')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
                      <Sparkles className="w-3 h-3 text-amber-600 mr-1" />
                      {t('hitl.initiatorAi')}
                    </span>
                  );

                  const roleBadge = isRecipient ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      📥 {t('hitl.roleRecipient')}
                    </span>
                  ) : isDonor ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                      📤 {t('hitl.roleDonor')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                      🏛️ {t('hitl.roleCoordination')}
                    </span>
                  );

                  const approveBtnLabel = isRecipient
                    ? t('hitl.approveReceiveBtn')
                    : isDonor
                    ? t('hitl.approveDispatchBtn')
                    : t('hitl.approveBtn');

                  return (
                    <div
                      key={task.id}
                      className="p-5 rounded-2xl border-2 border-amber-300/80 bg-amber-50/40 shadow-xs space-y-4 hover:shadow-md transition-shadow"
                    >
                      {/* Badge, Role & Title */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            {initiatorBadge}
                            {roleBadge}
                          </div>
                          <h4 className="font-bold text-base text-slate-900">
                            {card.title || card.item_title}
                          </h4>
                        </div>
                        <span className="text-xs font-black text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs shrink-0">
                          {card.quantity} {t('hero.units.items')}
                        </span>
                      </div>

                      {/* Adaptive Stock Warning if stock was reduced */}
                      {card.stock_adjusted && (
                        <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 flex items-center space-x-1.5">
                          <span>{t('hitl.stockAdjustedWarning', { count: card.quantity })}</span>
                        </div>
                      )}

                      {/* Route Map Card */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <div className="flex items-center space-x-1 text-slate-700 truncate max-w-[170px]">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">{card.from_school_name}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
                          <div className="flex items-center space-x-1 text-emerald-700 truncate max-w-[170px]">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{card.to_school_name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>{t('hitl.distance')}: <strong>{card.distance_km} km</strong></span>
                          <span>{card.from_district} ➔ {card.to_district}</span>
                        </div>
                      </div>

                      {/* Impact Metrics Badges */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <div className="flex items-center space-x-2 bg-emerald-100/70 text-emerald-950 p-2.5 rounded-xl border border-emerald-200">
                          <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <div className="text-[10px] text-emerald-800 uppercase font-semibold">{t('hitl.savings')}</div>
                            <div className="text-sm">{currencySymbol}{Number(card.estimated_savings_tl || 0).toLocaleString(locale)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 bg-blue-100/70 text-blue-950 p-2.5 rounded-xl border border-blue-200">
                          <Leaf className="w-4 h-4 text-blue-700 shrink-0" />
                          <div>
                            <div className="text-[10px] text-blue-800 uppercase font-semibold">{t('hitl.preventedCo2')}</div>
                            <div className="text-sm">{Number(card.prevented_co2_kg || 0).toFixed(1)} kg</div>
                          </div>
                        </div>
                      </div>

                      {/* Agent Reasoning */}
                      {card.reasoning && (
                        <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-amber-200/60 leading-relaxed font-normal">
                          <span className="font-bold text-amber-900 block mb-0.5">{t('hitl.reasoningTitle')}:</span>
                          {card.reasoning}
                        </div>
                      )}

                      {/* Alternative Candidate School */}
                      {card.alternative_candidate && (
                        <div className="flex items-center space-x-2 p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700">
                          <span className="font-bold text-amber-700 shrink-0">🥈 {t('hitl.alternativeOption')}:</span>
                          <span className="font-medium text-slate-800 truncate">{card.alternative_candidate}</span>
                        </div>
                      )}

                      {/* Protocol Code Confirmation Banner */}
                      {protocolCode && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5 animate-fadeIn">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{t('hitl.protocolSuccess')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200/60">
                            <span>{t('hitl.protocolCode')}:</span>
                            <code className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900 font-black">
                              {protocolCode}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons: If user school initiated the proposal, they can withdraw it! */}
                      {!protocolCode && (
                        isInitiator ? (
                          <div className="pt-2">
                            <button
                              onClick={() => handleWithdraw(task.id)}
                              disabled={isProcessing}
                              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span>{isProcessing ? t('hitl.withdrawing') : t('hitl.withdrawBtn')}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                              onClick={() => handleReject(task.id)}
                              disabled={isProcessing}
                              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4 text-slate-400" />
                              <span>{t('hitl.rejectBtn')}</span>
                            </button>
                            <button
                              onClick={() => handleApprove(task.id)}
                              disabled={isProcessing}
                              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/30 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-200" />
                              )}
                              <span>{approveBtnLabel}</span>
                            </button>
                          </div>
                        )
                      )}

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
              {t('hitl.footerNote')}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
