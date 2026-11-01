import { useWizard } from '../wizardContext';
import { colors } from '../ui';
import { PhonePreview, ReminderTimeline } from '../components/Messages';
import { PayoutPanel } from '../components/Payout';

export function ReviewStep() {
  const {
    draft,
    view,
    hostName,
    hostInitial,
    goToStep,
    banks,
    loadingBanks,
    payoutGate,
    savedBankName,
    savedLast4,
    payoutBank,
    setPayoutBank,
    payoutAccount,
    setPayoutAccount,
    savePayoutAccount,
    payoutSaving,
    payoutError,
    payoutFieldErrors,
    payoutConfirmed,
    setPayoutConfirmed,
    justSavedBankName,
    justSavedLast4,
  } = useWizard();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {view.summary.map((row, index) => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '6px 16px',
              padding: '14px 18px',
              borderBottom: index === view.summary.length - 1 ? 'none' : `1px solid ${colors.divider}`,
              background: '#FFFFFF',
            }}
          >
            <div style={{ color: colors.muted, fontSize: 14, fontWeight: 600, flex: '0 0 110px' }}>{row.label}</div>
            <div style={{ flex: '1 1 240px', minWidth: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{row.value}</div>
            <button
              type="button"
              onClick={() => goToStep(row.step)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.coralText,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 4px',
                minHeight: 36,
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>What students will receive</div>
          <div style={{ color: colors.muted, fontSize: 14 }}>{view.messagesNote}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <PhonePreview
            view={view}
            hostName={hostName}
            hostInitial={hostInitial}
            showGroupBtn={view.isFree && Boolean(draft.groupLink)}
          />
          {view.isPaid && <ReminderTimeline view={view} />}
        </div>
      </div>

      <PayoutPanel
        gate={payoutGate}
        banks={banks}
        savedBankName={savedBankName}
        savedLast4={savedLast4}
        bank={payoutBank}
        account={payoutAccount}
        onBank={setPayoutBank}
        onAccount={setPayoutAccount}
        onSave={savePayoutAccount}
        saving={payoutSaving}
        error={payoutError}
        fieldErrors={payoutFieldErrors}
        confirmed={payoutConfirmed}
        onConfirmed={setPayoutConfirmed}
        justSavedBankName={justSavedBankName}
        justSavedLast4={justSavedLast4}
        loadingBanks={loadingBanks}
      />
    </div>
  );
}
