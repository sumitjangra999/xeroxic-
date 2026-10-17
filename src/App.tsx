import { useState, useEffect } from 'react';
import { User, PrintJob } from './types';
import {
  getStoredUser,
  saveStoredUser,
  getStoredJobs,
  syncJobsFromSupabase,
  syncRegisteredUsersFromSupabase,
  DEMO_STUDENT,
} from './services/storage';
import { subscribeToLiveJobs } from './services/supabase';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { LoginPage } from './components/LoginPage';
import { UploadAssignment } from './components/UploadAssignment';
import { TrackPrinting } from './components/TrackPrinting';
import { RateCard } from './components/RateCard';
import { AdminQueue } from './components/AdminQueue';
import { AdminHistory } from './components/AdminHistory';
import { AdminUsers } from './components/AdminUsers';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [jobs, setJobs] = useState<PrintJob[]>(() => getStoredJobs());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const user = getStoredUser();
    if (user?.role === 'admin') return 'queue';
    return 'upload';
  });
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, showSignInModal]);

  // Supabase initial sync, live subscription, and background 5s poller
  useEffect(() => {
    const doSync = async () => {
      try {
        const latest = await syncJobsFromSupabase();
        if (latest && latest.length > 0) {
          setJobs(latest);
        }
        await syncRegisteredUsersFromSupabase();
      } catch (err) {
        console.warn('Sync error:', err);
      }
    };

    doSync();
    const interval = setInterval(doSync, 5000);

    const unsubscribe = subscribeToLiveJobs(async () => {
      await doSync();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Keep jobs and user in sync with localStorage and custom window events
  useEffect(() => {
    const handleJobsUpdated = (e: any) => {
      if (e.detail) {
        setJobs(e.detail);
      } else {
        setJobs(getStoredJobs());
      }
    };

    const handleUserUpdated = (e: any) => {
      if (e.detail !== undefined) {
        setCurrentUser(e.detail);
      }
    };

    window.addEventListener('xeroxic_jobs_updated', handleJobsUpdated);
    window.addEventListener('xeroxic_user_updated', handleUserUpdated);
    window.addEventListener('storage', handleJobsUpdated);

    return () => {
      window.removeEventListener('xeroxic_jobs_updated', handleJobsUpdated);
      window.removeEventListener('xeroxic_user_updated', handleUserUpdated);
      window.removeEventListener('storage', handleJobsUpdated);
    };
  }, []);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTabChange = (nextTab: string) => {
    let target = nextTab;
    if (currentUser?.role === 'admin' && (target === 'home' || target === 'upload')) {
      target = 'queue';
    }
    if (target === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(target);
      setIsTransitioning(false);
    }, 160);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveStoredUser(user);
    setShowSignInModal(false);
    if (user.role === 'admin') {
      setActiveTab('queue');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredUser(null);
    setActiveTab('home');
  };

  const handleRefreshJobs = async () => {
    const refreshed = await syncJobsFromSupabase();
    setJobs(refreshed);
  };

  const handleJobCreated = async (newJob: PrintJob) => {
    setJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
    handleTabChange('track');
    const refreshed = await syncJobsFromSupabase();
    setJobs(refreshed);
  };

  const handleOpenPortal = () => {
    handleTabChange('upload');
  };

  // Require user to sign in or create an account before accessing the app
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
      />
    );
  }

  if (showSignInModal) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onCancel={() => setShowSignInModal(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#242424] font-segoe flex flex-col justify-between">
      <div>
        <Navbar
          user={currentUser}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenSignIn={() => setShowSignInModal(true)}
          onLogout={handleLogout}
        />

        <main className="pb-12">
          {isTransitioning ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3.5 animate-fadeIn">
              <div className="w-9 h-9 border-[3px] border-[#0067b8]/20 border-t-[#0067b8] rounded-full animate-spin" />
              <div className="text-xs font-semibold text-[#605e5c] tracking-wide">
                Loading workspace...
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {activeTab === 'home' && currentUser?.role !== 'admin' && (
                <HomeView
                  onOpenPortal={handleOpenPortal}
                  onOpenRates={() => handleTabChange('rates')}
                  onOpenTracking={() => {
                    if (!currentUser) {
                      setCurrentUser(DEMO_STUDENT);
                      saveStoredUser(DEMO_STUDENT);
                    }
                    handleTabChange('track');
                  }}
                  onOpenSignIn={() => setShowSignInModal(true)}
                />
              )}

              {activeTab === 'upload' && (
                <UploadAssignment
                  user={currentUser || DEMO_STUDENT}
                  onJobCreated={handleJobCreated}
                />
              )}

              {activeTab === 'track' && (
                <TrackPrinting
                  user={currentUser || DEMO_STUDENT}
                  jobs={jobs}
                  onRefresh={handleRefreshJobs}
                  onNavigateToUpload={() => handleTabChange('upload')}
                />
              )}

              {activeTab === 'rates' && <RateCard />}

              {(activeTab === 'queue' || (currentUser?.role === 'admin' && activeTab === 'home')) && (
                <AdminQueue
                  user={currentUser || DEMO_STUDENT}
                  jobs={jobs}
                  onRefresh={handleRefreshJobs}
                  onNavigateToUsers={() => handleTabChange('users')}
                />
              )}

              {activeTab === 'users' && (
                <AdminUsers
                  user={currentUser || DEMO_STUDENT}
                  jobs={jobs}
                />
              )}

              {activeTab === 'history' && <AdminHistory jobs={jobs} />}
            </div>
          )}
        </main>
      </div>

      {/* Clean quiet footer */}
      <footer className="bg-white border-t border-[#e5e5e5] py-6 px-6 text-xs text-[#605e5c]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#242424]">Xeroxic</span>
            <span>•</span>
            <span className="uppercase">ait xerox shop</span>
          </div>

          <div className="flex items-center space-x-5">
            <span>Operating Hours: 8:30 AM – 4:00 PM (Mon–Sat)</span>
            {!currentUser && (
              <span
                onClick={() => setShowSignInModal(true)}
                className="text-[#0067b8] hover:underline cursor-pointer"
              >
                Sign In
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
