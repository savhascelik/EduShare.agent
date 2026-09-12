import React from 'react';
import { motion } from 'framer-motion';
import { Coins, PackageCheck, Leaf, School } from 'lucide-react';

export const HeroMetrics = ({ stats }) => {
  const metrics = [
    {
      id: 'savings',
      title: 'Kamu Tasarrufu',
      value: `₺${(stats?.total_savings_tl || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
      description: 'Yeniden paylaşımla bütçede kalan kamu kaynağı',
      icon: Coins,
      gradient: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-500 text-white',
      textColor: 'text-amber-900'
    },
    {
      id: 'items',
      title: 'Paylaşılan Ekipman',
      value: `${(stats?.total_items_rehomed || 0).toLocaleString('tr-TR')} Adet`,
      description: 'Atıl depolardan sınıflara kazandırılan eşya',
      icon: PackageCheck,
      gradient: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-200/80',
      iconBg: 'bg-blue-600 text-white',
      textColor: 'text-blue-900'
    },
    {
      id: 'co2',
      title: 'Önlenen Karbon Ayak İzi',
      value: `${(stats?.total_co2_prevented_kg || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg`,
      description: 'Yeni üretim ve ambalaj önlenerek korunan doğa',
      icon: Leaf,
      gradient: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-900'
    },
    {
      id: 'schools',
      title: 'Ağdaki Eğitim Kurumu',
      value: `${stats?.active_schools_count || 0} Okul`,
      description: 'Dayanışma ağındaki aktif okul ve atölye',
      icon: School,
      gradient: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-200/80',
      iconBg: 'bg-purple-600 text-white',
      textColor: 'text-purple-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {metrics.map((m, idx) => {
        const Icon = m.icon;
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className={`relative p-5 rounded-2xl bg-gradient-to-br ${m.gradient} border ${m.border} shadow-xs backdrop-blur-xs flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {m.title}
                </span>
                <motion.div
                  key={m.value}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className={`text-2xl font-black ${m.textColor} mt-1 tracking-tight`}
                >
                  {m.value}
                </motion.div>
              </div>
              <div className={`w-11 h-11 rounded-xl ${m.iconBg} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/60 font-medium">
              {m.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};
