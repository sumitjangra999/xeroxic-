import React, { useState } from 'react';
import { PrintJob, User } from '../types';
import { addPrintJobAsync, generateOrderId } from '../services/storage';
import { mergeFilesToPdf, MAX_PAGE_COUNT, MAX_TOTAL_SIZE_BYTES } from '../utils/pdfMerger';
import { openRazorpayCheckout } from '../services/razorpay';
import { soundManager } from '../utils/audio';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  Check,
  CreditCard,
  Clock,
  MapPin,
  AlertCircle,
  FileCheck,
  Info,
  FileText,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Banknote,
  ShieldCheck,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Sparkles,
  Shield
} from 'lucide-react';

interface UploadAssignmentProps {
  user: User;
  onJobCreated: (job: PrintJob) => void;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
}

export const UploadAssignment: React.FC<UploadAssignmentProps> = ({ user, onJobCreated }) => {
  // Navigation phase: 'upload' | 'configure' | 'payment'
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'payment'>('upload');

  // Multi-file state
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);
  const [mergedFile, setMergedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [totalDocPages, setTotalDocPages] = useState<number>(1);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Helper to parse page range (e.g. "1-4, 7, 9-11")
  const parsePageRangeList = (rangeStr: string, maxPages: number): number[] => {
    if (!rangeStr.trim()) return [];
    const pages = new Set<number>();
    const parts = rangeStr.split(/[,;\s]+/);

    for (const part of parts) {
      if (!part) continue;
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(maxPages, Math.max(start, end));
          for (let p = min; p <= max; p++) {
            pages.add(p);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
          pages.add(pageNum);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleRangeModeChange = (mode: 'all' | 'custom') => {
    setPageRangeMode(mode);
    if (mode === 'all') {
      setPageCount(totalDocPages);
    } else {
      const activeStr = customRange.trim() || `1-${totalDocPages}`;
      setCustomRange(activeStr);
      const parsed = parsePageRangeList(activeStr, totalDocPages);
      setPageCount(parsed.length > 0 ? parsed.length : 1);
    }
  };

  const handleCustomRangeInput = (val: string) => {
    setCustomRange(val);
    const parsed = parsePageRangeList(val, totalDocPages);
    if (parsed.length > 0) {
      setPageCount(parsed.length);
    }
  };

  const applyRangePreset = (preset: 'odd' | 'even' | 'first' | 'all') => {
    let str = '';
    if (preset === 'all') {
      str = `1-${totalDocPages}`;
    } else if (preset === 'first') {
      str = '1';
    } else if (preset === 'odd') {
      const odds: number[] = [];
      for (let i = 1; i <= totalDocPages; i += 2) odds.push(i);
      str = odds.join(', ');
    } else if (preset === 'even') {
      const evens: number[] = [];
      for (let i = 2; i <= totalDocPages; i += 2) evens.push(i);
      str = evens.join(', ');
    }
    setCustomRange(str);
    const parsed = parsePageRangeList(str, totalDocPages);
    setPageCount(parsed.length > 0 ? parsed.length : 1);
  };

  // Print configuration state (No binding options)
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState<number>(1);
  const [sides, setSides] = useState<'single' | 'double'>('double');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [paperType, setPaperType] = useState<'plain' | 'photo'>('plain');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isUrgent, setIsUrgent] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Payment method state - Razorpay is default
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'counter'>('razorpay');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successJob, setSuccessJob] = useState<PrintJob | null>(null);

  // Price calculations - strictly 0 until files are uploaded and merged!
  const hasFile = fileList.length > 0 && Boolean(mergedFile);
  const paperMultiplier = paperSize === 'A3' ? 2 : 1;
  // Physical sheets of paper used: 2 pages fit on 1 sheet front-and-back when double-sided
  const sheetsCount = hasFile ? (sides === 'double' ? Math.ceil(pageCount / 2) : pageCount) : 0;
  // Rate per copy:
  // - B&W: ₹2.00 per physical sheet (1 sheet holds 2 pages front & back for ₹2.00)
  // - Color: ₹10.00 per single-sided page, ₹9.00 per side for double-sided
  const printRatePerCopy = colorMode === 'color'
    ? (sides === 'double' ? pageCount * 9 : pageCount * 10) * paperMultiplier
    : (sides === 'double' ? Math.ceil(pageCount / 2) * 2 : pageCount * 2) * paperMultiplier;
  const pagesCost = hasFile ? printRatePerCopy * copies : 0;
  const photoPaperFee = hasFile && paperType === 'photo' ? 15 * copies : 0;
  const urgentFee = hasFile && isUrgent ? 10 : 0;
  const totalCost = hasFile ? pagesCost + photoPaperFee + urgentFee : 0;

  // Merge files pipeline using pdf-lib
  const triggerMerge = async (items: UploadedFileItem[]) => {
    if (items.length === 0) {
      setMergedFile(null);
      setFileName('');
      setFileSize('');
      setPageCount(1);
      setTotalDocPages(1);
      setMergeError(null);
      setIsMerging(false);
      return;
    }

    setIsMerging(true);
    setMergeError(null);

    try {
      const rawFiles = items.map((item) => item.file);
      const result = await mergeFilesToPdf(rawFiles);
      setMergedFile(result.mergedFile);
      setFileName(result.mergedFile.name);
      setFileSize(result.fileSizeFormatted);
      setTotalDocPages(result.pageCount);
      if (pageRangeMode === 'all') {
        setPageCount(result.pageCount);
      } else {
        const parsed = parsePageRangeList(customRange, result.pageCount);
        setPageCount(parsed.length > 0 ? parsed.length : result.pageCount);
      }
    } catch (err: any) {
      console.error('Merge error:', err);
      setMergeError(err.message || 'Failed to merge files into a PDF.');
    } finally {
      setIsMerging(false);
    }
  };

  // Add files to queue
  const processNewFiles = async (incoming: FileList | File[]) => {
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    const fileArray = Array.from(incoming);
    for (const f of fileArray) {
      const lower = f.name.toLowerCase();
      const isValid =
        validExtensions.some((ext) => lower.endsWith(ext)) ||
        f.type === 'application/pdf' ||
        f.type.startsWith('image/');
      if (isValid) {
        validFiles.push(f);
      } else {
        rejectedFiles.push(f.name);
      }
    }

    if (rejectedFiles.length > 0) {
      alert(`Only PDF, JPG, JPEG, and PNG files are supported.\nSkipped: ${rejectedFiles.join(', ')}`);
    }

    if (validFiles.length === 0) return;

    // Check size limit
    const existingBytes = fileList.reduce((acc, f) => acc + f.size, 0);
    const newBytes = validFiles.reduce((acc, f) => acc + f.size, 0);
    if (existingBytes + newBytes > MAX_TOTAL_SIZE_BYTES) {
      alert(`Total size of files cannot exceed 50 MB.`);
      return;
    }

    const newItems: UploadedFileItem[] = validFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    }));

    const updatedList = [...fileList, ...newItems];
    setFileList(updatedList);
    await triggerMerge(updatedList);
    setCurrentStep('configure');
  };

  // Reorder files
  const handleMoveFile = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fileList.length) return;

    const reordered = [...fileList];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    setFileList(reordered);
    await triggerMerge(reordered);
  };

  // Remove single file
  const handleRemoveFile = async (id: string) => {
    const updated = fileList.filter((item) => item.id !== id);
    setFileList(updated);
    if (updated.length === 0) {
      setMergedFile(null);
      setFileName('');
      setFileSize('');
      setPageCount(1);
      setMergeError(null);
      setCurrentStep('upload');
    } else {
      await triggerMerge(updated);
    }
  };

  // Clear all files
  const handleClearAll = () => {
    setFileList([]);
    setMergedFile(null);
    setFileName('');
    setFileSize('');
    setPageCount(1);
    setMergeError(null);
    setCurrentStep('upload');
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processNewFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processNewFiles(e.target.files);
      // Reset input value so same files can be re-selected if removed
      e.target.value = '';
    }
  };

  // Generate sample files (creates a valid sample PDF using pdf-lib)
  const handleUseSampleFile = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const sampleDoc = await PDFDocument.create();
      sampleDoc.addPage([595.28, 841.89]);
      const pdfBytes = await sampleDoc.save();
      const sample = new File([pdfBytes], 'Lab_Assignment_Unit_4.pdf', {
        type: 'application/pdf',
      });
      await processNewFiles([sample]);
    } catch (err) {
      console.error('Error generating sample document:', err);
    }
  };

  // Open merged PDF preview in a new browser tab
  const handlePreviewMergedPdf = () => {
    if (!mergedFile) return;
    const blobUrl = URL.createObjectURL(mergedFile);
    window.open(blobUrl, '_blank');
  };

  const handleProceedToPayment = () => {
    if (!mergedFile || fileList.length === 0) {
      alert('Please upload and merge at least one document or image first.');
      return;
    }
    if (mergeError) {
      alert(`Please fix merging errors before proceeding:\n${mergeError}`);
      return;
    }
    setPaymentError(null);
    setCurrentStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergedFile) return;

    setPaymentError(null);
    setIsSubmitting(true);

    const randomToken = generateOrderId();
    const now = new Date().toISOString();

    // 1. IF RAZORPAY: Launch Razorpay Standard Checkout Gateway
    if (paymentMethod === 'razorpay') {
      try {
        const paymentResponse = await openRazorpayCheckout({
          amountInRupees: totalCost,
          orderToken: randomToken,
          fileName: fileName || mergedFile.name,
          pageCount: pageCount,
          copies: copies,
          studentName: user.name,
          studentEmail: user.email,
          studentPhone: user.phone || '+91 98765 43210',
          studentRoll: user.studentId || '250222',
          department: user.department || 'Student',
        });

        // Payment succeeded! Play victory sound chime
        soundManager.playPaymentSuccessChime();

        const newJob: PrintJob = {
          id: randomToken,
          studentId: user.id,
          studentName: user.name,
          studentRoll: user.studentId || '250222',
          studentPhone: user.phone || '+91 98765 43210',
          department: user.department || 'Campus Student',
          fileName: fileName || mergedFile.name,
          fileSize: fileSize || '1.5 MB',
          fileType: 'application/pdf',
          pageCount: pageCount,
          pageRange: pageRangeMode === 'all' ? 'All Pages' : customRange.trim() || 'All Pages',
          copies: copies,
          colorMode: colorMode,
          paperSize: paperSize,
          paperType: paperType,
          orientation: orientation,
          sides: sides,
          binding: 'none',
          isUrgent: isUrgent,
          instructions: pageRangeMode === 'custom' && customRange.trim()
            ? `[Pages to print: ${customRange.trim()}] ${instructions.trim()}`
            : instructions.trim(),
          cost: totalCost,
          status: 'submitted',
          paymentMethod: 'razorpay',
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          paymentStatus: 'paid',
          createdAt: now,
          updatedAt: now,
          pickupCounter: 'AIT Xerox Shop',
          estimatedPickupTime: isUrgent ? '10-15 minutes' : '20-25 minutes',
          statusHistory: [
            {
              status: 'submitted',
              timestamp: now,
              note: `Paid & Verified via Razorpay Gateway (Txn ID: ${paymentResponse.razorpay_payment_id}). Queued at AIT Xerox Shop.`,
            },
          ],
        };

        // ONLY AFTER SUCCESSFUL PAYMENT: Send to admin queue & redirect immediately to Track page!
        try {
          await addPrintJobAsync(newJob, mergedFile);
        } catch (storageErr) {
          console.warn('Fast storage notice:', storageErr);
        }

        // Navigate immediately to Track Printing tab
        onJobCreated(newJob);

        // Reset upload form for future submissions
        setFileList([]);
        setMergedFile(null);
        setFileName('');
        setFileSize('');
        setPageCount(1);
        setCustomRange('');
        setCurrentStep('upload');
        setSuccessJob(null);
      } catch (err: any) {
        console.warn('Razorpay checkout error / closed:', err);
        if (err?.message === 'PAYMENT_DISMISSED') {
          setPaymentError('Payment window was closed. Your print request has NOT been submitted to the admin.');
        } else {
          setPaymentError(err?.message || 'Payment could not be completed.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. IF PAY AT COUNTER
    const newJob: PrintJob = {
      id: randomToken,
      studentId: user.id,
      studentName: user.name,
      studentRoll: user.studentId || '250222',
      studentPhone: user.phone || '+91 98765 43210',
      department: user.department || 'Campus Student',
      fileName: fileName || mergedFile.name,
      fileSize: fileSize || '1.5 MB',
      fileType: 'application/pdf',
      pageCount: pageCount,
      pageRange: pageRangeMode === 'all' ? 'All Pages' : customRange.trim() || 'All Pages',
      copies: copies,
      colorMode: colorMode,
      paperSize: paperSize,
      paperType: paperType,
      orientation: orientation,
      sides: sides,
      binding: 'none',
      isUrgent: isUrgent,
      instructions: pageRangeMode === 'custom' && customRange.trim()
        ? `[Pages to print: ${customRange.trim()}] ${instructions.trim()}`
        : instructions.trim(),
      cost: totalCost,
      status: 'submitted',
      paymentMethod: 'counter',
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      pickupCounter: 'AIT Xerox Shop',
      estimatedPickupTime: isUrgent ? '10-15 minutes' : '20-25 minutes',
      statusHistory: [
        {
          status: 'submitted',
          timestamp: now,
          note: 'Order placed online via Pay at Counter. Queued at AIT Xerox Shop.',
        },
      ],
    };

    try {
      await addPrintJobAsync(newJob, mergedFile);
    } catch (err) {
      console.error('Failed to submit print job:', err);
    } finally {
      onJobCreated(newJob);
      setFileList([]);
      setMergedFile(null);
      setFileName('');
      setFileSize('');
      setPageCount(1);
      setCustomRange('');
      setCurrentStep('upload');
      setSuccessJob(null);
      setIsSubmitting(false);
    }
  };

  // Visual Step Progress Bar
  const renderStepIndicator = () => (
    <div className="max-w-3xl mx-auto mb-8 px-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-[#e1dfdd] rounded-full z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#0067b8] rounded-full z-0 transition-all duration-500 ease-out"
          style={{
            width: currentStep === 'upload' ? '0%' : currentStep === 'configure' ? '50%' : '100%',
          }}
        />

        {/* Step 1 */}
        <div
          onClick={() => setCurrentStep('upload')}
          className={`relative z-10 flex flex-col items-center cursor-pointer transition-all duration-300 ${
            currentStep === 'upload' ? 'scale-105' : ''
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 ${
              fileList.length > 0 && currentStep !== 'upload'
                ? 'bg-[#107c10] text-white ring-2 ring-[#107c10]/20'
                : currentStep === 'upload'
                ? 'bg-[#0067b8] text-white ring-4 ring-[#0067b8]/20'
                : 'bg-white text-[#605e5c] border border-[#d2d0ce]'
            }`}
          >
            {fileList.length > 0 && currentStep !== 'upload' ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              '1'
            )}
          </div>
          <span
            className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              currentStep === 'upload' ? 'text-[#0067b8]' : 'text-[#605e5c]'
            }`}
          >
            1. Upload Documents
          </span>
        </div>

        {/* Step 2 */}
        <div
          onClick={() => {
            if (fileList.length > 0) setCurrentStep('configure');
          }}
          className={`relative z-10 flex flex-col items-center transition-all duration-300 ${
            fileList.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          } ${currentStep === 'configure' ? 'scale-105' : ''}`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 ${
              currentStep === 'payment'
                ? 'bg-[#107c10] text-white ring-2 ring-[#107c10]/20'
                : currentStep === 'configure'
                ? 'bg-[#0067b8] text-white ring-4 ring-[#0067b8]/20'
                : 'bg-white text-[#605e5c] border border-[#d2d0ce]'
            }`}
          >
            {currentStep === 'payment' ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              '2'
            )}
          </div>
          <span
            className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              currentStep === 'configure' ? 'text-[#0067b8]' : 'text-[#605e5c]'
            }`}
          >
            2. Configure Print
          </span>
        </div>

        {/* Step 3 */}
        <div
          onClick={() => {
            if (fileList.length > 0) handleProceedToPayment();
          }}
          className={`relative z-10 flex flex-col items-center transition-all duration-300 ${
            fileList.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          } ${currentStep === 'payment' ? 'scale-105' : ''}`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 ${
              currentStep === 'payment'
                ? 'bg-[#0067b8] text-white ring-4 ring-[#0067b8]/20'
                : 'bg-white text-[#605e5c] border border-[#d2d0ce]'
            }`}
          >
            3
          </div>
          <span
            className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              currentStep === 'payment' ? 'text-[#0067b8]' : 'text-[#605e5c]'
            }`}
          >
            3. Razorpay & Print
          </span>
        </div>
      </div>
    </div>
  );

  // SUCCESS / CONFIRMATION SCREEN
  if (successJob) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 animate-slideUp">
        <div className="bg-white border border-[#e1dfdd] rounded-xl p-8 shadow-sm text-left">
          <div className="flex items-center space-x-3.5 pb-5 border-b border-[#edebe9]">
            <div className="w-12 h-12 rounded-full bg-[#107c10]/15 text-[#107c10] flex items-center justify-center animate-scaleIn animate-pulseGreen">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-[#242424]">Print Request Received!</h2>
                {successJob.paymentMethod === 'razorpay' && (
                  <span className="text-[11px] bg-[#107c10]/15 text-[#107c10] font-bold px-2.5 py-0.5 rounded-full border border-[#107c10]/30 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Paid via Razorpay</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#605e5c] mt-0.5">
                Your single merged PDF has been sent to the AIT Xerox operator desk and queued for printing.
              </p>
            </div>
          </div>

          {/* Token ID Highlight */}
          <div className="my-6 p-5 bg-[#f3f2f1] border border-[#e1dfdd] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Your Token ID</div>
              <div className="text-2xl font-bold text-[#0067b8] mt-1 tracking-wider font-mono">
                {successJob.id}
              </div>
              <div className="text-[11px] text-[#797775] mt-0.5">Show this token at pickup counter</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Pickup Counter</div>
              <div className="text-base font-semibold text-[#242424] mt-1">
                {successJob.pickupCounter}
              </div>
              <div className="text-[11px] text-[#797775]">Library Ground Floor</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#605e5c] uppercase">Payment & Status</div>
              <div className="text-base font-semibold text-[#107c10] mt-1">
                ₹{successJob.cost}.00 {successJob.paymentMethod === 'razorpay' ? '(Paid)' : '(Pay at Counter)'}
              </div>
              {successJob.razorpayPaymentId && (
                <div className="text-[10px] text-[#605e5c] font-mono mt-0.5 truncate" title={successJob.razorpayPaymentId}>
                  Txn: {successJob.razorpayPaymentId}
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-3 text-xs text-[#323130] pb-6 border-b border-[#edebe9]">
            <div className="font-semibold text-sm text-[#242424]">Print Specifications</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#faf9f8] p-2.5 border border-[#e1dfdd] rounded-lg">
                <span className="text-[#605e5c] block text-[11px]">Merged PDF:</span>
                <span className="font-medium truncate block" title={successJob.fileName}>
                  {successJob.fileName}
                </span>
              </div>
              <div className="bg-[#faf9f8] p-2.5 border border-[#e1dfdd] rounded-lg">
                <span className="text-[#605e5c] block text-[11px]">Pages & Copies:</span>
                <span className="font-medium">
                  {successJob.pageCount} pgs × {successJob.copies} {successJob.copies > 1 ? 'copies' : 'copy'}
                </span>
              </div>
              <div className="bg-[#faf9f8] p-2.5 border border-[#e1dfdd] rounded-lg">
                <span className="text-[#605e5c] block text-[11px]">Color & Sides:</span>
                <span className="font-medium">
                  {successJob.colorMode === 'color' ? 'Full Color' : 'B&W'} ({successJob.sides === 'double' ? 'Duplex' : 'Single Sided'})
                </span>
              </div>
              <div className="bg-[#faf9f8] p-2.5 border border-[#e1dfdd] rounded-lg">
                <span className="text-[#605e5c] block text-[11px]">Paper Type:</span>
                <span className="font-medium">
                  {successJob.paperType === 'photo' ? 'Photo Paper' : 'Plain Paper'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccessJob(null);
                handleClearAll();
              }}
              className="w-full sm:w-auto px-4 py-2 border border-[#8a8886] hover:bg-[#f3f2f1] text-[#242424] text-xs font-semibold rounded-lg transition-colors"
            >
              Upload Another Assignment
            </button>
            <button
              type="button"
              onClick={() => onJobCreated(successJob)}
              className="w-full sm:w-auto px-5 py-2 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>Track Live Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: PAYMENT PAGE
  if (currentStep === 'payment') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 text-left animate-slideUp">
        {renderStepIndicator()}
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-[#605e5c] mb-4">
          <button
            onClick={() => setCurrentStep('configure')}
            className="flex items-center space-x-1 hover:text-[#0067b8]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Print Options</span>
          </button>
          <span>/</span>
          <span className="font-semibold text-[#242424]">Checkout & Payment</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
            Review Order & Payment
          </h1>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Complete payment or choose pay at counter to send your print request to the operator desk
          </p>
        </div>

        <form onSubmit={handleFinalOrderSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Payment Options (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-[#e1dfdd] rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-[#242424] pb-2 border-b border-[#edebe9]">
                  Select Payment Method
                </h2>

                {/* Option 1: Razorpay Instant Payment Gateway */}
                <div
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    paymentMethod === 'razorpay'
                      ? 'border-[#0067b8] bg-[#e6f2fb]/40 shadow-sm ring-2 ring-[#0067b8]/20'
                      : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-lg bg-[#0067b8] text-white flex items-center justify-center shadow-sm">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-[#242424]">
                            Razorpay Online Gateway
                          </span>
                          <span className="text-[10px] bg-[#107c10]/15 text-[#107c10] font-bold px-2 py-0.5 rounded-full border border-[#107c10]/30">
                            Recommended
                          </span>
                        </div>
                        <div className="text-xs text-[#605e5c] mt-0.5">
                          Instant UPI (GPay, PhonePe, Paytm), Debit/Credit Cards & Netbanking
                        </div>
                      </div>
                    </div>
                    {paymentMethod === 'razorpay' && (
                      <div className="w-5 h-5 rounded-full bg-[#0067b8] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {paymentMethod === 'razorpay' && (
                    <div className="mt-4 pt-4 border-t border-[#edebe9] space-y-3 animate-fadeIn">
                      <div className="bg-white p-3.5 border border-[#e1dfdd] rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#605e5c]">Amount to Pay:</span>
                          <span className="text-base font-bold text-[#0067b8]">₹{totalCost}.00</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#605e5c] pt-1 border-t border-[#f3f2f1]">
                          <span className="flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#107c10]" />
                            <span>Official Razorpay Standard Checkout</span>
                          </span>
                          <span className="font-mono text-[10px] text-[#797775]">Test Mode (rzp_test_Te...)</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#e6f2fb]/60 border border-[#0067b8]/20 rounded-lg text-xs text-[#0067b8] flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 shrink-0 text-[#0067b8]" />
                        <span>After successful payment in the Razorpay window, your print request is automatically verified and immediately sent to the Xerox counter.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 2: Pay at Counter */}
                <div
                  onClick={() => setPaymentMethod('counter')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    paymentMethod === 'counter'
                      ? 'border-[#0067b8] bg-[#e6f2fb]/40 shadow-sm ring-2 ring-[#0067b8]/20'
                      : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-md bg-[#107c10]/10 text-[#107c10] flex items-center justify-center">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#242424]">
                          Pay at Counter on Pickup
                        </div>
                        <div className="text-xs text-[#605e5c] mt-0.5">
                          Pay cash or scan counter QR when collecting printed sheets
                        </div>
                      </div>
                    </div>
                    {paymentMethod === 'counter' && (
                      <div className="w-5 h-5 rounded-full bg-[#0067b8] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {paymentMethod === 'counter' && (
                    <div className="mt-3 pt-3 border-t border-[#edebe9] text-xs text-[#605e5c] space-y-1 animate-fadeIn">
                      <p>
                        Your order will be queued at <strong>AIT Xerox Shop</strong> (Library Ground Floor).
                      </p>
                      <p className="text-[#107c10] font-medium">
                        Pay ₹{totalCost}.00 in cash or via UPI when handing your Token ID.
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Banner if user dismissed or payment failed */}
                {paymentError && (
                  <div className="p-3.5 bg-[#fde7e9] border border-[#a80000]/30 rounded-lg text-xs text-[#a80000] flex items-start space-x-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a80000]" />
                    <div>
                      <span className="font-semibold block">Payment Notice</span>
                      <span>{paymentError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Button (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-[#e1dfdd] rounded-lg p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#242424] pb-2 border-b border-[#edebe9]">
                  Order Summary
                </h3>

                {/* Document summary */}
                <div className="p-3 bg-[#faf9f8] border border-[#e1dfdd] rounded space-y-1.5 text-xs">
                  <div className="font-semibold text-[#242424] truncate" title={fileName}>
                    {fileName}
                  </div>
                  <div className="text-[#605e5c] flex items-center space-x-2">
                    <span>{fileList.length} source file(s)</span>
                    <span>•</span>
                    <span className="font-semibold text-[#0067b8]">{pageCount} total pages</span>
                    <span>•</span>
                    <span>{fileSize}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs py-2 border-b border-[#edebe9]">
                  <div className="flex justify-between text-[#605e5c]">
                    <div>
                      <span className="font-medium text-[#242424]">
                        Printing ({pageCount} {pageCount === 1 ? 'page' : 'pages'} • {sheetsCount} {sheetsCount === 1 ? 'sheet' : 'sheets'})
                      </span>
                      <span className="block text-[11px] text-[#605e5c]">
                        {sides === 'double' ? 'Double Sided (Front & Back)' : 'Single Sided'} • {copies} {copies > 1 ? 'copies' : 'copy'}
                      </span>
                    </div>
                    <span className="font-semibold text-[#242424]">₹{pagesCost}.00</span>
                  </div>

                  {photoPaperFee > 0 && (
                    <div className="flex justify-between text-[#605e5c]">
                      <span>Photo Paper Finish</span>
                      <span className="font-medium text-[#242424]">₹{photoPaperFee}.00</span>
                    </div>
                  )}

                  {urgentFee > 0 && (
                    <div className="flex justify-between text-[#605e5c]">
                      <span>Urgent Priority Fee</span>
                      <span className="font-medium text-[#242424]">+₹10.00</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-semibold text-[#242424]">Total Payable</span>
                  <span className="text-2xl font-bold text-[#0067b8]">₹{totalCost}.00</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-[#0067b8] hover:bg-[#005da6] active:bg-[#004e8c] text-white text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm disabled:bg-[#a19f9d]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay Secure Checkout...</span>
                      </>
                    ) : paymentMethod === 'razorpay' ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₹{totalCost}.00 via Razorpay</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Submit Request (Pay at Counter ₹{totalCost})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('configure')}
                    className="w-full mt-2 py-2 text-xs text-[#605e5c] hover:text-[#242424] hover:underline text-center"
                  >
                    Edit Print Options
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // STEP 1 & STEP 2: UPLOAD & CONFIGURE
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 text-left animate-slideUp">
      {renderStepIndicator()}
      {/* Title section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
          New Print Order
        </h1>
        <p className="text-xs text-[#605e5c] mt-0.5">
          Upload single or multiple files (PDFs, JPGs, PNGs). They will be automatically merged into one print-ready PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload Dropzone, File List & Print Options (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: MULTI-FILE UPLOADER & MERGER */}
          <div className="bg-white border border-[#e1dfdd] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#edebe9]">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#0067b8] text-white text-xs font-semibold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-semibold text-[#242424]">Document & File Upload</h2>
              </div>
              {fileList.length === 0 && (
                <button
                  type="button"
                  onClick={handleUseSampleFile}
                  className="text-xs text-[#0067b8] hover:underline font-medium"
                >
                  Load Sample Document
                </button>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#0067b8] bg-[#e6f2fb]/40'
                  : 'border-[#c8c6c4] hover:border-[#8a8886] bg-[#faf9f8]'
              }`}
            >
              <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-[#e6f2fb] text-[#0067b8] flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-[#242424]">
                {fileList.length === 0 ? 'Drag and drop your files here' : 'Drag and drop more files here'}
              </div>
              <p className="text-xs text-[#605e5c] mt-1 mb-3">
                Upload multiple <strong>PDF, JPG, JPEG, or PNG</strong> files (Max 50 MB total, up to 1,000 pages).
              </p>
              <label className="inline-flex items-center justify-center px-4 py-2 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>{fileList.length === 0 ? 'Select Files from Device' : 'Add More Files'}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Error Banner */}
            {mergeError && (
              <div className="p-3 bg-[#fdf3f2] border border-[#f1707a] rounded text-xs text-[#a80000] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">PDF Merging Error</span>
                  <span>{mergeError}</span>
                </div>
              </div>
            )}

            {/* Uploaded Files Queue (with Reordering & Delete) */}
            {fileList.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#242424]">
                    Queued Files ({fileList.length}) — Merged in this order:
                  </span>
                  <div className="flex items-center space-x-3">
                    <label className="text-[#0067b8] hover:underline font-semibold cursor-pointer flex items-center space-x-1">
                      <Plus className="w-3 h-3" />
                      <span>Add More</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[#d83b01] hover:underline font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {fileList.map((item, idx) => {
                    const isPdf = item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-[#f3f2f1] hover:bg-[#edebe9] border border-[#e1dfdd] rounded flex items-center justify-between transition-colors text-xs"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                          <span className="w-5 h-5 rounded bg-white text-[#605e5c] border border-[#c8c6c4] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="w-7 h-7 rounded bg-white border border-[#e1dfdd] text-[#0067b8] flex items-center justify-center shrink-0">
                            {isPdf ? <FileText className="w-4 h-4 text-[#d83b01]" /> : <ImageIcon className="w-4 h-4 text-[#0067b8]" />}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-[#242424] block truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[#797775]">
                              {item.sizeFormatted} • {isPdf ? 'PDF document' : 'Image (aspect ratio kept on page)'}
                            </span>
                          </div>
                        </div>

                        {/* Reorder and Delete Actions */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveFile(idx, 'up')}
                            disabled={idx === 0 || isMerging}
                            className="p-1 rounded hover:bg-white text-[#605e5c] disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFile(idx, 'down')}
                            disabled={idx === fileList.length - 1 || isMerging}
                            className="p-1 rounded hover:bg-white text-[#605e5c] disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item.id)}
                            disabled={isMerging}
                            className="p-1 rounded hover:bg-[#fdf3f2] text-[#a19f9d] hover:text-[#d83b01] ml-1 transition-colors"
                            title="Remove File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Merged PDF Status Bar */}
                <div className="pt-2">
                  {isMerging ? (
                    <div className="p-3 bg-[#e6f2fb] border border-[#0067b8]/30 rounded text-xs text-[#0067b8] flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Merging {fileList.length} files client-side with pdf-lib into single PDF...</span>
                    </div>
                  ) : mergedFile ? (
                    <div className="p-3 bg-[#dff6dd] border border-[#a2e6a0] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-[#107c10] shrink-0" />
                        <div>
                          <div className="font-semibold text-[#107c10] flex items-center space-x-1.5">
                            <span>Ready to Print: Single Merged PDF</span>
                            <span className="text-[11px] font-normal text-[#242424]">({fileSize})</span>
                          </div>
                          <div className="text-[11px] text-[#605e5c]">
                            Actual page count: <strong className="text-[#0067b8] font-bold">{pageCount} pages</strong> (Images fitted to A4 preserving aspect ratio)
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePreviewMergedPdf}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#f3f2f1] text-[#0067b8] border border-[#0067b8]/40 rounded font-semibold text-xs shadow-sm transition-colors"
                        title="Preview generated PDF in browser"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Preview Merged PDF</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PRINT SPECIFICATIONS (SHOWN AFTER FILES ADDED) */}
          {fileList.length > 0 && (
            <div className="bg-white border border-[#e1dfdd] rounded-lg p-5 shadow-sm space-y-5 animate-fadeIn">
              <div className="flex items-center space-x-2 pb-2 border-b border-[#edebe9]">
                <span className="w-5 h-5 rounded-full bg-[#0067b8] text-white text-xs font-semibold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-semibold text-[#242424]">Print Specifications</h2>
              </div>

              {/* Pages to Print Option (All Pages vs Custom Page Range) */}
              <div className="p-4 bg-[#faf9f8] border border-[#edebe9] rounded-xl space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#edebe9]">
                  <div className="flex items-center space-x-2 text-[#242424]">
                    <FileText className="w-4 h-4 text-[#0067b8]" />
                    <span className="font-semibold text-sm">Select Pages to Print</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#605e5c]">Total Document Pages:</span>
                    <span className="font-bold text-[#0067b8] px-2 py-0.5 bg-[#e6f2fb] rounded-md border border-[#cbe4f9]">
                      {totalDocPages} {totalDocPages === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                </div>

                {/* Range Toggle: All Pages vs Specific Pages */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRangeModeChange('all')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      pageRangeMode === 'all'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/60 text-[#0067b8] font-semibold ring-1 ring-[#0067b8]'
                        : 'border-[#edebe9] bg-white text-[#605e5c] hover:border-[#a19f9d]'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Print All Pages</span>
                      {pageRangeMode === 'all' && <Check className="w-3.5 h-3.5 text-[#0067b8]" />}
                    </div>
                    <div className="text-[11px] text-[#605e5c] mt-0.5">
                      Pages 1 to {totalDocPages} ({totalDocPages} pages)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRangeModeChange('custom')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      pageRangeMode === 'custom'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/60 text-[#0067b8] font-semibold ring-1 ring-[#0067b8]'
                        : 'border-[#edebe9] bg-white text-[#605e5c] hover:border-[#a19f9d]'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Specific Pages / Range</span>
                      {pageRangeMode === 'custom' && <Check className="w-3.5 h-3.5 text-[#0067b8]" />}
                    </div>
                    <div className="text-[11px] text-[#605e5c] mt-0.5">
                      e.g. 1-3, 5, 8 (Select custom)
                    </div>
                  </button>
                </div>

                {/* Custom Range Input & Presets */}
                {pageRangeMode === 'custom' ? (
                  <div className="pt-2 space-y-2 animate-fadeIn">
                    <label className="block text-[11px] font-semibold text-[#242424]">
                      Enter Page Numbers / Range (separated by commas or hyphens):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. 1-4, 7, 9-11"
                        value={customRange}
                        onChange={(e) => handleCustomRangeInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#8a8886] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0067b8] bg-white shadow-xs"
                      />
                      <div className="text-xs bg-[#e6f2fb] text-[#0067b8] px-3 py-2 rounded-lg font-bold border border-[#cbe4f9] whitespace-nowrap shadow-xs">
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'} to print
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-[#605e5c] mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyRangePreset('first')}
                        className="px-2.5 py-1 text-[11px] bg-white border border-[#c8c6c4] hover:border-[#0067b8] hover:text-[#0067b8] rounded-md transition-colors font-medium shadow-xs"
                      >
                        First Page Only
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRangePreset('odd')}
                        className="px-2.5 py-1 text-[11px] bg-white border border-[#c8c6c4] hover:border-[#0067b8] hover:text-[#0067b8] rounded-md transition-colors font-medium shadow-xs"
                      >
                        Odd Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRangePreset('even')}
                        className="px-2.5 py-1 text-[11px] bg-white border border-[#c8c6c4] hover:border-[#0067b8] hover:text-[#0067b8] rounded-md transition-colors font-medium shadow-xs"
                      >
                        Even Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRangePreset('all')}
                        className="px-2.5 py-1 text-[11px] bg-white border border-[#c8c6c4] hover:border-[#0067b8] hover:text-[#0067b8] rounded-md transition-colors font-medium shadow-xs"
                      >
                        All Pages
                      </button>
                    </div>

                    <div className="text-[11px] text-[#107c10] font-medium flex items-center space-x-1.5 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] shrink-0" />
                      <span>
                        Operator will print pages: <strong className="font-mono">{parsePageRangeList(customRange, totalDocPages).join(', ') || 'No valid pages'}</strong> ({pageCount} pages total)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#605e5c] flex items-center space-x-1.5 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] shrink-0" />
                    <span>Entire document will be printed ({totalDocPages} {totalDocPages === 1 ? 'page' : 'pages'})</span>
                  </div>
                )}
              </div>

              {/* Color Mode */}
              <div>
                <label className="block text-xs font-semibold text-[#242424] mb-2">
                  Color Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setColorMode('bw')}
                    className={`p-3 rounded-md border-2 cursor-pointer transition-all flex items-start justify-between ${
                      colorMode === 'bw'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/40'
                        : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#242424]">Black & White</div>
                      <div className="text-[11px] text-[#605e5c] mt-0.5">Assignments, notes & reports</div>
                      <div className="text-xs font-bold text-[#0067b8] mt-1">₹2.00 / page</div>
                    </div>
                    {colorMode === 'bw' && <Check className="w-4 h-4 text-[#0067b8]" />}
                  </div>

                  <div
                    onClick={() => setColorMode('color')}
                    className={`p-3 rounded-md border-2 cursor-pointer transition-all flex items-start justify-between ${
                      colorMode === 'color'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/40'
                        : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#242424]">Color Print</div>
                      <div className="text-[11px] text-[#605e5c] mt-0.5">Charts, diagrams & cover pages</div>
                      <div className="text-xs font-bold text-[#0067b8] mt-1">₹10.00 / page</div>
                    </div>
                    {colorMode === 'color' && <Check className="w-4 h-4 text-[#0067b8]" />}
                  </div>
                </div>
              </div>

              {/* Sides and Copies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Print Sides */}
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-2">
                    Print Sides
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSides('double')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        sides === 'double'
                          ? 'border-[#0067b8] bg-[#e6f2fb]/60 text-[#0067b8] ring-1 ring-[#0067b8]'
                          : 'border-[#edebe9] hover:border-[#a19f9d] bg-white text-[#242424]'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>Double Sided</span>
                        {sides === 'double' && <Check className="w-3.5 h-3.5 text-[#0067b8]" />}
                      </div>
                      <div className="text-[11px] text-[#107c10] font-semibold mt-0.5">
                        Front & Back (₹2 / sheet)
                      </div>
                      <div className="text-[10px] text-[#605e5c]">
                        2 pages fit on 1 sheet for ₹2
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSides('single')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        sides === 'single'
                          ? 'border-[#0067b8] bg-[#e6f2fb]/60 text-[#0067b8] ring-1 ring-[#0067b8]'
                          : 'border-[#edebe9] hover:border-[#a19f9d] bg-white text-[#242424]'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>Single Sided</span>
                        {sides === 'single' && <Check className="w-3.5 h-3.5 text-[#0067b8]" />}
                      </div>
                      <div className="text-[11px] text-[#0067b8] font-semibold mt-0.5">
                        Front Only (₹2 / page)
                      </div>
                      <div className="text-[10px] text-[#605e5c]">
                        1 page per separate sheet
                      </div>
                    </button>
                  </div>
                </div>

                {/* Copies Stepper */}
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-2">
                    Number of Copies
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="w-9 h-9 border border-[#8a8886] rounded bg-[#f3f2f1] hover:bg-[#edebe9] text-[#242424] font-bold text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-9 border border-[#8a8886] rounded text-center text-sm font-semibold focus:outline-none focus:border-[#0067b8]"
                    />
                    <button
                      type="button"
                      onClick={() => setCopies(copies + 1)}
                      className="w-9 h-9 border border-[#8a8886] rounded bg-[#f3f2f1] hover:bg-[#edebe9] text-[#242424] font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-xs text-[#605e5c] pl-1 font-medium">set(s)</span>
                  </div>
                </div>
              </div>

              {/* Paper Type: Plain vs Photo Paper (+15 rs) */}
              <div>
                <label className="block text-xs font-semibold text-[#242424] mb-2">
                  Paper Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaperType('plain')}
                    className={`p-3 rounded-md border-2 cursor-pointer transition-all flex items-start justify-between ${
                      paperType === 'plain'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/40'
                        : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#242424]">Plain Paper</div>
                      <div className="text-[11px] text-[#605e5c] mt-0.5">Standard 75 GSM paper</div>
                      <div className="text-xs font-bold text-[#107c10] mt-1">Included (Standard)</div>
                    </div>
                    {paperType === 'plain' && <Check className="w-4 h-4 text-[#0067b8]" />}
                  </div>

                  <div
                    onClick={() => setPaperType('photo')}
                    className={`p-3 rounded-md border-2 cursor-pointer transition-all flex items-start justify-between ${
                      paperType === 'photo'
                        ? 'border-[#0067b8] bg-[#e6f2fb]/40'
                        : 'border-[#edebe9] hover:border-[#a19f9d] bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#242424]">Photo Paper</div>
                      <div className="text-[11px] text-[#605e5c] mt-0.5">Glossy high-resolution finish</div>
                      <div className="text-xs font-bold text-[#0067b8] mt-1">+₹15.00 / copy</div>
                    </div>
                    {paperType === 'photo' && <Check className="w-4 h-4 text-[#0067b8]" />}
                  </div>
                </div>
              </div>

              {/* Paper Size & Orientation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1.5">
                    Paper Size
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full py-2 px-3 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0067b8] bg-white"
                  >
                    <option value="A4">A4 (Standard Campus Paper)</option>
                    <option value="A3">A3 (Large Sheet - 2x Rate)</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1.5">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full py-2 px-3 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0067b8] bg-white"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              {/* Urgent Priority Checkbox */}
              <div className="p-3 bg-[#fff4ce]/50 border border-[#f2c80f] rounded-md flex items-center justify-between">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded border-[#8a8886] text-[#0067b8] focus:ring-[#0067b8] mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#242424]">Urgent Priority Order (+₹10)</div>
                    <div className="text-[11px] text-[#605e5c]">Priority counter queue (ready in 10-15 minutes)</div>
                  </div>
                </label>
              </div>

              {/* Note for Operator */}
              <div>
                <label className="block text-xs font-semibold text-[#242424] mb-1">
                  Note for Operator (Optional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  placeholder="e.g. Please staple top left corner, or first page in color"
                  className="w-full p-2.5 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0067b8]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Estimate & Action (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#e1dfdd] rounded-lg p-5 shadow-sm sticky top-20">
            <h3 className="text-sm font-semibold text-[#242424] pb-3 border-b border-[#edebe9]">
              Print Order Estimate
            </h3>

            {/* Student info */}
            <div className="py-3 border-b border-[#edebe9] text-xs space-y-1">
              <div className="text-[#605e5c]">
                Student: <span className="font-semibold text-[#242424]">{user.name}</span>
              </div>
              <div className="text-[#605e5c]">
                Roll No: <span className="font-semibold text-[#242424]">{user.studentId || '250222'}</span>
              </div>
              <div className="text-[#605e5c]">
                Dept: <span className="text-[#242424]">{user.department || 'Campus Student'}</span>
              </div>
            </div>

            {/* Bill breakdown */}
            <div className="py-3 border-b border-[#edebe9] space-y-2 text-xs">
              {!hasFile ? (
                <div className="py-4 text-center bg-[#faf9f8] rounded border border-dashed border-[#edebe9] p-3">
                  <div className="w-8 h-8 rounded-full bg-[#f3f2f1] text-[#8a8886] flex items-center justify-center mx-auto mb-1.5">
                    <Upload className="w-4 h-4 text-[#0067b8]" />
                  </div>
                  <div className="text-xs font-semibold text-[#242424]">No Document Uploaded</div>
                  <div className="text-[11px] text-[#605e5c] mt-0.5">
                    Upload your file to see page count and printing estimate
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[#605e5c]">
                    <div>
                      <span className="font-medium text-[#242424]">
                        Printing ({pageCount} {pageCount === 1 ? 'page' : 'pages'} • {sheetsCount} {sheetsCount === 1 ? 'sheet' : 'sheets'})
                      </span>
                      <span className="block text-[11px] text-[#605e5c]">
                        {sides === 'double' ? 'Front & Back (Duplex)' : 'Single Sided'} ({copies} {copies > 1 ? 'copies' : 'copy'})
                      </span>
                    </div>
                    <span className="font-semibold text-[#242424]">₹{pagesCost}.00</span>
                  </div>

                  {photoPaperFee > 0 && (
                    <div className="flex justify-between text-[#605e5c]">
                      <span>Photo Paper ({copies} copy)</span>
                      <span className="font-medium text-[#242424]">₹{photoPaperFee}.00</span>
                    </div>
                  )}

                  {urgentFee > 0 && (
                    <div className="flex justify-between text-[#605e5c]">
                      <span>Urgent Fee</span>
                      <span className="font-medium text-[#242424]">₹{urgentFee}.00</span>
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 border-t border-dashed border-[#edebe9] flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#242424]">Total Amount</span>
                <span className={`text-2xl font-bold ${hasFile ? 'text-[#0067b8]' : 'text-[#8a8886]'}`}>
                  {hasFile ? `₹${totalCost}.00` : '₹0.00'}
                </span>
              </div>
            </div>

            {/* Counter details */}
            <div className="py-3 border-b border-[#edebe9] space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-[#605e5c]">
                <MapPin className="w-4 h-4 text-[#0067b8] shrink-0" />
                <span>Pickup: <strong>AIT Xerox Shop (Library Ground Floor)</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-[#605e5c]">
                <Clock className="w-4 h-4 text-[#107c10] shrink-0" />
                <span>ETA: <strong>{isUrgent ? '10-15 mins' : '20-25 mins'}</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-[#605e5c]">
                <CreditCard className="w-4 h-4 text-[#797775] shrink-0" />
                <span>Payment via UPI QR or at Counter</span>
              </div>
            </div>

            {/* Proceed to Payment Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={!hasFile || isMerging || !!mergeError}
                className={`w-full py-2.5 px-4 rounded font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm ${
                  !hasFile || isMerging || !!mergeError
                    ? 'bg-[#edebe9] text-[#a19f9d] cursor-not-allowed'
                    : 'bg-[#0067b8] hover:bg-[#005da6] active:bg-[#004e8c] text-white'
                }`}
              >
                <span>{hasFile ? `Proceed to Payment (₹${totalCost})` : 'Upload Document to Proceed'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!hasFile && (
                <div className="text-[11px] text-[#d83b01] flex items-center justify-center space-x-1 mt-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Upload your document or images to proceed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
