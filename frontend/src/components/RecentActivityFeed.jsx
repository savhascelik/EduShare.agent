import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Package, HandHeart, Sparkles, Building2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const RecentActivityFeed = ({
  transfers = [],
  surplusItems = [],
  needRequests = []
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
  const currencySymbol = i18n.language?.startsWith('en') ? '$' : '₺';

  const [activeTab, setActiveTab] = useState('transfers'); // 'transfers' | 'surplus' | 'needs'

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
      
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'transfers'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('feed.transfersTab', { count: transfers.length })}
          </button>
          <button
            onClick={() => setActiveTab('surplus')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'surplus'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('feed.surplusTab', { count: surplusItems.length })}
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'needs'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('feed.needsTab', { count: needRequests.length })}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === 'transfers' && (
          transfers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              {t('feed.emptyTransfers')}
            </div>
          ) : (
            transfers.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                      {t('feed.successfulTransfer')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {t('feed.today')}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {item.item_summary} ({item.quantity} {t('hero.units.items')})
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{item.from_school_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-emerald-700">{item.to_school_name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold">{t('feed.savingsLabel')}</div>
                    <div className="font-extrabold text-amber-900">
                      {currencySymbol}{Number(item.estimated_savings_tl).toLocaleString(locale)}
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold">{t('feed.co2Label')}</div>
                    <div className="font-extrabold text-emerald-700">
                      {Number(item.prevented_co2_kg).toFixed(1)} kg
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )
        )}

        {activeTab === 'surplus' && (
          surplusItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              {t('feed.emptySurplus')}
            </div>
          ) : (
            surplusItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                    <p className="text-[11px] text-slate-500">
                      {item.item_category} • {t('feed.conditionLabel')} {item.condition_rating}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {item.quantity} {t('hero.units.items')}
                  </span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'needs' && (
          needRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              {t('feed.emptyNeeds')}
            </div>
          ) : (
            needRequests.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                    <HandHeart className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                    <p className="text-[11px] text-slate-500">
                      {item.item_category} • {t('feed.requestedBy')} {item.school_name || t('feed.schoolLabel')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {t('feed.neededLabel')} {item.quantity_needed}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>

    </div>
  );
};
