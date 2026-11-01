import { useCallback, useEffect, useState } from 'react';
import { fetchFeePreview, type FeeBreakdown } from './fees';
import { toNaira, type MoneyInput } from './money';

export type FeePreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FeePreviewState {
  /** `null` until the backend has answered (or when the price is blank). */
  fee: FeeBreakdown | null;
  status: FeePreviewStatus;
  /** Human-readable reason when `status === 'error'`. */
  message: string | null;
  retry: () => void;
}

interface Snapshot {
  fee: FeeBreakdown | null;
  status: FeePreviewStatus;
  message: string | null;
}

const cache = new Map<string, FeeBreakdown>();
const DEFAULT_DEBOUNCE_MS = 300;
const MAX_CACHE_ENTRIES = 100;

/** Only used by tests. */
export function clearFeePreviewCache(): void {
  cache.clear();
}

function remember(key: string, fee: FeeBreakdown) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, fee);
}

function messageOf(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return 'Could not work out the fees for that price. Please try again.';
}

/**
 * Backend-backed price breakdown, debounced so typing a price does not fire a
 * request per keystroke. Answers are cached per amount (and per class, when a
 * class id is given), so the wizard and the class detail page show identical
 * numbers for the same price without refetching.
 */
export function useFeePreview(
  amount: MoneyInput,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  classId?: number | null,
): FeePreviewState {
  const naira = toNaira(amount);
  const classKey = classId && classId > 0 ? String(classId) : '';
  const key = naira > 0 ? `${classKey}|${naira.toFixed(2)}` : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Snapshot>(() => {
    const cached = key ? cache.get(key) : undefined;
    if (cached) return { fee: cached, status: 'ready', message: null };
    return { fee: null, status: key ? 'loading' : 'idle', message: null };
  });

  useEffect(() => {
    if (!key) {
      setState({ fee: null, status: 'idle', message: null });
      return;
    }

    const cached = cache.get(key);
    if (cached) {
      setState({ fee: cached, status: 'ready', message: null });
      return;
    }

    setState({ fee: null, status: 'loading', message: null });
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchFeePreview(naira, controller.signal, classId)
        .then((fee) => {
          if (controller.signal.aborted) return;
          remember(key, fee);
          setState({ fee, status: 'ready', message: null });
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setState({ fee: null, status: 'error', message: messageOf(caught) });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, attempt, debounceMs]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
