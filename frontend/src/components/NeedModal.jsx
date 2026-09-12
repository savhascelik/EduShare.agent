import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HandHeart, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const NeedModal = ({
  isOpen,
  onClose,
  onNeedCreated,
  onRequireAuth
}) => {
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [itemCategory, setItemCategory] = useState('Bilişim & Bilgisayar');
  const [quantityNeeded, setQuantityNeeded] = useState(5);
  const [urgencyLevel, setUrgencyLevel] = useState('HIGH');
  const [rawText, setRawText] = useState('');

  const categories = [
    'Bilişim & Bilgisayar',
    'Mobilya & Sıra',
    'Fen & Laboratuvar',
    'Kütüphane & Kitap',
    'Spor & Beden Eğitimi',
    'Müzik & Sanat',
    'Ofis & İdari Donanım',
    'Genel Donanım'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onClose();
      onRequireAuth && onRequireAuth();
      return;
    }

    if (!title) {
      setError('Lütfen ihtiyaç başlığını giriniz.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        item_category: itemCategory,
        quantity_needed: Number(quantityNeeded),
        urgency_level: urgencyLevel,
        raw_text: rawText
      };

      const created = await api.createNeed(payload);
      onNeedCreated && onNeedCreated(created);
      onClose();
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.detail || 'İhtiyaç talebi kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setRawText('');
    setQuantityNeeded(5);
    setUrgencyLevel('HIGH');
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
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <HandHeart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Okul İhtiyaç Bildirimi
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Eğitim materyali veya donanım talebinizi komşu okullara duyurun.
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  İhtiyaç Başlığı *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Kodlama Atölyesi İçin 10 Adet Bilgisayar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kategori
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Aciliyet Seviyesi
                  </label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CRITICAL">Kritik / Çok Acil</option>
                    <option value="HIGH">Yüksek Öncelikli</option>
                    <option value="MEDIUM">Normal Öncelik</option>
                    <option value="LOW">Düşük Öncelik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gereken Miktar (Adet)
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Açıklama / Amacı
                </label>
                <textarea
                  rows="3"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="İhtiyacın gerekçesi, kullanılacağı sınıf veya laboratuvar..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>İhtiyaç Talebi Oluştur</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
