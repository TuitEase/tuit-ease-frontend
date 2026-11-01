import { formatNaira, toNaira } from '../lib/money';
import { DEFAULT_TIMEZONE, formatDateTime, formatDateShort } from '../lib/datetime';
import type { ClassStudentBooking, HostClassRecord, HostClassSession } from './api';

export type StudentFilter = 'all' | 'late' | 'paid' | 'wait';
export type StudentTab = 'booking' | 'payments' | 'messages';

export interface ChipTone {
  bg: string;
  border: string;
  color: string;
}

export const CHIP_STYLES: Record<'green' | 'red' | 'grey' | 'amber' | 'blue', ChipTone> = {
  green: { bg: '#E8F6EE', border: '#BFE0CC', color: '#14532D' },
  red: { bg: '#FDECEC', border: '#F3C2C2', color: '#9B1C1C' },
  grey: { bg: '#F3F0EA', border: '#E6E1D8', color: '#4A4A50' },
  amber: { bg: '#FFF3DC', border: '#F1D9A6', color: '#7A4F00' },
  blue: { bg: '#E7F1FB', border: '#BBD5F0', color: '#1B4F8A' },
};

export function initials(name: string): string {
  if (!name) return '??';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function firstName(fullName: string): string {
  if (!fullName) return 'Student';
  return fullName.trim().split(/\s+/)[0] || 'Student';
}

export function isSessionHeld(session: HostClassSession): boolean {
  const time = new Date(session.starts_at).getTime();
  return !Number.isNaN(time) && time <= Date.now();
}

export function isBookingOverdue(booking: ClassStudentBooking, cls: HostClassRecord): boolean {
  if (booking.status !== 'active' && booking.status !== 'pending_payment') return false;
  const balance = toNaira(booking.balance);
  if (balance <= 0) return false;

  // A class with installments or created past the payment window
  const daysSinceCreated = (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (cls.allow_installments && daysSinceCreated > (cls.installment_interval_days || 14)) {
    return true;
  }
  // If first session has passed and balance > 0, it is overdue
  const first = [...(cls.sessions || [])].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  )[0];
  if (first && isSessionHeld(first)) {
    return true;
  }
  return false;
}

export type StudentBookingStatus = 'waiting' | 'done' | 'late' | 'part' | 'paid';

export function studentStatus(
  booking: ClassStudentBooking,
  cls: HostClassRecord,
): StudentBookingStatus {
  if (booking.status === 'waitlisted') return 'waiting';
  if (cls.status === 'ended') return 'done';
  if (isBookingOverdue(booking, cls)) return 'late';
  if (toNaira(booking.balance) > 0) return 'part';
  return 'paid';
}

export function statusChip(
  status: StudentBookingStatus,
  isFree: boolean,
): { label: string; tone: keyof typeof CHIP_STYLES } {
  switch (status) {
    case 'waiting':
      return { label: 'Waiting', tone: 'blue' };
    case 'done':
      return { label: 'Completed', tone: 'grey' };
    case 'late':
      return { label: 'Overdue', tone: 'red' };
    case 'part':
      return { label: 'Part paid', tone: 'amber' };
    case 'paid':
    default:
      return { label: isFree ? 'Registered' : 'Paid up', tone: 'green' };
  }
}

export function normalizePhoneDigits(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Local Nigerian numbers are stored as 0XXXXXXXXXX; wa.me needs 234XXXXXXXXXX.
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = `234${digits.slice(1)}`;
  }
  return digits;
}

/**
 * A WhatsApp deep link, or null when the number is missing or implausible.
 * Supports local `0…`, `234…` and full international `+…` numbers.
 */
export function whatsappLink(phone: string, name: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10 || digits.length > 15) return null;
  const text = `Hi ${firstName(name)}, `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function formatStudentSince(
  dateStr?: string,
  status = 'booked',
  timeZone = DEFAULT_TIMEZONE,
): string {
  if (!dateStr) return 'Student';
  const prefix = status === 'waitlisted' ? 'On the list since ' : 'Student since ';
  return `${prefix}${formatDateShort(dateStr, timeZone)}`;
}

export function classMetaText(cls: HostClassRecord): string {
  const mode = cls.mode === 'offline' ? 'Offline' : cls.mode === 'hybrid' ? 'Hybrid' : 'Online';
  const venue = cls.venue ? cls.venue : cls.meeting_link ? 'Online' : '';
  const sessionCount = cls.sessions?.length || 0;
  const sessionsText = `${sessionCount} session${sessionCount === 1 ? '' : 's'}`;
  const price = toNaira(cls.price);
  const priceText = price === 0 ? 'Free' : `${formatNaira(price)} for the whole class`;
  const booked = cls.seats?.booked ?? 0;
  const cap = cls.capacity;
  const seatsText = cap && cap > 0 && cap < 9999 ? `${booked} of ${cap} seats` : `${booked} registered`;

  const parts = [mode];
  if (venue) parts.push(venue);
  parts.push(sessionsText);
  parts.push(priceText);
  parts.push(seatsText);
  return parts.join(' · ');
}

export function getStudentNotes(studentId: number | string): string {
  try {
    return localStorage.getItem(`tuitease_student_notes_${studentId}`) || '';
  } catch {
    return '';
  }
}

export function saveStudentNotes(studentId: number | string, notes: string): void {
  try {
    localStorage.setItem(`tuitease_student_notes_${studentId}`, notes);
  } catch {
    // Ignore localStorage quota errors
  }
}
