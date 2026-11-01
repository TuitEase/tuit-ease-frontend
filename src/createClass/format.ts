/** Presentation helpers shared by every step. Keep them pure and dependency-free. */

export function fmtDate(iso: string): string {
  if (!iso) return 'Date to be set';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date to be set';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtTime(time: string): string {
  if (!time) return '';
  const [rawHour, rawMinute = '00'] = time.split(':');
  const hour = Number.parseInt(rawHour, 10);
  if (Number.isNaN(hour)) return '';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${rawMinute} ${suffix}`;
}

export function naira(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₦${safe.toLocaleString('en-US')}`;
}

export function addDays(iso: string, days: number): string {
  if (!iso) return iso;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'your-class'
  );
}

/** Whole naira, never a float. `20000.50` is still twenty thousand naira. */
export function parseAmount(value: string): number {
  const cleaned = String(value).replace(/[₦,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
}

/** What the API expects for a DecimalField: a plain, stringified amount. */
export function amountForApi(value: string): string {
  return String(parseAmount(value));
}

export function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'A';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function formatClassLink(base: string, slug: string): string {
  return `${base.replace(/\/+$/, '')}/class/${encodeURIComponent(slug)}/`;
}

export function publicBaseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (configured || origin || '').replace(/\/+$/, '');
}

export function classShareMessage(title: string, startsLine: string, link: string): string {
  const safeTitle = title.trim() || 'My class';
  const when = startsLine && startsLine !== 'Add a session' ? ` ${startsLine}.` : '';
  return `${safeTitle}.${when} Book here: ${link}`;
}
