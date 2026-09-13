import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Sparkles, Loader2, Check, AlertCircle, Zap, Lock, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SurplusModal = ({
  isOpen,
  onClose,
  onItemCreated,
  onRequireAuth
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [aiFilled, setAiFilled] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState(null);

  // Load quota when modal opens
  useEffect(() => {
    if (isOpen) {
      api.getQuota()
        .then((q) => {
          setQuotaInfo({
            remaining: q.remaining,
            limit: q.limit,
            user_type: q.user_type,
            global_used: q.global_used,
            global_limit: q.global_limit
          });
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [conditionRating, setConditionRating] = useState('İyi');
  const [estimatedUnitValue, setEstimatedUnitValue] = useState(1500);
  const [rawText, setRawText] = useState('');

  const categoryOptions = [
    { value: 'Bilişim & Bilgisayar', label: t('surplus.categories.it') },
    { value: 'Mobilya & Sıra', label: t('surplus.categories.furniture') },
    { value: 'Fen & Laboratuvar', label: t('surplus.categories.science') },
    { value: 'Kütüphane & Kitap', label: t('surplus.categories.library') },
    { value: 'Spor & Beden Eğitimi', label: t('surplus.categories.sports') },
    { value: 'Müzik & Sanat', label: t('surplus.categories.music') },
    { value: 'Ofis & İdari Donanım', label: t('surplus.categories.office') },
    { value: 'Genel Donanım', label: t('surplus.categories.general') }
  ];

  const conditionOptions = [
    { value: 'Sıfır / Paketli', label: t('surplus.conditions.new') },
    { value: 'Çok İyi (Hafif Kullanılmış)', label: t('surplus.conditions.veryGood') },
    { value: 'İyi', label: t('surplus.conditions.good') },
    { value: 'Bakım / Onarım İhtiyacı Var', label: t('surplus.conditions.needsRepair') }
  ];

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
    setAnalyzingImage(true);
    setAiFilled(false);

    try {
      const result = await api.analyzeImage(file);
      if (result) {
        setTitle(result.title || '');
        if (result.category) setItemCategory(result.category);
        if (result.estimated_quantity) setQuantity(Number(result.estimated_quantity));
        if (result.condition_rating) setConditionRating(result.condition_rating);
        if (result.estimated_unit_value_tl) setEstimatedUnitValue(Number(result.estimated_unit_value_tl));
        if (result.notes) setRawText(result.notes);
        setAiFilled(true);

        if (result.quota_remaining !== undefined && result.quota_remaining !== null) {
          setQuotaInfo((prev) => ({
            ...prev,
            remaining: result.quota_remaining,
            limit: result.quota_total || prev?.limit || 50,
            is_cached: result.is_cached,
            message: result.quota_message
          }));
        }
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        setError(detail || t('surplus.quotaExceeded'));
      } else if (err?.response?.status === 413) {
        setError(detail || t('surplus.fileTooLarge'));
      } else {
        setError(detail || 'Vision analysis could not be completed. You can manually enter item details.');
      }
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onClose();
      onRequireAuth && onRequireAuth();
      return;
    }

    if (!title) {
      setError('Please provide an equipment title.');
      return;
    }

    if (!itemCategory) {
      setError(t('surplus.selectCategoryError'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        item_category: itemCategory,
        quantity: Number(quantity),
        condition_rating: conditionRating,
        estimated_unit_value_tl: Number(estimatedUnitValue),
        raw_text: rawText
      };

      const created = await api.createSurplus(payload);
      onItemCreated && onItemCreated(created);
      onClose();
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save surplus item.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setTitle('');
    setItemCategory('');
    setRawText('');
    setQuantity(1);
    setEstimatedUnitValue(1500);
    setAiFilled(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {t('surplus.modalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {t('surplus.modalSubtitle')}
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

            {/* Form or Auth Guard */}
            {!isAuthenticated ? (
              <div className="p-8 text-center py-16 flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">
                  {t('surplus.authRequiredTitle')}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
                  {t('surplus.authRequiredDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequireAuth && onRequireAuth();
                  }}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('surplus.loginToContinue')}</span>
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Photo Upload Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t('surplus.photoLabel')}
                  </label>
                  {quotaInfo && (
                    <div 
                      title={t('navbar.aiQuotaTooltip', {
                        remaining: quotaInfo.remaining,
                        limit: quotaInfo.limit,
                        global_used: quotaInfo.global_used ?? 0,
                        global_limit: quotaInfo.global_limit ?? 300
                      })}
                      className="flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>{t('surplus.aiQuotaBadge')}: <strong className="text-emerald-700 font-mono">{quotaInfo.remaining}/{quotaInfo.limit}</strong></span>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    imagePreview
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60'
                  }`}
                >
                  {imagePreview ? (
                    <div className="flex items-center space-x-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-2xs"
                      />
                      <div className="text-left flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{imageFile?.name}</span>
                          {aiFilled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center">
                              <Check className="w-3 h-3 mr-0.5" /> {t('surplus.aiDetected')}
                            </span>
                          )}
                        </div>
                        {analyzingImage ? (
                          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-600 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('surplus.analyzing')}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            {t('surplus.changePhoto')}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {t('surplus.dropzoneTitle')}
                      </div>
                      <p className="text-xs text-slate-400">
                        {t('surplus.dropzoneDesc')}
                      </p>
                    </div>
                  )}
                </div>

                {quotaInfo?.message && (
                  <div className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    quotaInfo.is_cached
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}>
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      {quotaInfo.is_cached
                        ? t('surplus.cacheHit')
                        : t('surplus.bedrockHit', { remaining: quotaInfo.remaining, limit: quotaInfo.limit })}
                    </span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t('surplus.itemTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('surplus.itemTitlePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('surplus.category')} *
                  </label>
                  <select
                    required
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>
                      {t('surplus.selectCategoryPlaceholder')}
                    </option>
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('surplus.condition')}
                  </label>
                  <select
                    value={conditionRating}
                    onChange={(e) => setConditionRating(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {conditionOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity & Unit Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('surplus.quantity')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('surplus.estimatedValue')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedUnitValue}
                    onChange={(e) => setEstimatedUnitValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Notes / Raw Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t('surplus.notes')}
                </label>
                <textarea
                  rows="3"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t('surplus.notesPlaceholder')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  {t('surplus.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || analyzingImage}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t('surplus.submit')}</span>
                </button>
              </div>

            </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
