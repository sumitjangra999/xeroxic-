import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  verifyStudentLogin,
  verifyAdminLogin,
  registerStudentAccount,
  getRememberedLogin,
  saveRememberedLogin,
  getRegisteredAccounts,
  getRegisteredAdmins,
  syncRegisteredUsersFromSupabase
} from '../services/storage';
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onCancel }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Sign In state
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupRoll, setSignupRoll] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('Computer Science & Engineering');

  // Load remembered credentials and sync users from Supabase on mount
  useEffect(() => {
    syncRegisteredUsersFromSupabase().catch(() => {});
    const remembered = getRememberedLogin();
    if (remembered && remembered.identifier) {
      setUsernameOrEmail(remembered.identifier);
      if (remembered.isAdmin) {
        setIsAdminMode(true);
      }
    }
  }, []);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const input = usernameOrEmail.trim();
    if (!input) {
      setErrorMessage(
        isAdminMode
          ? 'Please enter admin username or email.'
          : 'Please enter your roll number or college email.'
      );
      return;
    }

    if (isAdminMode) {
      const lower = input.toLowerCase();
      const admins = getRegisteredAdmins();
      const exists = admins.some(
        (a) =>
          a.username.toLowerCase() === lower ||
          a.email.toLowerCase() === lower
      );
      if (!exists) {
        setErrorMessage('No admin account found for this username or email.');
        return;
      }
      setStep('password');
      return;
    }

    // Student: Verify that the account actually exists in registered accounts!
    const accounts = getRegisteredAccounts();
    const cleanId = input.toLowerCase();
    const matched = accounts.find(
      (a) =>
        a.rollNumber.toLowerCase() === cleanId ||
        a.email.toLowerCase() === cleanId
    );

    if (!matched) {
      setErrorMessage(
        `No registered account found for "${input}". You must create an account in the "Sign Up" tab first.`
      );
      return;
    }

    if (matched.status === 'blocked') {
      setErrorMessage('⛔ Your account has been BLOCKED by the administrator. Please visit the Xerox counter.');
      return;
    }

    if (matched.status === 'disabled') {
      setErrorMessage('⚠️ Your account has been DISABLED by the administrator. Contact Xerox counter to reactivate.');
      return;
    }

    setStep('password');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (isAdminMode) {
      const res = verifyAdminLogin(usernameOrEmail, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Incorrect admin password.');
        return;
      }
      saveRememberedLogin(usernameOrEmail.trim(), true);
      if (res.user) onLogin(res.user);
    } else {
      const res = verifyStudentLogin(usernameOrEmail, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Incorrect password.');
        return;
      }
      saveRememberedLogin(usernameOrEmail.trim().toUpperCase(), false);
      if (res.user) onLogin(res.user);
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signupName.trim() || !signupRoll.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    const res = registerStudentAccount({
      name: signupName.trim(),
      rollNumber: signupRoll.trim(),
      email: signupEmail.trim(),
      phone: signupPhone.trim(),
      department: signupDepartment.trim(),
      password: signupPassword.trim(),
    });

    if (!res.success) {
      setErrorMessage(res.message || 'Could not register account.');
      return;
    }

    // Account created successfully! Save remembered roll number and log in directly
    saveRememberedLogin(signupRoll.trim().toUpperCase(), false);

    const newUser: User = {
      id: res.account!.id,
      name: res.account!.name,
      email: res.account!.email,
      role: 'student',
      studentId: res.account!.rollNumber,
      department: res.account!.department,
      phone: res.account!.phone,
      balance: 350,
    };

    onLogin(newUser);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col justify-center items-center py-10 px-4 font-segoe select-none">
      {/* Main Card */}
      <div className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#e5e7eb] p-8 sm:p-10 text-left my-auto">
        {/* Top-left back arrow inside the card */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back to Home"
            title="Back to Home"
            className="absolute top-5 left-5 p-2 text-[#605e5c] hover:text-[#242424] hover:bg-[#f3f4f6] rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header with Xeroxic Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center">
            <img
              src="/xeroxic-logo-cropped.png"
              alt="Xeroxic Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-semibold text-[#111827] tracking-tight mt-6">
            {isAdminMode
              ? 'Admin Login'
              : authMode === 'signup'
              ? 'Create Student Account'
              : 'Sign in to Xeroxic'}
          </h1>
          <p className="text-xs text-[#6b7280] mt-1">
            {isAdminMode
              ? 'Access Xerox operator print desk & live queue'
              : authMode === 'signup'
              ? 'Register once with your college roll number to upload assignments'
              : 'Enter your registered roll number or email'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Sign Up) */}
        {!isAdminMode && (
          <div className="flex border-b border-[#e5e7eb] mt-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setStep('username');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
                authMode === 'signin'
                  ? 'border-[#0062e0] text-[#0062e0]'
                  : 'border-transparent text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
                authMode === 'signup'
                  ? 'border-[#0062e0] text-[#0062e0]'
                  : 'border-transparent text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              Sign Up (Register First)
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mt-4 p-3 text-xs bg-[#fed9cc] text-[#d83b01] rounded-md font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 text-xs bg-[#dff6dd] text-[#107c10] rounded-md font-medium flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form: Sign In Flow */}
        {authMode === 'signin' || isAdminMode ? (
          step === 'username' ? (
            <form onSubmit={handleNext} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">
                  {isAdminMode ? 'Admin Username or Email' : 'Roll Number or College Email'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={
                    isAdminMode
                      ? 'admin'
                      : 'e.g. 2024CS1092 or student@college.edu'
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
                />
              </div>

              {/* Toggle Admin / Student login on the right */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#6b7280]">
                  {isAdminMode ? 'Operator Portal' : 'Student Access'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isAdminMode;
                    setIsAdminMode(nextMode);
                    setUsernameOrEmail('');
                    setStep('username');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-[#0062e0] hover:underline font-semibold"
                >
                  {isAdminMode ? '← Back to Student Login' : 'Admin Login →'}
                </button>
              </div>

              {/* Status and Sign Up switch */}
              <div className="p-2.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-md text-[11px] text-[#6b7280]">
                {isAdminMode ? (
                  <div className="flex items-center space-x-1.5 text-[#111827] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0062e0] shrink-0" />
                    <span>Authorized Xerox Operator Access Portal</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>
                      Demo Student: <strong className="text-[#111827]">2024CS1092</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setErrorMessage('');
                      }}
                      className="text-[#0062e0] hover:underline font-semibold"
                    >
                      New student? Sign Up
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#0062e0] hover:bg-[#0052be] active:bg-[#004299] text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#374151]">
                    Enter Password for <span className="font-semibold text-[#111827]">{usernameOrEmail}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('username');
                      setPassword('');
                      setErrorMessage('');
                    }}
                    className="text-xs text-[#0062e0] hover:underline"
                  >
                    Change ID
                  </button>
                </div>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#0062e0] hover:bg-[#0052be] text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign in as {isAdminMode ? 'Admin Operator' : 'Student'}</span>
              </button>
            </form>
          )
        ) : (
          /* Form: Sign Up Flow */
          <form onSubmit={handleSignUpSubmit} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="e.g. Sumit Jangra"
                className="w-full px-3.5 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  required
                  value={signupRoll}
                  onChange={(e) => setSignupRoll(e.target.value)}
                  placeholder="e.g. 250222"
                  className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                College Email *
              </label>
              <input
                type="email"
                required
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full px-3.5 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Department
              </label>
              <input
                type="text"
                value={signupDepartment}
                onChange={(e) => setSignupDepartment(e.target.value)}
                placeholder="Computer Science & Engineering"
                className="w-full px-3.5 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Create Password *
              </label>
              <input
                type="password"
                required
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Choose a password (min 4 characters)"
                className="w-full px-3.5 py-2 text-sm border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#0062e0] focus:ring-1 focus:ring-[#0062e0] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-3 bg-[#0062e0] hover:bg-[#0052be] active:bg-[#004299] text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Create Account & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-center space-x-6 text-xs text-[#6b7280] mt-8 pt-4 border-t border-[#f3f4f6]">
          <span className="hover:underline cursor-pointer">Help Desk</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Counter 1 & 2</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Central Library</span>
        </div>
      </div>

      <div className="text-xs text-[#605e5c] py-2 flex flex-col items-center space-y-1">
        <span className="font-semibold text-[#242424]">Xeroxic • ait xerox shop</span>
        <span>Operating: 8:30 AM – 4:00 PM (Mon–Sat)</span>
      </div>
    </div>
  );
};
