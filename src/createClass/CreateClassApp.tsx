import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuthToken } from '../auth/api';
import { useFeePreview } from '../lib/useFeePreview';
import {
  CreateClassApiError,
  createClass,
  createSession,
  deleteSession,
  fetchBanks,
  fetchHostProfile,
  getClass,
  patchClass,
  savePayout,
  updateSession as updateSessionRequest,
  type Bank,
  type HostProfile,
} from './api';
import { getDraft, patchDraft, replaceDraft, resetDraft, setDraft, useDraft } from './draft';
import { combineHostDateTime, DEFAULT_TIMEZONE } from './datetime';
import { classShareMessage, formatClassLink, initials, publicBaseUrl, slugify } from './format';
import { draftFromClass } from './fromClass';
import { payoutGate as computePayoutGate } from './gating';
import { viewOf } from './messages';
import { overridePayload, classPayload, sessionPayload, sessionUpdatePayload } from './payload';
import { downloadQrPng, qrSvg } from './qr';
import { addSession as addSessionToList, isSessionChanged, removeSession as removeSessionFromList, repeatWeekly, snapshotOf } from './sessions';
import {
  consumeDirection,
  consumeNotice,
  guardFor,
  navigateToStep,
  redirectToStep,
  stepIndex,
  STEPS,
} from './steps';
import { firstError, validateAccount, validateBasics, validateSchedule, validateSeats } from './validation';
import type { Draft, DraftSession, StepKey } from './types';
import { WizardContext, hostDisplay, type WizardContextValue } from './wizardContext';
import { Alert, FormHeading, NavRow, PageHeading, PreviewColumn, Stepper, TopBar } from './components/Chrome';
import { BookingPreview } from './components/Preview';
import { PayoutPanel } from './components/Payout';
import { BasicsStep } from './steps/BasicsStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { SeatsStep } from './steps/SeatsStep';
import { ReviewStep } from './steps/ReviewStep';
import { PublishedView } from './steps/PublishedView';
import './create-class.css';

export default function CreateClassApp({ step }: { step: StepKey }) {
  const draft = useDraft();
  const [host, setHost] = useState<HostProfile | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(() => consumeNotice());
  const [draftSaved, setDraftSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(true);
  const [qr, setQr] = useState('');
  const [payoutOnFile, setPayoutOnFile] = useState(false);
  const [payoutSavedNow, setPayoutSavedNow] = useState(false);
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutFieldErrors, setPayoutFieldErrors] = useState<Record<string, string>>({});
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);
  const [justSavedBankName, setJustSavedBankName] = useState('');
  const [justSavedLast4, setJustSavedLast4] = useState('');
  const guardRan = useRef(false);
  const busyRef = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const direction = useMemo(() => consumeDirection(), []);

  /** Synchronous lock so a double click can never create or publish twice. */
  const claimBusy = useCallback((): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    return true;
  }, []);

  const timeZone = host?.timezone || DEFAULT_TIMEZONE;
  const { name: hostName, initial: hostInitial } = hostDisplay(host);
  const feePreview = useFeePreview(draft.kind === 'paid' ? draft.price : 0, undefined, draft.classId);
  const view = useMemo(() => viewOf(draft, hostName, feePreview.fee), [draft, hostName, feePreview.fee]);
  const shareSlug = draft.slug || slugify(draft.title);
  const shareLink = formatClassLink(publicBaseUrl(), shareSlug);

  const savedBankName = useMemo(
    () => banks.find((bank) => bank.code === host?.payout_bank_code)?.name ?? host?.payout_bank_code ?? '',
    [banks, host],
  );
  const savedLast4 = host?.payout_account_last4 ?? '';

  const payoutGate = useMemo(
    () =>
      computePayoutGate({
        isPaid: draft.kind === 'paid',
        payoutOnFile,
        payoutSavedNow,
        confirmed: payoutConfirmed,
      }),
    [draft.kind, payoutOnFile, payoutSavedNow, payoutConfirmed],
  );

  const applyApiError = useCallback((caught: unknown) => {
    if (caught instanceof CreateClassApiError) {
      const fields: Record<string, string> = {};
      for (const [key, values] of Object.entries(caught.fields)) {
        fields[key] = values[0] ?? '';
      }
      setFieldErrors(fields);
      setError(firstError(fields) || caught.message);
      return;
    }
    setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      window.location.assign('/signin/');
      return;
    }
    let active = true;

    const load = async () => {
      try {
        const profile = await fetchHostProfile();
        if (!active) return;
        setHost(profile);
        setPayoutOnFile(profile.payout_ready);

        fetchBanks()
          .then((list) => {
            if (active) setBanks(list);
          })
          .catch(() => {
            /* Banks are only needed on review; the panel stays usable with an empty list. */
          })
          .finally(() => {
            if (active) setLoadingBanks(false);
          });

        const rawId = new URLSearchParams(window.location.search).get('id');
        const id = rawId ? Number(rawId) : Number.NaN;
        if (Number.isFinite(id) && id > 0 && getDraft().classId !== id) {
          try {
            const cls = await getClass(id);
            if (!active) return;
            replaceDraft(draftFromClass(cls, profile.timezone || DEFAULT_TIMEZONE));
          } catch (caught) {
            if (active) applyApiError(caught);
          }
        }
      } catch (caught) {
        if (active) applyApiError(caught);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [applyApiError]);

  useEffect(() => {
    if (loading || guardRan.current) return;
    guardRan.current = true;
    const target = guardFor(step, getDraft());
    if (target) {
      redirectToStep(
        target,
        getDraft().classId,
        step === 'published' ? 'Publish the class to see this page.' : 'Finish the earlier steps first.',
      );
    }
  }, [loading, step]);

  useEffect(() => {
    let active = true;
    qrSvg(shareLink)
      .then((svg) => {
        if (active) setQr(svg);
      })
      .catch(() => {
        /* The panel keeps a neutral placeholder if the QR library fails. */
      });
    return () => {
      active = false;
    };
  }, [shareLink]);

  useEffect(() => {
    if (error) document.getElementById('wizard-error')?.focus();
  }, [error]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const update = useCallback((patch: Partial<Draft>) => {
    setError('');
    setFieldErrors({});
    patchDraft(patch);
  }, []);

  const updateSession = useCallback((key: string, patch: Partial<DraftSession>) => {
    setError('');
    setFieldErrors({});
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) => (session.key === key ? { ...session, ...patch } : session)),
    }));
  }, []);

  const addSession = useCallback(() => {
    setDraft((current) => ({ ...current, ...addSessionToList(current) }));
  }, []);

  const removeSession = useCallback((key: string) => {
    setDraft((current) => ({ ...current, ...removeSessionFromList(current, key) }));
  }, []);

  const repeatWeeklySessions = useCallback(() => {
    setDraft((current) => ({ ...current, ...repeatWeekly(current) }));
  }, []);

  const toggleShare = useCallback(() => setShareOpen((open) => !open), []);

  const copyLink = useCallback(() => {
    navigator.clipboard
      .writeText(shareLink)
      .then(() => {
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError('Could not copy the link. Select it and copy it manually.'));
  }, [shareLink]);

  const shareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(classShareMessage(draft.title, view.startsLine, shareLink));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }, [draft.title, shareLink, view.startsLine]);

  const shareMore = useCallback(() => {
    if (navigator.share) {
      navigator
        .share({ title: draft.title || 'My class', text: classShareMessage(draft.title, view.startsLine, shareLink), url: shareLink })
        .catch(() => {
          /* The share sheet can be dismissed without an error state. */
        });
      return;
    }
    copyLink();
  }, [copyLink, draft.title, shareLink, view.startsLine]);

  const downloadQr = useCallback(() => {
    downloadQrPng(shareLink, draft.title || 'My class', `${slugify(draft.title)}-qr.png`).catch(() =>
      setError('Could not create the QR image. Please try again.'),
    );
  }, [draft.title, shareLink]);

  /** Saves the class, then applies session updates, deletions and additions. */
  const persistSchedule = useCallback(async (): Promise<number> => {
    const current = getDraft();

    let classId = current.classId;
    if (!classId) {
      const created = await createClass(classPayload(current));
      classId = created.id;
      patchDraft({ classId, slug: created.slug });
      const url = new URL(window.location.href);
      if (url.searchParams.get('id') !== String(classId)) {
        url.searchParams.set('id', String(classId));
        window.history.replaceState(null, '', url.toString());
      }
    } else {
      const updated = await patchClass(classId, classPayload(current));
      patchDraft({ slug: updated.slug || current.slug });
    }

    const online = current.mode !== 'offline';
    const offline = current.mode !== 'online';
    const serverIds = new Set(
      current.sessions
        .map((session) => session.serverId)
        .filter((id): id is number => typeof id === 'number'),
    );

    // Sessions the host removed from the draft. Delete them before adding new
    // rows so the API never sees duplicate dates while the save is in flight.
    for (const sessionId of current.savedSessionIds.filter((id) => !serverIds.has(id))) {
      await deleteSession(classId, sessionId);
      setDraft((store) => ({
        ...store,
        savedSessionIds: store.savedSessionIds.filter((id) => id !== sessionId),
      }));
    }

    // Sessions that kept their server id but changed date, time, length or place.
    for (const session of current.sessions) {
      if (!session.serverId || !isSessionChanged(session)) continue;
      const startsAt = combineHostDateTime(session.date, session.time, timeZone);
      if (!startsAt) {
        throw new CreateClassApiError('A session date or time is incomplete. Go back and check the sessions.');
      }
      const saved = snapshotOf(session);
      const response = await updateSessionRequest(
        classId,
        session.serverId,
        sessionUpdatePayload(startsAt, Number.parseInt(session.duration, 10) || 120, session, online, offline),
      );
      setDraft((store) => ({
        ...store,
        sessions: store.sessions.map((item) =>
          item.key === session.key ? { ...item, serverId: response.id, saved } : item,
        ),
      }));
    }

    // Sessions the host added while the class already existed.
    for (const session of current.sessions) {
      if (session.serverId) continue;
      const startsAt = combineHostDateTime(session.date, session.time, timeZone);
      if (!startsAt) {
        throw new CreateClassApiError('A session date or time is incomplete. Go back and check the sessions.');
      }
      const saved = snapshotOf(session);
      const response = await createSession(classId, {
        ...sessionPayload(startsAt, Number.parseInt(session.duration, 10) || 120),
        ...overridePayload(session, online, offline),
      });
      setDraft((store) => ({
        ...store,
        savedSessionIds: store.savedSessionIds.includes(response.id)
          ? store.savedSessionIds
          : [...store.savedSessionIds, response.id],
        sessions: store.sessions.map((item) =>
          item.key === session.key ? { ...item, serverId: response.id, saved } : item,
        ),
      }));
    }

    return classId;
  }, [timeZone]);

  const fail = useCallback((errors: Record<string, string>, focusId?: string) => {
    setFieldErrors(errors);
    setError(firstError(errors));
    if (focusId) {
      window.setTimeout(() => document.getElementById(focusId)?.focus(), 0);
    }
  }, []);

  const next = useCallback(async () => {
    setError('');
    setFieldErrors({});
    setNotice('');
    setDraftSaved(false);

    if (step === 'basics') {
      const errors = validateBasics(draft);
      if (Object.keys(errors).length > 0) {
        fail(errors, errors.title ? 'f-title' : 'f-link');
        return;
      }
      navigateToStep('schedule', draft.classId, { from: 'basics' });
      return;
    }

    if (step === 'schedule') {
      const errors = validateSchedule(draft);
      if (Object.keys(errors).length > 0) {
        const firstSessionError = Object.keys(errors).find((key) => key.startsWith('session:'));
        const focusId = firstSessionError
          ? `s-${firstSessionError.split(':')[1]}-${firstSessionError.endsWith(':time') ? 'time' : 'date'}`
          : errors.venue
            ? 'f-venue'
            : errors.meetingLink
              ? 'f-link'
              : undefined;
        fail(errors, focusId);
        return;
      }
      if (!claimBusy()) return;
      setSaving(true);
      try {
        const classId = await persistSchedule();
        navigateToStep('seats', classId, { from: 'schedule' });
      } catch (caught) {
        applyApiError(caught);
      } finally {
        setSaving(false);
        busyRef.current = false;
      }
      return;
    }

    if (step === 'seats') {
      const errors = validateSeats(draft);
      if (Object.keys(errors).length > 0) {
        fail(errors, errors.price ? 'f-price' : errors.capacity ? 'f-cap' : 'f-group');
        return;
      }
      const classId = draft.classId;
      if (!classId) {
        redirectToStep('schedule', null, 'Finish the sessions first.');
        return;
      }
      if (!claimBusy()) return;
      setSaving(true);
      try {
        const updated = await patchClass(classId, classPayload(draft));
        patchDraft({ slug: updated.slug || draft.slug });
        navigateToStep('review', classId, { from: 'seats' });
      } catch (caught) {
        applyApiError(caught);
      } finally {
        setSaving(false);
        busyRef.current = false;
      }
    }
  }, [applyApiError, claimBusy, draft, fail, persistSchedule, step]);

  const publish = useCallback(async () => {
    setError('');
    setFieldErrors({});
    setNotice('');
    if (!draft.classId) {
      if (!claimBusy()) return;
      persistSchedule()
        .then((classId) => {
          navigateToStep('review', classId, { from: step });
        })
        .catch(applyApiError)
        .finally(() => {
          busyRef.current = false;
        });
      return;
    }
    if (!payoutGate.canPublish) {
      setError(payoutGate.blockedReason || 'Complete the payout step before publishing.');
      return;
    }
    if (!draft.title.trim()) {
      fail({ title: 'Please enter a class title.' }, 'f-title');
      return;
    }
    if (!claimBusy()) return;
    setSaving(true);
    try {
      const current = getDraft();
      const updated = await patchClass(current.classId as number, { ...classPayload(current), is_published: true });
      patchDraft({ published: true, slug: updated.slug, classId: updated.id });
      navigateToStep('published', updated.id, { from: 'review' });
    } catch (caught) {
      applyApiError(caught);
    } finally {
      setSaving(false);
      busyRef.current = false;
    }
  }, [applyApiError, claimBusy, draft.classId, draft.title, fail, payoutGate, persistSchedule, step]);

  const saveDraft = useCallback(async () => {
    setError('');
    setFieldErrors({});
    setNotice('');
    if (!draft.classId) {
      setDraftSaved(true);
      setNotice('Draft saved. You can come back to it from your classes.');
      return;
    }
    if (!claimBusy()) return;
    setSaving(true);
    try {
      await persistSchedule();
      setDraftSaved(true);
      setNotice('Draft saved. You can come back to it from your classes.');
    } catch (caught) {
      applyApiError(caught);
    } finally {
      setSaving(false);
      busyRef.current = false;
    }
  }, [applyApiError, claimBusy, draft.classId, persistSchedule]);

  const back = useCallback(() => {
    const index = stepIndex(step);
    const previous = STEPS[Math.max(0, index - 1)];
    navigateToStep(previous.key, getDraft().classId, { from: step });
  }, [step]);

  const goToStep = useCallback(
    (target: StepKey) => {
      if (target === step) return;
      const currentIndex = stepIndex(step);
      const targetIndex = stepIndex(target);
      if (targetIndex < currentIndex) {
        navigateToStep(target, getDraft().classId, { from: step });
        return;
      }
      if (targetIndex === currentIndex + 1) {
        void next();
        return;
      }
      setError('Finish this step first. Use Continue to move forward.');
    },
    [next, step],
  );

  const savePayoutAccount = useCallback(async () => {
    setPayoutError('');
    setPayoutFieldErrors({});
    const errors = validateAccount(payoutBank, payoutAccount);
    if (Object.keys(errors).length > 0) {
      setPayoutFieldErrors(errors);
      setPayoutError(firstError(errors));
      return;
    }
    setPayoutSaving(true);
    try {
      const profile = await savePayout(payoutBank, payoutAccount);
      setHost((current) => (current ? { ...current, ...profile } : profile));
      setPayoutSavedNow(true);
      setJustSavedBankName(banks.find((bank) => bank.code === payoutBank)?.name ?? 'Your bank');
      setJustSavedLast4(profile.payout_account_last4 || payoutAccount.slice(-4));
      setPayoutBank('');
      setPayoutAccount('');
      setPayoutConfirmed(false);
      setPayoutSaving(false);
    } catch (caught) {
      setPayoutSaving(false);
      if (caught instanceof CreateClassApiError) {
        const fields: Record<string, string> = {};
        for (const [key, values] of Object.entries(caught.fields)) fields[key] = values[0] ?? '';
        setPayoutFieldErrors(fields);
        setPayoutError(firstError(fields) || caught.message);
      } else {
        setPayoutError(caught instanceof Error ? caught.message : 'Could not save your account.');
      }
    }
  }, [banks, payoutAccount, payoutBank]);

  const contextValue: WizardContextValue = {
    step,
    draft,
    view,
    feePreview,
    hostName,
    hostInitial,
    timeZone,
    loading,
    saving,
    error,
    fieldErrors,
    notice,
    draftSaved,
    direction,
    shareLink,
    qr,
    copied,
    shareOpen,
    update,
    updateSession,
    addSession,
    removeSession,
    repeatWeeklySessions,
    toggleShare,
    goToStep,
    next: () => void next(),
    back,
    saveDraft: () => void saveDraft(),
    publish: () => void publish(),
    copyLink,
    shareWhatsApp,
    shareMore,
    downloadQr,
    banks,
    loadingBanks,
    payoutGate,
    payoutOnFile,
    savedBankName,
    savedLast4,
    payoutBank,
    setPayoutBank,
    payoutAccount,
    setPayoutAccount,
    savePayoutAccount: () => void savePayoutAccount(),
    payoutSaving,
    payoutError,
    payoutFieldErrors,
    payoutConfirmed,
    setPayoutConfirmed,
    justSavedBankName,
    justSavedLast4,
  };

  const meta = STEPS.find((item) => item.key === step);
  const publishDisabled = !payoutGate.canPublish || !draft.title.trim();
  const animationClass = direction === 'back' ? 'tt-step--back' : 'tt-step--forward';

  return (
    <WizardContext.Provider value={contextValue}>
      <div className="tt-page">
        <TopBar />
        <div className="tt-container">
          {loading ? (
            <div role="status" style={{ padding: '64px 0', textAlign: 'center', color: '#5F5F66' }}>
              Loading your class…
            </div>
          ) : step === 'published' ? (
            <PublishedView />
          ) : (
            <>
              <PageHeading />
              <Stepper step={step} onSelect={goToStep} />
              <div className="tt-layout">
                <section
                  className={`tt-form-card ${animationClass}`}
                  style={{ flex: '999 1 560px', minWidth: 0, background: '#FFFFFF', border: '1px solid #E6E1D8', borderRadius: 24, boxShadow: '0 6px 24px rgba(22,22,26,0.05)', display: 'flex', flexDirection: 'column', gap: 28 }}
                >
                  {meta && <FormHeading number={meta.number} title={meta.title} help={meta.help} />}
                  <Alert id="wizard-error" message={error} />
                  {step === 'basics' && <BasicsStep />}
                  {step === 'schedule' && <ScheduleStep />}
                  {step === 'seats' && <SeatsStep />}
                  {step === 'review' && <ReviewStep />}
                  <NavRow
                    showBack={step !== 'basics'}
                    onBack={back}
                    onSave={contextValue.saveDraft}
                    saveLabel="Save as draft"
                    saving={saving}
                    onNext={step === 'review' ? undefined : contextValue.next}
                    nextLabel="Continue"
                    nextDisabled={step === 'basics' && !draft.title.trim()}
                    onPublish={step === 'review' ? contextValue.publish : undefined}
                    publishLabel="Publish class"
                    publishDisabled={publishDisabled}
                    notice={notice}
                  />
                </section>
                <PreviewColumn>
                  <BookingPreview
                    view={view}
                    hostName={hostName}
                    hostInitial={hostInitial}
                    shareLink={shareLink}
                    qr={qr}
                    shareOpen={shareOpen}
                    copied={copied}
                    onToggleShare={toggleShare}
                    onCopy={copyLink}
                    onWhatsApp={shareWhatsApp}
                    onMore={shareMore}
                    onDownloadQr={downloadQr}
                    limited={draft.capMode === 'limited'}
                    capacity={Number.parseInt(draft.capacity, 10) || 0}
                  />
                </PreviewColumn>
              </div>
            </>
          )}
        </div>
      </div>
    </WizardContext.Provider>
  );
}
