import { ExpiryStatus } from '../types/product';

/**
 * Parses MM.YYYY, YYYY-MM, DD.MM.YYYY, or YYYY-MM-DD into a valid Date object.
 * When MM.YYYY is provided, it resolves to the LAST day of that month (pharmaceutical standard).
 */
export function parseDate(dateStr: string): Date | null {
  const clean = dateStr.trim();
  if (!clean) return null;

  // Check MM.YYYY or MM-YYYY or MM/YYYY (Format: AA.YYYY)
  if (/^\d{1,2}[.\-/]\d{4}$/.test(clean)) {
    const separator = clean.includes('.') ? '.' : clean.includes('-') ? '-' : '/';
    const parts = clean.split(separator);
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, lastDay);
  }

  // Check YYYY-MM
  if (/^\d{4}-\d{2}$/.test(clean)) {
    const parts = clean.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, lastDay);
  }

  // Check DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}$/.test(clean)) {
    const separator = clean.includes('.') ? '.' : clean.includes('-') ? '-' : '/';
    const parts = clean.split(separator);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  return null;
}

/**
 * Calculates days remaining until the given expiry date string.
 * Negative values mean the date has already passed.
 */
export function getDaysRemaining(expiryDateStr: string): number {
  const expiryDate = parseDate(expiryDateStr);
  if (!expiryDate || isNaN(expiryDate.getTime())) return 0;

  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryZero = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());

  const diffTime = expiryZero.getTime() - todayZero.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(daysRemaining: number): ExpiryStatus {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 30) return 'warning';
  return 'safe';
}

export interface ExpiryVisualMeta {
  status: ExpiryStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export function getExpiryVisualMeta(daysRemaining: number): ExpiryVisualMeta {
  if (daysRemaining < 0) {
    return {
      status: 'expired',
      label: `${Math.abs(daysRemaining)} gün önce doldu!`,
      badgeBg: '#FEE2E2',
      badgeText: '#B91C1C',
      borderColor: '#EF4444',
    };
  }
  if (daysRemaining === 0) {
    return {
      status: 'critical',
      label: 'Bugün son gün!',
      badgeBg: '#FEE2E2',
      badgeText: '#B91C1C',
      borderColor: '#EF4444',
    };
  }
  if (daysRemaining <= 7) {
    return {
      status: 'critical',
      label: `${daysRemaining} gün kaldı!`,
      badgeBg: '#FEE2E2',
      badgeText: '#B91C1C',
      borderColor: '#EF4444',
    };
  }
  if (daysRemaining <= 30) {
    return {
      status: 'warning',
      label: `${daysRemaining} gün kaldı`,
      badgeBg: '#FEF3C7',
      badgeText: '#B45309',
      borderColor: '#F59E0B',
    };
  }
  return {
    status: 'safe',
    label: `${daysRemaining} gün kaldı`,
    badgeBg: '#D1FAE5',
    badgeText: '#047857',
    borderColor: '#10B981',
  };
}

/**
 * Formats date into pharmaceutical standard AA.YYYY (Ay.Yıl, örn: 08.2027)
 */
export function formatDisplayDate(dateStr: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return dateStr;
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}.${year}`;
}

/**
 * Formats a Date object to ISO YYYY-MM
 */
export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Applies a strict AA.YYYY mask as user enters numbers (max 6 digits: 2 month, 4 year).
 * E.g: "082027" -> "08.2027"
 */
export function applyDateMask(text: string, prevText: string = ''): string {
  if (prevText && text.length < prevText.length) {
    if (prevText.endsWith('.') && !text.endsWith('.')) {
      return text.slice(0, -1);
    }
    return text;
  }

  const rawDigits = text.replace(/\D/g, '').slice(0, 6);
  if (rawDigits.length === 0) return '';
  if (rawDigits.length < 2) return rawDigits;
  if (rawDigits.length === 2) return `${rawDigits}.`;
  return `${rawDigits.slice(0, 2)}.${rawDigits.slice(2, 6)}`;
}

/**
 * Normalizes Turkish characters for fuzzy search
 */
export function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}
