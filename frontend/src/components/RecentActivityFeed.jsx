import React, { useState } from 'react';
import { Truck, Package, Target, ArrowRight, Sparkles, Clock, AlertTriangle } from 'lucide-react';

export const RecentActivityFeed = ({
  transfers = [],
  surplusItems = [],
  needRequests = []
}) => {
  const [activeTab, setActiveTab] = useState('transfers'); // 'transfers' | 'surplus' | 'needs'

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden my-6">
      
      {/* Tabs Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'transfers'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Tamamlanan Transferler ({transfers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('surplus')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'surplus'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mevcut Fazla Eşyalar ({surplusItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('needs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'needs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Açık İhtiyaçlar ({needRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        
        {/* TRANSFERS TAB */}
        {activeTab === 'transfers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transfers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                Henüz tamamlanmış transfer kaydı bulunmuyor.
              </div>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      <Sparkles className="w-3 h-3 text-amber-600 mr-0.5" />
                      Başarılı Transfer
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {t.transferred_at ? new Date(t.transferred_at).toLocaleDateString('tr-TR') : 'Bugün'}
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-slate-900">
                    {t.item_summary} ({t.quantity} Adet)
                  </h5>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="truncate max-w-[110px]">{t.from_school_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                    <span className="truncate max-w-[110px] text-emerald-700">{t.to_school_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                    <span className="text-emerald-700">₺{Number(t.estimated_savings_tl).toLocaleString('tr-TR')} Tasarruf</span>
                    <span className="text-blue-700">{Number(t.prevented_co2_kg).toFixed(1)} kg CO2</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SURPLUS ITEMS TAB */}
        {activeTab === 'surplus' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surplusItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                Şu anda açık fazla eşya bulunmamaktadır.
              </div>
            ) : (
              surplusItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/80 hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {item.item_category}
                    </span>
                    <span className="text-xs font-black text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      {item.quantity} Adet
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-slate-900">
                    {item.title}
                  </h5>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {item.raw_text || 'Açıklama belirtilmedi.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                    <span>Okul: <strong>{item.school_name}</strong></span>
                    <span>Durum: {item.condition_rating}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NEEDS TAB */}
        {activeTab === 'needs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {needRequests.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                Şu anda açık bir ihtiyaç talebi bulunmamaktadır.
              </div>
            ) : (
              needRequests.map((need) => (
                <div
                  key={need.id}
                  className="p-4 rounded-2xl bg-blue-50/30 border border-blue-200/80 hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {need.item_category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      need.urgency_level === 'CRITICAL' || need.urgency_level === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {need.urgency_level === 'CRITICAL' ? 'Kritik Acil' : need.urgency_level === 'HIGH' ? 'Acil İhtiyaç' : 'Normal'}
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-slate-900">
                    {need.title}
                  </h5>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {need.raw_text || 'Gerekçe belirtilmedi.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                    <span>Talep Eden: <strong>{need.school_name}</strong></span>
                    <span>Gereken: <strong>{need.quantity_needed} Adet</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
