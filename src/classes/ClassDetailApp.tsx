import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { copyText } from '../lib/clipboard';
import { DEFAULT_TIMEZONE } from '../lib/datetime';
import { formatNaira } from '../lib/money';
import {
  fetchClass,
  fetchClassStudents,
  fetchHostProfile,
  fetchPayments,
  fetchPendingInstallments,
  publishClass,
  remindBooking,
  saveAttendance,
  type HostClassRecord,
} from './api';
import {
  ALL_DETAIL_TABS,
  attendanceHistory,
  attendanceKey,
  classMetaLine,
  classScheduleLabel,
  classState,
  editClassUrl,
  isPaidClass,
  nextTab,
  pendingForClass,
  publicClassUrl,
  seatsLeftText,
  seatsText,
  studentAggregates,
  tabFromHash,
  tabsForClass,
  type DetailTab,
} from './model';
import { TopBar } from './components/TopBar';
import { EmptyState, InlineError, Pill, Skeleton, StatCard } from './components/ui';
import { OverviewTab } from './components/OverviewTab';
import { StudentsTab } from './components/StudentsTab';
import { SessionsTab } from './components/SessionsTab';
import { PaymentsTab } from './components/PaymentsTab';
import { ShareTab } from './components/ShareTab';
import './classes.css';

const TAB_LABELS: Record<DetailTab, string> = {
  overview: 'Overview',
  students: 'Students',
  sessions: 'Sessions',
  payments: 'Payments',
  share: 'Share',
};

type ToastState = { kind: 'success' | 'error'; message: string } | null;

export default function ClassDetailApp() {
  const queryClient = useQueryClient();
  const classId = Number(new URLSearchParams(window.location.search).get('id'));
  const validId = Number.isInteger(classId) && classId > 0;

  const [tab, setTab] = useState<DetailTab>(() => tabFromHash(window.location.hash, ALL_DETAIL_TABS));
  const [toast, setToast] = useState<ToastState>(null);
  const [remindingId, setRemindingId] = useState<number | null>(null);
  const [remindingAll, setRemindingAll] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const classQuery = useQuery({
    queryKey: ['class', classId],
    queryFn: () => fetchClass(classId),
    enabled: validId,
  });
  const hostQuery = useQuery({
    queryKey: ['host-profile'],
    queryFn: fetchHostProfile,
    staleTime: 300_000,
  });
  const studentsQuery = useQuery({
    queryKey: ['class-students', classId],
    queryFn: () => fetchClassStudents(classId),
    enabled: validId,
  });

  const cls = classQuery.data;
  const paid = cls ? isPaidClass(cls) : false;
  const ended = cls ? classState(cls) === 'ended' : false;
  const draft = cls ? classState(cls) === 'draft' : false;
  const timeZone = hostQuery.data?.timezone || DEFAULT_TIMEZONE;
  const students = studentsQuery.data?.items ?? [];
  const history = useMemo(() => attendanceHistory(students), [students]);

  const paymentsQuery = useQuery({
    queryKey: ['class-payments'],
    queryFn: fetchPayments,
    enabled: paid,
    staleTime: 30_000,
  });
  const pendingQuery = useQuery({
    queryKey: ['pending-installments', 'all'],
    queryFn: fetchPendingInstallments,
    enabled: paid,
    staleTime: 30_000,
  });

  const tabs = cls ? tabsForClass(cls) : (['overview'] as DetailTab[]);
  const activeTab = tabs.includes(tab) ? tab : 'overview';
  const aggregates = useMemo(() => studentAggregates(students), [students]);
  const pendingInfo = useMemo(
    () => (cls ? pendingForClass(pendingQuery.data?.items ?? [], cls.id, timeZone) : null),
    [cls, pendingQuery.data, timeZone],
  );
  const remindTargets = useMemo(() => {
    if (!cls) return [];
    return students.filter((student) => {
      if (student.status !== 'active' && student.status !== 'pending_payment') return false;
      return Number(student.balance) > 0 || (cls.require_seat_confirmation && !student.confirmed);
    });
  }, [students, cls]);

  useEffect(() => {
    function syncFromHash() {
      setTab(tabFromHash(window.location.hash, ALL_DETAIL_TABS));
    }
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(message: string, kind: 'success' | 'error' = 'success') {
    setToast({ kind, message });
  }

  function selectTab(next: DetailTab) {
    setTab(next);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
  }

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    let next: DetailTab | null = null;
    if (event.key === 'ArrowRight') next = nextTab(tabs, activeTab, 1);
    if (event.key === 'ArrowLeft') next = nextTab(tabs, activeTab, -1);
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    window.requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  }

  async function handleCopy(text: string, message: string) {
    const copied = await copyText(text);
    notify(copied ? message : 'Could not copy. Select the text and copy it manually.', copied ? 'success' : 'error');
  }

  async function handleRemind(studentId: number, studentName: string) {
    setRemindingId(studentId);
    try {
      const result = await remindBooking(studentId);
      notify(
        result.sent
          ? `Reminder sent to ${studentName}.`
          : `WhatsApp could not send to ${studentName}. Check the number and try again.`,
        result.sent ? 'success' : 'error',
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send that reminder.', 'error');
    } finally {
      setRemindingId(null);
    }
  }

  async function handleRemindAll() {
    if (!remindTargets.length) return;
    setRemindingAll(true);
    let sent = 0;
    const failed: string[] = [];
    for (const student of remindTargets) {
      try {
        const result = await remindBooking(student.id);
        if (result.sent) sent += 1;
        else failed.push(student.student_name);
      } catch {
        failed.push(student.student_name);
      }
    }
    setRemindingAll(false);
    if (failed.length) {
      const names = failed.slice(0, 3).join(', ');
      notify(
        `Sent ${sent} of ${remindTargets.length} reminders. Could not send to ${names}${failed.length > 3 ? '…' : ''}.`,
        'error',
      );
      return;
    }
    notify(`Reminders sent to ${sent} ${sent === 1 ? 'student' : 'students'}.`);
  }

  async function handlePublish() {
    if (!cls) return;
    setPublishing(true);
    try {
      await publishClass(cls.id);
      await queryClient.invalidateQueries({ queryKey: ['class', cls.id] });
      await queryClient.invalidateQueries({ queryKey: ['classes', 'all'] });
      notify('Class published. The booking link is live.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not publish this class.', 'error');
    } finally {
      setPublishing(false);
    }
  }

  async function handleAttendance(sessionId: number, bookingId: number, present: boolean) {
    const key = attendanceKey(sessionId, bookingId);
    const previous = marks[key];
    setMarks((current) => ({ ...current, [key]: present }));
    setSavingKey(key);
    try {
      await saveAttendance(sessionId, [{ booking: bookingId, present }]);
    } catch (error) {
      setMarks((current) => {
        const next = { ...current };
        if (previous === undefined) delete next[key];
        else next[key] = previous;
        return next;
      });
      notify(error instanceof Error ? error.message : 'Could not save that attendance mark.', 'error');
    } finally {
      setSavingKey((current) => (current === key ? null : current));
    }
  }

  const statusPill = !cls ? null : draft ? (
    <Pill tone="draft">Draft</Pill>
  ) : ended ? (
    <Pill tone="ended">Ended</Pill>
  ) : (
    <Pill tone="live">Published</Pill>
  );

  return (
    <div className="tt-shell">
      <TopBar>
        <a className="tt-topbar-link" href="/classes/">
          All classes
        </a>
        <a className="tt-btn tt-btn-primary tt-btn-small" href="/classes/new/">
          New class
        </a>
      </TopBar>

      <main id="main" className="tt-main">
        <a className="tt-back" href="/classes/">
          <span aria-hidden="true">←</span> All classes
        </a>

        {!validId ? (
          <EmptyState
            title="Choose a class"
            body="Open a class from your list to see its students, sessions and payments."
            action={
              <a className="tt-btn tt-btn-primary" href="/classes/">
                Back to classes
              </a>
            }
          />
        ) : classQuery.isError ? (
          <div className="tt-stack">
            <InlineError message={classQuery.error.message} onRetry={() => void classQuery.refetch()} />
            <a className="tt-btn tt-btn-secondary" href="/classes/">
              Back to classes
            </a>
          </div>
        ) : !cls ? (
          <div className="tt-stack" aria-busy="true">
            <Skeleton height={40} width="55%" />
            <Skeleton height={20} width="40%" />
            <div className="tt-stat-grid">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} height={92} />
              ))}
            </div>
            <Skeleton height={240} />
          </div>
        ) : (
          <>
            <header className="tt-detail-head">
              <div className="tt-detail-head-main">
                <div className="tt-detail-pills">
                  {statusPill}
                  <Pill tone="neutral">{paid ? formatNaira(cls.price) : 'Free'}</Pill>
                  {aggregates.waitlisted > 0 ? <Pill tone="warning">{aggregates.waitlisted} on waitlist</Pill> : null}
                  {cls.allow_installments && paid ? <Pill tone="neutral">Instalments</Pill> : null}
                </div>
                <h1>{cls.title}</h1>
                <p className="tt-detail-meta">{classMetaLine(cls, timeZone)}</p>
              </div>
              <div className="tt-detail-actions">
                {!draft ? (
                  <a className="tt-btn tt-btn-secondary" href={publicClassUrl(cls.slug)} target="_blank" rel="noreferrer">
                    View public page
                  </a>
                ) : null}
                <a className="tt-btn tt-btn-secondary" href={editClassUrl(cls.id)}>
                  Edit class
                </a>
                <button
                  type="button"
                  className="tt-btn tt-btn-primary"
                  onClick={() => void handleCopy(publicClassUrl(cls.slug), 'Class link copied.')}
                >
                  Copy link
                </button>
              </div>
            </header>

            {draft ? (
              <div className="tt-banner" role="status">
                <div>
                  <strong>This class is still a draft.</strong>
                  <p>Students can’t see or book it yet. Publish when the details are ready.</p>
                </div>
                <button
                  type="button"
                  className="tt-btn tt-btn-primary"
                  onClick={() => void handlePublish()}
                  disabled={publishing}
                  aria-busy={publishing}
                >
                  {publishing ? 'Publishing…' : 'Publish class'}
                </button>
              </div>
            ) : null}

            <section className="tt-stat-grid" aria-label="Class totals">
              {paid ? (
                <>
                  <StatCard
                    label="Collected"
                    value={draft ? '—' : studentsQuery.isLoading ? <Skeleton height={28} width={90} /> : formatNaira(aggregates.collected)}
                    hint={draft ? 'Available after publishing' : `${aggregates.paid} paid in full`}
                    dashed={draft}
                  />
                  <StatCard
                    label="Outstanding"
                    value={draft ? '—' : studentsQuery.isLoading ? <Skeleton height={28} width={90} /> : formatNaira(aggregates.outstanding)}
                    hint={
                      draft
                        ? 'Available after publishing'
                        : pendingInfo?.overdueCount
                          ? `${formatNaira(pendingInfo.overdueAmount)} overdue`
                          : 'Nothing overdue'
                    }
                    dashed={draft}
                  />
                  <StatCard
                    label="Students"
                    value={draft ? '—' : studentsQuery.isLoading ? <Skeleton height={28} width={48} /> : aggregates.students}
                    hint={draft ? 'Available after publishing' : `${aggregates.unconfirmed} not confirmed`}
                    dashed={draft}
                  />
                  <StatCard
                    label="Seats left"
                    value={draft ? '—' : seatsLeftText(cls)}
                    hint={draft ? 'Available after publishing' : seatsText(cls)}
                    dashed={draft}
                  />
                </>
              ) : (
                <>
                  <StatCard
                    label="Students"
                    value={draft ? '—' : studentsQuery.isLoading ? <Skeleton height={28} width={48} /> : aggregates.students}
                    hint={draft ? 'Available after publishing' : `${aggregates.unconfirmed} not confirmed`}
                    dashed={draft}
                  />
                  <StatCard
                    label="Seats left"
                    value={draft ? '—' : seatsLeftText(cls)}
                    hint={draft ? 'Available after publishing' : seatsText(cls)}
                    dashed={draft}
                  />
                  <StatCard
                    label="Sessions"
                    value={draft ? '—' : cls.sessions.length}
                    hint={draft ? 'Available after publishing' : classScheduleLabel(cls, timeZone)}
                    dashed={draft}
                  />
                  <StatCard
                    label="Waitlist"
                    value={draft ? '—' : aggregates.waitlisted}
                    hint={draft ? 'Available after publishing' : 'Free class'}
                    dashed={draft}
                  />
                </>
              )}
            </section>

            {tabs.length > 1 ? (
              <div className="tt-tabs" role="tablist" aria-label="Class sections" onKeyDown={handleTabKey}>
                {tabs.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    id={`tab-${item}`}
                    aria-selected={activeTab === item}
                    aria-controls={`panel-${item}`}
                    tabIndex={activeTab === item ? 0 : -1}
                    className={`tt-tab${activeTab === item ? ' is-active' : ''}`}
                    onClick={() => selectTab(item)}
                  >
                    {TAB_LABELS[item]}
                    {item === 'students' && !studentsQuery.isLoading ? ` (${aggregates.students})` : ''}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              id={`panel-${activeTab}`}
              role={tabs.length > 1 ? 'tabpanel' : undefined}
              aria-labelledby={tabs.length > 1 ? `tab-${activeTab}` : undefined}
              tabIndex={tabs.length > 1 ? 0 : undefined}
              className="tt-panel"
            >
              {activeTab === 'overview' ? (
                <OverviewTab
                  cls={cls}
                  timeZone={timeZone}
                  students={students}
                  pending={pendingQuery.data?.items ?? []}
                  paid={paid}
                  ended={ended}
                  draft={draft}
                  remindTargets={remindTargets.length}
                  remindingAll={remindingAll}
                  onOpenTab={selectTab}
                  onCopy={() => void handleCopy(publicClassUrl(cls.slug), 'Class link copied.')}
                  onRemindAll={() => void handleRemindAll()}
                />
              ) : null}

              {activeTab === 'students' ? (
                <StudentsTab
                  cls={cls}
                  students={students}
                  paid={paid}
                  ended={ended}
                  loading={studentsQuery.isLoading}
                  error={studentsQuery.isError ? studentsQuery.error.message : undefined}
                  onRetry={() => void studentsQuery.refetch()}
                  onRemind={(student) => void handleRemind(student.id, student.student_name)}
                  remindingId={remindingId}
                />
              ) : null}

              {activeTab === 'sessions' ? (
                <SessionsTab
                  cls={cls}
                  students={students}
                  timeZone={timeZone}
                  ended={ended}
                  loading={studentsQuery.isLoading}
                  marks={marks}
                  history={history}
                  savingKey={savingKey}
                  onToggle={(sessionId, bookingId, present) => void handleAttendance(sessionId, bookingId, present)}
                />
              ) : null}

              {activeTab === 'payments' && paid ? (
                <PaymentsTab
                  cls={cls}
                  students={students}
                  payments={paymentsQuery.data?.items ?? []}
                  pending={pendingQuery.data?.items ?? []}
                  timeZone={timeZone}
                  ended={ended}
                  loading={studentsQuery.isLoading || paymentsQuery.isLoading || pendingQuery.isLoading}
                  paymentsError={paymentsQuery.isError ? paymentsQuery.error.message : undefined}
                  pendingError={pendingQuery.isError ? pendingQuery.error.message : undefined}
                  onRetry={() => {
                    void paymentsQuery.refetch();
                    void pendingQuery.refetch();
                  }}
                  onRemind={(bookingId, studentName) => void handleRemind(bookingId, studentName)}
                  remindingId={remindingId}
                />
              ) : null}

              {activeTab === 'share' ? (
                <ShareTab
                  cls={cls}
                  timeZone={timeZone}
                  onCopy={(text, message) => void handleCopy(text, message)}
                  notify={(message, kind) => notify(message, kind)}
                />
              ) : null}
            </div>
          </>
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
