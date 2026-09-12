import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Save, Loader2, Check, Navigation, MapPin, Mail, Users, GraduationCap, School as SchoolIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const ProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { t } = useTranslation();
  const { currentSchool, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(41.0);
  const [longitude, setLongitude] = useState(29.0);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [classroomCount, setClassroomCount] = useState(0);
  const [schoolType, setSchoolType] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [phone, setPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(''); // '' | 'detecting' | 'success' | 'error'

  useEffect(() => {
    if (currentSchool) {
      setName(currentSchool.name || '');
      setDistrict(currentSchool.district || '');
      setAddress(currentSchool.address || '');
      setLatitude(currentSchool.latitude || 41.0);
      setLongitude(currentSchool.longitude || 29.0);
      setStudentCount(currentSchool.student_count || 0);
      setTeacherCount(currentSchool.teacher_count || 0);
      setClassroomCount(currentSchool.classroom_count || 0);
      setSchoolType(currentSchool.school_type || 'Anadolu Lisesi');
      setPrincipalName(currentSchool.principal_name || '');
      setPhone(currentSchool.phone || '');
    }
  }, [currentSchool]);

  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      setGpsStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(4)));
          setLongitude(Number(pos.coords.longitude.toFixed(4)));
          setGpsStatus('success');
          setTimeout(() => setGpsStatus(''), 3000);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setGpsStatus('error');
          setTimeout(() => setGpsStatus(''), 3000);
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateProfile({
        name,
        district,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        student_count: Number(studentCount),
        teacher_count: Number(teacherCount),
        classroom_count: Number(classroomCount),
        school_type: schoolType,
        principal_name: principalName,
        phone
      });
      setSavedSuccess(true);
      onProfileUpdated && onProfileUpdated();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentSchool) return null;

  const densityRatio = Math.round(studentCount / Math.max(classroomCount, 1));
  const teacherRatio = (studentCount / Math.max(teacherCount, 1)).toFixed(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md font-extrabold text-sm border border-amber-400/40">
                  {name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                    {t('profile.modalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {t('profile.modalSubtitle')}
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              
              {/* Institutional Name & Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t('profile.schoolName')} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('profile.district')}
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('profile.schoolType')}
                  </label>
                  <input
                    type="text"
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t('profile.address')}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Mahalle, Cadde, No"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Capacity Questions & Analytical Indicators */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wide flex items-center space-x-1.5">
                    <SchoolIcon className="w-4 h-4 text-amber-700" />
                    <span>{t('profile.capacityMetrics')}</span>
                  </span>
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                    <span>{densityRatio} {t('profile.classDensity')}</span>
                    <span>•</span>
                    <span>{teacherRatio} {t('profile.teacherRatio')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {t('profile.studentCount')}
                    </label>
                    <input
                      type="number"
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {t('profile.teacherCount')}
                    </label>
                    <input
                      type="number"
                      value={teacherCount}
                      onChange={(e) => setTeacherCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {t('profile.classroomCount')}
                    </label>
                    <input
                      type="number"
                      value={classroomCount}
                      onChange={(e) => setClassroomCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates + GPS Detection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('profile.latitude')} & {t('profile.longitude')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                  >
                    <Navigation className="w-3 h-3 text-amber-600" />
                    <span>{gpsStatus === 'detecting' ? '...' : gpsStatus === 'success' ? t('profile.gpsDetected') : t('profile.gpsDetect')}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Principal & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('profile.principalName')}
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t('profile.phone')}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Registered Email (Read-only Badge) */}
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">{t('profile.registeredEmail')}:</span>
                <span className="font-bold text-slate-800 font-mono text-[11px]">{currentSchool.email}</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('profile.success')}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  {t('profile.close')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{t('profile.save')}</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
