import { useState, useEffect, useRef } from 'react';
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
import { soundManager } from './utils/audio';
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

  // Track known submitted job IDs to sound the bell when a new request arrives
  const knownSubmittedIdsRef = useRef<Set<string>>(
    new Set(jobs.filter((j) => j.status === 'submitted').map((j) => j.id))
  );

  useEffect(() => {
    const currentSubmitted = jobs.filter((j) => j.status === 'submitted');
    const newIncoming = currentSubmitted.filter(
      (j) => !knownSubmittedIdsRef.current.has(j.id)
    );

    if (newIncoming.length > 0 && currentUser?.role === 'admin') {
      soundManager.playNewOrderBell();
    }

    knownSubmittedIdsRef.current = new Set(currentSubmitted.map((j) => j.id));
  }, [jobs, currentUser]);

  // Supabase initial sync, live subscription, and fast 1.5s background poller for instant order alerts
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
    const interval = setInterval(doSync, 1500);

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

    const handleNewOrderPlaced = (e: any) => {
      if (currentUser?.role === 'admin') {
        soundManager.playNewOrderBell();
      }
    };

    window.addEventListener('xeroxic_jobs_updated', handleJobsUpdated);
    window.addEventListener('xeroxic_user_updated', handleUserUpdated);
    window.addEventListener('xeroxic_new_order_placed', handleNewOrderPlaced);
    window.addEventListener('storage', handleJobsUpdated);

    return () => {
      window.removeEventListener('xeroxic_jobs_updated', handleJobsUpdated);
      window.removeEventListener('xeroxic_user_updated', handleUserUpdated);
      window.removeEventListener('xeroxic_new_order_placed', handleNewOrderPlaced);
      window.removeEventListener('storage', handleJobsUpdated);
    };
  }, [currentUser]);

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
    }, 120);
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

  const handleJobCreated = (newJob: PrintJob) => {
    // 1. Immediately update React state with newJob
    setJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
    // 2. Instantly switch to track tab without delay
    setActiveTab('track');
    setIsTransitioning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 3. Sync from Supabase in background, preserving newJob
    syncJobsFromSupabase().then((refreshed) => {
      if (refreshed && refreshed.length > 0) {
        setJobs((prev) => {
          const ids = new Set(refreshed.map((j) => j.id));
          if (!ids.has(newJob.id)) {
            return [newJob, ...refreshed];
          }
          return refreshed;
        });
      }
    });
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
          <div
            className={`transition-all duration-200 ease-out ${
              isTransitioning
                ? 'opacity-20 scale-[0.99] pointer-events-none'
                : 'opacity-100 scale-100 animate-slideUp'
            }`}
          >
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

              {activeTab === 'rates' && <RateCard user={currentUser} />}

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
