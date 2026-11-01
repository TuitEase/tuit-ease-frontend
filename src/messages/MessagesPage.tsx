import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken, isAuthTokenStorageEvent } from '../auth/api';
import { fetchHost } from '../dashboard/api';
import { HostHeader } from '../components/HostHeader';
import {
  fetchAnnouncementPreview,
  fetchMessageActivity,
  fetchMessageClasses,
  fetchMessageIssues,
  fetchMessageSummary,
  fetchReminderPreviews,
  handleMessage,
  retryMessage,
  type MessageActivity,
  type MessageClass,
  type MessageIssue,
} from './api';
import './messages.css';

type MessageTab = 'attention' | 'announce' | 'activity';
type PreviewKind = 'confirmation' | 'day_before' | 'hour_before';

const TABS: Array<{ id: MessageTab; label: string }> = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'announce', label: 'Message a class' },
  { id: 'activity', label: 'Activity' },
];

const ACTIVITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'delivered', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'scheduled', label: 'Scheduled' },
];

const PREVIEW_TABS: Array<{ id: PreviewKind; label: string }> = [
  { id: 'confirmation', label: 'Booking confirmation' },
  { id: 'day_before', label: 'Day before' },
  { id: 'hour_before', label: 'Hour before' },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

function formatWhen(value: string | null, timeZone: string) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

function classIdFromUrl() {
  const value = new URLSearchParams(window.location.search).get('class');
  return value && /^\d+$/.test(value) ? value : 'all';
}

function tabFromUrl(): MessageTab | null {
  const value = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((tab) => tab.id === value) ? (value as MessageTab) : null;
}

function updateUrl(classId: string, tab: MessageTab) {
  const url = new URL(window.location.href);
  if (classId === 'all') url.searchParams.delete('class');
  else url.searchParams.set('class', classId);
  url.searchParams.set('tab', tab);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function phoneLink(phone: string, studentName: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  const message = `Hi ${firstName(studentName)}, `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function statusPresentation(activity: MessageActivity) {
  switch (activity.delivery_status) {
    case 'scheduled':
      return { label: 'Scheduled', tone: 'neutral', detail: 'Will be sent' };
    case 'failed':
      return { label: 'Failed', tone: 'danger', detail: 'Not sent' };
    case 'sms_fallback':
      return { label: 'Sent by SMS', tone: 'warning', detail: 'WhatsApp failed; SMS sent' };
    case 'skipped':
      return { label: 'Skipped', tone: 'neutral', detail: 'This message was not sent' };
    default:
      return { label: 'Sent', tone: 'success', detail: 'Accepted by the messaging provider' };
  }
}

function IssueCard({
  issue,
  timeZone,
  busy,
  onRetry,
  onHandle,
}: {
  issue: MessageIssue;
  timeZone: string;
  busy: boolean;
  onRetry: () => void;
  onHandle: () => void;
}) {
  const whatsappUrl = phoneLink(issue.student_phone, issue.student_name);
  const fixHref = `/students/?class=${issue.class_id}&student=${issue.student_id}`;

  return (
    <article className="message-issue-card">
      <div className="message-issue-heading">
        <div className="message-person">
          <span className="message-avatar" aria-hidden="true">{initials(issue.student_name)}</span>
          <span className="message-person-copy">
            <strong>{issue.student_name}</strong>
            <small>{issue.class_title} · {issue.kind.replaceAll('_', ' ')} · {formatWhen(issue.occurred_at, timeZone)}</small>
          </span>
        </div>
        <span className={`message-chip ${issue.state === 'failed' ? 'is-danger' : 'is-warning'}`}>
          {issue.state === 'failed' ? 'Not delivered' : 'Sent by SMS'}
        </span>
      </div>
      <p className="message-reason">{issue.reason_text}</p>
      <div className="message-issue-actions">
        {whatsappUrl ? (
          <a className="message-button message-whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            Message on WhatsApp
          </a>
        ) : (
          <span className="message-disabled-action" title="This phone number is not valid for a WhatsApp link">
            WhatsApp link unavailable: check their number
          </span>
        )}
        {issue.can_retry && (
          <button className="message-button message-secondary-button" type="button" disabled={busy} onClick={onRetry}>
            {busy ? 'Scheduling…' : 'Try sending again'}
          </button>
        )}
        <a className="message-fix-link" href={fixHref}>Fix their number</a>
        <button className="message-handle-button" type="button" disabled={busy} onClick={onHandle}>
          Mark as handled
        </button>
      </div>
    </article>
  );
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const hasAuthToken = Boolean(getAuthToken());
  const [classFilter, setClassFilter] = useState(classIdFromUrl);
  const [activeTab, setActiveTab] = useState<MessageTab>(() => tabFromUrl() ?? 'attention');
  const [tabWasSpecified] = useState(() => tabFromUrl() !== null);
  const [activityFilter, setActivityFilter] = useState('all');
  const [previewTab, setPreviewTab] = useState<PreviewKind>('confirmation');
  const [announcementClassId, setAnnouncementClassId] = useState<number | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [includeWaitlist, setIncludeWaitlist] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [debouncedText, setDebouncedText] = useState('');

  useEffect(() => {
    const checkSession = (event?: StorageEvent) => {
      if (event && !isAuthTokenStorageEvent(event)) return;
      if (!getAuthToken()) window.location.assign('/signin/');
    };
    checkSession();
    window.addEventListener('storage', checkSession);
    return () => window.removeEventListener('storage', checkSession);
  }, []);

  useEffect(() => {
    updateUrl(classFilter, activeTab);
  }, [classFilter, activeTab]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedText(announcementText), 250);
    return () => window.clearTimeout(timeout);
  }, [announcementText]);

  const hostQuery = useQuery({ queryKey: ['host-profile'], queryFn: fetchHost, enabled: hasAuthToken });
  const classesQuery = useQuery({ queryKey: ['message-classes'], queryFn: fetchMessageClasses, enabled: hasAuthToken });
  const classes = classesQuery.data ?? [];
  const visibleClasses = useMemo(
    () => classFilter === 'all' ? classes : classes.filter((item) => String(item.id) === classFilter),
    [classFilter, classes],
  );
  const liveClasses = classes.filter((item) => item.status === 'live');
  const selectedAnnouncementClass = liveClasses.find((item) => item.id === announcementClassId) ?? null;
  const activePreviewClass = visibleClasses.find((item) => item.status === 'live') ?? liveClasses[0] ?? null;

  useEffect(() => {
    if (!liveClasses.length) {
      setAnnouncementClassId(null);
      return;
    }
    if (liveClasses.some((item) => item.id === announcementClassId)) return;
    const fromFilter = liveClasses.find((item) => String(item.id) === classFilter);
    setAnnouncementClassId((fromFilter ?? liveClasses[0]).id);
  }, [announcementClassId, classFilter, classes]);

  const summaryQuery = useQuery({
    queryKey: ['messages-summary', classFilter],
    queryFn: () => fetchMessageSummary(classFilter),
    enabled: hasAuthToken,
  });
  const issuesQuery = useInfiniteQuery({
    queryKey: ['message-issues', classFilter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchMessageIssues(classFilter, pageParam),
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: hasAuthToken,
  });
  const activityQuery = useInfiniteQuery({
    queryKey: ['message-activity', classFilter, activityFilter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchMessageActivity(classFilter, activityFilter, pageParam),
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: hasAuthToken && activeTab === 'activity',
  });
  const remindersQuery = useQuery({
    queryKey: ['message-previews', activePreviewClass?.id],
    queryFn: () => fetchReminderPreviews(activePreviewClass!.id),
    enabled: hasAuthToken && activePreviewClass !== null,
  });
  const announcementPreviewQuery = useQuery({
    queryKey: ['announcement-preview', announcementClassId, debouncedText],
    queryFn: () => fetchAnnouncementPreview(announcementClassId!, debouncedText),
    enabled: hasAuthToken && announcementClassId !== null,
  });

  useEffect(() => {
    if (tabWasSpecified) return;
    if (summaryQuery.data) setActiveTab(summaryQuery.data.needs_attention > 0 ? 'attention' : 'activity');
  }, [summaryQuery.data, tabWasSpecified]);

  const issues = issuesQuery.data?.pages.flatMap((page) => page.results) ?? [];
  const activity = activityQuery.data?.pages.flatMap((page) => page.results) ?? [];
  const summary = summaryQuery.data;
  const host = hostQuery.data;
  const timezone = host?.timezone || 'Africa/Lagos';
  const audienceCount = selectedAnnouncementClass
    ? selectedAnnouncementClass.message_audience.students + (includeWaitlist ? selectedAnnouncementClass.message_audience.waiting_list : 0)
    : 0;
  const overLimit = Boolean(summary && audienceCount > summary.messages_remaining);

  const runIssueAction = async (issue: MessageIssue, action: 'retry' | 'handled') => {
    setActionId(issue.id);
    setFlash(null);
    try {
      if (action === 'retry') {
        await retryMessage(issue.id);
        setFlash({ kind: 'success', text: `Sent again to ${firstName(issue.student_name)}. We will tell you if it fails.` });
      } else {
        await handleMessage(issue.id);
        setFlash({ kind: 'success', text: 'Marked as handled.' });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['message-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['message-activity'] }),
      ]);
    } catch (error) {
      setFlash({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update this message.' });
    } finally {
      setActionId(null);
    }
  };

  const setTab = (tab: MessageTab) => {
    setActiveTab(tab);
    setFlash(null);
  };

  const currentPreview = remindersQuery.data?.[previewTab];

  return (
    <div className="messages-page">
      <HostHeader context="Messages">
        <a className="messages-dashboard-link" href="/dashboard/">Dashboard</a>
      </HostHeader>
      <main className="messages-container" id="top">
        <section className="messages-heading-row">
          <div>
            <h1>Messages</h1>
            <p>What TuitEase sends to your students for you, and anything that needs you.</p>
          </div>
          <div className="messages-class-filter">
            <label htmlFor="messages-class-filter">Show</label>
            <select
              id="messages-class-filter"
              className="messages-input"
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setFlash(null);
              }}
            >
              <option value="all">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}{item.status === 'ended' ? ' (ended)' : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        {flash && <div className={`messages-flash is-${flash.kind}`} role="status">{flash.text}</div>}
        {(summaryQuery.isError || classesQuery.isError || hostQuery.isError) && (
          <div className="messages-error" role="alert">
            <span>
              {summaryQuery.error instanceof Error ? summaryQuery.error.message
                : classesQuery.error instanceof Error ? classesQuery.error.message
                  : hostQuery.error instanceof Error ? hostQuery.error.message : 'Could not load messages.'}
            </span>
            <button type="button" onClick={() => void Promise.all([summaryQuery.refetch(), classesQuery.refetch(), hostQuery.refetch()])}>
              Try again
            </button>
          </div>
        )}

        <section className="message-metrics" aria-label="Message delivery overview">
          {summaryQuery.isLoading ? (
            <div className="message-metric-skeleton" role="status">Loading message summary…</div>
          ) : summary ? (
            <>
              <article className={`message-metric ${summary.needs_attention > 0 ? 'is-attention' : ''}`}>
                <span>Needs attention</span><strong>{summary.needs_attention}</strong>
                <small>{summary.needs_attention ? 'Open the first tab' : 'All clear'}</small>
              </article>
              <article className="message-metric">
                <span>Sent today</span><strong>{summary.sent_today} of {summary.daily_limit}</strong>
                <small>WhatsApp messages sent</small>
              </article>
              <article className="message-metric">
                <span>Sent</span><strong>{summary.sent_percent_30d}%</strong>
                <small>Last 30 days · {summary.delivery_metric_note}</small>
              </article>
              <article className="message-metric">
                <span>Scheduled</span><strong>{summary.scheduled}</strong>
                <small>Going out next</small>
              </article>
            </>
          ) : null}
        </section>

        <div className="messages-columns">
          <section className="messages-main-column" aria-label="Messages">
            <div className="messages-tabs" role="tablist" aria-label="Messages sections">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const count = tab.id === 'attention' ? summary?.needs_attention : undefined;
                return (
                  <button
                    key={tab.id}
                    id={`messages-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`messages-panel-${tab.id}`}
                    className={`messages-tab ${active ? 'is-active' : ''}`}
                    onClick={() => setTab(tab.id)}
                  >
                    {tab.label}
                    {count !== undefined && (
                      <span className={`messages-tab-count ${tab.id === 'attention' && count > 0 && !active ? 'has-issues' : ''}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === 'attention' && (
              <div id="messages-panel-attention" role="tabpanel" aria-labelledby="messages-tab-attention" className="messages-panel">
                {issuesQuery.isLoading ? (
                  <div className="messages-empty" role="status">Loading messages that need attention…</div>
                ) : issuesQuery.isError ? (
                  <div className="messages-error" role="alert">
                    <span>{issuesQuery.error instanceof Error ? issuesQuery.error.message : 'Could not load message issues.'}</span>
                    <button type="button" onClick={() => void issuesQuery.refetch()}>Try again</button>
                  </div>
                ) : issues.length === 0 ? (
                  <div className="messages-all-clear">
                    <strong>Everything was delivered.</strong>
                    <span>Nothing needs you right now. We will show failed messages here as soon as they happen.</span>
                  </div>
                ) : (
                  <>
                    {issues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        timeZone={timezone}
                        busy={actionId === issue.id}
                        onRetry={() => void runIssueAction(issue, 'retry')}
                        onHandle={() => void runIssueAction(issue, 'handled')}
                      />
                    ))}
                    {issuesQuery.hasNextPage && (
                      <button className="messages-button messages-secondary-button messages-show-more" type="button" disabled={issuesQuery.isFetchingNextPage} onClick={() => void issuesQuery.fetchNextPage()}>
                        {issuesQuery.isFetchingNextPage ? 'Loading…' : 'Show more'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'announce' && (
              <div id="messages-panel-announce" role="tabpanel" aria-labelledby="messages-tab-announce" className="messages-compose-card">
                <div>
                  <h2>Message a whole class</h2>
                  <p>For anything everyone should know: a change, a reminder to bring something, a thank you. For one person, use Message on WhatsApp from the Students page.</p>
                </div>
                <div className="messages-field">
                  <label htmlFor="announcement-class">Which class?</label>
                  <select
                    id="announcement-class"
                    className="messages-input"
                    value={announcementClassId ?? ''}
                    onChange={(event) => setAnnouncementClassId(Number(event.target.value) || null)}
                    disabled={!liveClasses.length}
                  >
                    {liveClasses.length === 0 ? <option value="">No live classes</option> : null}
                    {liveClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.message_audience.students} students)
                      </option>
                    ))}
                  </select>
                  {!liveClasses.length && <small>Announcements are available for live classes only.</small>}
                </div>
                <div className="messages-field">
                  <label htmlFor="announcement-text">Your message</label>
                  <textarea
                    id="announcement-text"
                    className="messages-input"
                    rows={5}
                    maxLength={500}
                    placeholder="e.g. Please bring a small towel on Saturday."
                    value={announcementText}
                    onChange={(event) => setAnnouncementText(event.target.value)}
                  />
                  <div className="messages-counter-row">
                    <span>Keep it short. Students read WhatsApp on their phone.</span>
                    <span>{announcementText.length} / 500</span>
                  </div>
                </div>
                <div className="messages-preview-section">
                  <div className="messages-preview-label">
                    <strong>How it will look on their phone</strong>
                    <span>
                      {announcementPreviewQuery.isLoading ? 'Loading preview…'
                        : announcementPreviewQuery.data ? `Example for ${announcementPreviewQuery.data.rendered_text.match(/^Hi ([^,]+)/)?.[1] ?? 'a student'}`
                          : 'Preview unavailable'}
                    </span>
                  </div>
                  <div className="messages-phone-wallpaper">
                    <div className="messages-chat-bubble">
                      <strong>{host?.business_name ?? 'Your class'} · TuitEase</strong>
                      {announcementPreviewQuery.isError ? (
                        <p role="alert">{announcementPreviewQuery.error instanceof Error ? announcementPreviewQuery.error.message : 'Could not load preview.'}</p>
                      ) : announcementPreviewQuery.data ? (
                        <p>{announcementPreviewQuery.data.rendered_text}</p>
                      ) : (
                        <p className="is-placeholder">Your message will appear here as you type.</p>
                      )}
                    </div>
                    <small>Now</small>
                  </div>
                  <p className="messages-template-note">
                    This is a draft preview only. WhatsApp sending is disabled until an approved “Class update” template is configured.
                  </p>
                </div>
                {selectedAnnouncementClass && selectedAnnouncementClass.message_audience.waiting_list > 0 && (
                  <label className="messages-waitlist-option">
                    <input type="checkbox" checked={includeWaitlist} onChange={(event) => setIncludeWaitlist(event.target.checked)} />
                    <span>Also send to the waiting list ({selectedAnnouncementClass.message_audience.waiting_list})</span>
                  </label>
                )}
                <div className="messages-audience-bar">
                  <div>
                    <strong>Goes to {audienceCount} {audienceCount === 1 ? 'student' : 'students'}</strong>
                    <span>You have {summary?.messages_remaining ?? 0} messages left today.</span>
                  </div>
                  <button type="button" className="messages-button messages-primary-button" disabled>
                    Send to {audienceCount}
                  </button>
                </div>
                {overLimit && <div className="messages-limit-error" role="alert">That is more than your messages left for today. Pick a smaller class or send it tomorrow.</div>}
                <div className="messages-template-blocked" role="status">
                  No approved WhatsApp “Class update” template is configured. Sending is unavailable; the message has not been sent.
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div id="messages-panel-activity" role="tabpanel" aria-labelledby="messages-tab-activity" className="messages-panel">
                <div className="messages-filter-pills" role="group" aria-label="Activity status">
                  {ACTIVITY_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      aria-pressed={activityFilter === filter.value}
                      className={`messages-filter-pill ${activityFilter === filter.value ? 'is-active' : ''}`}
                      onClick={() => setActivityFilter(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {activityQuery.isLoading ? (
                  <div className="messages-empty" role="status">Loading message activity…</div>
                ) : activityQuery.isError ? (
                  <div className="messages-error" role="alert">
                    <span>{activityQuery.error instanceof Error ? activityQuery.error.message : 'Could not load message activity.'}</span>
                    <button type="button" onClick={() => void activityQuery.refetch()}>Try again</button>
                  </div>
                ) : activity.length === 0 ? (
                  <div className="messages-activity-list">No messages match.</div>
                ) : (
                  <div className="messages-activity-list">
                    {activity.map((item) => {
                      const status = statusPresentation(item);
                      const when = item.delivery_status === 'scheduled' ? item.scheduled_for : item.occurred_at;
                      return (
                        <article key={item.id} className="messages-activity-row">
                          <div className="messages-activity-copy">
                            <strong>{item.kind_label}</strong>
                            <span>{item.class_title} · {item.recipient_label}</span>
                            <small>{formatWhen(when, timezone)}</small>
                          </div>
                          <div className="messages-activity-status">
                            <span className={`message-chip is-${status.tone}`}>{status.label}</span>
                            <small>{status.detail}</small>
                          </div>
                        </article>
                      );
                    })}
                    {activityQuery.hasNextPage && (
                      <button className="messages-button messages-secondary-button messages-show-more" type="button" disabled={activityQuery.isFetchingNextPage} onClick={() => void activityQuery.fetchNextPage()}>
                        {activityQuery.isFetchingNextPage ? 'Loading…' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="messages-side-column">
            <section className="messages-side-card">
              <h2>What your students get</h2>
              <p>A preview with your class details filled in. It goes out automatically.</p>
              <div className="messages-preview-tabs" role="group" aria-label="Message preview">
                {PREVIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={previewTab === tab.id}
                    className={`messages-preview-pill ${previewTab === tab.id ? 'is-active' : ''}`}
                    onClick={() => setPreviewTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {activePreviewClass ? (
                <>
                  <div className="messages-phone-wallpaper compact">
                    <div className="messages-chat-bubble">
                      {remindersQuery.isLoading ? <p>Loading preview…</p>
                        : remindersQuery.isError ? <p role="alert">Could not load the message preview.</p>
                          : currentPreview?.rendered_text ? <p>{currentPreview.rendered_text}</p>
                            : <p className="is-placeholder">No preview available for this class.</p>}
                    </div>
                    <small>{currentPreview?.send_time_label ?? ''}</small>
                  </div>
                  <p className="messages-preview-example">
                    {remindersQuery.data?.sample_student ? `Example for ${remindersQuery.data.sample_student} · ` : ''}
                    {activePreviewClass.title}
                  </p>
                </>
              ) : (
                <div className="messages-empty">Create a live class to preview its automatic messages.</div>
              )}
            </section>
            <section className="messages-side-card messages-how-card">
              <h2>How sending works</h2>
              <p>Confirmations and reminders go out on their own. You never have to remember.</p>
              <p>If WhatsApp cannot reach a number, we try SMS and show it under Needs attention.</p>
              <p>Messages you send yourself from WhatsApp are private to you and do not appear here.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
