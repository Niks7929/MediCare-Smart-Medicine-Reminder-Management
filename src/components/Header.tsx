import React, { useState } from 'react';
import { 
  Pill, 
  HeartPulse, 
  User, 
  Users, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  LogOut, 
  Stethoscope, 
  ShieldCheck,
  FileText,
  Send,
  Activity,
  HeartHandshake,
  Bell,
  Phone,
  Pencil,
  Check,
  Download,
  Terminal,
  Home,
  Sun,
  Moon,
  Sparkles,
  Camera,
  Upload,
  UserCheck,
  Droplet,
  Eye,
  Glasses,
  ShieldAlert,
  Key,
  Info
} from 'lucide-react';
import { Patient, User as UserType, AlertSoundId } from '../types';
import { ProfilePhotoModal } from './ProfilePhotoModal';
import { VoiceCommandsModal } from './VoiceCommandsModal';
import { AlertSoundPickerModal } from './AlertSoundPickerModal';
import { ALERT_SOUNDS } from '../utils/audioAlerts';

interface HeaderProps {
  currentUser?: UserType | null;
  onLogout?: () => void;
  onUpdateUserName?: (newName: string) => void;
  patients: Patient[];
  activePatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onAddPatient: () => void;
  onUpdatePatientPhoto?: (patientId: number, photoUrl: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (val: boolean) => void;
  alertSound?: AlertSoundId;
  onSelectAlertSound?: (soundId: AlertSoundId) => void;
  pushEnabled?: boolean;
  onTogglePush?: () => void;
  onTestPush?: () => void;
  currentTime: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  accessibilityMode?: boolean;
  onToggleAccessibilityMode?: () => void;
  onShowLanding?: () => void;
  onSwitchPersona?: (role: 'patient' | 'doctor' | 'caregiver' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onUpdateUserName,
  patients,
  activePatient,
  onSelectPatient,
  onAddPatient,
  onUpdatePatientPhoto,
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  speechEnabled,
  setSpeechEnabled,
  alertSound = 'chime',
  onSelectAlertSound,
  pushEnabled = false,
  onTogglePush,
  onTestPush,
  currentTime,
  theme = 'light',
  onToggleTheme,
  accessibilityMode = false,
  onToggleAccessibilityMode,
  onShowLanding,
  onSwitchPersona
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.full_name || '');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isVoiceCommandsModalOpen, setIsVoiceCommandsModalOpen] = useState(false);
  const [isSoundPickerModalOpen, setIsSoundPickerModalOpen] = useState(false);
  const role = currentUser?.role || 'patient';

  // Role tailored navigation items
  const getNavTabs = () => {
    if (role === 'admin') {
      return [
        { id: 'admin-panel', label: 'Admin Dashboard', icon: ShieldAlert },
      ];
    }
    if (role === 'doctor') {
      return [
        { id: 'doctor-portal', label: 'Clinician Portal', icon: Stethoscope },
        { id: 'prescriptions', label: 'Rx Archive', icon: FileText },
        { id: 'medications', label: 'Drug Regimens', icon: Pill },
      ];
    }
    if (role === 'caregiver') {
      return [
        { id: 'caregiver-portal', label: 'Ward Oversight', icon: ShieldCheck },
        { id: 'dashboard', label: 'Medication Schedule', icon: Pill },
        { id: 'caregiver', label: 'Alert History', icon: Bell },
      ];
    }
    // Patient default tabs
    return [
      { id: 'dashboard', label: 'Daily Schedule', icon: Home },
      { id: 'medications', label: 'Medicines & Stock', icon: Pill },
      { id: 'caregiver', label: 'Caregiver Alerts', icon: Bell },
      { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    ];
  };

  const handleSavePhoto = (photoDataUrl: string) => {
    if (activePatient && onUpdatePatientPhoto) {
      onUpdatePatientPhoto(activePatient.patient_id, photoDataUrl);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';
  };

  return (
    <header className={`bg-slate-900 text-white shadow-md border-b sticky top-0 z-30 ${accessibilityMode ? 'border-amber-400 bg-black' : 'border-slate-800'}`}>
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer" 
          onClick={() => setActiveTab(role === 'admin' ? 'admin-panel' : role === 'doctor' ? 'doctor-portal' : role === 'caregiver' ? 'caregiver-portal' : 'dashboard')}
        >
          <div className={`p-2.5 rounded-xl shadow-lg flex items-center justify-center ${
            role === 'admin' ? 'bg-amber-500 text-slate-950 shadow-amber-500/30' :
            role === 'doctor' ? 'bg-purple-600 text-white shadow-purple-600/30' :
            role === 'caregiver' ? 'bg-rose-600 text-white shadow-rose-600/30' :
            'bg-teal-600 text-white shadow-teal-600/30'
          }`}>
            {role === 'admin' ? (
              <ShieldAlert className="h-6 w-6" />
            ) : role === 'doctor' ? (
              <Stethoscope className="h-6 w-6" />
            ) : role === 'caregiver' ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Pill className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-bold tracking-tight text-white">MediCare</span>
              <span className="text-teal-400 text-xl font-extrabold">+</span>
              {accessibilityMode && (
                <span className="text-[10px] bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">
                  A11Y Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {role === 'admin'
                ? 'Master Administrative Control'
                : role === 'doctor' 
                ? 'Clinical Physician Workspace' 
                : role === 'caregiver' 
                ? 'Caregiver Ward Monitoring' 
                : 'Smart Medication System'}
            </p>
          </div>
        </div>

        {/* Right Section: Accessibility Mode Toggle, Theme, Time, Voice, User & Logout */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Live Clock */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{currentTime}</span>
          </div>

          {/* Product Showcase Overview Button */}
          {onShowLanding && (
            <button
              id="header-showcase-btn"
              type="button"
              onClick={onShowLanding}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 hover:border-teal-500/40 transition flex items-center gap-1.5 shadow-sm"
              title="View Welcome Showcase Dashboard"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">Showcase</span>
            </button>
          )}

          {/* HIGH CONTRAST ACCESSIBILITY MODE TOGGLE */}
          {onToggleAccessibilityMode && (
            <button
              id="accessibility-mode-toggle-button"
              type="button"
              onClick={onToggleAccessibilityMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                accessibilityMode
                  ? 'bg-yellow-400 text-black border-yellow-300 shadow-lg shadow-yellow-400/30'
                  : 'bg-slate-800 text-yellow-400 hover:text-yellow-300 border-slate-700 hover:border-yellow-400/50'
              }`}
              title={accessibilityMode ? 'Accessibility Mode: High Contrast ON (WCAG AAA 7:1+)' : 'Enable Accessibility Mode for Visual Impairments (High Contrast)'}
              aria-label={`Toggle High-Contrast Accessibility Mode. Currently ${accessibilityMode ? 'Enabled' : 'Disabled'}`}
            >
              <Eye className={`h-4 w-4 ${accessibilityMode ? 'stroke-[2.5]' : ''}`} />
              <span className="whitespace-nowrap">
                {accessibilityMode ? 'A11Y: High Contrast' : 'A11Y Mode'}
              </span>
            </button>
          )}

          {/* Global Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="theme-toggle-button"
              type="button"
              onClick={onToggleTheme}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                theme === 'dark'
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 hover:border-amber-400/50 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 shadow-sm'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
                  <span className="font-semibold text-amber-200">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-300" />
                  <span className="font-semibold">Dark</span>
                </>
              )}
            </button>
          )}

          {/* Browser Push Notifications Toggle */}
          {role !== 'doctor' && role !== 'admin' && (
            <div className="flex items-center gap-1">
              <button
                onClick={onTogglePush}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  pushEnabled
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 shadow-sm hover:border-indigo-400'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:bg-slate-750'
                }`}
                title={pushEnabled ? 'Browser Push Notifications Active (Service Worker)' : 'Enable Browser Push Reminders'}
              >
                <Bell className={`h-4 w-4 ${pushEnabled ? 'text-indigo-400 animate-bounce' : 'text-slate-500'}`} />
                <span className="font-semibold">{pushEnabled ? 'Push: ON' : 'Enable Push'}</span>
              </button>
              {pushEnabled && onTestPush && (
                <button
                  onClick={onTestPush}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-indigo-600/40 text-slate-300 hover:text-indigo-200 border border-slate-700 transition"
                  title="Dispatch Test Browser Notification"
                >
                  Test Push
                </button>
              )}
            </div>
          )}

          {/* Voice Speech Synthesis Reminder Toggle & Info Guide */}
          {role !== 'doctor' && role !== 'admin' && (
            <div className="flex items-center gap-1">
              <button
                id="header-voice-toggle-btn"
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  speechEnabled
                    ? 'bg-gradient-to-r from-teal-600/30 to-emerald-600/30 text-teal-200 border border-teal-500/50 shadow-sm hover:border-teal-400'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:bg-slate-750'
                }`}
                title={speechEnabled ? 'Voice Reminders Enabled (Speech Synthesis API)' : 'Voice Reminders Disabled'}
              >
                {speechEnabled ? (
                  <>
                    <Volume2 className="h-4 w-4 text-teal-400 animate-pulse" />
                    <span className="font-semibold text-teal-300">Voice: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 text-slate-500" />
                    <span>Voice: OFF</span>
                  </>
                )}
              </button>

              <button
                id="header-voice-commands-info-btn"
                onClick={() => setIsVoiceCommandsModalOpen(true)}
                className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 border border-slate-700 hover:border-teal-500/50 transition shadow-sm"
                title="Voice Commands & Audio Guide"
                aria-label="View Available Voice Commands"
              >
                <Info className="h-4 w-4 text-teal-400" />
              </button>

              {/* Alert Chime Picker Button */}
              <button
                id="header-alert-sound-btn"
                onClick={() => setIsSoundPickerModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 hover:border-amber-400 shadow-sm"
                title={`Reminder Chime: ${ALERT_SOUNDS.find(s => s.id === alertSound)?.name || 'Chime'}. Click to customize alert sound.`}
              >
                <Bell className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold hidden xl:inline">Chime:</span>
                <span className="font-extrabold text-white text-[11px]">
                  {ALERT_SOUNDS.find(s => s.id === alertSound)?.name || 'Chime'}
                </span>
              </button>
            </div>
          )}

          {/* Multi-Patient Profile Dropdown (visible for patients and caregivers) */}
          {role !== 'admin' && patients.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-slate-800 rounded-lg p-1 border border-slate-700">
              {activePatient?.photo_url ? (
                <img 
                  src={activePatient.photo_url} 
                  alt={activePatient.name} 
                  className="h-5 w-5 rounded-full object-cover ml-1 border border-teal-400"
                />
              ) : (
                <Users className="h-4 w-4 text-teal-400 ml-1.5" />
              )}
              <select
                value={activePatient?.patient_id || ''}
                onChange={(e) => {
                  const selected = patients.find((p) => p.patient_id === Number(e.target.value));
                  if (selected) onSelectPatient(selected);
                }}
                className="bg-transparent text-xs font-medium text-white px-2 py-1 outline-none cursor-pointer max-w-[140px] truncate"
              >
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id} className="bg-slate-900 text-white">
                    {p.name} {p.relationship ? `(${p.relationship})` : ''}
                  </option>
                ))}
              </select>
              {role === 'patient' && (
                <button
                  onClick={onAddPatient}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-teal-300 transition"
                  title="Add Family Profile"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* User Badge & Logout */}
          {currentUser && (
            <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-slate-900 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500 text-xs outline-none w-28 sm:w-36"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editedName.trim() && onUpdateUserName) {
                        onUpdateUserName(editedName.trim());
                        setIsEditingName(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingName(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (editedName.trim() && onUpdateUserName) {
                        onUpdateUserName(editedName.trim());
                        setIsEditingName(false);
                      }
                    }}
                    className="p-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded"
                    title="Save Name"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-200 font-bold hidden sm:inline">{currentUser.full_name}</span>
                  {onUpdateUserName && (
                    <button
                      onClick={() => {
                        setEditedName(currentUser.full_name);
                        setIsEditingName(true);
                      }}
                      className="p-1 text-slate-400 hover:text-teal-300 transition"
                      title="Edit Profile Name"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <span className={`capitalize text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                role === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                  : role === 'doctor'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : role === 'caregiver'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {role === 'admin' ? '🛡️ Admin' : role === 'doctor' ? '🩺 Physician' : role === 'caregiver' ? '🛡️ Caregiver' : '👤 Patient'}
              </span>
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-md text-xs font-bold transition flex items-center gap-1.5 ml-1 shadow-sm"
                title="Sign Out / Switch Account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PATIENT PROFILE BANNER IN HEADER (Hidden for Admin) */}
      {role !== 'admin' && activePatient && (
        <div className="bg-slate-950/90 border-t border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* Left: Patient Avatar with Interactive Camera Trigger & Clinical Profile Details */}
            <div className="flex items-center space-x-3.5 sm:space-x-4">
              
              {/* Profile Photo / Avatar Frame with Camera Overlay */}
              <div 
                onClick={() => setIsPhotoModalOpen(true)}
                className="relative group cursor-pointer flex-shrink-0"
                title="Click to take a photo with your camera or upload an image"
              >
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full overflow-hidden border-2 border-teal-400 group-hover:border-teal-300 shadow-lg shadow-teal-500/20 transition-all transform group-hover:scale-105 bg-slate-900 flex items-center justify-center">
                  {activePatient.photo_url ? (
                    <img
                      src={activePatient.photo_url}
                      alt={activePatient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black text-lg">
                      {getInitials(activePatient.name)}
                    </div>
                  )}
                </div>

                {/* Camera Icon Trigger Badge */}
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md transition group-hover:scale-110 border-2 border-slate-900 flex items-center justify-center">
                  <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </div>

              {/* Patient Text & Medical Metadata Tags */}
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>{activePatient.name}</span>
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {activePatient.relationship || 'Primary Profile'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                    <span>Active Patient</span>
                  </span>
                </div>

                {/* Clinical Pill Badges: Age, Gender, Blood Group */}
                <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-slate-300">
                  <span className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    <span className="text-slate-400">Age:</span> <strong className="text-white">{activePatient.age} yrs</strong>
                  </span>
                  <span className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    <span className="text-slate-400">Gender:</span> <strong className="text-white">{activePatient.gender}</strong>
                  </span>
                  <span className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    <Droplet className="h-3 w-3 text-rose-400" />
                    <span className="text-slate-400">Blood:</span> <strong className="text-rose-300">{activePatient.blood_group || 'O+'}</strong>
                  </span>
                </div>
              </div>

            </div>

            {/* Right: Quick Action to Open Camera / Photo Modal */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border border-teal-500/40 hover:border-teal-400 transition shadow-sm"
              >
                <Camera className="h-3.5 w-3.5 text-teal-400" />
                <span>{activePatient.photo_url ? 'Change Profile Photo' : 'Upload / Capture Photo'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-1 scrollbar-none">
          {getNavTabs().map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? tab.id === 'admin-panel' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Camera / Upload Profile Photo Modal */}
      {activePatient && (
        <ProfilePhotoModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          patientName={activePatient.name}
          currentPhotoUrl={activePatient.photo_url}
          onSavePhoto={handleSavePhoto}
        />
      )}

      {/* Voice Commands & Audio Guide Modal */}
      <VoiceCommandsModal
        isOpen={isVoiceCommandsModalOpen}
        onClose={() => setIsVoiceCommandsModalOpen(false)}
        activePatientName={activePatient?.name || currentUser?.full_name || 'Patient'}
      />

      {/* Alert Sound & Chime Picker Modal */}
      <AlertSoundPickerModal
        isOpen={isSoundPickerModalOpen}
        onClose={() => setIsSoundPickerModalOpen(false)}
        currentSound={alertSound}
        onSelectSound={(newSound) => {
          if (onSelectAlertSound) onSelectAlertSound(newSound);
        }}
        activePatientName={activePatient?.name || currentUser?.full_name || 'Patient'}
      />
    </header>
  );
};
