import { formatCalendarDate, formatDayMonth, todayKey } from '../../lib/datetime';
import { feePercentLabel } from '../../lib/fees';
import { formatNaira } from '../../lib/money';
import { useFeePreview } from '../../lib/useFeePreview';
import type { ClassStudent, HostClassRecord, PaymentRow, PendingInstallment } from '../api';
import { pendingForClass, studentAggregates, studentUrl } from '../model';
import { InlineError, Pill, Section, Skeleton, StatCard } from './ui';

export interface PaymentsTabProps {
  cls: HostClassRecord;
  students: ClassStudent[];
  payments: PaymentRow[];
  pending: PendingInstallment[];
  timeZone: string;
  ended: boolean;
  loading: boolean;
  paymentsError?: string;
  pendingError?: string;
  onRetry: () => void;
}

function methodLabel(method: string): string {
  if (method === 'manual') return 'Cash or transfer';
  if (method === 'paystack') return 'Paystack';
  return method || '—';
}

function paymentTone(status: string) {
  if (status === 'success') return 'paid' as const;
  if (status === 'failed') return 'unpaid' as const;
  return 'draft' as const;
}

export function PaymentsTab({
  cls,
  students,
  payments,
  pending,
  timeZone,
  ended,
  loading,
  paymentsError,
  pendingError,
  onRetry,
}: PaymentsTabProps) {
  const aggregates = studentAggregates(students);
  const pendingInfo = pendingForClass(pending, cls.id, timeZone);
  const classPending = pending
    .filter((row) => row.class_id === cls.id)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const classPayments = payments
    .filter((row) => row.class_name.trim().toLowerCase() === cls.title.trim().toLowerCase())
    .sort((a, b) => {
      const left = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const right = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return right - left;
    });
  const feePreview = useFeePreview(cls.price, undefined, cls.id);
  const fee = feePreview.fee;
  const today = todayKey(timeZone);

  return (
    <div className="tt-tab-body">
      <div className="tt-tab-head">
        <div>
          <h2>Payments</h2>
          <p>
            {ended ? 'This class has ended. ' : ''}
            Money collected and still to come for {cls.title}.
          </p>
        </div>
      </div>

      <div className="tt-stat-grid tt-stat-grid-3">
        <StatCard
          label="Collected"
          value={loading ? <Skeleton height={28} width={90} /> : formatNaira(aggregates.collected)}
          hint={`${aggregates.paid} paid in full`}
        />
        <StatCard
          label="Outstanding"
          value={loading ? <Skeleton height={28} width={90} /> : formatNaira(aggregates.outstanding)}
          hint={`${aggregates.partPaid + aggregates.unpaid} students with a balance`}
        />
        <StatCard
          label="Overdue"
          value={loading ? <Skeleton height={28} width={90} /> : formatNaira(pendingInfo.overdueAmount)}
          hint={
            pendingInfo.overdueCount
              ? `${pendingInfo.overdueCount} ${pendingInfo.overdueCount === 1 ? 'instalment' : 'instalments'} past due`
              : 'Nothing past due'
          }
        />
      </div>

      <div className="tt-detail-grid tt-detail-grid-payments">
        <div className="tt-stack">
          <Section title="Payment history" id="payment-history">
            {paymentsError ? (
              <InlineError message={paymentsError} onRetry={onRetry} />
            ) : loading ? (
              <div className="tt-skeleton-table" aria-hidden="true">
                <Skeleton height={46} />
                <Skeleton height={46} />
                <Skeleton height={46} />
              </div>
            ) : classPayments.length === 0 ? (
              <p className="tt-muted">No payments recorded for this class yet.</p>
            ) : (
              <div className="tt-table-wrap">
                <table className="tt-table">
                  <caption className="tt-sr-only">Payments for {cls.title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Student</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Method</th>
                      <th scope="col">Status</th>
                      <th scope="col">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.paid_at ? formatDayMonth(payment.paid_at, timeZone) : '—'}</td>
                        <td>{payment.student_name}</td>
                        <td>
                          <strong>{formatNaira(payment.amount)}</strong>
                        </td>
                        <td>{methodLabel(payment.method)}</td>
                        <td>
                          <Pill tone={paymentTone(payment.status)}>{payment.status}</Pill>
                        </td>
                        <td>
                          <code className="tt-reference" title={payment.reference}>
                            {payment.reference.slice(0, 12)}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="tt-hint">
              The payments API does not include a class id, so this list matches on the class name. Two classes with the
              same name cannot be told apart here yet.
            </p>
          </Section>

          <Section title="Still to come" id="pending-instalments">
            {pendingError ? (
              <InlineError message={pendingError} onRetry={onRetry} />
            ) : loading ? (
              <div className="tt-skeleton-table" aria-hidden="true">
                <Skeleton height={46} />
                <Skeleton height={46} />
              </div>
            ) : classPending.length === 0 ? (
              <p className="tt-muted">No pending instalments. Every booked student is up to date.</p>
            ) : (
              <div className="tt-table-wrap">
                <table className="tt-table">
                  <caption className="tt-sr-only">Pending instalments for {cls.title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Due</th>
                      <th scope="col">Student</th>
                      <th scope="col">Amount</th>
                      <th scope="col">State</th>
                      <th scope="col">
                        <span className="tt-sr-only">Student page</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classPending.map((row) => {
                      const overdue = String(row.due_date) < today;
                      return (
                        <tr key={row.id}>
                          <td>{formatCalendarDate(String(row.due_date))}</td>
                          <td>
                            <a href={studentUrl(row.student_id)}>{row.student_name}</a>
                          </td>
                          <td>
                            <strong>{formatNaira(row.amount)}</strong>
                          </td>
                          <td>{overdue ? <Pill tone="warning">Overdue</Pill> : <Pill tone="neutral">Scheduled</Pill>}</td>
                          <td>
                            <a className="tt-btn tt-btn-ghost tt-btn-small" href={studentUrl(row.student_id)}>
                              View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="tt-hint">
              Pending instalments do not include a booking id, so the reminder button lives on the Students tab.
            </p>
          </Section>
        </div>

        <aside className="tt-stack">
          <Section title="What you receive" id="payout">
            <p className="tt-muted">Per student payment of {formatNaira(cls.price)}.</p>
            {fee ? (
              <dl className="tt-money-list">
                <div>
                  <dt>Student pays</dt>
                  <dd>{formatNaira(fee.studentPays)}</dd>
                </div>
                <div>
                  <dt>Paystack fee</dt>
                  <dd>−{formatNaira(fee.paystackFee)}</dd>
                </div>
                <div>
                  <dt>TuitEase fee ({feePercentLabel(fee.platformPercent)})</dt>
                  <dd>−{formatNaira(fee.platformFee)}</dd>
                </div>
                <div className="is-total">
                  <dt>You receive</dt>
                  <dd>{formatNaira(fee.hostReceives)}</dd>
                </div>
              </dl>
            ) : feePreview.status === 'error' ? (
              <InlineError
                message={feePreview.message || 'Could not load the fee preview.'}
                onRetry={feePreview.retry}
              />
            ) : (
              <p className="tt-muted" role="status" aria-live="polite">
                Calculating fees from the class price…
              </p>
            )}
            <p className="tt-hint">
              Calculated by TuitEase from one student payment. Paystack charges per payment, so instalments net a
              little less in total than this figure times the number of payments.
            </p>
          </Section>

          <Section title="Fee breakdown" id="fees">
            <p className="tt-muted">
              TuitEase charges {fee ? feePercentLabel(fee.platformPercent) : 'its platform rate'} of each payment, plus
              Paystack’s processing fee. These are the same figures the class wizard shows for this price.
            </p>
            <p className="tt-muted">
              Expected this class: <strong>{formatNaira(aggregates.expected)}</strong> ({formatNaira(cls.price)} per student)
            </p>
          </Section>
        </aside>
      </div>
    </div>
  );
}
