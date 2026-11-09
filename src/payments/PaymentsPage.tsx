import { useCallback, useEffect, useState } from 'react';
import { HostHeader } from '../components/HostHeader';
import { formatMoney } from '../lib/money';
import {
  downloadPaymentCsv,
  fetchClassRanking,
  fetchMonthlyCollections,
  fetchOverdue,
  fetchPaymentSummary,
  fetchReminderPreview,
  queueOverdueReminders,
  type MonthlyCollection,
  type OverduePayment,
  type PaymentExportType,
  type PaymentRange,
  type PaymentSummary,
  type RankedClass,
  type ReminderPreview,
} from './api';
import './payments.css';

type ClassFilter = 'all' | 'live' | 'ended';

const RANGE_LABELS: Record<PaymentRange, string> = {
  this_month: 'This month',
  last_3_months: 'Last 3 months',
  all: 'All time',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

export function PaymentsPage() {
  const [range, setRange] = useState<PaymentRange>('this_month');
  const [classFilterId, setClassFilterId] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [months, setMonths] = useState<MonthlyCollection[]>([]);
  const [classes, setClasses] = useState<RankedClass[]>([]);
  const [overdue, setOverdue] = useState<OverduePayment[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overduePage, setOverduePage] = useState(1);
  const [overdueNext, setOverdueNext] = useState<number | null>(null);
  const [overduePrevious, setOverduePrevious] = useState<number | null>(null);
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState<PaymentExportType | null>(null);

  const classId = classFilterId ? Number(classFilterId) : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, monthly, ranking, latePayments, reminderPreview] = await Promise.all([
        fetchPaymentSummary(range),
        fetchMonthlyCollections(),
        fetchClassRanking(range),
        fetchOverdue({ classId, page: overduePage }),
        fetchReminderPreview(classId),
      ]);
      setSummary(nextSummary);
      setMonths(monthly.results);
      setClasses(ranking.results);
      setOverdue(latePayments.results);
      setOverdueCount(latePayments.count);
      setOverdueNext(latePayments.next);
      setOverduePrevious(latePayments.previous);
      setPreview(reminderPreview);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [range, classId, overduePage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport(type: PaymentExportType) {
    setExporting(type);
    setNotice(null);
    setError(null);
    try {
      const downloaded = await downloadPaymentCsv(type, range, classId, summary?.timezone);
      setNotice(downloaded ? 'Your CSV export is ready.' : 'There are no rows for this export.');
    } catch (exportError) {
      setError(messageOf(exportError));
    } finally {
      setExporting(null);
    }
  }

  async function handleSendReminders() {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const result = await queueOverdueReminders(classId);
      setNotice(
        result.queued
          ? `${result.queued} reminder${result.queued === 1 ? '' : 's'} queued.`
          : 'No new reminders were queued. Students may already have been reminded today.',
      );
      setConfirmSend(false);
      await load();
    } catch (sendError) {
      setError(messageOf(sendError));
    } finally {
      setSending(false);
    }
  }

  const visibleClasses = classes.filter((item) => {
    if (classFilter === 'live') return !item.ended;
    if (classFilter === 'ended') return item.ended;
    return true;
  });
  const chartMaximum = Math.max(...months.map((item) => Number(item.amount)), 0);

  return (
    <div className="payments-page">
      <HostHeader context="Payments">
        <a className="payments-nav-link" href="/dashboard/">Dashboard</a>
      </HostHeader>

      <main className="payments-main">
        <div className="payments-page-heading">
          <div>
            <p className="payments-eyebrow">Money overview</p>
            <h1>Payments</h1>
            <p className="payments-subtitle">A clear view of what you’ve collected and what’s still due.</p>
          </div>
          <label className="payments-range">
            <span>Reporting period</span>
            <select value={range} onChange={(event) => setRange(event.target.value as PaymentRange)}>
              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="payments-alert payments-alert-error" role="alert">
            <span>{error}</span>
            <button type="button" className="payments-text-button" onClick={() => void load()}>Try again</button>
          </div>
        ) : null}
        {notice ? <p className="payments-alert payments-alert-success" role="status">{notice}</p> : null}

        {loading && !summary ? (
          <div className="payments-loading" role="status">Loading your payment report…</div>
        ) : null}
        {loading && summary ? <p className="payments-loading" role="status">Refreshing your payment report…</p> : null}

        {summary ? (
          <>
            <section className="payments-kpis" aria-label="Payment summary">
              <article className="payments-kpi payments-kpi-primary">
                <span>Collected</span>
                <strong>{formatMoney(summary.collected_amount)}</strong>
                <small>{summary.successful_payment_count} successful payments</small>
              </article>
              <article className="payments-kpi">
                <span>Still to come</span>
                <strong>{formatMoney(summary.still_to_come_amount)}</strong>
                <small>Remaining booking balances</small>
              </article>
              <article className="payments-kpi">
                <span>Overdue</span>
                <strong>{formatMoney(summary.overdue_amount)}</strong>
                <small>{summary.overdue_booking_count} bookings with overdue instalments</small>
              </article>
              <article className="payments-kpi">
                <span>Paid on time</span>
                <strong>{summary.paid_on_time_percent === null ? '—' : `${summary.paid_on_time_percent}%`}</strong>
                <small>By instalment amount, in {summary.timezone}</small>
              </article>
            </section>

            <section className="payments-panel payments-monthly">
              <div className="payments-section-heading">
                <div>
                  <h2>Monthly collections</h2>
                  <p>Successful payments received over the last 12 months.</p>
                </div>
                <span className="payments-muted">{summary.timezone}</span>
              </div>
              <div className="payments-chart" role="img" aria-label="Monthly collections bar chart">
                {months.map((item) => {
                  const amount = Number(item.amount);
                  const height = chartMaximum > 0 ? Math.max((amount / chartMaximum) * 100, amount > 0 ? 3 : 0) : 0;
                  return (
                    <div className="payments-chart-column" key={item.month}>
                      <span className="payments-chart-amount">{amount > 0 ? formatMoney(item.amount) : ''}</span>
                      <div className="payments-chart-track">
                        <div
                          className="payments-chart-bar"
                          style={{ height: `${height}%` }}
                          title={`${monthLabel(item.month)}: ${formatMoney(item.amount)}`}
                        />
                      </div>
                      <span className="payments-chart-month">{monthLabel(item.month)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="payments-panel">
              <div className="payments-section-heading payments-section-heading-wrap">
                <div>
                  <h2>Class performance</h2>
                  <p>Ranked by successful collections during {RANGE_LABELS[range].toLowerCase()}.</p>
                </div>
                <div className="payments-toolbar">
                  <div className="payments-segmented" aria-label="Filter classes">
                    {(['all', 'live', 'ended'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        aria-pressed={classFilter === filter}
                        onClick={() => setClassFilter(filter)}
                      >
                        {filter === 'all' ? 'All classes' : filter === 'live' ? 'Live' : 'Ended'}
                      </button>
                    ))}
                  </div>
                  <label className="payments-select-label">
                    <span className="payments-sr-only">Choose a class for exports and overdue payments</span>
                    <select
                      value={classFilterId}
                      onChange={(event) => {
                        setClassFilterId(event.target.value);
                        setOverduePage(1);
                      }}
                    >
                      <option value="">All classes</option>
                      {classes.map((item) => <option value={item.class_id} key={item.class_id}>{item.class_name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className="payments-table-scroll">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th scope="col">Class</th>
                      <th scope="col">Students</th>
                      <th scope="col">Collected</th>
                      <th scope="col">Still due</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClasses.map((item) => (
                      <tr key={item.class_id}>
                        <th scope="row">{item.class_name}</th>
                        <td>{item.student_count}</td>
                        <td>{formatMoney(item.collected_amount)}</td>
                        <td>{formatMoney(item.outstanding_amount)}</td>
                        <td><span className={`payments-status ${item.ended ? 'is-ended' : 'is-live'}`}>{item.ended ? 'Ended' : 'Live'}</span></td>
                      </tr>
                    ))}
                    {!visibleClasses.length ? (
                      <tr><td className="payments-empty" colSpan={5}>No classes match this filter.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="payments-export-actions">
                <span>Download a host-scoped CSV report</span>
                <button type="button" className="payments-button payments-button-secondary" disabled={exporting !== null} onClick={() => void handleExport('received')}>
                  {exporting === 'received' ? 'Preparing…' : 'Export received'}
                </button>
                <button type="button" className="payments-button payments-button-secondary" disabled={exporting !== null} onClick={() => void handleExport('overdue')}>
                  {exporting === 'overdue' ? 'Preparing…' : 'Export overdue'}
                </button>
              </div>
            </section>

            <section className="payments-panel payments-overdue">
              <div className="payments-section-heading payments-section-heading-wrap">
                <div>
                  <h2>Overdue payments</h2>
                  <p>{overdueCount} overdue instalment{overdueCount === 1 ? '' : 's'} · local dates use {summary.timezone}.</p>
                </div>
                {overdueCount ? (
                  <div className="payments-pagination" aria-label="Overdue payment pages">
                    <button type="button" disabled={!overduePrevious} onClick={() => setOverduePage(overduePrevious ?? 1)}>Previous</button>
                    <span>Page {overduePage}</span>
                    <button type="button" disabled={!overdueNext} onClick={() => setOverduePage(overdueNext ?? overduePage)}>Next</button>
                  </div>
                ) : null}
              </div>
              <div className="payments-table-scroll">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Class</th>
                      <th scope="col">Amount due</th>
                      <th scope="col">Due date</th>
                      <th scope="col">Late by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((item) => (
                      <tr key={item.installment_id}>
                        <th scope="row">{item.student_name}</th>
                        <td>{item.class_name}</td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{new Date(`${item.due_date}T00:00:00`).toLocaleDateString()}</td>
                        <td>{item.days_overdue} day{item.days_overdue === 1 ? '' : 's'}</td>
                      </tr>
                    ))}
                    {!overdue.length ? (
                      <tr><td className="payments-empty" colSpan={5}>No overdue instalments. You’re all caught up.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payments-panel payments-reminders">
              <div className="payments-section-heading payments-section-heading-wrap">
                <div>
                  <h2>Payment reminders</h2>
                  <p>Preview the overdue reminder before queueing it for eligible students.</p>
                </div>
                <span className={`payments-status ${preview?.send_allowed ? 'is-live' : 'is-ended'}`}>
                  {preview?.send_allowed ? 'Template ready' : 'Sending disabled'}
                </span>
              </div>
              {preview?.disabled_reason ? <p className="payments-reminder-warning" role="status">{preview.disabled_reason}</p> : null}
              <div className="payments-reminder-meta">
                <span>{preview?.eligible_count ?? 0} eligible</span>
                <span>{preview?.opted_out_count ?? 0} opted out</span>
              </div>
              {preview?.samples.length ? (
                <div className="payments-message-samples">
                  {preview.samples.map((sample, index) => (
                    <article key={`${sample.student_name}-${index}`} className="payments-message-sample">
                      <p><strong>{sample.student_name}</strong> · {sample.class_name}</p>
                      <blockquote>{sample.message}</blockquote>
                    </article>
                  ))}
                </div>
              ) : <p className="payments-muted">There are no eligible overdue reminders to preview.</p>}
              {confirmSend ? (
                <div className="payments-confirm" role="group" aria-label="Confirm overdue reminders">
                  <p>Queue reminders for {preview?.eligible_count ?? 0} eligible student(s)?</p>
                  <button type="button" className="payments-button payments-button-primary" disabled={sending} onClick={() => void handleSendReminders()}>
                    {sending ? 'Queueing…' : 'Confirm and queue'}
                  </button>
                  <button type="button" className="payments-button payments-button-secondary" disabled={sending} onClick={() => setConfirmSend(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="payments-button payments-button-primary"
                  disabled={!preview?.send_allowed || !preview.eligible_count || sending}
                  onClick={() => setConfirmSend(true)}
                >
                  Send overdue reminders
                </button>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
