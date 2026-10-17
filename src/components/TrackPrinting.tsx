import React, { useState, useEffect, useRef } from 'react';
import { PrintJob, User } from '../types';
import { soundManager } from '../utils/audio';
import {
  Clock,
  Printer,
  CheckCircle2,
  PackageCheck,
  Search,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Bell,
  ExternalLink,
  Download,
  QrCode,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const BarcodeSVG: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => {
  const bars = React.useMemo(() => {
    const raw = `*${code.trim().toUpperCase()}*`;
    const patterns: Record<string, string> = {
      '0': '101001101', '1': '110100101', '2': '101100101', '3': '110110010',
      '4': '101011001', '5': '110101100', '6': '101101100', '7': '101001011',
      '8': '110100101', '9': '101100101',
      'A': '110101001', 'B': '101101001', 'C': '110110100', 'D': '101011001',
      'E': '110101100', 'F': '101101100', 'G': '101001101', 'H': '110100110',
      'I': '101100110', 'J': '101011010', 'K': '110101010', 'L': '101101010',
      'M': '110110101', 'N': '101011011', 'O': '110101101', 'P': '101101101',
      'Q': '101001011', 'R': '110100101', 'S': '101100101', 'T': '101011001',
      'U': '110010101', 'V': '100110101', 'W': '110011010', 'X': '100101101',
      'Y': '110010110', 'Z': '100110110', '*': '100101101'
    };

    const elements: { isBar: boolean; width: number }[] = [];
    for (const char of raw) {
      const bitStr = patterns[char] || patterns['*'];
      for (let i = 0; i < bitStr.length; i++) {
        const isBar = i % 2 === 0;
        const isWide = bitStr[i] === '1';
        elements.push({ isBar, width: isWide ? 2.6 : 1.2 });
      }
      elements.push({ isBar: false, width: 1.4 });
    }
    return elements;
  }, [code]);

  let currentX = 8;
  const rects: React.ReactNode[] = [];
  bars.forEach((b, idx) => {
    if (b.isBar) {
      rects.push(
        <rect
          key={idx}
          x={currentX}
          y={2}
          width={b.width}
          height={44}
          fill="#111827"
        />
      );
    }
    currentX += b.width;
  });

  const totalWidth = currentX + 8;

  return (
    <div className={`flex flex-col items-center select-all ${className}`}>
      <svg
        width={Math.min(totalWidth, 230)}
        height={48}
        viewBox={`0 0 ${totalWidth} 48`}
        className="h-10 w-auto max-w-full"
      >
        {rects}
      </svg>
      <div className="font-mono text-xs tracking-[0.28em] font-extrabold text-[#111827] mt-1 text-center">
        * {code.trim().toUpperCase()} *
      </div>
    </div>
  );
};

export const QRCodeSVG: React.FC<{ code: string }> = ({ code }) => {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200">
      <svg width="60" height="60" viewBox="0 0 68 68" className="w-14 h-14">
        <rect width="68" height="68" fill="#ffffff" />
        <rect x="4" y="4" width="20" height="20" fill="#111827" rx="3" />
        <rect x="7" y="7" width="14" height="14" fill="#ffffff" rx="2" />
        <rect x="10" y="10" width="8" height="8" fill="#111827" rx="1.5" />
        <rect x="44" y="4" width="20" height="20" fill="#111827" rx="3" />
        <rect x="47" y="7" width="14" height="14" fill="#ffffff" rx="2" />
        <rect x="50" y="10" width="8" height="8" fill="#111827" rx="1.5" />
        <rect x="4" y="44" width="20" height="20" fill="#111827" rx="3" />
        <rect x="7" y="47" width="14" height="14" fill="#ffffff" rx="2" />
        <rect x="10" y="50" width="8" height="8" fill="#111827" rx="1.5" />
        <rect x="28" y="8" width="4" height="4" fill="#111827" />
        <rect x="36" y="8" width="4" height="4" fill="#111827" />
        <rect x="28" y="16" width="4" height="4" fill="#111827" />
        <rect x="36" y="20" width="4" height="4" fill="#111827" />
        <rect x="8" y="28" width="4" height="4" fill="#111827" />
        <rect x="16" y="28" width="4" height="4" fill="#111827" />
        <rect x="24" y="28" width="4" height="4" fill="#111827" />
        <rect x="32" y="28" width="4" height="4" fill="#111827" />
        <rect x="40" y="28" width="4" height="4" fill="#111827" />
        <rect x="48" y="28" width="4" height="4" fill="#111827" />
        <rect x="56" y="28" width="4" height="4" fill="#111827" />
        <rect x="28" y="36" width="4" height="4" fill="#111827" />
        <rect x="36" y="36" width="4" height="4" fill="#111827" />
        <rect x="48" y="36" width="4" height="4" fill="#111827" />
        <rect x="28" y="44" width="4" height="4" fill="#111827" />
        <rect x="40" y="48" width="4" height="4" fill="#111827" />
        <rect x="52" y="48" width="4" height="4" fill="#111827" />
        <rect x="32" y="56" width="4" height="4" fill="#111827" />
        <rect x="44" y="56" width="4" height="4" fill="#111827" />
        <rect x="56" y="56" width="4" height="4" fill="#111827" />
      </svg>
      <span className="text-[9px] font-mono font-bold text-gray-700 mt-0.5">{code}</span>
    </div>
  );
};

interface TrackPrintingProps {
  user: User;
  jobs: PrintJob[];
  onRefresh: () => void;
  onNavigateToUpload: () => void;
}

export const TrackPrinting: React.FC<TrackPrintingProps> = ({
  user,
  jobs,
  onRefresh,
  onNavigateToUpload,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'ready' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readyAlertMsg, setReadyAlertMsg] = useState<string | null>(null);

  // Student should see their own jobs matching their ID, Roll number, or Email
  const studentJobs = jobs.filter((j) => {
    if (!user) return false;
    const userRoll = (user.studentId || '').trim().toLowerCase();
    const jobRoll = (j.studentRoll || '').trim().toLowerCase();
    const userId = (user.id || '').trim().toLowerCase();
    const jobStudentId = (j.studentId || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();

    return (
      (userRoll && jobRoll && userRoll === jobRoll) ||
      (userId && jobStudentId && userId === jobStudentId) ||
      (userRoll && jobStudentId && userRoll === jobStudentId) ||
      (userEmail && jobRoll && userEmail === jobRoll)
    );
  });

  // Sound chime when operator marks an order as ready
  const knownReadyRef = useRef<Set<string>>(
    new Set(studentJobs.filter((j) => j.status === 'ready').map((j) => j.id))
  );

  useEffect(() => {
    const currentReady = studentJobs.filter((j) => j.status === 'ready');
    const newlyReady = currentReady.filter((j) => !knownReadyRef.current.has(j.id));

    if (newlyReady.length > 0) {
      soundManager.playReadyChime();
      setReadyAlertMsg(
        `🎉 Great news! Your order ${newlyReady[0].id} (${newlyReady[0].fileName}) is printed and READY at ${newlyReady[0].pickupCounter}!`
      );
      setTimeout(() => setReadyAlertMsg(null), 10000);
    }

    knownReadyRef.current = new Set(currentReady.map((j) => j.id));
  }, [studentJobs]);

  const filteredJobs = studentJobs.filter((job) => {
    const matchesQuery =
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (filter === 'active') return job.status === 'submitted' || job.status === 'processing';
    if (filter === 'ready') return job.status === 'ready';
    if (filter === 'completed') return job.status === 'completed';
    return true;
  });

  const handleCopyToken = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: PrintJob['status']) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9]">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fff4ce] text-[#797673] border border-[#f2c80f]">
            <Printer className="w-3.5 h-3.5 text-[#0067b8] animate-pulse" />
            <span className="text-[#323130]">Printing in Progress</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0] shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f3f2f1] text-[#605e5c] border border-[#d2d0ce]">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Collected</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStepIndex = (status: PrintJob['status']) => {
    switch (status) {
      case 'submitted':
        return 1;
      case 'processing':
        return 2;
      case 'ready':
        return 3;
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Title & Live Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
            Track Print Status
          </h1>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Real-time status updates from the Central Xerox machine queue
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="text-xs bg-white hover:bg-[#f3f2f1] text-[#242424] border border-[#8a8886] px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0067b8]" />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={onNavigateToUpload}
            className="text-xs bg-[#0067b8] hover:bg-[#005da6] text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <span>+ New Print Order</span>
          </button>
        </div>
      </div>

      {/* Live Ready Alert Banner */}
      {readyAlertMsg && (
        <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-green-100 text-[#107c10] border-2 border-[#107c10] rounded-xl text-xs font-semibold flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-5 h-5 text-[#107c10] shrink-0" />
            <span className="text-sm">{readyAlertMsg}</span>
          </div>
          <button
            onClick={() => setReadyAlertMsg(null)}
            className="text-xs text-[#107c10] hover:underline font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Total Orders</div>
          <div className="text-2xl font-bold text-[#242424] mt-0.5">{studentJobs.length}</div>
        </div>
        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">In Queue</div>
          <div className="text-2xl font-bold text-[#0067b8] mt-0.5">
            {studentJobs.filter((j) => j.status === 'submitted').length}
          </div>
        </div>
        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Printing Now</div>
          <div className="text-2xl font-bold text-[#d83b01] mt-0.5">
            {studentJobs.filter((j) => j.status === 'processing').length}
          </div>
        </div>
        <div className="bg-white border border-[#e1dfdd] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Ready at Counter</div>
          <div className="text-2xl font-bold text-[#107c10] mt-0.5">
            {studentJobs.filter((j) => j.status === 'ready').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e1dfdd] p-3 rounded-xl mb-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex space-x-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0067b8] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            All Orders ({studentJobs.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-[#0067b8] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Active & Printing (
            {studentJobs.filter((j) => j.status === 'submitted' || j.status === 'processing').length}
            )
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'ready'
                ? 'bg-[#107c10] text-white font-semibold shadow-sm'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Ready for Pickup ({studentJobs.filter((j) => j.status === 'ready').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-[#0067b8] text-white font-semibold'
                : 'text-[#605e5c] hover:bg-[#f3f2f1]'
            }`}
          >
            Completed ({studentJobs.filter((j) => j.status === 'completed').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#797775] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID (e.g. A001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#8a8886] rounded-lg focus:outline-none focus:border-[#0067b8]"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-[#e1dfdd] rounded-xl p-12 text-center shadow-sm">
          <FileText className="w-10 h-10 text-[#a19f9d] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#242424]">No print jobs found</h3>
          <p className="text-xs text-[#605e5c] mt-1 mb-4">
            {searchQuery
              ? 'No print orders match your search query.'
              : 'You have not submitted any assignments in this category.'}
          </p>
          <button
            onClick={onNavigateToUpload}
            className="text-xs bg-[#0067b8] hover:bg-[#005da6] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Upload Assignment Now
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredJobs.map((job) => {
            const currentStep = getStepIndex(job.status);
            const isExpanded = expandedJobId === job.id;
            const isReady = job.status === 'ready';

            return (
              <div
                key={job.id}
                className={`bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                  isReady ? 'border-[#107c10] ring-2 ring-[#dff6dd]' : 'border-[#e1dfdd] hover:border-[#8a8886]'
                }`}
              >
                {/* Job Top Row Header */}
                <div className="p-4 sm:p-5 border-b border-[#edebe9]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[#f3f2f1] border border-[#e1dfdd] flex items-center justify-center text-[#0067b8] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-[#242424]">
                            {job.fileName}
                          </span>
                          {job.isUrgent && (
                            <span className="text-[10px] bg-[#fff4ce] text-[#d83b01] font-semibold px-2 py-0.5 rounded-full border border-[#f2c80f]">
                              Express
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#605e5c] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono font-bold text-[#0067b8]">{job.id}</span>
                          <span>•</span>
                          <span>{job.pageCount} pages × {job.copies} set(s)</span>
                          {job.pageRange && (
                            <>
                              <span>•</span>
                              <span className="text-[#0067b8] font-semibold">Pages: {job.pageRange}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="capitalize">{job.colorMode === 'color' ? 'Full Color' : 'B&W'}</span>
                          <span>•</span>
                          <span>{job.sides === 'double' ? 'Double Sided' : 'Single Sided'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 justify-between sm:justify-end">
                      {getStatusBadge(job.status)}
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#242424]">₹{job.cost}.00</div>
                        <div className="text-[11px] text-[#797775]">
                          {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DIGITAL COUNTER PICKUP PASS (When Ready) */}
                  {isReady && (
                    <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-[#107c10] rounded-xl shadow-sm text-[#242424]">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Pass Info */}
                        <div className="space-y-1.5 text-center md:text-left">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#107c10] text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>READY FOR COLLECTION</span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 flex items-center justify-center md:justify-start space-x-2">
                            <span>Counter Pickup Barcode Pass</span>
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </h4>
                          <p className="text-xs text-gray-600 max-w-md">
                            Show this barcode at <strong className="text-gray-900">{job.pickupCounter}</strong>. Operator will scan or enter your sequential Order ID <strong className="font-mono text-[#0067b8]">{job.id}</strong> to verify and hand over your printout.
                          </p>
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs text-gray-700">
                            <span className="bg-white/90 border border-gray-200 px-2 py-0.5 rounded-md font-medium">
                              Pages: <strong>{job.pageRange || `All (${job.pageCount})`}</strong>
                            </span>
                            <span className="bg-white/90 border border-gray-200 px-2 py-0.5 rounded-md font-medium">
                              Copies: <strong>{job.copies} set(s)</strong>
                            </span>
                            <span className="bg-white/90 border border-gray-200 px-2 py-0.5 rounded-md font-medium">
                              Paid: <strong>₹{job.cost}.00</strong>
                            </span>
                          </div>
                        </div>

                        {/* Scannable Barcode & QR Box */}
                        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm shrink-0">
                          <BarcodeSVG code={job.id} />
                          <div className="hidden sm:block border-l border-gray-200 pl-3">
                            <QRCodeSVG code={job.id} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4-Step Progress Tracker */}
                  <div className="mt-6 pt-4 border-t border-[#edebe9]">
                    <div className="relative">
                      {/* Connecting line */}
                      <div className="absolute top-3.5 left-4 right-4 h-1 bg-[#edebe9] -z-0">
                        <div
                          className="h-full bg-[#0067b8] transition-all duration-500"
                          style={{
                            width:
                              currentStep === 1
                                ? '15%'
                                : currentStep === 2
                                ? '50%'
                                : currentStep === 3
                                ? '85%'
                                : '100%',
                          }}
                        />
                      </div>

                      {/* 4 Steps */}
                      <div className="grid grid-cols-4 relative z-10 text-center">
                        {/* Step 1: Queued */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              currentStep >= 1
                                ? 'bg-[#0067b8] text-white ring-4 ring-[#e6f2fb]'
                                : 'bg-[#e1dfdd] text-[#797775]'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="text-[11px] font-semibold text-[#242424] mt-1.5">
                            Queued
                          </div>
                          <div className="text-[10px] text-[#605e5c] hidden sm:block">
                            In queue
                          </div>
                        </div>

                        {/* Step 2: Printing */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              currentStep >= 2
                                ? 'bg-[#0067b8] text-white ring-4 ring-[#e6f2fb]'
                                : 'bg-[#e1dfdd] text-[#797775]'
                            }`}
                          >
                            <Printer className="w-4 h-4" />
                          </div>
                          <div className="text-[11px] font-semibold text-[#242424] mt-1.5">
                            Printing
                          </div>
                          <div className="text-[10px] text-[#605e5c] hidden sm:block">
                            Printing pages
                          </div>
                        </div>

                        {/* Step 3: Ready */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              currentStep >= 3
                                ? 'bg-[#107c10] text-white ring-4 ring-[#dff6dd]'
                                : 'bg-[#e1dfdd] text-[#797775]'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="text-[11px] font-semibold text-[#242424] mt-1.5">
                            Ready for Pickup
                          </div>
                          <div className="text-[10px] text-[#605e5c] hidden sm:block">
                            At counter
                          </div>
                        </div>

                        {/* Step 4: Completed */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              currentStep >= 4
                                ? 'bg-[#323130] text-white ring-4 ring-[#edebe9]'
                                : 'bg-[#e1dfdd] text-[#797775]'
                            }`}
                          >
                            <PackageCheck className="w-4 h-4" />
                          </div>
                          <div className="text-[11px] font-semibold text-[#242424] mt-1.5">
                            Completed
                          </div>
                          <div className="text-[10px] text-[#605e5c] hidden sm:block">
                            Collected
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Bottom Info bar */}
                <div className="px-4 py-2.5 bg-[#faf9f8] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3 text-[#605e5c]">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0067b8]" />
                      <span className="font-medium text-[#242424]">{job.pickupCounter}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#107c10]" />
                      <span>ETA: <strong className="text-[#242424]">{job.estimatedPickupTime}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyToken(job.id)}
                      className="text-xs text-[#0067b8] hover:text-[#005da6] font-medium flex items-center space-x-1"
                    >
                      {copiedId === job.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#107c10]" />
                          <span className="text-[#107c10]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Order ID</span>
                        </>
                      )}
                    </button>
                    <span>|</span>
                    <button
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="text-xs text-[#605e5c] hover:text-[#242424] font-medium flex items-center space-x-1"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Specifications & Timeline'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white border-t border-[#edebe9] text-xs space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-[#f3f2f1] border border-[#e1dfdd] rounded-lg">
                        <span className="text-[#605e5c] block text-[11px]">Paper & Media</span>
                        <span className="font-semibold text-[#242424] capitalize">
                          {job.paperSize} ({job.paperType === 'photo' ? 'Photo Paper' : 'Plain Paper'})
                        </span>
                      </div>
                      <div className="p-3 bg-[#f3f2f1] border border-[#e1dfdd] rounded-lg">
                        <span className="text-[#605e5c] block text-[11px]">Payment Method</span>
                        <span className="font-semibold text-[#242424] capitalize">
                          {job.paymentMethod === 'upi' ? 'UPI Online' : 'Pay at Counter'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#f3f2f1] border border-[#e1dfdd] rounded-lg">
                        <span className="text-[#605e5c] block text-[11px]">Student Roll No.</span>
                        <span className="font-semibold text-[#242424]">{job.studentRoll}</span>
                      </div>
                      <div className="p-3 bg-[#f3f2f1] border border-[#e1dfdd] rounded-lg">
                        <span className="text-[#605e5c] block text-[11px]">File & Pages</span>
                        <span className="font-semibold text-[#242424]">{job.pageRange || `${job.pageCount} Pages`} (PDF)</span>
                      </div>
                    </div>

                    {job.instructions && (
                      <div className="p-3 bg-[#e6f2fb]/40 border border-[#cbe4f9] rounded-lg">
                        <span className="font-semibold text-[#0067b8] block mb-0.5">Your Instructions to Operator:</span>
                        <span className="text-[#323130]">{job.instructions}</span>
                      </div>
                    )}

                    {/* Timeline History */}
                    <div>
                      <div className="font-semibold text-[#242424] mb-2">Order Activity Log</div>
                      <div className="space-y-2 border-l-2 border-[#0067b8] pl-3 ml-1">
                        {job.statusHistory.map((h, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#242424] capitalize">{h.status}</span>
                              <span className="text-[11px] text-[#797775]">
                                {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            {h.note && <div className="text-[11px] text-[#605e5c]">{h.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
