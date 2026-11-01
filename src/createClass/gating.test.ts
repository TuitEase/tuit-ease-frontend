import { describe, expect, it } from 'vitest';
import { payoutGate } from './gating';

describe('payout gate', () => {
  it('never blocks a free class', () => {
    const gate = payoutGate({ isPaid: false, payoutOnFile: false, payoutSavedNow: false, confirmed: false });
    expect(gate).toMatchObject({ needsPayout: false, showSaved: false, showReady: false, canPublish: true });
  });

  it('blocks a paid class until an account exists', () => {
    const gate = payoutGate({ isPaid: true, payoutOnFile: false, payoutSavedNow: false, confirmed: false });
    expect(gate.needsPayout).toBe(true);
    expect(gate.canPublish).toBe(false);
    expect(gate.blockedReason).toContain('payout account');
  });

  it('requires confirmation when the account was already saved', () => {
    const unconfirmed = payoutGate({ isPaid: true, payoutOnFile: true, payoutSavedNow: false, confirmed: false });
    expect(unconfirmed.showSaved).toBe(true);
    expect(unconfirmed.canPublish).toBe(false);
    expect(unconfirmed.blockedReason).toContain('confirm');

    const confirmed = payoutGate({ isPaid: true, payoutOnFile: true, payoutSavedNow: false, confirmed: true });
    expect(confirmed.canPublish).toBe(true);
  });

  it('allows publishing straight after saving from this screen', () => {
    const gate = payoutGate({ isPaid: true, payoutOnFile: false, payoutSavedNow: true, confirmed: false });
    expect(gate.showReady).toBe(true);
    expect(gate.needsPayout).toBe(false);
    expect(gate.canPublish).toBe(true);
  });

  it('shows the ready state after replacing an account that was already saved', () => {
    const gate = payoutGate({ isPaid: true, payoutOnFile: true, payoutSavedNow: true, confirmed: false });
    expect(gate.showReady).toBe(true);
    expect(gate.showSaved).toBe(false);
    expect(gate.canPublish).toBe(true);
  });
});
