import type { FeeBreakdown } from '../lib/fees';
import { fmtDate, fmtTime, naira, parseAmount } from './format';
import { anyOverride, sessionWhereText } from './sessions';
import type { Draft, StepKey } from './types';

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
  step: StepKey;
}

export interface TimelineRow {
  when: string;
  what: string;
}

export interface DraftView {
  isOnline: boolean;
  isOffline: boolean;
  isPaid: boolean;
  isFree: boolean;
  count: number;
  titleText: string;
  modeLabel: string;
  amount: number;
  /** `null` until the backend fee preview has answered. */
  fee: FeeBreakdown | null;
  whenLine: string;
  whereLine: string;
  startsLine: string;
  seatLine: string;
  courseLabel: string;
  locPill: string;
  instalLine: string;
  priceBadge: string;
  confirmText: string;
  timeline: TimelineRow[];
  summary: SummaryRow[];
  messagesNote: string;
  doneLine: string;
  anyOverride: boolean;
}

export function modeLabel(mode: Draft['mode']): string {
  if (mode === 'online') return 'Online';
  if (mode === 'offline') return 'Offline';
  return 'Hybrid';
}

export function seatsLine(draft: Draft): string {
  if (draft.capMode === 'unlimited') return 'Unlimited seats';
  return `${Number.parseInt(draft.capacity, 10) || 0} seats · 0 taken`;
}

export function whenLine(draft: Draft): string {
  const first = draft.sessions[0];
  if (!first) return 'Add a session';
  const count = draft.sessions.length;
  if (count > 1) return `${count} sessions, starting ${fmtDate(first.date)} at ${fmtTime(first.time)}`;
  return `${fmtDate(first.date)} at ${fmtTime(first.time)}`;
}

export function whereLine(draft: Draft): string {
  if (anyOverride(draft.sessions)) return 'Location depends on the session';
  if (draft.mode === 'online') return draft.meetingLink ? 'Online, link sent after booking' : 'Online';
  if (draft.mode === 'offline') return draft.venue || 'Venue to be added';
  return draft.venue ? `Online or at ${draft.venue}` : 'Online or in person';
}

export function locationPill(draft: Draft): string {
  if (draft.mode === 'online') return 'Online';
  if (draft.mode === 'offline') return draft.venue || 'Venue to be added';
  return draft.venue ? `Hybrid · ${draft.venue}` : 'Hybrid';
}

export function startsLine(draft: Draft): string {
  const first = draft.sessions[0];
  if (!first) return 'Add a session';
  return `Starts ${fmtDate(first.date)}, ${fmtTime(first.time)}`;
}

export function instalmentLine(draft: Draft): string {
  if (draft.kind === 'free') return 'No payment needed';
  const count = draft.sessions.length;
  if (draft.installments) return `or 2 payments of ${naira(parseAmount(draft.price) / 2)}`;
  return count > 1 ? `One payment covers all ${count} sessions` : 'One payment';
}

function sessionWhere(draft: Draft, index: number): string {
  const session = draft.sessions[index];
  if (!session) return '';
  return sessionWhereText(draft, session, {
    online: draft.mode !== 'offline',
    offline: draft.mode !== 'online',
  });
}

/** The date/time/location block used by both confirmation messages. */
export function whenWhereText(draft: Draft): string {
  const count = draft.sessions.length;
  if (count === 0) return 'Add a session';
  if (count > 1 && anyOverride(draft.sessions)) {
    const rows = draft.sessions
      .map((session) => `${fmtDate(session.date)}, ${fmtTime(session.time)}\n${sessionWhere(draft, draft.sessions.indexOf(session))}`)
      .join('\n\n');
    return `${count} sessions:\n${rows}`;
  }
  return `${whenLine(draft)}\n${sessionWhere(draft, 0)}`;
}

export function confirmText(draft: Draft, hostName: string): string {
  const title = draft.title.trim() || 'Your class title';
  const whenWhere = whenWhereText(draft);
  if (draft.kind === 'paid') {
    const amount = parseAmount(draft.price);
    const paid = draft.installments ? amount / 2 : amount;
    return `Hi there, your seat for ${title} is booked.\n\n${whenWhere}\n\nPaid so far: ${naira(paid)} of ${naira(amount)}.`;
  }
  const group = draft.groupLink ? '\n\nJoin the class WhatsApp group for updates from the host.' : '';
  return `Hi there, you are registered for ${title} with ${hostName}.\n\n${whenWhere}${group}`;
}

export function timelineFor(draft: Draft): TimelineRow[] {
  if (draft.kind === 'free') return [];
  const count = draft.sessions.length;
  const overrides = anyOverride(draft.sessions);
  const rows: TimelineRow[] = [
    { when: 'On booking', what: 'Seat confirmation with date, where to join and an add to calendar button.' },
  ];
  if (draft.confirmSeat) {
    rows.push({ when: '3 days before', what: 'Asks the student to reply YES to keep their seat.' });
  }
  rows.push({
    when: '1 day before',
    what: count > 1 ? (overrides ? "Reminder before every session, with that session's own link or venue." : 'Reminder before every session.') : 'Reminder with time and where to join.',
  });
  rows.push({
    when: '1 hour before',
    what: count > 1 ? 'Last reminder before every session.' : 'Last reminder with the link or venue.',
  });
  if (draft.installments) {
    rows.push({ when: 'Second payment', what: 'Payment link and follow-ups until it is paid.' });
  }
  rows.push({
    when: 'After class',
    what: count > 1 ? 'Thank-you after the last session.' : 'Thank-you message with your follow-up.',
  });
  return rows;
}

export function summaryFor(draft: Draft, fee: FeeBreakdown | null = null): SummaryRow[] {
  const count = draft.sessions.length;
  const first = draft.sessions[0];
  const last = draft.sessions[count - 1];
  const overrides = anyOverride(draft.sessions);
  const amount = parseAmount(draft.price);
  const title = draft.title.trim() || 'Your class title';
  const missing: string[] = [];
  if (draft.mode !== 'offline' && !draft.meetingLink.trim()) missing.push('(meeting link missing)');
  if (draft.mode !== 'online' && !draft.venue.trim()) missing.push('(venue missing)');

  return [
    { key: 'title', label: 'Title', value: title, step: 'basics' },
    {
      key: 'mode',
      label: 'How it runs',
      value: `${modeLabel(draft.mode)}${missing.length ? ` ${missing.join(' ')}` : ''}`,
      step: 'basics',
    },
    {
      key: 'sessions',
      label: count > 1 ? 'Sessions' : 'Session',
      value:
        count > 1
          ? `${count} sessions, ${fmtDate(first.date)} to ${fmtDate(last.date)}${overrides ? '. Some sessions have their own location.' : ''}`
          : whenLine(draft),
      step: 'schedule',
    },
    { key: 'seats', label: 'Seats', value: seatsLine(draft), step: 'seats' },
    {
      key: 'price',
      label: 'Price',
      value:
        draft.kind === 'paid'
          ? `${naira(amount)} for all sessions.${fee ? ` You receive ${naira(fee.hostReceives)}.` : ''}`
          : 'Free',
      step: 'seats',
    },
  ];
}

export function viewOf(draft: Draft, hostName: string, fee: FeeBreakdown | null = null): DraftView {
  const isOnline = draft.mode !== 'offline';
  const isOffline = draft.mode !== 'online';
  const isPaid = draft.kind === 'paid';
  const count = draft.sessions.length;
  const amount = parseAmount(draft.price);
  const isFree = !isPaid;
  const titleText = draft.title.trim() || 'Your class title';

  return {
    isOnline,
    isOffline,
    isPaid,
    isFree,
    count,
    titleText,
    modeLabel: modeLabel(draft.mode),
    amount,
    fee,
    whenLine: whenLine(draft),
    whereLine: whereLine(draft),
    startsLine: startsLine(draft),
    seatLine: seatsLine(draft),
    courseLabel: count > 1 ? `${count}-session course` : 'Single session',
    locPill: locationPill(draft),
    instalLine: instalmentLine(draft),
    priceBadge: isPaid ? naira(amount) : 'Free',
    confirmText: confirmText(draft, hostName),
    timeline: timelineFor(draft),
    summary: summaryFor(draft, fee),
    messagesNote: isPaid
      ? 'Paid classes get a confirmation and automatic reminders for every session.'
      : 'Free classes get one confirmation message. Your group and the calendar alert take it from there.',
    doneLine: isPaid
      ? 'Students can book and pay now. Reminders will go out automatically for every session.'
      : 'Students can book now. Each one gets your confirmation message, and nothing else is needed from you.',
    anyOverride: anyOverride(draft.sessions),
  };
}
