import React, { useState, useEffect } from 'react';
import { User, PrintJob } from '../types';
import {
  getRegisteredAccounts,
  updateUserStatus,
  deleteUserAccount,
  syncRegisteredUsersFromSupabase,
  RegisteredAccount,
  getRegisteredAdmins,
  registerAdminAccount,
  deleteAdminAccount,
  syncAdminsFromSupabase,
  AdminAccount,
} from '../services/storage';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  UserCheck,
  UserPlus,
  Shield,
  Copy,
  Check,
  Lock,
  User as UserIcon,
} from 'lucide-react';

interface AdminUsersProps {
  user: User;
  jobs: PrintJob[];
  initialSubTab?: 'students' | 'admins';
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ user, jobs, initialSubTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'admins'>(initialSubTab || 'students');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Students state
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(() => getRegisteredAccounts());
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'warn' } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Admin accounts state
  const [admins, setAdmins] = useState<AdminAccount[]>(() => getRegisteredAdmins());
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminFormError, setAdminFormError] = useState('');
  const [adminFormSuccess, setAdminFormSuccess] = useState('');

  const reloadAccounts = () => {
    setAccounts(getRegisteredAccounts());
  };

  const reloadAdmins = () => {
    setAdmins(getRegisteredAdmins());
  };

  useEffect(() => {
    const handleUsersUpdated = (e: any) => {
      if (e.detail) {
        setAccounts(e.detail);
      } else {
        reloadAccounts();
      }
    };

    const handleAdminsUpdated = (e: any) => {
      if (e.detail) {
        setAdmins(e.detail);
      } else {
        reloadAdmins();
      }
    };

    window.addEventListener('xeroxic_users_updated', handleUsersUpdated);
    window.addEventListener('xeroxic_admins_updated', handleAdminsUpdated);

    return () => {
      window.removeEventListener('xeroxic_users_updated', handleUsersUpdated);
      window.removeEventListener('xeroxic_admins_updated', handleAdminsUpdated);
    };
  }, []);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const syncedUsers = await syncRegisteredUsersFromSupabase();
      setAccounts(syncedUsers);
      const syncedAdmins = await syncAdminsFromSupabase();
      setAdmins(syncedAdmins);
      setActionFeedback({ message: 'Records synced with cloud database.', type: 'success' });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback({ message: 'Could not sync with cloud.', type: 'warn' });
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = (
    account: RegisteredAccount,
    newStatus: 'active' | 'disabled' | 'blocked'
  ) => {
    updateUserStatus(account.id, newStatus);
    reloadAccounts();
    const actionName =
      newStatus === 'active' ? 'Active (Re-enabled)' : newStatus === 'disabled' ? 'Disabled' : 'Blocked';
    setActionFeedback({
      message: `Account for ${account.name} (${account.rollNumber}) updated to ${actionName}.`,
      type: newStatus === 'active' ? 'success' : 'warn',
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteUser = (account: RegisteredAccount) => {
    if (
      confirm(
        `Are you sure you want to delete the student record for ${account.name} (${account.rollNumber})? This will permanently remove their login credentials.`
      )
    ) {
      deleteUserAccount(account.id);
      reloadAccounts();
      setActionFeedback({
        message: `Account for ${account.name} (${account.rollNumber}) deleted.`,
        type: 'warn',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Add new admin handler
  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError('');
    setAdminFormSuccess('');

    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setAdminFormError('Admin username and password are required.');
      return;
    }

    if (newAdminPassword.trim().length < 4) {
      setAdminFormError('Password must be at least 4 characters long.');
      return;
    }

    const res = registerAdminAccount({
      name: newAdminName.trim() || newAdminUsername.trim(),
      username: newAdminUsername.trim(),
      email: newAdminEmail.trim() || `${newAdminUsername.trim()}@college.edu`,
      password: newAdminPassword.trim(),
    });

    if (!res.success) {
      setAdminFormError(res.message || 'Could not create admin account.');
      return;
    }

    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminEmail('');
    setNewAdminPassword('');
    reloadAdmins();
    setAdminFormSuccess(`New admin operator "${res.account?.username}" created successfully! They can now log in using Admin Login.`);
    setTimeout(() => setAdminFormSuccess(''), 6000);
  };

  const handleDeleteAdmin = (adminId: string, adminUsername: string) => {
    if (adminId === 'admin-01') {
      alert('The primary superadmin account cannot be removed.');
      return;
    }

    if (confirm(`Remove admin privileges for "${adminUsername}"? They will no longer be able to log into the admin portal.`)) {
      deleteAdminAccount(adminId);
      reloadAdmins();
      setActionFeedback({
        message: `Admin account "${adminUsername}" removed.`,
        type: 'warn',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Compute stats per user from jobs
  const getUserStats = (rollNumber: string, email: string) => {
    const cleanRoll = rollNumber.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const userJobs = jobs.filter(
      (j) =>
        (j.studentRoll && j.studentRoll.trim().toLowerCase() === cleanRoll) ||
        (j.studentId && j.studentId.trim().toLowerCase() === cleanRoll)
    );
    const totalSpent = userJobs.reduce((acc, j) => acc + (j.cost || 0), 0);
    return { orderCount: userJobs.length, totalSpent };
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.department && acc.department.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return acc.status === filter;
  });

  const totalUsers = accounts.length;
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const disabledCount = accounts.filter((a) => a.status === 'disabled').length;
  const blockedCount = accounts.filter((a) => a.status === 'blocked').length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
              Manage Accounts & Directory
            </h1>
            <span className="text-xs bg-[#0067b8]/15 text-[#0067b8] font-semibold px-2.5 py-0.5 rounded-full border border-[#0067b8]/30">
              Cloud Synced
            </span>
          </div>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Manage registered student accounts, enable or disable user access, view their Gmail/emails, and add new admin operators.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCloudSync}
            disabled={isSyncing}
            className="text-xs bg-white hover:bg-[#f3f2f1] text-[#0067b8] border border-[#8a8886] px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Records'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex space-x-2 mb-6 border-b border-[#e1dfdd] pb-3">
        <button
          onClick={() => setActiveSubTab('students')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeSubTab === 'students'
              ? 'bg-[#0067b8] text-white shadow-sm'
              : 'bg-white hover:bg-[#f3f2f1] text-[#605e5c] border border-[#e1dfdd]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Students ({totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('admins')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeSubTab === 'admins'
              ? 'bg-[#0067b8] text-white shadow-sm'
              : 'bg-white hover:bg-[#f3f2f1] text-[#605e5c] border border-[#e1dfdd]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin Operators & Add New Admin ({admins.length})</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0]'
              : 'bg-[#fff4ce] text-[#835c00] border border-[#f2c80f]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: REGISTERED STUDENTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'students' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Total Students</div>
              <div className="text-2xl font-bold text-[#242424] mt-0.5">{totalUsers}</div>
              <div className="text-[10px] text-[#797775]">Registered on Xeroxic</div>
            </div>

            <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Active Accounts</div>
              <div className="text-2xl font-bold text-[#107c10] mt-0.5">{activeCount}</div>
              <div className="text-[10px] text-[#797775]">Full printing access</div>
            </div>

            <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Disabled Accounts</div>
              <div className="text-2xl font-bold text-[#d83b01] mt-0.5">{disabledCount}</div>
              <div className="text-[10px] text-[#797775]">Temporarily paused</div>
            </div>

            <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Blocked Accounts</div>
              <div className="text-2xl font-bold text-[#a80000] mt-0.5">{blockedCount}</div>
              <div className="text-[10px] text-[#797775]">Access prohibited</div>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="bg-white border border-[#e1dfdd] p-3 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex space-x-1.5 overflow-x-auto w-full md:w-auto">
              <button
                onClick={() => setFilter('all')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#0067b8] text-white font-semibold'
                    : 'text-[#605e5c] hover:bg-[#f3f2f1]'
                }`}
              >
                All Students ({totalUsers})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === 'active'
                    ? 'bg-[#107c10] text-white font-semibold'
                    : 'text-[#605e5c] hover:bg-[#f3f2f1]'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilter('disabled')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === 'disabled'
                    ? 'bg-[#d83b01] text-white font-semibold'
                    : 'text-[#605e5c] hover:bg-[#f3f2f1]'
                }`}
              >
                Disabled ({disabledCount})
              </button>
              <button
                onClick={() => setFilter('blocked')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === 'blocked'
                    ? 'bg-[#a80000] text-white font-semibold'
                    : 'text-[#605e5c] hover:bg-[#f3f2f1]'
                }`}
              >
                Blocked ({blockedCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-[#797775] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll number, or Gmail/email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
              />
            </div>
          </div>

          {/* Students Table with Explicit Gmail / Email Column */}
          <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf9f8] text-[#605e5c] border-b border-[#edebe9]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Student Name & Roll Number</th>
                    <th className="py-3 px-4 font-semibold">Gmail / College Email</th>
                    <th className="py-3 px-4 font-semibold">Dept & Phone</th>
                    <th className="py-3 px-4 font-semibold">Orders & Spent</th>
                    <th className="py-3 px-4 font-semibold">Account Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Access Controls (Enable / Disable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edebe9] text-[#242424]">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#797775]">
                        No registered student accounts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => {
                      const { orderCount, totalSpent } = getUserStats(account.rollNumber, account.email);
                      const isBlocked = account.status === 'blocked';
                      const isDisabled = account.status === 'disabled';
                      const isActive = account.status === 'active';

                      return (
                        <tr key={account.id} className="hover:bg-[#f3f2f1]/60 transition-colors">
                          {/* Name & Roll */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isBlocked
                                    ? 'bg-red-100 text-red-700'
                                    : isDisabled
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-[#e6f2fb] text-[#0067b8]'
                                }`}
                              >
                                {account.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-[#242424] flex items-center space-x-1.5">
                                  <span>{account.name}</span>
                                  {isBlocked && (
                                    <span className="text-[9px] bg-[#fde7e9] text-[#a80000] font-bold px-1.5 py-0.2 rounded border border-[#f19999]">
                                      BLOCKED
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono font-bold text-[#0067b8] text-[11px]">
                                  {account.rollNumber}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Explicit Gmail / College Email Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="p-1 rounded bg-[#f3f2f1] text-[#d83b01]">
                                <Mail className="w-3.5 h-3.5 text-[#0067b8]" />
                              </span>
                              <span className="font-medium text-[#242424] font-mono select-all">
                                {account.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(account.email)}
                                className="text-[#605e5c] hover:text-[#0067b8] p-1 rounded hover:bg-[#edebe9] transition-colors"
                                title="Copy Email"
                              >
                                {copiedEmail === account.email ? (
                                  <Check className="w-3.5 h-3.5 text-[#107c10]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Department & Phone */}
                          <td className="py-3 px-4">
                            <div className="text-[11px] text-[#242424]">
                              {account.department || 'Campus Student'}
                            </div>
                            {account.phone && (
                              <div className="text-[10px] text-[#605e5c] flex items-center space-x-1 mt-0.5">
                                <Phone className="w-3 h-3 text-[#797775]" />
                                <span>{account.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Orders & Spent */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#242424]">{orderCount} orders</div>
                            <div className="text-[10px] text-[#107c10] font-bold">₹{totalSpent}.00 spent</div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {isActive && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0]">
                                <UserCheck className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            )}
                            {isDisabled && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fff4ce] text-[#835c00] border border-[#f2c80f]">
                                <AlertTriangle className="w-3 h-3 text-[#d83b01]" />
                                <span>Disabled</span>
                              </span>
                            )}
                            {isBlocked && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fde7e9] text-[#a80000] border border-[#f19999]">
                                <Ban className="w-3 h-3" />
                                <span>Blocked</span>
                              </span>
                            )}
                          </td>

                          {/* Controls (Enable / Disable / Block / Delete) */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Toggle Enable / Disable */}
                              {isActive && (
                                <button
                                  onClick={() => handleStatusChange(account, 'disabled')}
                                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-[#835c00] border border-[#f2c80f] text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                  title="Disable student account (prevents login & orders)"
                                >
                                  Disable
                                </button>
                              )}
                              {isDisabled && (
                                <button
                                  onClick={() => handleStatusChange(account, 'active')}
                                  className="px-2.5 py-1 bg-[#107c10] hover:bg-[#0e690e] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                  title="Re-enable student account"
                                >
                                  Enable
                                </button>
                              )}

                              {/* Block / Unblock */}
                              {!isBlocked ? (
                                <button
                                  onClick={() => handleStatusChange(account, 'blocked')}
                                  className="px-2.5 py-1 bg-white hover:bg-red-50 text-[#a80000] border border-[#f19999] text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                  title="Permanently block student account"
                                >
                                  Block
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(account, 'active')}
                                  className="px-2.5 py-1 bg-[#107c10] hover:bg-[#0e690e] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                  title="Unblock and restore student account"
                                >
                                  Unblock
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteUser(account)}
                                className="p-1.5 text-[#a19f9d] hover:text-[#d83b01] hover:bg-[#fed9cc]/40 rounded-lg transition-colors"
                                title="Delete student account record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADMIN OPERATORS & ADD NEW ADMIN */}
      {/* ========================================================================= */}
      {activeSubTab === 'admins' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card: Add New Admin Account Form */}
          <div className="bg-white border-2 border-[#0067b8] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#edebe9]">
              <div className="w-8 h-8 rounded-lg bg-[#0067b8] text-white flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#242424]">Add New Admin / Xerox Operator</h2>
                <p className="text-[11px] text-[#605e5c]">
                  Create an authorized operator account with credentials to access the admin queue and management dashboard.
                </p>
              </div>
            </div>

            {adminFormError && (
              <div className="p-3 bg-[#fed9cc] text-[#d83b01] rounded-lg text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{adminFormError}</span>
              </div>
            )}

            {adminFormSuccess && (
              <div className="p-3 bg-[#dff6dd] text-[#107c10] rounded-lg text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adminFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-[#242424] mb-1">
                    Operator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Counter Operator 2"
                    className="w-full px-3 py-2 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block font-semibold text-[#242424] mb-1">
                    Admin Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    placeholder="e.g. operator2"
                    className="w-full px-3 py-2 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8] lowercase"
                  />
                </div>

                {/* Email / Gmail */}
                <div>
                  <label className="block font-semibold text-[#242424] mb-1">
                    Gmail / Email
                  </label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="e.g. operator2@college.edu"
                    className="w-full px-3 py-2 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-[#242424] mb-1">
                    Password * (min 4 chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Set admin password"
                    className="w-full px-3 py-2 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Admin Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table of Registered Admins */}
          <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f3f2f1] border-b border-[#e1dfdd] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#0067b8]" />
                <h3 className="text-sm font-semibold text-[#242424]">Authorized Admin Operators ({admins.length})</h3>
              </div>
              <span className="text-[11px] text-[#605e5c]">Authorized to access operator print portal</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf9f8] text-[#605e5c] border-b border-[#edebe9]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Admin Name & Username</th>
                    <th className="py-3 px-4 font-semibold">Gmail / Email</th>
                    <th className="py-3 px-4 font-semibold">Role & Permissions</th>
                    <th className="py-3 px-4 font-semibold">Added On</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edebe9] text-[#242424]">
                  {admins.map((adm) => {
                    const isSuper = adm.id === 'admin-01' || adm.username === 'admin';

                    return (
                      <tr key={adm.id} className="hover:bg-[#f3f2f1]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0067b8]/10 text-[#0067b8] flex items-center justify-center font-bold">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#242424]">{adm.name}</div>
                              <div className="font-mono text-[#0067b8] text-[11px]">@{adm.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 font-mono text-[#242424]">
                            <Mail className="w-3.5 h-3.5 text-[#797775]" />
                            <span>{adm.email}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {isSuper ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0067b8]/15 text-[#0067b8] border border-[#0067b8]/30">
                              Primary Administrator
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#107c10]/15 text-[#107c10] border border-[#107c10]/30">
                              Counter Operator
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[#605e5c] text-[11px]">
                          {adm.createdAt
                            ? new Date(adm.createdAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Permanent Admin'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isSuper ? (
                            <span className="text-[11px] text-[#797775] italic">Protected</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteAdmin(adm.id, adm.username)}
                              className="px-2.5 py-1 text-xs text-[#a80000] border border-[#f19999] hover:bg-red-50 rounded-lg transition-colors font-semibold"
                              title="Delete admin account"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
