import { createContext, useContext } from 'react';
import type { FeePreviewState } from '../lib/useFeePreview';
import type { Bank, HostProfile } from './api';
import type { DraftView } from './messages';
import type { PayoutGate } from './gating';
import type { Direction } from './steps';
import type { Draft, DraftSession, StepKey } from './types';

export interface WizardContextValue {
  step: StepKey;
  draft: Draft;
  view: DraftView;
  /** Backend fee preview for the current price; shared by every fee panel. */
  feePreview: FeePreviewState;
  hostName: string;
  hostInitial: string;
  timeZone: string;
  loading: boolean;
  saving: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  notice: string;
  draftSaved: boolean;
  direction: Direction;
  shareLink: string;
  qr: string;
  copied: boolean;
  shareOpen: boolean;

  update: (patch: Partial<Draft>) => void;
  updateSession: (key: string, patch: Partial<DraftSession>) => void;
  addSession: () => void;
  removeSession: (key: string) => void;
  repeatWeeklySessions: () => void;
  toggleShare: () => void;

  goToStep: (target: StepKey) => void;
  next: () => void;
  back: () => void;
  saveDraft: () => void;
  publish: () => void;

  copyLink: () => void;
  shareWhatsApp: () => void;
  shareMore: () => void;
  downloadQr: () => void;

  banks: Bank[];
  loadingBanks: boolean;
  payoutGate: PayoutGate;
  payoutOnFile: boolean;
  savedBankName: string;
  savedLast4: string;
  payoutBank: string;
  setPayoutBank: (value: string) => void;
  payoutAccount: string;
  setPayoutAccount: (value: string) => void;
  savePayoutAccount: () => void;
  payoutSaving: boolean;
  payoutError: string;
  payoutFieldErrors: Record<string, string>;
  payoutConfirmed: boolean;
  setPayoutConfirmed: (value: boolean) => void;
  justSavedBankName: string;
  justSavedLast4: string;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const value = useContext(WizardContext);
  if (!value) throw new Error('useWizard must be used inside the create-class wizard.');
  return value;
}

export function hostDisplay(host: HostProfile | null): { name: string; initial: string } {
  const name = host?.business_name?.trim() || 'Your business';
  return { name, initial: name.charAt(0).toUpperCase() || 'A' };
}
