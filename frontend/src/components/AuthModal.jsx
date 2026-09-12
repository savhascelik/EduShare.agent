import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Lock, Mail, MapPin, Users, GraduationCap, Phone, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const districts = [
    'Kadıköy', 'Beşiktaş', 'Üsküdar', 'Maltepe', 'Şişli', 'Fatih',
    'Ataşehir', 'Kartal', 'Pendik', 'Bakırköy', 'Beyoğlu', 'Sarıyer'
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: loginEmail, password: loginPassword });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Giriş yapılamadı. E-posta veya şifre hatalı.');
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
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Hızlı giriş hatası.');
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
        principal_name: regPrincipalName,
        phone: regPhone
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
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
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header Tabs */}
            <div className="p-6 pb-0 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">
                      Okul Yönetim Portalı
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      EduShare Ajanı ile kaynak paylaşımına katılın.
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
              <div className="flex space-x-2">
                <button
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'login'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Okul Girişi
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setError(null); }}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'register'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Yeni Okul Kaydı
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
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Demo Fast Login Buttons */}
                  <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hızlı Test İçin Örnek Okul Seçebilirsiniz:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('kadikoy@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Kadıköy Anadolu Lisesi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('besiktas@meb.gov.tr', 'Sifre123!')}
                        className="py-1.5 px-2.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors text-left truncate shadow-2xs"
                      >
                        Beşiktaş Atatürk Lisesi
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Okul E-posta Adresi
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="ornek@meb.gov.tr"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Şifre
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Giriş Yap</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  
                  {/* School Name & Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Okul Resmi Adı *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Örn: Üsküdar Fen Lisesi"
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        E-posta *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="okul@meb.gov.tr"
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Şifre *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* District & School Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        İlçe
                      </label>
                      <select
                        value={regDistrict}
                        onChange={(e) => setRegDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      >
                        {districts.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Okul Türü
                      </label>
                      <select
                        value={regSchoolType}
                        onChange={(e) => setRegSchoolType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Anadolu Lisesi">Anadolu Lisesi</option>
                        <option value="Fen Lisesi">Fen Lisesi</option>
                        <option value="Mesleki ve Teknik Lise">Mesleki ve Teknik Lise</option>
                        <option value="İmam Hatip Lisesi">İmam Hatip Lisesi</option>
                        <option value="Ortaokul">Ortaokul</option>
                        <option value="İlkokul">İlkokul</option>
                      </select>
                    </div>
                  </div>

                  {/* Profile Metrics (Students, Teachers, Classrooms) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase">
                      Kurum Kapasite Bilgileri (Basit Sorular)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Öğrenci Sayısı
                        </label>
                        <input
                          type="number"
                          value={regStudentCount}
                          onChange={(e) => setRegStudentCount(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Öğretmen Sayısı
                        </label>
                        <input
                          type="number"
                          value={regTeacherCount}
                          onChange={(e) => setRegTeacherCount(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Derslik Sayısı
                        </label>
                        <input
                          type="number"
                          value={regClassroomCount}
                          onChange={(e) => setRegClassroomCount(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location (Lat / Lng) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Enlem (Latitude)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={regLatitude}
                        onChange={(e) => setRegLatitude(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Boylam (Longitude)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={regLongitude}
                        onChange={(e) => setRegLongitude(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Principal & Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Müdür Adı
                      </label>
                      <input
                        type="text"
                        value={regPrincipalName}
                        onChange={(e) => setRegPrincipalName(e.target.value)}
                        placeholder="Örn: Kemal Demir"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        İletişim Telefonu
                      </label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0216 XXX XX XX"
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
                    <span>Okulu Kaydet ve Giriş Yap</span>
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
