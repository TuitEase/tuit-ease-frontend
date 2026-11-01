import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { replaceDraft } from '../createClass/draft';
import { copyText } from '../lib/clipboard';
import { DEFAULT_TIMEZONE, dateTile, formatDateShort, relativeWhen } from '../lib/datetime';
import { formatNaira } from '../lib/money';
import {
  fetchClass,
  fetchClassTotals,
  fetchClasses,
  fetchClassesOverview,
  fetchHostProfile,
  fetchPendingInstallments,
  type ClassTotals,
  type HostClassRecord,
  type PendingInstallment,
  type UpcomingClass,
} from './api';
import {
  classDetailUrl,
  classFlags,
  classMetaLine,
  classScheduleLabel,
  classState,
  classTotalsFor,
  duplicateDraft,
  editClassUrl,
  filterAndSortClasses,
  isPaidClass,
  modeBadgeLabel,
  modeLabel,
  pendingForClass,
  publicClassUrl,
  readViewPreference,
  seatUsage,
  seatsText,
  sortKeyLabel,
  statusCounts,
  type SortKey,
  type StatusFilter,
  type TypeFilter,
  writeViewPreference,
} from './model';
import { TopBar } from './components/TopBar';
import { EmptyState, InlineError, Pill, Skeleton, StatCard } from './components/ui';
import './classes.css';

const VIEW_KEY = 'tuitease.classes.view';

type ViewMode = 'cards' | 'list';
type ToastState = { kind: 'success' | 'error'; message: string } | null;

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

const STATUS_OPTIONS: readonly StatusFilter[] = ['all', 'published', 'draft', 'ended'];
const STATUS_CHIPS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Live' },
  { value: 'draft', label: 'Drafts' },
  { value: 'ended', label: 'Past' },
];
const TYPE_OPTIONS: readonly TypeFilter[] = ['all', 'free', 'paid'];
const SORT_OPTIONS: readonly SortKey[] = ['next-session', 'newest', 'title', 'price-desc', 'students'];

interface UrlState {
  status: StatusFilter;
  type: TypeFilter;
  sort: SortKey;
  view: ViewMode;
  query: string;
}

function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  const storedView = readViewPreference(window.localStorage, VIEW_KEY);
  const viewParam = params.get('view');
  return {
    status: oneOf(params.get('status'), STATUS_OPTIONS, 'all'),
    type: oneOf(params.get('type'), TYPE_OPTIONS, 'all'),
    sort: oneOf(params.get('sort'), SORT_OPTIONS, 'next-session'),
    view: viewParam === 'list' || viewParam === 'cards' ? viewParam : (storedView ?? 'cards'),
    query: params.get('q') ?? '',
  };
}

function UpcomingClasses({
  items,
  timeZone,
  loading,
}: {
  items: UpcomingClass[];
  timeZone: string;
  loading: boolean;
}) {
  const visible = [...items]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 10);

  return (
    <section className="tt-upcoming" aria-labelledby="upcoming-title">
      <div className="tt-upcoming-head">
        <div>
          <p className="tt-eyebrow">Next 10 days</p>
          <h2 id="upcoming-title">Coming up in the next 10 days</h2>
        </div>
        {!loading && visible.length ? (
          <span className="tt-upcoming-total">
            {visible.length} {visible.length === 1 ? 'session' : 'sessions'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="tt-upcoming-list" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <div className="tt-upcoming-item is-skeleton" key={key}>
              <Skeleton height={52} width={52} />
              <span className="tt-upcoming-copy">
                <Skeleton height={16} width="70%" />
                <Skeleton height={13} width="55%" />
              </span>
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <ul className="tt-upcoming-list">
          {visible.map((item) => {
            const tile = dateTile(item.starts_at, timeZone);
            const place =
              item.location?.trim() || (item.mode === 'online' ? 'Online' : modeLabel(item.mode));
            return (
              <li key={item.session_id}>
                <a className="tt-upcoming-item" href={classDetailUrl(item.class_id)}>
                  <span className="tt-upcoming-date" aria-hidden="true">
                    <span className="tt-upcoming-month">{tile.month}</span>
                    <span className="tt-upcoming-day">
                      {tile.day === '—' ? tile.day : Number(tile.day)}
                    </span>
                  </span>
                  <span className="tt-upcoming-copy">
                    <span className="tt-sr-only">{formatDateShort(item.starts_at, timeZone)}. </span>
                    <strong>{item.class_title}</strong>
                    <span className="tt-upcoming-meta">
                      Session {item.session_number} of {item.session_total} · {place}
                    </span>
                    <span className="tt-upcoming-when">{relativeWhen(item.starts_at, timeZone)}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="tt-upcoming-empty">No sessions scheduled in the next 10 days.</p>
      )}
    </section>
  );
}

export default function ClassesApp() {
  const initial = useMemo(readUrlState, []);
  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [type, setType] = useState<TypeFilter>(initial.type);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [view, setView] = useState<ViewMode>(initial.view);
  const [query, setQuery] = useState(initial.query);
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query);
  const [toast, setToast] = useState<ToastState>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: fetchClasses,
    staleTime: 30_000,
  });
  const overviewQuery = useQuery({
    queryKey: ['classes', 'overview'],
    queryFn: fetchClassesOverview,
    staleTime: 30_000,
  });
  const totalsQuery = useQuery({
    queryKey: ['class-totals'],
    queryFn: fetchClassTotals,
    staleTime: 60_000,
  });
  const pendingQuery = useQuery({
    queryKey: ['pending-installments', 'all'],
    queryFn: fetchPendingInstallments,
    staleTime: 60_000,
  });
  const hostQuery = useQuery({
    queryKey: ['host-profile'],
    queryFn: fetchHostProfile,
    staleTime: 300_000,
  });

  const classes = classesQuery.data?.items ?? [];
  const totals = totalsQuery.data?.items ?? [];
  const pending = pendingQuery.data?.items ?? [];
  const timeZone = hostQuery.data?.timezone || DEFAULT_TIMEZONE;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (type !== 'all') params.set('type', type);
    if (sort !== 'next-session') params.set('sort', sort);
    if (view !== 'cards') params.set('view', view);
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    const search = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  }, [status, type, sort, view, debouncedQuery]);

  useEffect(() => {
    writeViewPreference(window.localStorage, VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () =>
      filterAndSortClasses(classes, {
        status,
        type,
        query: debouncedQuery,
        sort,
      }),
    [classes, status, type, debouncedQuery, sort],
  );

  const hasFilters = status !== 'all' || type !== 'all' || Boolean(debouncedQuery.trim());

  const counts = useMemo(
    () => statusCounts(classes, { type, query: debouncedQuery }),
    [classes, type, debouncedQuery],
  );

  function clearFilters() {
    setStatus('all');
    setType('all');
    setQuery('');
    setDebouncedQuery('');
  }

  async function handleCopy(cls: HostClassRecord) {
    const url = publicClassUrl(cls.slug);
    const copied = await copyText(url);
    if (!copied) {
      setToast({ kind: 'error', message: 'Could not copy the link. Open Manage and copy it from the Share tab.' });
      return;
    }
    setToast({
      kind: 'success',
      message:
        classState(cls) === 'draft'
          ? 'Link copied. Publish the class before sharing it.'
          : `Link copied for “${cls.title}”.`,
    });
  }

  async function handleDuplicate(cls: HostClassRecord) {
    setDuplicatingId(cls.id);
    try {
      const full = cls.sessions?.length ? cls : await fetchClass(cls.id);
      replaceDraft(duplicateDraft(full, timeZone));
      window.location.assign('/classes/new/basics/');
    } catch (error) {
      setToast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not duplicate this class. Please try again.',
      });
      setDuplicatingId(null);
    }
  }

  const overview = overviewQuery.data;
  const upcoming = overview?.upcoming_classes ?? [];
  const liveClasses = overview ? Number(overview.stats.live_classes ?? 0) : null;
  const draftClasses = overview ? Number(overview.stats.drafts ?? 0) : null;
  const pastClasses = overview ? Number(overview.stats.past_classes ?? 0) : null;
  const studentsBooked = overview ? Number(overview.stats.students_booked ?? 0) : null;
  const collectedMoney = overview?.stats.collected_money ?? null;
  const classesHint =
    liveClasses !== null && draftClasses !== null && pastClasses !== null
      ? `Everything you teach, in one place. ${liveClasses} live, ${draftClasses} ${
          draftClasses === 1 ? 'draft' : 'drafts'
        }, ${pastClasses} past.`
      : 'Everything you teach, in one place.';
  const loading = classesQuery.isLoading;

  return (
    <div className="tt-shell">
      <TopBar>
        <a className="tt-topbar-link" href="/dashboard/">
          Dashboard
        </a>
        <a className="tt-btn tt-btn-primary tt-btn-small" href="/classes/new/">
          + Create class
        </a>
      </TopBar>

      <main id="main" className="tt-main">
        <div className="tt-page-head">
          <div>
            <p className="tt-eyebrow">Your classes</p>
            <h1>Classes</h1>
            <p className="tt-lede">{classesHint}</p>
          </div>
          <a className="tt-btn tt-btn-primary" href="/classes/new/">
            + Create class
          </a>
        </div>

        <section className="tt-stat-grid" aria-label="Live class overview">
          <StatCard
            label="Live classes"
            value={
              overviewQuery.isLoading ? <Skeleton height={28} width={64} /> : liveClasses !== null ? liveClasses.toLocaleString('en-US') : '—'
            }
            hint="Open for booking now"
          />
          <StatCard
            label="Drafts"
            value={
              overviewQuery.isLoading ? <Skeleton height={28} width={64} /> : draftClasses !== null ? draftClasses.toLocaleString('en-US') : '—'
            }
            hint="Finish setup to publish"
          />
          <StatCard
            label="Students booked"
            value={
              overviewQuery.isLoading ? (
                <Skeleton height={28} width={64} />
              ) : studentsBooked !== null ? (
                studentsBooked.toLocaleString('en-US')
              ) : (
                '—'
              )
            }
            hint="Across live classes"
          />
          <StatCard
            label="Collected"
            value={
              overviewQuery.isLoading ? (
                <Skeleton height={28} width={90} />
              ) : overview ? (
                formatNaira(collectedMoney)
              ) : (
                '—'
              )
            }
            hint="From live classes"
          />
        </section>

        {overviewQuery.isError ? null : (
          <UpcomingClasses items={upcoming} timeZone={timeZone} loading={overviewQuery.isLoading} />
        )}

        <div className="tt-status-chips" role="group" aria-label="Filter classes by status">
          {STATUS_CHIPS.map((chip) => {
            const count = counts[chip.value];
            return (
              <button
                key={chip.value}
                type="button"
                className="tt-chip"
                aria-pressed={status === chip.value}
                aria-label={`${chip.label}, ${count} ${count === 1 ? 'class' : 'classes'}`}
                onClick={() => setStatus(chip.value)}
              >
                {chip.label}
                <span className="tt-chip-count" aria-hidden="true">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="tt-toolbar">
          <div className="tt-field tt-search">
            <label htmlFor="class-search">Search classes</label>
            <div className="tt-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                id="class-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or place"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="tt-filter-row">
            <div className="tt-field">
              <label htmlFor="class-type">Type</label>
              <select id="class-type" value={type} onChange={(event) => setType(event.target.value as TypeFilter)}>
                <option value="all">All types</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="tt-field">
              <label htmlFor="class-sort">Sort by</label>
              <select id="class-sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                <option value="next-session">Next session</option>
                <option value="newest">Newest first</option>
                <option value="title">Title A–Z</option>
                <option value="price-desc">Price high to low</option>
                <option value="students">Most students</option>
              </select>
            </div>
            <div className="tt-view-toggle" role="group" aria-label="View classes as">
              <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                Cards
              </button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
                List
              </button>
            </div>
          </div>
        </div>

        <p className="tt-result-line" role="status" aria-live="polite">
          {loading
            ? 'Loading classes…'
            : `Showing ${filtered.length} of ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}${
                sort !== 'next-session' ? ` · ${sortKeyLabel(sort)}` : ''
              }`}
        </p>

        {classesQuery.isError ? (
          <InlineError message={classesQuery.error.message} onRetry={() => void classesQuery.refetch()} />
        ) : loading ? (
          <div className="tt-class-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((key) => (
              <div className="tt-class-card is-skeleton" key={key}>
                <Skeleton height={24} width={86} />
                <Skeleton height={28} width="70%" />
                <Skeleton height={18} width="90%" />
                <Skeleton height={64} />
                <Skeleton height={40} />
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            body="Your first class takes about a minute to set up. Add the details, set a date and share the link."
            action={
              <a className="tt-btn tt-btn-primary" href="/classes/new/">
                Create your first class
              </a>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No classes match those filters"
            body="Try a different search, or clear the filters to see every class."
            action={
              <button type="button" className="tt-btn tt-btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : view === 'cards' ? (
          <div className="tt-class-grid">
            {filtered.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                timeZone={timeZone}
                totals={totals}
                pending={pending}
                duplicating={duplicatingId === cls.id}
                onCopy={() => void handleCopy(cls)}
                onDuplicate={() => void handleDuplicate(cls)}
              />
            ))}
          </div>
        ) : (
          <ClassList
            classes={filtered}
            timeZone={timeZone}
            totals={totals}
            pending={pending}
            duplicatingId={duplicatingId}
            onCopy={(cls) => void handleCopy(cls)}
            onDuplicate={(cls) => void handleDuplicate(cls)}
          />
        )}

        {classesQuery.data?.truncated ? (
          <p className="tt-note">
            Showing the first {classes.length} classes. Search and filters apply to the loaded list.
          </p>
        ) : null}
        {hasFilters ? null : (
          <p className="tt-note">
            Need to change something? Open a class and choose <strong>Edit class</strong>. Duplicate keeps the details and
            drops past sessions.
          </p>
        )}
      </main>

      {toast ? (
        <div className={`tt-toast tt-toast-${toast.kind}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function statusPill(cls: HostClassRecord) {
  const state = classState(cls);
  if (state === 'draft') return <Pill tone="draft">Draft</Pill>;
  if (state === 'ended') return <Pill tone="ended">Ended</Pill>;
  return <Pill tone="live">Live</Pill>;
}

function moneyCell(cls: HostClassRecord, totals: ClassTotals[]): string {
  if (!isPaidClass(cls)) return 'Free';
  const match = classTotalsFor(cls, totals);
  return match ? `${formatNaira(match.total_paid)} collected` : `${formatNaira(cls.price)} per student`;
}

function ClassCard({
  cls,
  timeZone,
  totals,
  pending,
  duplicating,
  onCopy,
  onDuplicate,
}: {
  cls: HostClassRecord;
  timeZone: string;
  totals: ClassTotals[];
  pending: PendingInstallment[];
  duplicating: boolean;
  onCopy: () => void;
  onDuplicate: () => void;
}) {
  const usage = seatUsage(cls);
  const paid = isPaidClass(cls);
  const match = paid ? classTotalsFor(cls, totals) : null;
  const moneyValue = !paid ? 'Free' : match ? formatNaira(match.total_paid) : formatNaira(cls.price);
  const pendingInfo = pendingForClass(pending, cls.id, timeZone);
  const flags = classFlags(cls);
  const titleId = `class-${cls.id}-title`;

  return (
    <article className="tt-class-card" aria-labelledby={titleId}>
      <div className="tt-class-card-top">
        <span className={`tt-mode-badge is-${cls.mode}`}>{modeBadgeLabel(cls.mode)}</span>
        {statusPill(cls)}
      </div>

      <h3 id={titleId} className="tt-class-card-title">
        <a href={classDetailUrl(cls.id)}>{cls.title}</a>
      </h3>
      <p className="tt-class-card-meta">{classScheduleLabel(cls, timeZone)}</p>

      <div className="tt-class-card-stats">
        <div>
          <span>Students</span>
          <strong>{usage.booked}</strong>
        </div>
        <div>
          <span>{paid ? 'Collected' : 'Price'}</span>
          <strong>{moneyValue}</strong>
        </div>
      </div>

      <div className="tt-seat-block">
        <div className="tt-seat-line">
          <span>{seatsText(cls)}</span>
          <span className="tt-seat-meta">
            {usage.left !== null ? (
              <span className={`tt-seat-left${usage.left === 0 ? ' is-full' : ''}`}>
                {usage.left === 0 ? 'Full' : `${usage.left} left`}
              </span>
            ) : null}
            {usage.waitlist > 0 ? <span className="tt-seat-waitlist">{usage.waitlist} waiting</span> : null}
          </span>
        </div>
        <div className="tt-progress" aria-hidden="true">
          <span style={{ width: `${usage.percent}%` }} />
        </div>
      </div>

      {flags.length || pendingInfo.overdueCount ? (
        <div className="tt-flag-row">
          {pendingInfo.overdueCount > 0 ? <Pill tone="warning">{pendingInfo.overdueCount} overdue</Pill> : null}
          {flags
            .filter((flag) => !(pendingInfo.overdueCount > 0 && flag.tone === 'warning'))
            .map((flag) => (
              <Pill key={flag.label} tone={flag.tone}>
                {flag.label}
              </Pill>
            ))}
        </div>
      ) : null}

      <div className="tt-card-actions">
        <a className="tt-btn tt-btn-primary tt-btn-small" href={classDetailUrl(cls.id)}>
          Manage
        </a>
        <a className="tt-btn tt-btn-secondary tt-btn-small" href={editClassUrl(cls.id)}>
          Edit
        </a>
        <button
          type="button"
          className="tt-btn tt-btn-ghost tt-btn-small"
          onClick={onDuplicate}
          disabled={duplicating}
          aria-busy={duplicating}
        >
          {duplicating ? 'Duplicating…' : 'Duplicate'}
        </button>
        <button type="button" className="tt-btn tt-btn-ghost tt-btn-small" onClick={onCopy}>
          Copy link
        </button>
      </div>
    </article>
  );
}

function ClassList({
  classes,
  timeZone,
  totals,
  pending,
  duplicatingId,
  onCopy,
  onDuplicate,
}: {
  classes: HostClassRecord[];
  timeZone: string;
  totals: ClassTotals[];
  pending: PendingInstallment[];
  duplicatingId: number | null;
  onCopy: (cls: HostClassRecord) => void;
  onDuplicate: (cls: HostClassRecord) => void;
}) {
  return (
    <ul className="tt-class-list" aria-label="Classes">
      <li className="tt-class-list-head" aria-hidden="true">
        <span>Class</span>
        <span>Students</span>
        <span>Money</span>
        <span>Next</span>
        <span>Actions</span>
      </li>
      {classes.map((cls) => {
        const usage = seatUsage(cls);
        const pendingInfo = pendingForClass(pending, cls.id, timeZone);
        return (
          <li className="tt-class-row" key={cls.id}>
            <div className="tt-class-row-main">
              {statusPill(cls)}
              <div>
                <a href={classDetailUrl(cls.id)} className="tt-class-row-title">
                  {cls.title}
                </a>
                <p>{classMetaLine(cls, timeZone)}</p>
              </div>
            </div>
            <div className="tt-class-row-cell">
              <span>Students</span>
              <strong>
                {usage.booked}
                {usage.capacity !== null ? ` / ${usage.capacity}` : ''}
              </strong>
              <span className="tt-seat-left-note">
                {usage.capacity === null ? 'Unlimited' : usage.left === 0 ? 'Full' : `${usage.left} left`}
              </span>
              {pendingInfo.overdueCount > 0 ? <em>{pendingInfo.overdueCount} overdue</em> : null}
            </div>
            <div className="tt-class-row-cell">
              <span>Money</span>
              <strong>{moneyCell(cls, totals)}</strong>
            </div>
            <div className="tt-class-row-cell">
              <span>Next</span>
              <strong>{classScheduleLabel(cls, timeZone)}</strong>
            </div>
            <div className="tt-class-row-actions">
              <a className="tt-btn tt-btn-secondary tt-btn-small" href={classDetailUrl(cls.id)}>
                Manage
              </a>
              <a className="tt-btn tt-btn-ghost tt-btn-small" href={editClassUrl(cls.id)}>
                Edit
              </a>
              <button
                type="button"
                className="tt-btn tt-btn-ghost tt-btn-small"
                onClick={() => onDuplicate(cls)}
                disabled={duplicatingId === cls.id}
                aria-busy={duplicatingId === cls.id}
              >
                {duplicatingId === cls.id ? 'Copying…' : 'Duplicate'}
              </button>
              <button type="button" className="tt-btn tt-btn-ghost tt-btn-small" onClick={() => onCopy(cls)}>
                Copy link
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
