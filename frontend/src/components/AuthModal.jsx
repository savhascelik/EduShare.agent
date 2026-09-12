import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Lock, Mail, Loader2, Sparkles, AlertCircle, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(''); // '' | 'detecting' | 'success' | 'error'

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDistrict, setRegDistrict] = useState('Kadıköy');
  const [regAddress, setRegAddress] = useState('');
  const [regLatitude, setRegLatitude] = useState(40.9900);
  const [regLongitude, setRegLongitude] = useState(29.0250);
  const [regStudentCount, setRegStudentCount] = useState(650);
  const [regTeacherCount, setRegTeacherCount] = useState(45);
  const [regClassroomCount, setRegClassroomCount] = useState(24);
  const [regSchoolType, setRegSchoolType] = useState('Anadolu Lisesi');
  const [regPrincipalName, setRegPrincipalName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const districtCoords = {
    'Kadıköy': { lat: 40.9900, lng: 29.0250 },
    'Beşiktaş': { lat: 41.0480, lng: 29.0060 },
    'Üsküdar': { lat: 41.0250, lng: 29.0220 },
    'Maltepe': { lat: 40.9320, lng: 29.1380 },
    'Şişli': { lat: 41.0600, lng: 28.9870 },
    'Fatih': { lat: 41.0180, lng: 28.9490 },
    'Ataşehir': { lat: 40.9840, lng: 29.1060 },
    'Kartal': { lat: 40.8900, lng: 29.1900 },
    'Pendik': { lat: 40.8750, lng: 29.2330 },
    'Bakırköy': { lat: 40.9800, lng: 28.8700 },
    'Beyoğlu': { lat: 41.0370, lng: 28.9770 },
    'Sarıyer': { lat: 41.1680, lng: 29.0560 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'London': { lat: 51.5074, lng: -0.1278 }
  };

  const districts = Object.keys(districtCoords);

  const schoolTypeOptions = [
    { value: 'Anadolu Lisesi', label: t('auth.schoolTypes.anadolu') },
    { value: 'Fen Lisesi', label: t('auth.schoolTypes.fen') },
    { value: 'Mesleki ve Teknik Lise', label: t('auth.schoolTypes.mesleki') },
    { value: 'İmam Hatip Lisesi', label: t('auth.schoolTypes.imamHatip') },
    { value: 'Ortaokul', label: t('auth.schoolTypes.ortaokul') },
    { value: 'İlkokul', label: t('auth.schoolTypes.ilkokul') }
  ];

  const handleDistrictChange = (d) => {
    setRegDistrict(d);
    if (districtCoords[d]) {
      setRegLatitude(districtCoords[d].lat);
      setRegLongitude(districtCoords[d].lng);
    }
  };

  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      setGpsStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRegLatitude(Number(pos.coords.latitude.toFixed(4)));
          setRegLongitude(Number(pos.coords.longitude.toFixed(4)));
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: loginEmail, password: loginPassword });
      onAuthSuccess && onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      onAuthSuccess && onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Quick demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        district: regDistrict,
        address: regAddress,
        latitude: Number(regLatitude),
        longitude: Number(regLongitude),
        student_count: Number(regStudentCount),
        teacher_count: Number(regTeacherCount),
        classroom_count: Number(regClassroomCount),
        school_type: regSchoolType,
        principal_name: regPrincipalName || 'Okul Müdürü',
        phone: regPhone
      });
      onAuthSuccess && onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

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
            {/* Header Tabs */}
            <div className="p-5 pb-0 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                      {t('auth.modalTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t('auth.modalSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-4">
                <button
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'login'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('auth.tabLogin')}
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setError(null); }}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'register'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('auth.tabRegister')}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Content Form */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Demo Fast Login Buttons */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-2 mb-4 shadow-2xs">
                    <div className="text-[11px] font-bold text-amber-950 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('auth.quickLoginHint')}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('kadikoy@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Kadıköy Anadolu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('besiktas@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Beşiktaş Atatürk
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('haydarpasa@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Haydarpaşa MTAL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('kabatas@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Kabataş Erkek
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('uskudar@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Üsküdar A. Keleşoğlu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('maltepe@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2 rounded-xl bg-white border border-amber-300/80 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Maltepe Fen
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {t('auth.email')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="school@meb.gov.tr"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{t('auth.loginBtn')}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  
                  {/* 1. Institutional Identity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {t('auth.schoolName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={t('auth.schoolNamePlaceholder')}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.email')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="okul@meb.gov.tr"
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.password')} *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* District & School Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.district')}
                      </label>
                      <select
                        value={regDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {districts.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.schoolType')}
                      </label>
                      <select
                        value={regSchoolType}
                        onChange={(e) => setRegSchoolType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {schoolTypeOptions.map((st) => (
                          <option key={st.value} value={st.value}>{st.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {t('auth.address')}
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Mahalle, Cadde, No, İlçe"
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* 2. Capacity Metrics (Students, Teachers, Classrooms) */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase">
                        {t('auth.capacityMetrics')}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        ~{Math.round(regStudentCount / Math.max(regClassroomCount, 1))} {t('profile.classDensity')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          {t('auth.studentCount')}
                        </label>
                        <input
                          type="number"
                          value={regStudentCount}
                          onChange={(e) => setRegStudentCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          {t('auth.teacherCount')}
                        </label>
                        <input
                          type="number"
                          value={regTeacherCount}
                          onChange={(e) => setRegTeacherCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          {t('auth.classroomCount')}
                        </label>
                        <input
                          type="number"
                          value={regClassroomCount}
                          onChange={(e) => setRegClassroomCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Location (Lat / Lng) + GPS Auto-detect */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        {t('auth.latitude')} & {t('auth.longitude')}
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                      >
                        <Navigation className="w-3 h-3 text-amber-600" />
                        <span>{gpsStatus === 'detecting' ? '...' : gpsStatus === 'success' ? t('auth.gpsDetected') : t('auth.gpsDetect')}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        step="0.0001"
                        value={regLatitude}
                        onChange={(e) => setRegLatitude(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={regLongitude}
                        onChange={(e) => setRegLongitude(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Principal & Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.principalName')}
                      </label>
                      <input
                        type="text"
                        value={regPrincipalName}
                        onChange={(e) => setRegPrincipalName(e.target.value)}
                        placeholder="Müdür Adı Soyadı"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {t('auth.phone')}
                      </label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0212 000 00 00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 flex items-center justify-center space-x-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{t('auth.registerBtn')}</span>
                  </button>

                </form>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
