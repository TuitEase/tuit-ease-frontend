export interface PayoutGateInput {
  isPaid: boolean;
  /** Captured from the host profile when step 4 opened, matching the design's `hostHasPayout`. */
  payoutOnFile: boolean;
  /** True only after the host saved an account from this screen. */
  payoutSavedNow: boolean;
  confirmed: boolean;
}

export interface PayoutGate {
  needsPayout: boolean;
  showSaved: boolean;
  showReady: boolean;
  canPublish: boolean;
  blockedReason: string;
}

export function payoutGate(input: PayoutGateInput): PayoutGate {
  if (!input.isPaid) {
    return {
      needsPayout: false,
      showSaved: false,
      showReady: false,
      canPublish: true,
      blockedReason: '',
    };
  }

  if (input.payoutSavedNow) {
    return {
      needsPayout: false,
      showSaved: false,
      showReady: true,
      canPublish: true,
      blockedReason: '',
    };
  }

  if (input.payoutOnFile) {
    return {
      needsPayout: false,
      showSaved: true,
      showReady: false,
      canPublish: input.confirmed,
      blockedReason: input.confirmed ? '' : 'Tick the box to confirm where payments should go.',
    };
  }

  return {
    needsPayout: true,
    showSaved: false,
    showReady: false,
    canPublish: false,
    blockedReason: 'Save your payout account to publish this paid class.',
  };
}
