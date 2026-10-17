export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  department?: string;
  phone?: string;
  balance?: number;
}

export type JobStatus = 'submitted' | 'processing' | 'ready' | 'completed' | 'cancelled';

export interface StatusHistoryItem {
  status: JobStatus;
  timestamp: string;
  note?: string;
}

export interface PrintJob {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentPhone: string;
  department: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  fileUrl?: string;
  paymentMethod?: 'upi' | 'counter';
  utrNumber?: string;
  pageCount: number;
  pageRange?: string;
  copies: number;
  colorMode: 'bw' | 'color';
  paperSize: 'A4' | 'A3' | 'Letter';
  paperType?: 'plain' | 'photo';
  orientation: 'portrait' | 'landscape';
  sides: 'single' | 'double';
  binding: 'none' | 'staple' | 'spiral' | 'hardcover';
  isUrgent: boolean;
  instructions?: string;
  cost: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  pickupCounter: string;
  estimatedPickupTime: string;
  statusHistory: StatusHistoryItem[];
}
