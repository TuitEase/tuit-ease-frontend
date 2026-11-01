import { parseAmount } from './format';
import type { Draft, StepKey } from './types';

export interface StepMeta {
  key: Exclude<StepKey, 'published'>;
  number: number;
  label: string;
  title: string;
  help: string;
  path: string;
}

export const STEPS: StepMeta[] = [
  {
    key: 'basics',
    number: 1,
    label: 'Basics',
    title: 'Name your class',
    help: 'Tell students what the class is and how it will run.',
    path: '/classes/new/basics/',
  },
  {
    key: 'schedule',
    number: 2,
    label: 'When and where',
    title: 'Set the sessions',
    help: 'Add every session. Students book once and get all of them.',
    path: '/classes/new/schedule/',
  },
  {
    key: 'seats',
    number: 3,
    label: 'Seats and price',
    title: 'Seats and price',
    help: 'Choose how many can join and whether they pay.',
    path: '/classes/new/seats-and-price/',
  },
  {
    key: 'review',
    number: 4,
    label: 'Review',
    title: 'Review and publish',
    help: 'Check everything, then go live.',
    path: '/classes/new/review/',
  },
];

export const PUBLISHED_PATH = '/classes/new/published/';

export function stepMeta(key: StepKey): StepMeta | undefined {
  return STEPS.find((step) => step.key === key);
}

export function stepPath(key: StepKey, classId?: number | null): string {
  const path = key === 'published' ? PUBLISHED_PATH : (stepMeta(key)?.path ?? STEPS[0].path);
  return classId ? `${path}?id=${classId}` : path;
}

export function stepIndex(key: StepKey): number {
  const index = STEPS.findIndex((step) => step.key === key);
  return index === -1 ? STEPS.length : index;
}

export function isBasicsComplete(draft: Draft): boolean {
  return draft.title.trim().length > 0;
}

export function isScheduleComplete(draft: Draft): boolean {
  if (draft.sessions.length === 0) return false;
  if (draft.sessions.some((session) => !session.date || !session.time)) return false;
  if (draft.mode !== 'online' && !draft.venue.trim()) return false;
  return true;
}

export function isSeatsComplete(draft: Draft): boolean {
  if (draft.capMode === 'limited') {
    const capacity = Number.parseInt(draft.capacity, 10);
    if (!Number.isFinite(capacity) || capacity < 1) return false;
  }
  if (draft.kind === 'paid') {
    if (parseAmount(draft.price) <= 0) return false;
  }
  return true;
}

/** The earliest step that still needs work. Used for redirects. */
export function firstIncompleteStep(draft: Draft): StepKey {
  if (!isBasicsComplete(draft)) return 'basics';
  if (!isScheduleComplete(draft)) return 'schedule';
  if (draft.classId == null) return 'schedule';
  if (!isSeatsComplete(draft)) return 'seats';
  return 'review';
}

/**
 * Returns a redirect target when the requested step should not be shown yet,
 * or null when it is safe to render.
 */
export function guardFor(step: StepKey, draft: Draft): StepKey | null {
  if (step === 'basics') return null;
  if (!isBasicsComplete(draft)) return 'basics';

  if (step === 'schedule') return null;

  if (!isScheduleComplete(draft) || draft.classId == null) return 'schedule';

  if (step === 'seats') return null;

  if (!isSeatsComplete(draft)) return 'seats';

  if (step === 'review') return null;

  // published
  return draft.published ? null : 'review';
}

const TRANSITION_KEY = 'tuitease.create-class.transition';
const NOTICE_KEY = 'tuitease.create-class.notice';

export type Direction = 'forward' | 'back';

export function markDirection(direction: Direction): void {
  try {
    sessionStorage.setItem(TRANSITION_KEY, direction);
  } catch {
    /* storage can be unavailable in private mode */
  }
}

export function consumeDirection(): Direction {
  try {
    const value = sessionStorage.getItem(TRANSITION_KEY);
    sessionStorage.removeItem(TRANSITION_KEY);
    return value === 'back' ? 'back' : 'forward';
  } catch {
    return 'forward';
  }
}

export function setNotice(message: string): void {
  try {
    sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    /* ignore */
  }
}

export function consumeNotice(): string {
  try {
    const value = sessionStorage.getItem(NOTICE_KEY) ?? '';
    sessionStorage.removeItem(NOTICE_KEY);
    return value;
  } catch {
    return '';
  }
}

export function navigateToStep(target: StepKey, classId: number | null, options: { replace?: boolean; from?: StepKey } = {}): void {
  const from = options.from;
  const direction = from && stepIndex(target) < stepIndex(from) ? 'back' : 'forward';
  markDirection(direction);
  const url = stepPath(target, classId);
  if (options.replace) {
    window.location.replace(url);
  } else {
    window.location.assign(url);
  }
}

export function redirectToStep(target: StepKey, classId: number | null, notice: string): void {
  setNotice(notice);
  markDirection('forward');
  window.location.replace(stepPath(target, classId));
}
