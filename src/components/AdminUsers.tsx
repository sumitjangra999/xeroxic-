import React, { useState, useEffect } from 'react';
import { User, PrintJob } from '../types';
import {
  getRegisteredAccounts,
  updateUserStatus,
  deleteUserAccount,
  syncRegisteredUsersFromSupabase,
  RegisteredAccount
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
  FileText,
  UserCheck,
  UserX,
  Lock,
  Unlock
} from 'lucide-react';

interface AdminUsersProps {
  user: User;
  jobs: PrintJob[];
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ user, jobs }) => {
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(() => getRegisteredAccounts());
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'warn' } | null>(null);

  const reloadAccounts = () => {
    setAccounts(getRegisteredAccounts());
  };

  useEffect(() => {
    const handleUpdated = (e: any) => {
      if (e.detail) {
        setAccounts(e.detail);
      } else {
        reloadAccounts();
      }
    };

    window.addEventListener('xeroxic_users_updated', handleUpdated);
    return () => window.removeEventListener('xeroxic_users_updated', handleUpdated);
  }, []);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncRegisteredUsersFromSupabase();
      setAccounts(synced);
      setActionFeedback({ message: 'User records synced with cloud database.', type: 'success' });
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
      newStatus === 'active' ? 'Re-enabled' : newStatus === 'disabled' ? 'Disabled' : 'Blocked';
    setActionFeedback({
      message: `Account for ${account.name} (${account.rollNumber}) marked as ${actionName}.`,
      type: newStatus === 'active' ? 'success' : 'warn',
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteUser = (account: RegisteredAccount) => {
    if (confirm(`Are you sure you want to delete the student record for ${account.name} (${account.rollNumber})? This will permanently remove their login credentials.`)) {
      deleteUserAccount(account.id);
      reloadAccounts();
      setActionFeedback({
        message: `Account for ${account.name} (${account.rollNumber}) deleted.`,
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
              Registered Student Accounts
            </h1>
            <span className="text-xs bg-[#0067b8]/15 text-[#0067b8] font-semibold px-2.5 py-0.5 rounded-full border border-[#0067b8]/30">
              Cloud Synced
            </span>
          </div>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Manage all registered students, control access permissions (Enable, Disable, Block), and monitor printing activity.
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
      <div className="bg-white border border-[#e1dfdd] p-3 rounded-xl mb-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
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
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#797775] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name, roll number, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf9f8] text-[#605e5c] border-b border-[#edebe9]">
              <tr>
                <th className="py-3 px-4 font-semibold">Student / Roll Number</th>
                <th className="py-3 px-4 font-semibold">Contact & Dept</th>
                <th className="py-3 px-4 font-semibold">Registered On</th>
                <th className="py-3 px-4 font-semibold">Print Orders</th>
                <th className="py-3 px-4 font-semibold">Total Spent</th>
                <th className="py-3 px-4 font-semibold">Account Status</th>
                <th className="py-3 px-4 font-semibold text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9] text-[#242424]">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#797775]">
                    No registered student accounts found.
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

                      {/* Contact & Department */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-[#242424] flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-[#797775]" />
                          <span>{account.email}</span>
                        </div>
                        {account.phone && (
                          <div className="text-[10px] text-[#605e5c] flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#797775]" />
                            <span>{account.phone}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-[#797775] truncate max-w-[160px] mt-0.5">
                          {account.department || 'Campus Student'}
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-[11px] text-[#605e5c]">
                        {account.createdAt
                          ? new Date(account.createdAt).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Original User'}
                      </td>

                      {/* Orders */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#242424]">{orderCount}</span>{' '}
                        <span className="text-[11px] text-[#797775]">orders</span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-4 font-bold text-[#242424]">₹{totalSpent}.00</td>

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

                      {/* Controls */}
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
  );
};
