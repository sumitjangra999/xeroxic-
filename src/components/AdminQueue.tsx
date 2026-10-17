import React, { useState, useEffect, useRef } from 'react';
import { PrintJob, User } from '../types';
import { updateJobStatus, deletePrintJob, getRegisteredAdmins, registerAdminAccount, AdminAccount } from '../services/storage';
import { soundManager } from '../utils/audio';
import {
  Printer,
  CheckCircle2,
  Clock,
  PackageCheck,
  Search,
  Play,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  Trash2,
  ExternalLink,
  Eye,
  Download,
  Volume2,
  VolumeX,
  Bell,
  FileText,
  UserPlus,
  ShieldCheck,
  QrCode,
  Sparkles,
  Users
} from 'lucide-react';

interface AdminQueueProps {
  user: User;
  jobs: PrintJob[];
  onRefresh: () => void;
  onNavigateToUsers?: () => void;
}

export const AdminQueue: React.FC<AdminQueueProps> = ({ jobs, onRefresh, onNavigateToUsers }) => {
  const [filter, setFilter] = useState<'all' | 'submitted' | 'processing' | 'ready' | 'completed'>('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  // Quick Barcode / Instant Handover Scanner state
  const [scannerInput, setScannerInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Add Admin modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminRegisterError, setAdminRegisterError] = useState('');
  const [adminRegisterSuccess, setAdminRegisterSuccess] = useState('');
  const [adminsList, setAdminsList] = useState<AdminAccount[]>(() => getRegisteredAdmins());

  const handleRegisterNewAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminRegisterError('');
    setAdminRegisterSuccess('');

    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setAdminRegisterError('Please enter both Admin Username/ID and Password.');
      return;
    }

    const res = registerAdminAccount({
      name: newAdminName.trim() || newAdminUsername.trim(),
      username: newAdminUsername.trim(),
      email: newAdminEmail.trim(),
      password: newAdminPassword.trim(),
    });

    if (!res.success) {
      setAdminRegisterError(res.message || 'Could not register admin.');
      return;
    }

    const updated = getRegisteredAdmins();
    setAdminsList(updated);
    setAdminRegisterSuccess(`Admin account "${newAdminUsername.trim()}" created successfully!`);
    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminEmail('');
    setNewAdminPassword('');
  };

  // Track known submitted job IDs to sound the bell when a new request arrives
  const knownSubmittedIdsRef = useRef<Set<string>>(
    new Set(jobs.filter((j) => j.status === 'submitted').map((j) => j.id))
  );

  useEffect(() => {
    const currentSubmitted = jobs.filter((j) => j.status === 'submitted');
    const newIncoming = currentSubmitted.filter(
      (j) => !knownSubmittedIdsRef.current.has(j.id)
    );

    if (newIncoming.length > 0) {
      soundManager.playNewOrderBell();
      const first = newIncoming[0];
      setNewOrderAlert(
        `🛎️ New Print Order: ${first.fileName} (${first.id}) from ${first.studentName}`
      );
      setTimeout(() => setNewOrderAlert(null), 6000);
    }

    knownSubmittedIdsRef.current = new Set(currentSubmitted.map((j) => j.id));
  }, [jobs]);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundManager.setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      soundManager.playNewOrderBell();
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.studentRoll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    return job.status === filter;
  });

  const handleUpdateStatus = (jobId: string, newStatus: PrintJob['status'], note?: string) => {
    updateJobStatus(jobId, newStatus, note);
    onRefresh();

    let text = '';
    if (newStatus === 'processing') text = `Order ${jobId} status updated to Printing.`;
    if (newStatus === 'ready') text = `Order ${jobId} printed & ready for pickup at Counter.`;
    if (newStatus === 'completed') text = `Order ${jobId} completed & handed over to student.`;

    setActionSuccessMsg(text);
    setTimeout(() => setActionSuccessMsg(''), 3500);

    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (previewJob && previewJob.id === jobId) {
      setPreviewJob((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleOpenPreview = (job: PrintJob) => {
    if (job.status === 'submitted') {
      handleUpdateStatus(job.id, 'processing', 'Printing in progress (Operator opened preview)');
      setPreviewJob({ ...job, status: 'processing' });
    } else {
      setPreviewJob(job);
    }
  };

  const handleScanOrSubmitCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scannerInput.trim().toUpperCase();
    if (!code) return;

    const foundJob = jobs.find((j) => j.id.toUpperCase() === code);
    if (!foundJob) {
      setScanFeedback({ message: `❌ No order found matching "${code}"`, type: 'error' });
      setTimeout(() => setScanFeedback(null), 3500);
      return;
    }

    if (foundJob.status === 'ready') {
      handleUpdateStatus(foundJob.id, 'completed', 'Verified via Barcode Scan & Handed Over');
      soundManager.playReadyChime();
      setScanFeedback({
        message: `✅ Verified! Order ${foundJob.id} (${foundJob.studentName}) marked as Handed Over!`,
        type: 'success'
      });
      setScannerInput('');
    } else if (foundJob.status === 'submitted') {
      handleOpenPreview(foundJob);
      setScanFeedback({
        message: `ℹ️ Order ${foundJob.id} moved to Printing queue. Opened preview portal.`,
        type: 'info'
      });
      setScannerInput('');
    } else if (foundJob.status === 'processing') {
      setScanFeedback({
        message: `ℹ️ Order ${foundJob.id} is currently printing.`,
        type: 'info'
      });
      setScannerInput('');
    } else {
      setScanFeedback({
        message: `ℹ️ Order ${foundJob.id} is already marked as Delivered.`,
        type: 'info'
      });
      setScannerInput('');
    }
    setTimeout(() => setScanFeedback(null), 4000);
  };

  const handleDeleteJob = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Permanently delete order ${jobId} and its files from the database and storage?`)) {
      deletePrintJob(jobId);
      onRefresh();
      setActionSuccessMsg(`Order ${jobId} deleted from database and storage.`);
      setTimeout(() => setActionSuccessMsg(''), 3000);
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
      }
      if (previewJob && previewJob.id === jobId) {
        setPreviewJob(null);
      }
    }
  };

  // Direct In-Web Print Trigger
  const handleDirectWebPrint = () => {
    if (!previewJob) return;
    if (previewJob.status === 'submitted') {
      handleUpdateStatus(previewJob.id, 'processing', 'Printing in progress (Web print triggered)');
    }
    try {
      const iframe = document.getElementById('admin-preview-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, falling back to window.open:', e);
    }
    if (previewJob.fileUrl) {
      window.open(previewJob.fileUrl, '_blank');
    }
  };

  // KPI Calculations
  const submittedCount = jobs.filter((j) => j.status === 'submitted').length;
  const processingCount = jobs.filter((j) => j.status === 'processing').length;
  const readyCount = jobs.filter((j) => j.status === 'ready').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const totalRevenue = jobs.reduce((acc, j) => acc + j.cost, 0);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Operator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
              Xerox Operator Dashboard
            </h1>
            <span className="text-xs bg-[#107c10]/15 text-[#107c10] font-semibold px-2.5 py-0.5 rounded-full border border-[#107c10]/30">
              Shop Open
            </span>
          </div>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Incoming student print requests, in-web print portal, preview & counter queue
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Sound Notification Alert Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Order Bell Chimes' : 'Enable Order Bell Chimes'}
            className={`text-xs px-3 py-2 rounded-lg font-semibold flex items-center space-x-1.5 border transition-colors shadow-sm ${
              soundEnabled
                ? 'bg-white text-[#107c10] border-[#107c10]/40 hover:bg-[#dff6dd]/30'
                : 'bg-white text-[#a19f9d] border-[#8a8886] hover:bg-[#f3f2f1]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#107c10]" /> : <VolumeX className="w-3.5 h-3.5 text-[#a19f9d]" />}
            <span>Bell: {soundEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={() => soundManager.playNewOrderBell()}
            title="Test audio chime"
            className="text-xs bg-white hover:bg-[#f3f2f1] text-[#0067b8] border border-[#8a8886] px-3 py-2 rounded-lg font-medium"
          >
            Test Bell
          </button>

          {onNavigateToUsers && (
            <button
              onClick={onNavigateToUsers}
              className="text-xs bg-white hover:bg-[#f3f2f1] text-[#0067b8] border border-[#0067b8]/40 px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Manage registered students, view records, disable/block accounts"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Records</span>
            </button>
          )}

          <button
            onClick={() => {
              setAdminsList(getRegisteredAdmins());
              setShowAddAdminModal(true);
              setAdminRegisterError('');
              setAdminRegisterSuccess('');
            }}
            className="text-xs bg-white hover:bg-[#f3f2f1] text-[#0067b8] border border-[#0067b8]/40 px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Register a new counter operator / admin"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Admin</span>
          </button>

          <button
            onClick={onRefresh}
            className="text-xs bg-white hover:bg-[#f3f2f1] text-[#242424] border border-[#8a8886] px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0067b8]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Bell / New Incoming Request Alert Banner */}
      {newOrderAlert && (
        <div className="mb-4 p-4 bg-[#fff4ce] text-[#835c00] border-2 border-[#f2c80f] rounded-xl text-xs font-semibold flex items-center justify-between animate-bounce shadow-sm">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#d83b01]" />
            <span>{newOrderAlert}</span>
          </div>
          <span className="text-[11px] font-normal text-[#605e5c]">Click "Preview & Print" to start</span>
        </div>
      )}

      {/* Success Notification Bar */}
      {actionSuccessMsg && (
        <div className="mb-4 p-3 bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0] rounded-lg text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
          <span className="text-[11px] font-normal">Student tracking updated in real time</span>
        </div>
      )}

      {/* Operator KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Queued Orders</div>
          <div className="text-2xl font-bold text-[#0067b8] mt-0.5">{submittedCount}</div>
          <div className="text-[10px] text-[#797775]">Awaiting print</div>
        </div>

        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Printing Now</div>
          <div className="text-2xl font-bold text-[#d83b01] mt-0.5">{processingCount}</div>
          <div className="text-[10px] text-[#797775]">Being printed</div>
        </div>

        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Ready for Pickup</div>
          <div className="text-2xl font-bold text-[#107c10] mt-0.5">{readyCount}</div>
          <div className="text-[10px] text-[#797775]">At Counter</div>
        </div>

        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Delivered Today</div>
          <div className="text-2xl font-bold text-[#323130] mt-0.5">{completedCount}</div>
          <div className="text-[10px] text-[#797775]">Collected by students</div>
        </div>

        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Today's Revenue</div>
          <div className="text-2xl font-bold text-[#0067b8] mt-0.5">₹{totalRevenue}</div>
          <div className="text-[10px] text-[#797775]">Across {jobs.length} orders</div>
        </div>
      </div>

      {/* QUICK BARCODE SCANNER / INSTANT HANDOVER CARD */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200 p-4 rounded-xl mb-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0067b8] text-white flex items-center justify-center shrink-0 shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0067b8] uppercase tracking-wide">
                Quick Barcode Scanner & Handover
              </div>
              <p className="text-xs text-gray-600">
                Scan student's barcode pass or type sequential Order ID (e.g. <strong className="font-mono text-gray-900">A001</strong>) for instant verification
              </p>
            </div>
          </div>

          <form onSubmit={handleScanOrSubmitCode} className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Scan barcode or type A001..."
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              className="px-3 py-2 text-xs font-mono font-bold tracking-wider border border-[#8a8886] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067b8] bg-white w-full sm:w-64 uppercase shadow-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg shrink-0 shadow-sm transition-colors"
            >
              Verify / Handover
            </button>
          </form>
        </div>

        {scanFeedback && (
          <div
            className={`mt-2.5 p-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fadeIn ${
              scanFeedback.type === 'success'
                ? 'bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0]'
                : scanFeedback.type === 'error'
                ? 'bg-[#fde7e9] text-[#a80000] border border-[#f19999]'
                : 'bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9]'
            }`}
          >
            <span>{scanFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-[#e1dfdd] p-3 rounded-xl mb-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex space-x-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilter('submitted')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === 'submitted'
                ? 'bg-[#0067b8] text-white'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Queued ({submittedCount})
          </button>
          <button
            onClick={() => setFilter('processing')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'processing'
                ? 'bg-[#0067b8] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Printing ({processingCount})
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'ready'
                ? 'bg-[#107c10] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Ready ({readyCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-[#323130] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Delivered ({completedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0067b8] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            All ({jobs.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#797775] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Order ID (e.g. A001), Roll No, File..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf9f8] text-[#605e5c] border-b border-[#edebe9]">
              <tr>
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold">Document & Specs</th>
                <th className="py-3 px-4 font-semibold">Format & Paper</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions & Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9] text-[#242424]">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#797775]">
                    No print jobs match this filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#f3f2f1]/60 transition-colors">
                    {/* Token ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#0067b8]">
                      <div className="flex items-center space-x-1.5">
                        <span>{job.id}</span>
                        {job.isUrgent && (
                          <span className="text-[9px] bg-[#fff4ce] text-[#d83b01] font-bold px-1 py-0.5 rounded border border-[#f2c80f]">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#797775] font-sans font-normal mt-0.5">
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#242424]">{job.studentName}</div>
                      <div className="text-[11px] text-[#605e5c] font-mono">{job.studentRoll}</div>
                      <div className="text-[10px] text-[#797775] truncate max-w-[150px]">{job.department}</div>
                    </td>

                    {/* Document & Specs */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-[#242424] truncate max-w-[180px]" title={job.fileName}>
                          {job.fileName}
                        </span>
                        {/* Preview icon button */}
                        <button
                          onClick={() => handleOpenPreview(job)}
                          className="text-[#0067b8] hover:bg-[#e6f2fb] p-1 rounded transition-colors"
                          title="Open In-Web Document Preview & Print Portal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {job.fileUrl && (
                          <a
                            href={job.fileUrl}
                            download={job.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#605e5c] hover:text-[#0067b8] p-1 rounded transition-colors"
                            title="Download Document File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-[#605e5c] mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[#0067b8]">{job.pageCount} pgs</span>
                        <span>×</span>
                        <span className="font-semibold">{job.copies} copy</span>
                        {job.pageRange && (
                          <span className="text-[10px] bg-blue-50 text-[#0067b8] font-bold px-1.5 py-0.5 rounded-md border border-blue-200">
                            Pages: {job.pageRange}
                          </span>
                        )}
                        <span>•</span>
                        <span className="capitalize">{job.colorMode === 'color' ? 'Color' : 'B&W'}</span>
                        <span>•</span>
                        <span>{job.sides === 'double' ? 'Duplex' : 'Single'}</span>
                        {job.paperType === 'photo' && (
                          <span className="text-[10px] bg-[#e6f2fb] text-[#0067b8] font-bold px-1.5 py-0.5 rounded-md border border-[#cbe4f9]">
                            PHOTO PAPER
                          </span>
                        )}
                      </div>
                      {job.instructions && (
                        <div className="text-[10px] text-[#d83b01] font-medium mt-1 truncate max-w-[200px]" title={job.instructions}>
                          Note: {job.instructions}
                        </div>
                      )}
                    </td>

                    {/* Format & Paper */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-[#242424]">{job.paperSize} • {job.sides === 'double' ? 'Double Sided' : 'Single'}</span>
                      <div className="text-[11px] text-[#797775]">
                        {job.paperType === 'photo' ? 'Photo Paper' : 'Plain Paper'} ({job.orientation})
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#242424]">₹{job.cost}.00</div>
                      <div className="text-[10px] text-[#797775]">
                        {job.paymentMethod === 'razorpay' ? (
                          <span className="text-[#107c10] font-semibold flex items-center space-x-0.5">
                            <ShieldCheck className="w-3 h-3 text-[#107c10]" />
                            <span>Razorpay (Paid)</span>
                          </span>
                        ) : job.paymentMethod === 'upi' ? (
                          'UPI Online'
                        ) : (
                          'Pay at Counter'
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {job.status === 'submitted' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9]">
                          <Clock className="w-3 h-3" />
                          <span>Queued</span>
                        </span>
                      )}
                      {job.status === 'processing' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fff4ce] text-[#797673] border border-[#f2c80f]">
                          <Printer className="w-3 h-3 text-[#0067b8] animate-pulse" />
                          <span className="text-[#323130]">Printing</span>
                        </span>
                      )}
                      {job.status === 'ready' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready for Pickup</span>
                        </span>
                      )}
                      {job.status === 'completed' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f3f2f1] text-[#605e5c] border border-[#d2d0ce]">
                          <PackageCheck className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Direct Preview & Print Portal Button */}
                        <button
                          onClick={() => handleOpenPreview(job)}
                          className="bg-[#f3f2f1] hover:bg-[#edebe9] text-[#242424] border border-[#8a8886] px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center space-x-1 transition-colors shadow-sm"
                          title="Open Web Print Preview & Direct Print"
                        >
                          <Eye className="w-3 h-3 text-[#0067b8]" />
                          <span>Preview</span>
                        </button>

                        {job.status === 'submitted' && (
                          <button
                            onClick={() => {
                              if (job.fileUrl) {
                                window.open(job.fileUrl, '_blank');
                              }
                              handleUpdateStatus(job.id, 'processing', 'Printing in progress');
                            }}
                            className="bg-[#0067b8] hover:bg-[#005da6] text-white px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center space-x-1 transition-colors shadow-sm"
                            title="Start Printing & Open Merged PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Start Print</span>
                          </button>
                        )}

                        {job.status === 'processing' && (
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'ready', 'Printing complete. Kept at Counter.')}
                            className="bg-[#107c10] hover:bg-[#0e690e] text-white px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center space-x-1 transition-colors shadow-sm"
                            title="Mark Ready for Pickup"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Ready</span>
                          </button>
                        )}

                        {job.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'completed', 'Collected by student')}
                            className="bg-[#323130] hover:bg-[#201f1e] text-white px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center space-x-1 transition-colors shadow-sm"
                            title="Mark Handed Over"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteJob(job.id, e)}
                          className="p-1.5 text-[#a19f9d] hover:text-[#d83b01] hover:bg-[#fed9cc]/40 rounded-lg transition-colors"
                          title="Delete from Database & Storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedJob(job)}
                          className="p-1.5 text-[#605e5c] hover:text-[#0067b8] hover:bg-[#e6f2fb] rounded-lg transition-colors"
                          title="View Order Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IN-WEB DOCUMENT PREVIEW & PRINT PORTAL MODAL */}
      {previewJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white border border-[#e1dfdd] rounded-lg shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 bg-[#faf9f8] border-b border-[#edebe9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-[#0067b8] bg-[#e6f2fb] px-2 py-0.5 rounded">
                    {previewJob.id}
                  </span>
                  <span className="text-xs text-[#605e5c]">by {previewJob.studentName} ({previewJob.studentRoll})</span>
                </div>
                <h3 className="text-base font-semibold text-[#242424] truncate mt-1" title={previewJob.fileName}>
                  {previewJob.fileName}
                </h3>
              </div>

              {/* Action Buttons: Direct Print + Download */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDirectWebPrint}
                  className="bg-[#0067b8] hover:bg-[#005da6] active:bg-[#004e8c] text-white px-3.5 py-2 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                  title="Direct print from web without downloading"
                >
                  <Printer className="w-4 h-4" />
                  <span>Direct Web Print</span>
                </button>

                {previewJob.fileUrl && (
                  <a
                    href={previewJob.fileUrl}
                    download={previewJob.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-[#f3f2f1] text-[#242424] border border-[#8a8886] px-3 py-2 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                    title="Download document file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                )}

                <button
                  onClick={() => setPreviewJob(null)}
                  className="p-1.5 text-[#605e5c] hover:text-[#242424] hover:bg-[#edebe9] rounded"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Specifications Banner */}
            <div className="px-4 py-2.5 bg-[#f3f2f1] border-b border-[#edebe9] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-[#0067b8]">
                  {previewJob.pageRange ? `Selected Pages: ${previewJob.pageRange} (${previewJob.pageCount} pgs)` : `${previewJob.pageCount} Pages`}
                </span>
                <span>•</span>
                <span className="font-semibold">{previewJob.copies} Copy/Set</span>
                <span>•</span>
                <span className="capitalize font-medium">{previewJob.colorMode === 'color' ? 'Full Color' : 'Black & White'}</span>
                <span>•</span>
                <span className="capitalize">{previewJob.sides === 'double' ? 'Double Sided' : 'Single Sided'}</span>
                <span>•</span>
                <span>{previewJob.paperType === 'photo' ? 'Photo Paper' : 'Plain Paper'}</span>
                <span>•</span>
                <span>Size: {previewJob.paperSize}</span>
              </div>
              <div className="font-bold text-[#242424]">
                Total: ₹{previewJob.cost}.00 (
                {previewJob.paymentMethod === 'razorpay'
                  ? 'Paid via Razorpay'
                  : previewJob.paymentMethod === 'upi'
                  ? 'UPI'
                  : 'Pay at Counter'}
                )
              </div>
            </div>

            {previewJob.instructions && (
              <div className="px-4 py-2 bg-[#fff4ce] border-b border-[#f2c80f] text-xs text-[#835c00] flex items-center space-x-2">
                <span className="font-bold">Student Note:</span>
                <span>{previewJob.instructions}</span>
              </div>
            )}

            {/* Embedded Web Previewer */}
            <div className="flex-1 p-3 bg-[#e5e5e5] overflow-auto flex items-center justify-center min-h-[400px]">
              {previewJob.fileUrl ? (
                <iframe
                  id="admin-preview-iframe"
                  src={previewJob.fileUrl}
                  title={previewJob.fileName}
                  className="w-full h-full min-h-[500px] bg-white border border-[#c8c6c4] rounded-lg shadow"
                />
              ) : (
                <div className="p-8 bg-white border border-[#c8c6c4] rounded-xl text-center max-w-md space-y-3 shadow">
                  <FileText className="w-12 h-12 text-[#0067b8] mx-auto" />
                  <div className="font-semibold text-sm text-[#242424]">{previewJob.fileName}</div>
                  <p className="text-xs text-[#605e5c]">
                    Live browser preview is not available for this local simulated file. Use Direct Web Print or Download.
                  </p>
                  <button
                    onClick={handleDirectWebPrint}
                    className="px-4 py-2 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Send to Printer
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer with Status Transitions */}
            <div className="p-3 bg-white border-t border-[#edebe9] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[#605e5c]">Current Status:</span>
                <span className="font-semibold capitalize text-[#242424]">{previewJob.status}</span>
              </div>

              <div className="flex items-center space-x-2">
                {previewJob.status === 'submitted' && (
                  <button
                    onClick={() => handleUpdateStatus(previewJob.id, 'processing', 'Printing in progress')}
                    className="bg-[#0067b8] hover:bg-[#005da6] text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Printing</span>
                  </button>
                )}

                {previewJob.status === 'processing' && (
                  <button
                    onClick={() => handleUpdateStatus(previewJob.id, 'ready', 'Printing complete. Kept at Counter.')}
                    className="bg-[#107c10] hover:bg-[#0e690e] text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Mark Ready for Pickup</span>
                  </button>
                )}

                {previewJob.status === 'ready' && (
                  <button
                    onClick={() => handleUpdateStatus(previewJob.id, 'completed', 'Collected by student')}
                    className="bg-[#323130] hover:bg-[#201f1e] text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-1.5 shadow-sm"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Mark Handed Over</span>
                  </button>
                )}

                <button
                  onClick={() => setPreviewJob(null)}
                  className="px-4 py-2 border border-[#8a8886] hover:bg-[#f3f2f1] text-[#242424] font-semibold rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Job Inspection Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-2xl max-w-xl w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#edebe9]">
              <div>
                <span className="text-xs font-mono font-bold text-[#0067b8]">{selectedJob.id}</span>
                <h3 className="text-base font-semibold text-[#242424] mt-0.5">{selectedJob.fileName}</h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-[#605e5c] hover:text-[#242424] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Student info */}
              <div className="p-3 bg-[#f3f2f1] rounded-lg grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#605e5c] block">Student Name:</span>
                  <span className="font-semibold text-[#242424]">{selectedJob.studentName}</span>
                </div>
                <div>
                  <span className="text-[#605e5c] block">Roll Number:</span>
                  <span className="font-semibold text-[#242424]">{selectedJob.studentRoll}</span>
                </div>
                <div>
                  <span className="text-[#605e5c] block">Department:</span>
                  <span className="text-[#242424]">{selectedJob.department}</span>
                </div>
                <div>
                  <span className="text-[#605e5c] block">Phone:</span>
                  <span className="text-[#242424] font-mono">{selectedJob.studentPhone}</span>
                </div>
              </div>

              {/* Print specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Pages:</span>
                  <span className="font-semibold">{selectedJob.pageRange || `${selectedJob.pageCount} pages`}</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Copies:</span>
                  <span className="font-semibold">{selectedJob.copies} copy</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Color:</span>
                  <span className="font-semibold capitalize">{selectedJob.colorMode}</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Sides:</span>
                  <span className="font-semibold capitalize">{selectedJob.sides} sided</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Paper Size:</span>
                  <span className="font-semibold">{selectedJob.paperSize}</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg">
                  <span className="text-[#605e5c] block">Paper Type:</span>
                  <span className="font-semibold">{selectedJob.paperType === 'photo' ? 'Photo Paper (+₹15)' : 'Plain Paper'}</span>
                </div>
                <div className="p-2.5 border border-[#e1dfdd] rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[#605e5c] block">Payment:</span>
                  <span className="font-semibold">
                    {selectedJob.paymentMethod === 'razorpay'
                      ? `Razorpay Paid (ID: ${selectedJob.razorpayPaymentId || 'Verified'})`
                      : selectedJob.paymentMethod === 'upi'
                      ? 'UPI Online'
                      : 'Pay at Counter'}
                  </span>
                </div>
              </div>

              {selectedJob.fileUrl && (
                <div className="p-3 bg-[#e6f2fb]/50 border border-[#0067b8]/20 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[#0067b8] font-semibold block text-xs">Attached Student Document</span>
                    <span className="text-[11px] text-[#605e5c]">{selectedJob.fileName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        handleOpenPreview(selectedJob);
                        setSelectedJob(null);
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview & Print</span>
                    </button>
                    <a
                      href={selectedJob.fileUrl}
                      download={selectedJob.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-[#8a8886] hover:bg-[#f3f2f1] text-[#242424] text-xs font-semibold rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              )}

              {selectedJob.instructions && (
                <div className="p-3 bg-[#fff4ce]/60 border border-[#f2c80f] rounded-lg">
                  <span className="font-semibold text-[#d83b01] block mb-0.5">Note from Student:</span>
                  <p className="text-[#242424]">{selectedJob.instructions}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#edebe9]">
                <div>
                  <span className="text-[#605e5c] block text-[11px]">Total Amount:</span>
                  <span className="text-lg font-bold text-[#0067b8]">₹{selectedJob.cost}.00</span>
                </div>
                <div className="text-right">
                  <span className="text-[#605e5c] block text-[11px]">Pickup Counter:</span>
                  <span className="font-semibold text-[#242424]">{selectedJob.pickupCounter}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#edebe9] flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  handleOpenPreview(selectedJob);
                  setSelectedJob(null);
                }}
                className="bg-[#0067b8] hover:bg-[#005da6] text-white px-3.5 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open in Web Print Portal</span>
              </button>

              {selectedJob.status === 'submitted' && (
                <button
                  onClick={() => {
                    if (selectedJob.fileUrl) {
                      window.open(selectedJob.fileUrl, '_blank');
                    }
                    handleUpdateStatus(selectedJob.id, 'processing', 'Printing in progress');
                    setSelectedJob(null);
                  }}
                  className="bg-[#0067b8] hover:bg-[#005da6] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                  title="Start Printing & Open Merged PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Start Print & Open PDF</span>
                </button>
              )}
              {selectedJob.status === 'processing' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedJob.id, 'ready', 'Printing complete. Kept at Counter.');
                    setSelectedJob(null);
                  }}
                  className="bg-[#107c10] hover:bg-[#0e690e] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Mark Ready</span>
                </button>
              )}
              {selectedJob.status === 'ready' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedJob.id, 'completed', 'Collected by student');
                    setSelectedJob(null);
                  }}
                  className="bg-[#323130] hover:bg-[#201f1e] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Mark Handed Over</span>
                </button>
              )}
              <button
                onClick={() => setSelectedJob(null)}
                className="px-3.5 py-2 border border-[#8a8886] hover:bg-[#f3f2f1] text-[#242424] font-semibold text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#8a8886] shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="p-4 bg-[#faf9f8] border-b border-[#edebe9] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#e6f2fb] text-[#0067b8] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#242424]">Register New Admin / Operator</h3>
                  <p className="text-[11px] text-[#605e5c]">Create credentials for counter staff</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="text-[#605e5c] hover:text-[#242424] p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterNewAdmin} className="p-5 space-y-3.5 text-xs">
              {adminRegisterError && (
                <div className="p-2.5 bg-[#fde7e9] text-[#a80000] border border-[#f19999] rounded-lg">
                  {adminRegisterError}
                </div>
              )}
              {adminRegisterSuccess && (
                <div className="p-2.5 bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0] rounded-lg font-medium">
                  {adminRegisterSuccess}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#242424] mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar (Counter 2)"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#242424] mb-1">
                  Admin Login ID / Username <span className="text-[#d83b01]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin2 or operator_desk"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#242424] mb-1">
                  Admin Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. admin2@college.edu"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#242424] mb-1">
                  Password <span className="text-[#d83b01]">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter a secure password (min 4 characters)"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-3.5 py-2 border border-[#8a8886] hover:bg-[#f3f2f1] text-[#242424] font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0067b8] hover:bg-[#005da6] text-white px-4 py-2 font-semibold rounded-lg shadow-sm flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Admin Account</span>
                </button>
              </div>

              {/* Active Admins List */}
              <div className="mt-4 pt-3 border-t border-[#edebe9]">
                <div className="text-[11px] font-semibold text-[#605e5c] uppercase mb-2">
                  Active Registered Admins ({adminsList.length})
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {adminsList.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 bg-[#f3f2f1] rounded-lg flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-[#242424]">{a.name}</span>
                        <span className="text-[#605e5c] ml-2 font-mono">({a.username})</span>
                      </div>
                      <span className="text-[#107c10] font-semibold text-[10px] bg-[#dff6dd] px-2 py-0.5 rounded-full border border-[#a2e6a0]">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
