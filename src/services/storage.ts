import { PrintJob, User } from '../types';

export const DEMO_STUDENT: User = {
  id: 'usr-student-01',
  name: 'Rohan Sharma',
  email: 'student@college.edu',
  role: 'student',
  studentId: '250222',
  department: 'Computer Science & Engineering',
  phone: '+91 98765 43210',
  balance: 350,
};

export const DEMO_ADMIN: User = {
  id: 'usr-admin-01',
  name: 'AIT Xerox Shop',
  email: 'admin@college.edu',
  role: 'admin',
  department: 'AIT Xerox Counter',
  phone: '+91 98765 00001',
};

const STORAGE_KEY_ORDER_COUNTER = 'xeroxic_order_sequence_counter_v1';

export function getNextSequentialOrderId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDER_COUNTER);
    let count = raw ? parseInt(raw, 10) : 0;
    count += 1;
    localStorage.setItem(STORAGE_KEY_ORDER_COUNTER, count.toString());

    // 1 -> A001, 100 -> A100, 999 -> A999, 1000 -> B001, etc.
    const letterIdx = Math.floor((count - 1) / 999);
    const letter = String.fromCharCode(65 + (letterIdx % 26));
    const num = ((count - 1) % 999) + 1;
    const padded = num.toString().padStart(3, '0');
    return `${letter}${padded}`;
  } catch {
    return 'A001';
  }
}

export function generateOrderId(): string {
  return getNextSequentialOrderId();
}

const INITIAL_JOBS: PrintJob[] = [];

import {
  fetchJobsFromSupabase,
  insertJobToSupabase,
  updateJobStatusInSupabase,
  uploadAssignmentFile,
  deleteJobFromSupabase,
  deleteStorageFileFromSupabase,
} from './supabase';

const STORAGE_KEY_JOBS = 'xeroxic_jobs_v5';
const STORAGE_KEY_USER = 'xeroxic_active_user_v3';

export function getStoredJobs(): PrintJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JOBS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(INITIAL_JOBS));
      return INITIAL_JOBS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_JOBS;
  }
}

let liveSyncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    liveSyncChannel = new BroadcastChannel('xeroxic_live_sync');
    liveSyncChannel.onmessage = (event) => {
      if (event.data?.type === 'jobs_updated' && event.data.jobs) {
        window.dispatchEvent(new CustomEvent('xeroxic_jobs_updated', { detail: event.data.jobs }));
      }
      if (event.data?.type === 'new_job' && event.data.job) {
        window.dispatchEvent(new CustomEvent('xeroxic_new_order_placed', { detail: event.data.job }));
      }
    };
  }
} catch (e) {
  console.warn('BroadcastChannel error:', e);
}

export function broadcastJobsSync(jobs: PrintJob[], newJob?: PrintJob) {
  try {
    if (liveSyncChannel) {
      liveSyncChannel.postMessage({ type: 'jobs_updated', jobs });
      if (newJob) {
        liveSyncChannel.postMessage({ type: 'new_job', job: newJob });
      }
    }
  } catch {}
}

export function saveStoredJobs(jobs: PrintJob[], newJob?: PrintJob): void {
  try {
    localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent('xeroxic_jobs_updated', { detail: jobs }));
    if (newJob) {
      window.dispatchEvent(new CustomEvent('xeroxic_new_order_placed', { detail: newJob }));
    }
    broadcastJobsSync(jobs, newJob);
  } catch (e) {
    console.error('Error saving jobs to localStorage', e);
  }
}

const STORAGE_KEY_RECENT_SESSION_JOBS = 'xeroxic_recent_session_jobs_v1';

export function addRecentSessionJobId(jobId: string): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_RECENT_SESSION_JOBS);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(jobId)) {
      ids.unshift(jobId);
      sessionStorage.setItem(STORAGE_KEY_RECENT_SESSION_JOBS, JSON.stringify(ids.slice(0, 50)));
    }
  } catch {}
}

export function getRecentSessionJobIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_RECENT_SESSION_JOBS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function syncJobsFromSupabase(): Promise<PrintJob[]> {
  try {
    const remote = await fetchJobsFromSupabase();
    if (remote !== null) {
      // Merge with any recent local jobs that might not have committed to Supabase yet
      const local = getStoredJobs();
      const remoteIds = new Set(remote.map((j) => j.id));
      const recentLocalPending = local.filter((j) => {
        if (remoteIds.has(j.id)) return false;
        const ageMs = Date.now() - new Date(j.createdAt).getTime();
        return !isNaN(ageMs) && ageMs < 15 * 60 * 1000; // keep local jobs created in last 15 mins
      });
      const merged = [...recentLocalPending, ...remote];
      saveStoredJobs(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase sync skipped, using local cache:', err);
  }
  return getStoredJobs();
}

const STORAGE_KEY_REGISTERED_USERS = 'xeroxic_registered_accounts_v1';
const STORAGE_KEY_REMEMBERED_LOGIN = 'xeroxic_remembered_login_v1';
const SYSTEM_USERS_FILE = 'system_records/_xeroxic_registered_users.json';

import { supabase } from './supabase';

export interface RegisteredAccount {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  phone?: string;
  department?: string;
  password: string;
  status: 'active' | 'disabled' | 'blocked';
  createdAt: string;
}

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@college.edu',
  password: 'admin@123',
};

const DEFAULT_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'usr-student-01',
    name: 'Rohan Sharma',
    rollNumber: '2024CS1092',
    email: 'student@college.edu',
    phone: '+91 98765 43210',
    department: 'Computer Science & Engineering',
    password: 'student123',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-student-02',
    name: 'Sumit Jangra',
    rollNumber: '2024CS1001',
    email: 'sumit@college.edu',
    phone: '+91 98765 00000',
    department: 'Computer Science & Engineering',
    password: 'student123',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export function getRegisteredAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTERED_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    // Ensure all accounts have a status
    return parsed.map((a: any) => ({
      ...a,
      status: a.status || 'active',
    }));
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export async function syncRegisteredUsersFromSupabase(): Promise<RegisteredAccount[]> {
  try {
    const { data, error } = await supabase.storage.from('assignment').download(SYSTEM_USERS_FILE);
    if (!error && data) {
      const text = await data.text();
      const remoteUsers: RegisteredAccount[] = JSON.parse(text);
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        const local = getRegisteredAccounts();
        const mergedMap = new Map<string, RegisteredAccount>();
        local.forEach((u) => mergedMap.set(u.id, u));
        remoteUsers.forEach((u) => mergedMap.set(u.id, { ...u, status: u.status || 'active' }));
        const merged = Array.from(mergedMap.values());
        localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('xeroxic_users_updated', { detail: merged }));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not sync users from Supabase storage:', err);
  }
  return getRegisteredAccounts();
}

export async function uploadUsersToSupabase(accounts: RegisteredAccount[]): Promise<boolean> {
  try {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage
      .from('assignment')
      .upload(SYSTEM_USERS_FILE, blob, { upsert: true });
    if (error) {
      console.warn('Error uploading users to Supabase storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error saving users to Supabase storage:', err);
    return false;
  }
}

export function saveRegisteredAccounts(accounts: RegisteredAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent('xeroxic_users_updated', { detail: accounts }));
    uploadUsersToSupabase(accounts).catch((e) =>
      console.warn('Background user upload error:', e)
    );
  } catch (e) {
    console.error('Error saving registered accounts:', e);
  }
}

export function updateUserStatus(
  userId: string,
  newStatus: 'active' | 'disabled' | 'blocked'
): boolean {
  const accounts = getRegisteredAccounts();
  const updated = accounts.map((a) => (a.id === userId ? { ...a, status: newStatus } : a));
  saveRegisteredAccounts(updated);
  return true;
}

export function deleteUserAccount(userId: string): boolean {
  const accounts = getRegisteredAccounts();
  const updated = accounts.filter((a) => a.id !== userId);
  saveRegisteredAccounts(updated);
  return true;
}

export function registerStudentAccount(
  data: Omit<RegisteredAccount, 'id' | 'createdAt' | 'status'>
): { success: boolean; message?: string; account?: RegisteredAccount } {
  try {
    const accounts = getRegisteredAccounts();
    const cleanRoll = data.rollNumber.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check if roll or email already exists
    const duplicate = accounts.find(
      (a) =>
        a.rollNumber.toUpperCase() === cleanRoll ||
        a.email.toLowerCase() === cleanEmail
    );

    if (duplicate) {
      return {
        success: false,
        message: 'An account with this Roll Number or Email already exists. Please Sign In.',
      };
    }

    const newAccount: RegisteredAccount = {
      id: 'usr-student-' + Date.now(),
      name: data.name.trim(),
      rollNumber: cleanRoll,
      email: cleanEmail,
      phone: data.phone?.trim() || '+91 98765 43210',
      department: data.department?.trim() || 'Campus Student',
      password: data.password.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [newAccount, ...accounts];
    saveRegisteredAccounts(updated);
    return { success: true, account: newAccount };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error creating account.' };
  }
}

export function verifyStudentLogin(
  identifier: string,
  passwordInput: string
): { success: boolean; message?: string; user?: User } {
  const accounts = getRegisteredAccounts();
  const cleanId = identifier.trim().toLowerCase();

  const matched = accounts.find(
    (a) =>
      a.rollNumber.toLowerCase() === cleanId ||
      a.email.toLowerCase() === cleanId
  );

  if (!matched) {
    return {
      success: false,
      message: 'No registered student account found for this Roll Number or Email. Please Sign Up first.',
    };
  }

  // Enforce account status check
  if (matched.status === 'blocked') {
    return {
      success: false,
      message: '⛔ This account has been BLOCKED by the administrator. Please visit the Xerox counter.',
    };
  }

  if (matched.status === 'disabled') {
    return {
      success: false,
      message: '⚠️ This account has been DISABLED by the administrator. Contact Xerox counter to reactivate.',
    };
  }

  if (matched.password !== passwordInput.trim()) {
    return {
      success: false,
      message: 'Incorrect password. Please verify and try again.',
    };
  }

  const user: User = {
    id: matched.id,
    name: matched.name,
    email: matched.email,
    role: 'student',
    studentId: matched.rollNumber,
    department: matched.department,
    phone: matched.phone,
    balance: 350,
    status: matched.status || 'active',
  };

  return { success: true, user };
}

export interface AdminAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

const STORAGE_KEY_ADMIN_ACCOUNTS = 'xeroxic_admin_accounts_v1';

const DEFAULT_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-01',
    name: 'AIT Xerox Operator',
    username: 'admin',
    email: 'admin@college.edu',
    password: 'admin@123',
    createdAt: new Date().toISOString(),
  },
];

export function getRegisteredAdmins(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(DEFAULT_ADMIN_ACCOUNTS));
      return DEFAULT_ADMIN_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ADMIN_ACCOUNTS;
  } catch {
    return DEFAULT_ADMIN_ACCOUNTS;
  }
}

export function registerAdminAccount(data: {
  name: string;
  username: string;
  email?: string;
  password: string;
}): { success: boolean; message?: string; account?: AdminAccount } {
  try {
    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Admin username is required.' };
    }
    if (!data.password.trim() || data.password.trim().length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    const admins = getRegisteredAdmins();
    const cleanEmail = (data.email || `${cleanUsername}@college.edu`).trim().toLowerCase();

    if (admins.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: `Admin with username "${cleanUsername}" already exists.` };
    }

    const newAdmin: AdminAccount = {
      id: `admin-${Date.now()}`,
      name: data.name.trim() || cleanUsername,
      username: cleanUsername,
      email: cleanEmail,
      password: data.password.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...admins, newAdmin];
    localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('xeroxic_admins_updated', { detail: updated }));
    uploadAdminsToSupabase(updated).catch(() => {});
    return { success: true, account: newAdmin };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error creating admin account.' };
  }
}

const SYSTEM_ADMINS_FILE = 'system_records/_xeroxic_admin_accounts.json';

export async function uploadAdminsToSupabase(admins: AdminAccount[]): Promise<boolean> {
  try {
    const blob = new Blob([JSON.stringify(admins, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from('assignment').upload(SYSTEM_ADMINS_FILE, blob, { upsert: true });
    return !error;
  } catch {
    return false;
  }
}

export async function syncAdminsFromSupabase(): Promise<AdminAccount[]> {
  try {
    const { data, error } = await supabase.storage.from('assignment').download(SYSTEM_ADMINS_FILE);
    if (!error && data) {
      const text = await data.text();
      const remoteAdmins: AdminAccount[] = JSON.parse(text);
      if (Array.isArray(remoteAdmins) && remoteAdmins.length > 0) {
        const local = getRegisteredAdmins();
        const map = new Map<string, AdminAccount>();
        local.forEach((a) => map.set(a.id, a));
        remoteAdmins.forEach((a) => map.set(a.id, a));
        const merged = Array.from(map.values());
        localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('xeroxic_admins_updated', { detail: merged }));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not sync admins from Supabase:', err);
  }
  return getRegisteredAdmins();
}

export function deleteAdminAccount(adminId: string): boolean {
  if (adminId === 'admin-01') return false; // Protected superadmin
  const admins = getRegisteredAdmins();
  const updated = admins.filter((a) => a.id !== adminId);
  localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('xeroxic_admins_updated', { detail: updated }));
  uploadAdminsToSupabase(updated).catch(() => {});
  return true;
}

export function verifyAdminLogin(
  identifier: string,
  passwordInput: string
): { success: boolean; message?: string; user?: User } {
  const cleanId = identifier.trim().toLowerCase();
  const admins = getRegisteredAdmins();

  const matched = admins.find(
    (a) =>
      a.username.toLowerCase() === cleanId ||
      a.email.toLowerCase() === cleanId
  );

  if (!matched) {
    return {
      success: false,
      message: 'Invalid admin username or email.',
    };
  }

  if (passwordInput.trim() !== matched.password) {
    return {
      success: false,
      message: 'Incorrect admin password.',
    };
  }

  const user: User = {
    id: matched.id,
    name: matched.name,
    email: matched.email,
    role: 'admin',
    department: 'AIT Xerox Counter',
    phone: '+91 98765 00001',
  };

  return { success: true, user };
}

export function getRememberedLogin(): { identifier: string; isAdmin: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMEMBERED_LOGIN);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveRememberedLogin(identifier: string, isAdmin: boolean = false): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_REMEMBERED_LOGIN,
      JSON.stringify({ identifier, isAdmin })
    );
  } catch {}
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    window.dispatchEvent(new CustomEvent('xeroxic_user_updated', { detail: user }));
  } catch (e) {
    console.error('Error saving user to localStorage', e);
  }
}

export async function addPrintJobAsync(job: PrintJob, file?: File | null): Promise<boolean> {
  // 1. Immediately save to local storage & broadcast to other tabs (<2ms)
  const jobs = getStoredJobs();
  const updated = [job, ...jobs.filter((j) => j.id !== job.id)];
  saveStoredJobs(updated, job);
  addRecentSessionJobId(job.id);

  // 2. Instantly insert metadata to Supabase DB so admin receives order immediately
  insertJobToSupabase(job, job.fileUrl).catch((err) =>
    console.warn('Fast Supabase insert warning:', err)
  );

  // 3. Upload file asynchronously in the background WITHOUT delaying redirect to Track page
  if (file) {
    uploadAssignmentFile(file, job.id)
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          job.fileUrl = uploadedUrl;
          const currentJobs = getStoredJobs();
          const withFile = currentJobs.map((j) => (j.id === job.id ? { ...j, fileUrl: uploadedUrl } : j));
          saveStoredJobs(withFile);
          // Update file_url in Supabase
          supabase.from('print_jobs').update({ file_url: uploadedUrl }).eq('id', job.id).then();
        }
      })
      .catch((err) => {
        console.warn('Background file upload error:', err);
      });
  }

  return true;
}

export function addPrintJob(job: PrintJob, file?: File | null): void {
  addPrintJobAsync(job, file).catch((err) =>
    console.warn('addPrintJob background error:', err)
  );
}

export function updateJobStatus(jobId: string, newStatus: PrintJob['status'], note?: string): void {
  const jobs = getStoredJobs();
  const updated = jobs.map((j) => {
    if (j.id === jobId) {
      const now = new Date().toISOString();
      const updatedHistory = [
        ...j.statusHistory,
        { status: newStatus, timestamp: now, note },
      ];
      let estimated = j.estimatedPickupTime;
      if (newStatus === 'processing') estimated = 'Printing now (~10 mins)';
      if (newStatus === 'ready') estimated = 'Ready for pickup at counter';
      if (newStatus === 'completed') estimated = 'Delivered';
      if (newStatus === 'cancelled') estimated = 'Cancelled';

      return {
        ...j,
        status: newStatus,
        updatedAt: now,
        estimatedPickupTime: estimated,
        statusHistory: updatedHistory,
      };
    }
    return j;
  });
  saveStoredJobs(updated);

  // Sync status to Supabase in background (never auto-delete, so student tracking and completed history stay intact)
  updateJobStatusInSupabase(jobId, newStatus).catch((err) =>
    console.warn('Background Supabase update error:', err)
  );
}

// Manually delete a print job from local storage and Supabase database/storage
export function deletePrintJob(jobId: string): void {
  const jobs = getStoredJobs();
  const updated = jobs.filter((j) => j.id !== jobId);
  saveStoredJobs(updated);

  deleteJobFromSupabase(jobId).catch((err) =>
    console.warn('Background Supabase delete error:', err)
  );
}
