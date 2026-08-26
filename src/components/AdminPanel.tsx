import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  UserCheck,
  Stethoscope,
  HeartHandshake,
  Pill,
  FileText,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  X,
  CheckCircle2,
  Filter,
  KeyRound,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  Sliders,
  History,
  ShieldCheck,
  UserMinus,
  Check
} from 'lucide-react';
import { User, Patient, Medicine, Prescription, DoseRecord, Caregiver, AdminOverviewStats } from '../types';

interface AdminPanelProps {
  currentUser: User;
  onSwitchUserPersona?: (targetRole: 'patient' | 'doctor' | 'caregiver' | 'admin', user?: User) => void;
  onRefreshAllData?: () => void;
  autoLogoutPolicy?: {
    blurLockEnabled: boolean;
    idleTimeoutMinutes: number;
  };
  onUpdateAutoLogoutPolicy?: (policy: { blurLockEnabled: boolean; idleTimeoutMinutes: number }) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onSwitchUserPersona,
  onRefreshAllData,
  autoLogoutPolicy = { blurLockEnabled: true, idleTimeoutMinutes: 5 },
  onUpdateAutoLogoutPolicy
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'patients' | 'prescriptions' | 'inventory' | 'audit' | 'security'>('users');
  
  // Data States
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 4,
    totalPatients: 2,
    totalDoctors: 1,
    totalCaregivers: 1,
    totalPrescriptions: 1,
    totalMedicines: 3,
    totalDoseLogs: 3,
    systemAdherenceRate: 100,
    pendingRefillsCount: 1,
    highRiskPatientsCount: 0
  });
  
  const [usersList, setUsersList] = useState<User[]>([]);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [medicinesList, setMedicinesList] = useState<Medicine[]>([]);
  const [prescriptionsList, setPrescriptionsList] = useState<Prescription[]>([]);
  const [doseRecordsList, setDoseRecordsList] = useState<DoseRecord[]>([]);
  const [caregiversList, setCaregiversList] = useState<Caregiver[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals & Action States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'patient' | 'doctor' | 'caregiver'>('patient');
  const [newUserPassword, setNewUserPassword] = useState('password123');

  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState(32);
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [newPatientBlood, setNewPatientBlood] = useState('O+');
  const [newPatientRel, setNewPatientRel] = useState('Ward');

  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch Master Data
  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Overview Stats
      const statsRes = await fetch('/api/admin/overview');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Master DB Data
      const allRes = await fetch('/api/admin/all-data');
      if (allRes.ok) {
        const allData = await allRes.json();
        setUsersList(allData.users || []);
        setPatientsList(allData.patients || []);
        setMedicinesList(allData.medicines || []);
        setPrescriptionsList(allData.prescriptions || []);
        setDoseRecordsList(allData.doseRecords || []);
        setCaregiversList(allData.caregivers || []);
        setAuditLogsList(allData.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const triggerSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4500);
  };

  // 1. Handle Add New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole
        })
      });

      if (res.ok) {
        triggerSuccessBanner(`Successfully registered ${newUserName} as a ${newUserRole}`);
        setNewUserName('');
        setNewUserEmail('');
        setShowAddUserModal(false);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error creating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Change User Role
  const handleUpdateRole = async (userId: number, targetRole: 'patient' | 'doctor' | 'caregiver' | 'admin') => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });

      if (res.ok) {
        triggerSuccessBanner(`User role successfully changed to ${targetRole.toUpperCase()}`);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  // 3. Handle Reset Password
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalUser || !newPasswordInput.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordModalUser.user_id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPasswordInput.trim() })
      });

      if (res.ok) {
        triggerSuccessBanner(`Password updated for ${resetPasswordModalUser.full_name}`);
        setResetPasswordModalUser(null);
        setNewPasswordInput('');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error('Error resetting password:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Toggle Account Status
  const handleToggleUserStatus = async (user: User) => {
    const currentStatus = (user as any).status || 'ACTIVE';
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      const res = await fetch(`/api/admin/users/${user.user_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        triggerSuccessBanner(`Account ${user.email} marked as ${nextStatus}`);
        fetchAllAdminData();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // 5. Handle Delete User
  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccessBanner(`Deleted user ${userName}`);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // 6. Handle Add Patient
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatientName.trim(),
          age: Number(newPatientAge) || 30,
          gender: newPatientGender,
          blood_group: newPatientBlood,
          relationship: newPatientRel
        })
      });

      if (res.ok) {
        triggerSuccessBanner(`Clinical record registered for patient ${newPatientName}`);
        setNewPatientName('');
        setShowAddPatientModal(false);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error adding patient:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Handle Add Stock
  const handleReplenishStock = async (medId: number, medName: string, addAmount: number) => {
    try {
      const res = await fetch(`/api/admin/medicines/${medId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: addAmount })
      });

      if (res.ok) {
        triggerSuccessBanner(`Added +${addAmount} units of ${medName} to pharmacy inventory.`);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error replenishing stock:', err);
    }
  };

  // 8. Delete Prescription
  const handleDeletePrescription = async (rxId: number) => {
    if (!window.confirm(`Are you sure you want to delete Prescription #RX-${rxId}?`)) return;

    try {
      const res = await fetch(`/api/prescriptions/${rxId}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccessBanner(`Prescription #RX-${rxId} archived/deleted.`);
        fetchAllAdminData();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (err) {
      console.error('Error deleting prescription:', err);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div id="admin-governance-hub" className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div 
        id="admin-master-header" 
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                Master Administration Control
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                System Operational
              </span>
              <span className="text-[11px] font-semibold text-sky-300 bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-sky-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3 text-sky-400" />
                Auto-Logout On Tab Blur: Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5">
              MediCare+ System Administration
            </h1>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Full administrative authority: User governance, patient dossiers, hospital prescriptions, pharmacy inventory, audit telemetry, and auto-logout security enforcement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            id="admin-refresh-telemetry-btn"
            onClick={fetchAllAdminData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
            title="Reload telemetry data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
          
          <button
            id="admin-provision-patient-btn"
            onClick={() => setShowAddPatientModal(true)}
            className="px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Add Patient
          </button>

          <button
            id="admin-provision-user-btn"
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Provision User
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Telemetry Metric Cards */}
      <div id="admin-telemetry-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Users</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
          <span className="text-[10px] text-slate-400">Registered logins</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Patients</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalPatients}</p>
          <span className="text-[10px] text-emerald-400/90">Clinical dossiers</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Doctors</span>
            <Stethoscope className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalDoctors}</p>
          <span className="text-[10px] text-purple-400/90">Authorized prescribers</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Caregivers</span>
            <HeartHandshake className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalCaregivers}</p>
          <span className="text-[10px] text-rose-400/90">Family oversight</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Medicines</span>
            <Pill className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{medicinesList.length}</p>
          <span className="text-[10px] text-amber-400/90">Active pharmacy drugs</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 transition hover:border-slate-600">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Adherence</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.systemAdherenceRate}%</p>
          <span className="text-[10px] text-teal-400/90">{stats.totalDoseLogs} doses logged</span>
        </div>
      </div>

      {/* Admin Access Navigation Tabs */}
      <div id="admin-access-tabs-bar" className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        <button
          id="admin-tab-users"
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          User Governance ({usersList.length})
        </button>

        <button
          id="admin-tab-patients"
          onClick={() => setActiveTab('patients')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'patients'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Patient Registry ({patientsList.length})
        </button>

        <button
          id="admin-tab-prescriptions"
          onClick={() => setActiveTab('prescriptions')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'prescriptions'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Hospital Rx Vault ({prescriptionsList.length})
        </button>

        <button
          id="admin-tab-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Pharmacy Stock ({medicinesList.length})
        </button>

        <button
          id="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Logs ({auditLogsList.length})
        </button>

        <button
          id="admin-tab-security"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Security & Auto-Logout
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS & IDENTITY GOVERNANCE */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div id="admin-users-view" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search accounts by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
              >
                <option value="ALL">All Account Roles</option>
                <option value="patient">Patients (Self Tracker)</option>
                <option value="doctor">Doctors (Prescribers)</option>
                <option value="caregiver">Caregivers (Family/Ward)</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden md:table-cell">Account ID</th>
                  <th className="py-3 px-4 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((user) => {
                  const isMasterAdmin = user.role === 'admin' || user.email === 'admin@medicare.io';
                  const isSuspended = (user as any).status === 'SUSPENDED';

                  return (
                    <tr key={user.user_id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          {user.full_name}
                          {isMasterAdmin && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                              Root Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          isMasterAdmin
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : user.role === 'doctor'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                            : user.role === 'caregiver'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        }`}>
                          {isMasterAdmin ? 'ADMIN' : user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isSuspended ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400 hidden md:table-cell">
                        #{user.user_id}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isMasterAdmin ? (
                            <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                              Protected
                            </span>
                          ) : (
                            <>
                              {/* Change Role Selector */}
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateRole(user.user_id, e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                                title="Change user role"
                              >
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="caregiver">Caregiver</option>
                              </select>

                              {/* Reset Password */}
                              <button
                                title="Reset User Password"
                                onClick={() => {
                                  setResetPasswordModalUser(user);
                                  setNewPasswordInput('password123');
                                }}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-amber-300 rounded-lg text-xs transition"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Suspend/Activate */}
                              <button
                                title={isSuspended ? "Activate Account" : "Suspend Account"}
                                onClick={() => handleToggleUserStatus(user)}
                                className={`p-1.5 rounded-lg text-xs transition ${
                                  isSuspended ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete User */}
                              <button
                                title="Delete user"
                                onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                                className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg text-xs transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PATIENT MASTER DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'patients' && (
        <div id="admin-patients-view" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Clinical Patient Master Directory ({patientsList.length} Registered)
            </h3>
            <button
              onClick={() => setShowAddPatientModal(true)}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Add Patient Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientsList.map((patient) => {
              const pMeds = medicinesList.filter(m => m.patient_id === patient.patient_id);
              const pCaregiver = caregiversList.find(c => c.patient_id === patient.patient_id);

              return (
                <div 
                  key={patient.patient_id}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-white">{patient.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Age: {patient.age || 35} yrs • Gender: {patient.gender || 'Not specified'} • Blood Group: <strong className="text-rose-400">{patient.blood_group || 'O+'}</strong>
                      </p>
                    </div>
                    <span className="text-xs bg-slate-900 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg font-mono">
                      Patient #{patient.patient_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Designated Caregiver</span>
                      <span className="font-bold text-rose-300">
                        {pCaregiver ? `${pCaregiver.name} (${pCaregiver.relationship})` : 'No caregiver linked'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Prescriptions / Meds</span>
                      <span className="font-bold text-teal-300">{pMeds.length} Active Medicines</span>
                    </div>
                  </div>

                  {pMeds.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Prescribed Active Regimen
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {pMeds.map((med) => (
                          <div 
                            key={med.medicine_id} 
                            className="p-2 bg-slate-950/80 rounded-xl text-xs flex items-center justify-between text-slate-300 border border-slate-800"
                          >
                            <div>
                              <span className="font-bold text-white">{med.name}</span>
                              <span className="text-slate-400 text-[11px] ml-1.5">({med.dosage})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-300 text-[11px]">
                                Stock: <strong className={med.remaining_quantity <= med.refill_threshold ? 'text-rose-400' : 'text-emerald-400'}>{med.remaining_quantity}</strong>
                              </span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                {med.schedules[0]?.time || '08:00 AM'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HOSPITAL RX VAULT */}
      {/* ========================================================================= */}
      {activeTab === 'prescriptions' && (
        <div id="admin-prescriptions-view" className="space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rx Number & Date</th>
                  <th className="py-3 px-4">Prescribing Doctor</th>
                  <th className="py-3 px-4">Target Patient</th>
                  <th className="py-3 px-4">Prescribed Medicines</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {prescriptionsList.map((rx) => {
                  const targetPatient = patientsList.find(p => p.patient_id === rx.patient_id);
                  return (
                    <tr key={rx.prescription_id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-teal-400">RX-{rx.prescription_id}</div>
                        <div className="text-xs text-slate-400">{rx.prescription_date}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-300">
                        {rx.doctor_name}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {targetPatient ? targetPatient.name : `Patient #${rx.patient_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {rx.medicines_extracted.map((med, idx) => (
                            <div key={idx} className="text-xs text-slate-200">
                              • <strong className="text-white">{med.name}</strong> ({med.dosage}) - <span className="text-slate-400">{med.frequency}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          title="Delete Rx"
                          onClick={() => handleDeletePrescription(rx.prescription_id)}
                          className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg text-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PHARMACY INVENTORY & STOCK OVERSIGHT */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div id="admin-inventory-view" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicinesList.map((med) => {
              const isLowStock = (med.remaining_quantity || 0) <= (med.refill_threshold || 5);
              const targetPatient = patientsList.find(p => p.patient_id === med.patient_id);

              return (
                <div 
                  key={med.medicine_id}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-base text-white">{med.name}</h4>
                        <p className="text-xs text-slate-400">
                          {med.dosage} • {med.form || 'Tablet'} • {med.meal_timing || 'AFTER_MEAL'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isLowStock ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isLowStock ? 'Low Stock' : 'Adequate'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Patient:</span>
                        <span className="font-semibold text-white">{targetPatient ? targetPatient.name : `ID #${med.patient_id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Remaining Inventory:</span>
                        <span className="font-mono font-bold text-amber-300">{med.remaining_quantity} / {med.total_quantity} pills</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Prescribing Doctor:</span>
                        <span className="font-semibold text-purple-300">{med.doctor_name || 'Hospital Clinical Staff'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Replenishment Buttons */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Add Stock:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReplenishStock(med.medicine_id, med.name, 10)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleReplenishStock(med.medicine_id, med.name, 30)}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        +30
                      </button>
                      <button
                        onClick={() => handleReplenishStock(med.medicine_id, med.name, 60)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
                      >
                        +60
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div id="admin-audit-view" className="space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Live Operational Audit Trail ({auditLogsList.length} Recorded Events)
              </span>
              <span className="text-[11px] text-slate-500">Auto-synchronized with backend</span>
            </div>

            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {auditLogsList.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-800/50 transition flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.level === 'critical' ? 'bg-rose-500/20 text-rose-300' :
                        log.level === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                        log.level === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
                      }`}>
                        {log.action}
                      </span>
                      <strong className="text-white">{log.actor}</strong>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-300">{log.target}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{log.details}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SECURITY & AUTO-LOGOUT POLICIES */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div id="admin-security-view" className="space-y-6 max-w-4xl">
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Automatic Session Security & HIPAA Compliance
                </h3>
                <p className="text-xs text-slate-400">
                  Protect confidential clinical prescriptions and patient records when leaving the application.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Auto-Logout on Tab Blur / Window Switch
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically terminates the active session immediately when the user switches to another tab, minimizes the browser window, or navigates outside the application.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateAutoLogoutPolicy) {
                        onUpdateAutoLogoutPolicy({
                          ...autoLogoutPolicy,
                          blurLockEnabled: !autoLogoutPolicy.blurLockEnabled
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      autoLogoutPolicy.blurLockEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoLogoutPolicy.blurLockEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {autoLogoutPolicy.blurLockEnabled ? 'ENABLED (Strict)' : 'DISABLED (Recommended)'}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-200">Idle Inactivity Timeout</span>
                  <p className="text-slate-400 text-[11px]">Maximum period of user inactivity before locking session</p>
                </div>
                <select
                  value={autoLogoutPolicy.idleTimeoutMinutes}
                  onChange={(e) => {
                    if (onUpdateAutoLogoutPolicy) {
                      onUpdateAutoLogoutPolicy({
                        ...autoLogoutPolicy,
                        idleTimeoutMinutes: Number(e.target.value)
                      });
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value={1}>1 Minute (Strict Privacy)</option>
                  <option value={5}>5 Minutes (Hospital Standard)</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                How the Auto-Logout Protection Works:
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                <li>When any Doctor, Patient, Caregiver, or Admin logs into their account, the application attaches a security listener to <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">visibilitychange</code> and window blur events.</li>
                <li>The moment you switch tabs or click outside the application, MediCare+ safely terminates your session and returns to the Sign In portal.</li>
                <li>A lock notification is displayed on the login page confirming that medical data remained protected.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROVISION USER */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div id="add-user-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Provision New User Account
              </h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma or Rahul Patient"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@medicare.io"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Account Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-semibold"
                >
                  <option value="patient">Patient (Medicine Schedules & Reminders)</option>
                  <option value="doctor">Doctor (Prescription Authority)</option>
                  <option value="caregiver">Caregiver (Ward Monitoring & Refills)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" /> Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PATIENT RECORD */}
      {/* ========================================================================= */}
      {showAddPatientModal && (
        <div id="add-patient-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-400" /> Create Clinical Patient Record
              </h3>
              <button 
                onClick={() => setShowAddPatientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Blood Group</label>
                  <select
                    value={newPatientBlood}
                    onChange={(e) => setNewPatientBlood(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 text-xs font-semibold"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Relationship / Type</label>
                  <input
                    type="text"
                    value={newPatientRel}
                    onChange={(e) => setNewPatientRel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD */}
      {/* ========================================================================= */}
      {resetPasswordModalUser && (
        <div id="reset-password-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" /> Reset User Password
              </h3>
              <button 
                onClick={() => setResetPasswordModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Resetting credentials for: <strong className="text-white">{resetPasswordModalUser.full_name}</strong> (<span className="font-mono text-amber-400">{resetPasswordModalUser.email}</span>)
            </p>

            <form onSubmit={handleExecutePasswordReset} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalUser(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" /> Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
