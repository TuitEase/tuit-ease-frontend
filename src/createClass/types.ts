export type Mode = 'online' | 'offline' | 'hybrid';
export type CapMode = 'unlimited' | 'limited';
export type Kind = 'free' | 'paid';
export type StepKey = 'basics' | 'schedule' | 'seats' | 'review' | 'published';

export interface SessionSnapshot {
  date: string;
  time: string;
  duration: string;
  link: string;
  venue: string;
}

export interface DraftSession {
  key: string;
  serverId?: number;
  date: string;
  time: string;
  duration: string;
  override: boolean;
  link: string;
  venue: string;
  saved?: SessionSnapshot;
  error?: string;
}

export interface Draft {
  version: 2;
  classId: number | null;
  slug: string;
  published: boolean;
  title: string;
  description: string;
  mode: Mode;
  sessions: DraftSession[];
  nextSessionKey: number;
  savedSessionIds: number[];
  meetingLink: string;
  venue: string;
  capMode: CapMode;
  capacity: string;
  kind: Kind;
  price: string;
  groupLink: string;
  installments: boolean;
  waitlist: boolean;
  confirmSeat: boolean;
  updatedAt: number;
}

/**
 * The backend has no representation for "unlimited" seats (`capacity` is a
 * non-null PositiveInteger). We send a high, documented sentinel until the API
 * supports null. Reported as a backend item.
 */
export const UNLIMITED_CAPACITY = 999_999;
