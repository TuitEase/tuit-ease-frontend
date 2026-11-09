import { useCallback, useEffect, useMemo, useState } from 'react';
import { feePercentLabel, fetchPublicPricing, type FeeBreakdown, type PublicPricing } from '../lib/fees';
import { formatNaira } from '../lib/money';
import './pricing.css';

interface Loaded {
  status: 'ready';
  pricing: PublicPricing;
}

interface Failed {
  status: 'error';
  message: string;
}

type PricingState = { status: 'loading' } | Loaded | Failed;

function FeeEquation({ example }: { example: FeeBreakdown }) {
  return (
    <p className="pricing-equation">
      <span>{formatNaira(example.platformFee)}</span>
      <span aria-hidden="true">+</span>
      <span>{formatNaira(example.paystackFee)}</span>
      <span aria-hidden="true">+</span>
      <span>{formatNaira(example.hostReceives)}</span>
      <span aria-hidden="true">=</span>
      <strong>{formatNaira(example.studentPays)}</strong>
    </p>
  );
}

export function PricingPage() {
  const [state, setState] = useState<PricingState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchPublicPricing(controller.signal)
      .then((pricing) => {
        if (controller.signal.aborted) return;
        setState({ status: 'ready', pricing });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          caught instanceof Error && caught.message
            ? caught.message
            : 'Could not load the current prices. Please try again.';
        setState({ status: 'error', message });
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const pricing = state.status === 'ready' ? state.pricing : null;
  const rateLabel = pricing ? feePercentLabel(pricing.platformPercent) : null;
  const examples = pricing?.examples ?? [];
  const example = useMemo(() => {
    if (!examples.length) return null;
    return examples.find((item) => item.studentPays === selectedAmount) ?? examples[0];
  }, [examples, selectedAmount]);

  const totalFees = example ? example.platformFee + example.paystackFee : 0;

  return (
    <div className="pricing-shell">
      <a className="pricing-skip" href="#main">
        Skip to pricing
      </a>

      <header className="pricing-topbar">
        <div className="pricing-topbar-inner">
          <a className="pricing-brand" href="/" aria-label="TuitEase home">
            <img src="/assets/tuitease-logo.png" alt="TuitEase" />
          </a>

          <nav className="pricing-nav" aria-label="Pricing page">
            <a href="#breakdown">Fees</a>
            <a href="#how-it-works">How it works</a>
          </nav>

          <div className="pricing-topbar-actions">
            <a className="pricing-btn pricing-btn-quiet" href="/signin/">
              Sign in
            </a>
            <a className="pricing-btn pricing-btn-primary" href="/signup/">
              Start free
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="pricing-main">
        <section className="pricing-hero" aria-labelledby="pricing-title">
          <p className="pricing-eyebrow">Pricing</p>
          <h1 id="pricing-title">Pay only when you get paid.</h1>
          <p className="pricing-lead">
            Students pay exactly the price you set. TuitEase takes one platform fee from each paid student, Paystack
            takes its processing fee, and the rest is yours. Free classes stay free.
          </p>

          <div className="pricing-rate-card" aria-busy={state.status === 'loading'}>
            <p className="pricing-rate-label">TuitEase platform fee</p>
            {rateLabel ? (
              <p className="pricing-rate">
                <strong>{rateLabel}</strong>
                <span>per paid student</span>
              </p>
            ) : state.status === 'error' ? (
              <p className="pricing-rate is-muted">
                <strong>—</strong>
                <span>per paid student</span>
              </p>
            ) : (
              <p className="pricing-rate is-loading" role="status" aria-live="polite">
                <span className="pricing-skeleton" aria-hidden="true" />
                <span className="pricing-visually-hidden">Loading the current platform fee…</span>
              </p>
            )}
            <p className="pricing-rate-note">
              No subscription, no tiers, and every feature for every host. The rate is applied to each payment, and the
              exact amount is shown in the class wizard before you publish.
            </p>
          </div>

          <ul className="pricing-promises" aria-label="What pricing includes">
            <li>One fee per paid student</li>
            <li>No monthly charge</li>
            <li>Free classes are free</li>
          </ul>
        </section>

        <section
          className="pricing-section"
          id="breakdown"
          aria-labelledby="breakdown-title"
          aria-busy={state.status === 'loading'}
        >
          <div className="pricing-section-head">
            <p className="pricing-eyebrow">Total fee breakdown</p>
            <h2 id="breakdown-title">See the exact amount before you publish.</h2>
            <p>
              Pick an example price. These are the same live numbers the class wizard shows, with the TuitEase fee and
              the Paystack processing fee kept separate.
            </p>
          </div>

          {state.status === 'loading' ? (
            <div className="pricing-breakdown-wrap" aria-hidden="true">
              <div className="pricing-chips">
                {[0, 1, 2, 3].map((key) => (
                  <span className="pricing-skeleton pricing-skeleton-chip" key={key} />
                ))}
              </div>
              <div className="pricing-breakdown-card is-skeleton">
                <span className="pricing-skeleton pricing-skeleton-wide" />
                <span className="pricing-skeleton" />
                <span className="pricing-skeleton" />
                <span className="pricing-skeleton pricing-skeleton-total" />
              </div>
            </div>
          ) : state.status === 'error' ? (
            <div className="pricing-error" role="alert">
              <h3>We couldn’t load the live prices</h3>
              <p>{state.message}</p>
              <button type="button" className="pricing-btn pricing-btn-primary" onClick={retry}>
                Try again
              </button>
            </div>
          ) : (
            <div className="pricing-breakdown-wrap">
              <div className="pricing-chips" role="group" aria-label="Choose an example class price">
                {examples.map((item) => {
                  const active = example?.studentPays === item.studentPays;
                  return (
                    <button
                      type="button"
                      className="pricing-chip"
                      aria-pressed={active}
                      key={item.studentPays}
                      onClick={() => setSelectedAmount(item.studentPays)}
                    >
                      {formatNaira(item.studentPays)}
                    </button>
                  );
                })}
              </div>

              {example ? (
                <article className="pricing-breakdown-card" aria-live="polite">
                  <header className="pricing-breakdown-head">
                    <p>Total fee breakdown</p>
                    <h3>
                      Student pays <span>{formatNaira(example.studentPays)}</span>
                    </h3>
                  </header>

                  <dl className="pricing-breakdown-lines">
                    <div>
                      <dt>
                        TuitEase fee <span className="pricing-breakdown-rate">({rateLabel})</span>
                      </dt>
                      <dd>−{formatNaira(example.platformFee)}</dd>
                    </div>
                    <div>
                      <dt>Paystack processing fee</dt>
                      <dd>−{formatNaira(example.paystackFee)}</dd>
                    </div>
                    <div className="pricing-breakdown-fees">
                      <dt>Total fees</dt>
                      <dd>−{formatNaira(totalFees)}</dd>
                    </div>
                    <div className="is-total">
                      <dt>You receive</dt>
                      <dd>{formatNaira(example.hostReceives)}</dd>
                    </div>
                  </dl>

                  <FeeEquation example={example} />

                  <p className="pricing-breakdown-note">
                    The student’s price never changes. TuitEase and Paystack each take their own line from the top.
                  </p>
                </article>
              ) : null}
            </div>
          )}

          <div className="pricing-free-note">
            <span className="pricing-free-icon" aria-hidden="true">
              ✓
            </span>
            <p>
              <strong>Free class?</strong> No payment step, no TuitEase fee, and no payout account needed. Publish it
              and share the link.
            </p>
          </div>

          <p className="pricing-footnote">
            Paystack charges per payment, so a class paid in instalments is charged per instalment. The TuitEase fee is
            a percentage of each payment too. Prices shown in Nigerian naira.
          </p>
        </section>

        <section className="pricing-section" id="every-feature" aria-labelledby="features-title">
          <div className="pricing-section-head">
            <p className="pricing-eyebrow">Free or paid</p>
            <h2 id="features-title">Every host gets every feature.</h2>
            <p>
              There are no plans to choose between. The only difference is whether a class is free or paid, and both
              are handled plainly.
            </p>
          </div>

          <div className="pricing-compare">
            <article className="pricing-plan">
              <p className="pricing-plan-tag">Free class</p>
              <p className="pricing-plan-price">
                ₦0 <span>in fees</span>
              </p>
              <ul>
                <li>No payment step for students</li>
                <li>No payout account needed</li>
                <li>All class, student, and booking tools included</li>
              </ul>
            </article>

            <article className="pricing-plan is-paid">
              <p className="pricing-plan-tag">Paid class</p>
              <p className="pricing-plan-price">
                {rateLabel ?? '—'} <span>+ Paystack fee</span>
              </p>
              <ul>
                <li>A payout account is required before publishing</li>
                <li>The full breakdown is shown before you publish</li>
                <li>Instalments are separate payments, each charged the same way</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="pricing-section" id="how-it-works" aria-labelledby="how-title">
          <div className="pricing-section-head">
            <p className="pricing-eyebrow">How it works</p>
            <h2 id="how-title">One rate, applied the same way everywhere.</h2>
            <p>The numbers are worked out by TuitEase, not by your browser, so the preview and the payment always agree.</p>
          </div>

          <ol className="pricing-steps">
            <li>
              <span className="pricing-step-number" aria-hidden="true">
                1
              </span>
              <h3>Set your price</h3>
              <p>Free or paid, you choose. The wizard shows the exact breakdown before you publish.</p>
            </li>
            <li>
              <span className="pricing-step-number" aria-hidden="true">
                2
              </span>
              <h3>A student pays</h3>
              <p>Paystack collects the payment and takes its processing fee. TuitEase takes its percentage.</p>
            </li>
            <li>
              <span className="pricing-step-number" aria-hidden="true">
                3
              </span>
              <h3>The rest is yours</h3>
              <p>Your share settles to the payout account connected to your Paystack subaccount.</p>
            </li>
          </ol>
        </section>

        <section className="pricing-cta" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">Ready to run your first class?</h2>
            <p>Create a class, share the link, and get paid. Clear fees, to hosts and to students. Free classes stay free.</p>
          </div>
          <a className="pricing-btn pricing-btn-primary pricing-btn-large" href="/signup/">
            Start free
          </a>
        </section>
      </main>

      <footer className="pricing-footer">
        <p>© {new Date().getFullYear()} TuitEase</p>
        <nav aria-label="Footer">
          <a href="/">Home</a>
          <a href="/signin/">Sign in</a>
          <a href="/signup/">Create an account</a>
        </nav>
      </footer>
    </div>
  );
}
