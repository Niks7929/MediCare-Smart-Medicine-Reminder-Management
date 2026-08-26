import React, { useState } from 'react';
import { 
  Pill, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  Stethoscope, 
  ShieldAlert,
  ArrowLeft,
  Sun,
  Moon,
  Shield
} from 'lucide-react';
import { User as UserType, Patient } from '../types';

interface AuthViewProps {
  onLoginSuccess: (user: UserType, initialPatient?: Patient) => void;
  onGoToDashboard?: () => void;
  initialRole?: 'patient' | 'doctor' | 'caregiver' | 'admin';
  initialMode?: 'login' | 'register';
  securityNotice?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  accessibilityMode?: boolean;
  onToggleAccessibilityMode?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ 
  onLoginSuccess,
  onGoToDashboard,
  initialRole = 'patient',
  initialMode = 'login',
  securityNotice = '',
  theme = 'light',
  onToggleTheme,
  accessibilityMode = false,
  onToggleAccessibilityMode
}) => {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'caregiver' | 'admin'>(initialRole);
  
  // Patient details for registration
  const [age, setAge] = useState<number>(38);
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegister && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { full_name: fullName, email, password, role, age, gender, blood_group: bloodGroup }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      setSuccessMsg(isRegister ? 'Account created successfully! Logging you in directly...' : 'Login successful!');
      
      // Save session
      localStorage.setItem('medicare_user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('medicare_token', data.token);
      }

      // Immediately log in without unnecessary delay
      setTimeout(() => {
        onLoginSuccess(data.user, data.patient);
      }, 250);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-x-hidden font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background Decorative Glow Elements */}
      <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none -z-10 ${
        isDark ? 'bg-teal-500/10' : 'bg-teal-300/30'
      }`}></div>
      <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none -z-10 ${
        isDark ? 'bg-emerald-500/10' : 'bg-emerald-300/30'
      }`}></div>

      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-slate-950/85 border-slate-800/80' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Home Link */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={onGoToDashboard}
            title="Back to Landing Page"
          >
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Pill className="h-5 w-5 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>MediCare</span>
                <span className="text-teal-500 text-xl font-extrabold">+</span>
              </div>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold tracking-wider uppercase">Smart Health Ecosystem</p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* High Contrast Accessibility Mode Toggle */}
            {onToggleAccessibilityMode && (
              <button
                type="button"
                onClick={onToggleAccessibilityMode}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  accessibilityMode
                    ? 'bg-yellow-400 text-black border-yellow-300 shadow-md font-black ring-2 ring-yellow-400/50'
                    : isDark ? 'bg-slate-900 border-slate-800 text-yellow-300' : 'bg-slate-100 border-slate-200 text-yellow-600'
                }`}
                title="High-Contrast Accessibility Mode for visual impairment"
                aria-label="Toggle High-Contrast Accessibility Mode"
              >
                <span className="text-xs">👁️</span>
                <span className="hidden sm:inline font-mono text-[11px]">{accessibilityMode ? 'A11Y: ON' : 'A11Y'}</span>
              </button>
            )}

            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-teal-300 hover:text-white border-slate-800 hover:border-teal-500/50 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-sm'
                }`}
              >
                <ArrowLeft className="h-4 w-4 text-teal-500" />
                <span>Back to Home</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-2 rounded-xl border transition ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Form Content Container */}
      <main className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Brand Header Inside Content */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <span>Welcome to MediCare</span>
            <span className="text-teal-500 font-black">+</span>
          </h2>
          <p className={`mt-1.5 text-xs max-w-sm mx-auto ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {isRegister ? 'Create your medical account to get started' : 'Sign in to access your prescriptions and reminders'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-2 sm:px-0">
          {securityNotice && (
            <div className="mb-4 p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-300 dark:text-amber-200 text-xs flex items-start gap-3 shadow-lg backdrop-blur-sm animate-pulse">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-200 block">Automatic Security Lock Engaged</span>
                <p className="text-amber-300/90 text-[11px] leading-relaxed">
                  {securityNotice}
                </p>
              </div>
            </div>
          )}

          <div className={`backdrop-blur-md py-6 sm:py-8 px-5 sm:px-10 shadow-2xl rounded-2xl border space-y-6 transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xl'
          }`}>
            
            {/* Tab Switcher: Login / Register */}
            <div className={`grid grid-cols-2 p-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 rounded-lg transition-all font-bold ${
                  !isRegister
                    ? 'bg-teal-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 rounded-lg transition-all font-bold ${
                  isRegister
                    ? 'bg-teal-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register New Account
              </button>
            </div>

            {/* Role Selection Cards: ONLY visible during registration */}
            {isRegister && (
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Select Account Type:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Patient Role */}
                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                      role === 'patient'
                        ? 'bg-teal-500/15 border-teal-500 text-teal-700 dark:text-white shadow-md ring-1 ring-teal-500'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${role === 'patient' ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold block">Patient</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Self Tracker</span>
                  </button>

                  {/* Doctor Role */}
                  <button
                    type="button"
                    onClick={() => setRole('doctor')}
                    className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                      role === 'doctor'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-white shadow-md ring-1 ring-cyan-500'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${role === 'doctor' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold block">Doctor</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Prescriber</span>
                  </button>

                  {/* Caregiver Role */}
                  <button
                    type="button"
                    onClick={() => setRole('caregiver')}
                    className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                      role === 'caregiver'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-white shadow-md ring-1 ring-indigo-500'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${role === 'caregiver' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold block">Caregiver</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Family/Ward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form Title & Instructions */}
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <span>
                  {isRegister
                    ? `Create New ${role === 'doctor' ? 'Doctor' : role === 'caregiver' ? 'Caregiver' : 'Patient'} Account`
                    : 'Sign In to Your Account'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRegister
                  ? `Register your ${role} account to access prescriptions and schedules.`
                  : 'Enter your registered email and password to access MediCare+.'}
              </p>
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {role === 'doctor' ? 'Doctor Full Name & Title' : role === 'caregiver' ? 'Caregiver Full Name' : 'Patient Full Name'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={role === 'doctor' ? 'e.g., Dr. Rajesh Sharma, MD' : 'Enter full name'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                          : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                        : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                        : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {isRegister && (
                <>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                          isDark 
                            ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {role === 'patient' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>Age</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={age}
                          onChange={(e) => setAge(Number(e.target.value))}
                          className={`block w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-teal-500 ${
                            isDark 
                              ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className={`block w-full px-2 py-2 rounded-xl text-sm focus:outline-none focus:border-teal-500 ${
                            isDark 
                              ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>Blood Group</label>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className={`block w-full px-2 py-2 rounded-xl text-sm focus:outline-none focus:border-teal-500 ${
                            isDark 
                              ? 'bg-slate-950/70 border border-slate-700/80 text-white' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md shadow-teal-600/30 text-sm transition transform active:scale-98 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>
                      {isRegister
                        ? `Register & Log In Directly (${role === 'doctor' ? 'Doctor' : role === 'caregiver' ? 'Caregiver' : 'Patient'})`
                        : 'Sign In'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Clean User Guidance Switcher */}
            <div className={`pt-4 border-t text-center space-y-2 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <p className="text-xs text-slate-500">
                {isRegister
                  ? 'Already have an account? Switch to "Sign In" above.'
                  : 'Need a new account? Switch to "Register New Account" above.'}
              </p>
            </div>
          </div>

          {/* Bottom Feature Badges */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" /> Encrypted & Secure Portal
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500" /> Real-time Dose Tracker
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs transition-colors ${
        isDark ? 'border-slate-900 bg-slate-950/60 text-slate-500' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        MediCare+ Smart Health Management System
      </footer>
    </div>
  );
};
