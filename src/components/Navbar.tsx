import React from 'react';
import { User } from '../types';
import { XeroxicLogo } from './XeroxicLogo';
import { LogOut, ArrowRight, UserCheck, Shield } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSignIn: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenSignIn,
  onLogout,
}) => {
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-white border-b border-[#e5e5e5] sticky top-0 z-40 select-none shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Top Banner */}
      <div className="bg-[#f8f9fa] border-b border-[#ededed] text-[#605e5c] text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-[#242424] tracking-wide uppercase">ait xerox shop</span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span>Operating: 8:30 AM – 4:00 PM (Mon–Sat)</span>
        </div>
      </div>

      {/* Main Microsoft-style Navigation Header matching Image 3 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Navigation Links */}
          <div className="flex items-center space-x-8">
            <div
              className="flex items-center space-x-2.5 cursor-pointer"
              onClick={() => onTabChange(isAdmin ? 'queue' : 'home')}
              title={isAdmin ? 'Xerox Operator Dashboard' : 'Home'}
            >
              <XeroxicLogo size="md" />
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex space-x-1">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => onTabChange('queue')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'queue'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Operator Counter Queue
                  </button>
                  <button
                    onClick={() => onTabChange('users')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'users'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Students & Admins
                  </button>
                  <button
                    onClick={() => onTabChange('rates')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'rates'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Edit Rates & Pricing
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onTabChange('home')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'home'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => onTabChange('upload')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'upload'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Print Portal
                  </button>
                  <button
                    onClick={() => onTabChange('rates')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'rates'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Rates & Pricing
                  </button>
                  <button
                    onClick={() => onTabChange('track')}
                    className={`px-3.5 py-5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'track'
                        ? 'border-[#0067b8] text-[#0067b8] font-semibold'
                        : 'border-transparent text-[#605e5c] hover:text-[#242424] hover:border-[#a19f9d]'
                    }`}
                  >
                    Track Orders
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Action */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 pl-2 border-l border-[#e1dfdd]">
                  <div className="w-8 h-8 rounded-full bg-[#0067b8] text-white flex items-center justify-center text-xs font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-[#242424] leading-tight flex items-center gap-1">
                      <span>{user.name}</span>
                      {isStudent ? (
                        <UserCheck className="w-3.5 h-3.5 text-[#0067b8]" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-[#323130]" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#605e5c] leading-tight">
                      {isStudent ? user.studentId : 'Operator'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 text-[#605e5c] hover:text-[#d83b01] hover:bg-[#fed9cc]/40 rounded-[4px] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenSignIn}
                  className="text-xs font-semibold text-[#242424] hover:text-[#0067b8] px-3 py-2 rounded transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => onTabChange('upload')}
                  className="bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold px-4 py-2 rounded-[4px] transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <span>Open Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="md:hidden flex overflow-x-auto border-t border-[#edebe9] px-4 py-2 space-x-2 bg-[#faf9f8]">
        {isAdmin ? (
          <>
            <button
              onClick={() => onTabChange('queue')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'queue' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Operator Queue
            </button>
            <button
              onClick={() => onTabChange('users')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'users' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Students & Admins ({activeTab === 'users' ? '●' : ''})
            </button>
            <button
              onClick={() => onTabChange('rates')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'rates' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Edit Rates
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onTabChange('home')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'home' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onTabChange('upload')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'upload' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Print Portal
            </button>
            <button
              onClick={() => onTabChange('rates')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'rates' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Rates
            </button>
            <button
              onClick={() => onTabChange('track')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'track' ? 'bg-[#0067b8] text-white shadow-sm' : 'text-[#605e5c]'
              }`}
            >
              Track Orders
            </button>
          </>
        )}
      </div>
    </header>
  );
};
