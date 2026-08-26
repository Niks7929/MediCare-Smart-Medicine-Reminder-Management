import React from 'react';
import { 
  Pill, 
  HeartPulse, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  UserCheck, 
  Stethoscope, 
  Users, 
  Volume2, 
  Database, 
  FileText, 
  Sparkles, 
  Sun, 
  Moon, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  Heart,
  Eye,
  Clock,
  BellRing
} from 'lucide-react';

interface LandingPageProps {
  onGoToAuth: (role?: 'patient' | 'doctor' | 'caregiver' | 'admin', mode?: 'login' | 'register') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  accessibilityMode?: boolean;
  onToggleAccessibilityMode?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToAuth,
  theme = 'light',
  onToggleTheme,
  accessibilityMode = false,
  onToggleAccessibilityMode,
}) => {
  const isDark = theme === 'dark';

  const handleGetStarted = () => {
    onGoToAuth('patient', 'login');
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden ${
      accessibilityMode
        ? 'bg-black text-yellow-300 font-bold'
        : isDark
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-50 text-slate-900'
    } transition-colors duration-200`}>

      {/* Hero Background Image with Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-[680px] z-0 overflow-hidden pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2000&q=80" 
          alt="Healthcare Medical Laboratory Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 filter blur-[1px] opacity-15 dark:opacity-10 transition-opacity duration-300"
        />
        {/* Gradients to blend smoothly into page background */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950' 
            : 'bg-gradient-to-b from-white/75 via-slate-50/90 to-slate-50'
        }`} />
        
        {/* Soft Radial Ambient Glows */}
        <div className="absolute -top-24 right-10 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl" />
        <div className="absolute top-48 -left-20 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        accessibilityMode
          ? 'bg-black/95 border-yellow-400'
          : isDark
          ? 'bg-slate-900/85 border-slate-800/80'
          : 'bg-white/85 border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl shadow-lg flex items-center justify-center ${
              accessibilityMode
                ? 'bg-yellow-400 text-black'
                : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 shadow-teal-500/20'
            }`}>
              <Pill className="h-6 w-6 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xl font-black tracking-tight ${accessibilityMode ? 'text-yellow-400' : isDark ? 'text-white' : 'text-slate-900'}`}>
                  MediCare
                </span>
                <span className="text-teal-500 font-black text-xl">+</span>
                <span className={`hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  accessibilityMode 
                    ? 'bg-yellow-400 text-black' 
                    : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                }`}>
                  Smart Adherence
                </span>
              </div>
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center space-x-3">
            {/* High Contrast Toggle */}
            {onToggleAccessibilityMode && (
              <button
                type="button"
                onClick={onToggleAccessibilityMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                  accessibilityMode
                    ? 'bg-yellow-400 text-black border-yellow-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 border-slate-200 dark:border-slate-700'
                }`}
                title="Toggle High Contrast Mode"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">A11Y</span>
              </button>
            )}

            {/* Dark / Light Toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
              </button>
            )}

            {/* Top Bar Get Started */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-black text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-md shadow-teal-500/20 transition flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Pill Tag */}
            <div className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
              accessibilityMode
                ? 'bg-yellow-400 text-black'
                : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 backdrop-blur-sm'
            }`}>
              <Sparkles className="h-4 w-4 text-teal-500" />
              <span>Smart Medication Adherence & Reminder Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className={`text-4xl sm:text-6xl font-black tracking-tight leading-tight ${
              accessibilityMode ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
            }`}>
              Never Miss a Dose. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600">
                Stay Healthy, Stay Connected.
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto ${
              accessibilityMode ? 'text-yellow-200' : 'text-slate-600 dark:text-slate-300'
            }`}>
              An intelligent, clinical-grade medication management system connecting Patients, Doctors, and Caregivers with real-time audio voice reminders, adherence analytics, and refill guardian alerts.
            </p>

            {/* ONLY ONE Single Primary Get Started Button in Hero */}
            <div className="pt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-10 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-teal-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-3 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5 font-black" />
              </button>
            </div>

            {/* Trust Highlights */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-teal-500" />
                <span>Zero Cloud Dependency</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>100% Relational SQL Privacy</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <HeartPulse className="h-4 w-4 text-rose-500" />
                <span>Voice & Speech Alerts</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Role Architecture Information Cards (Pure Information - No extra buttons) */}
      <section className={`py-16 relative z-10 border-y ${
        accessibilityMode
          ? 'bg-black border-yellow-400'
          : isDark
          ? 'bg-slate-900/60 border-slate-800'
          : 'bg-white/80 border-slate-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className={`text-2xl sm:text-3xl font-black ${accessibilityMode ? 'text-yellow-400' : 'text-slate-900 dark:text-white'}`}>
              Designed for Every Care Role
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Select your role (Patient, Doctor, or Caregiver) during sign-in/registration to access your custom workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patient Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              accessibilityMode
                ? 'bg-black border-yellow-400'
                : isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Patients</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">Self Tracker</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Receive scheduled medication alerts with audio TTS, log dose compliance with reasons, track your 7-day adherence charts, and print clinical audit reports.
              </p>
            </div>

            {/* Doctor Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              accessibilityMode
                ? 'bg-black border-yellow-400'
                : isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Doctors</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">Prescriber</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Issue digital prescriptions directly to patient dashboards, review historical compliance trends, analyze missed-dose patterns, and optimize therapy.
              </p>
            </div>

            {/* Caregiver Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              accessibilityMode
                ? 'bg-black border-yellow-400'
                : isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Caregivers</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Family & Ward</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Keep loved ones safe with real-time missed dose alerts, refill threshold notifications, and immediate emergency contact shortcuts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Healthcare Image Banner Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <img 
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80" 
              alt="Medical Team & Technology" 
              referrerPolicy="no-referrer"
              className="w-full h-80 sm:h-96 object-cover object-center filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent flex flex-col justify-end p-6 sm:p-10">
              <div className="max-w-xl space-y-2">
                <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">Clinical Precision</span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">Empowering Proactive Healthcare Management</h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Real-time synchronization between clinical prescriptions and daily patient adherence tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature & Platform Info Grid */}
      <section className="pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Complete Healthcare Feature Set
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Everything required for seamless medication adherence in one unified dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                <Volume2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Audio & Speech Reminders</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Web Audio alert chimes and Web Speech TTS voice announcements so patients never overlook medication times.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Interactive D3 Charts</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Visual 7-day adherence curves, missed-dose reason pie breakdowns, and hourly compliance histograms for deep medical insights.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">In-Browser Relational SQLite</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Fast, offline-capable SQLite database preserving patients, medicines, dose logs, caregivers, and prescriptions with SQL integrity.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">ML Adherence Prediction</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Heuristic machine learning risk model calculating non-adherence probabilities, risk factors, and proactive recommendations.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Refill Guardian</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Automatic pill countdown and inventory monitoring with one-click refill requests sent directly to linked caregivers and pharmacies.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Printable Clinical Audit</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Export verified compliance records into clean, printable hospital audit sheets and CSV files for physician consultations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-teal-500 text-slate-950">
              <Pill className="h-4 w-4" />
            </div>
            <span className="font-black text-slate-800 dark:text-slate-200">MediCare+</span>
            <span>— Smart Healthcare Adherence</span>
          </div>

          <p>© {new Date().getFullYear()} MediCare+. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};
