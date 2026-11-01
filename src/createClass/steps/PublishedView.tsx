import { useState } from 'react';
import { useWizard } from '../wizardContext';
import { getClass } from '../api';
import { replaceDraft, resetDraft } from '../draft';
import { draftFromClass } from '../fromClass';
import { navigateToStep } from '../steps';
import { colors } from '../ui';
import { ghostButtonStyle } from '../components/Preview';

export function PublishedView() {
  const {
    draft,
    view,
    shareLink,
    qr,
    copied,
    copyLink,
    shareWhatsApp,
    downloadQr,
    timeZone,
  } = useWizard();
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState('');

  const createAnother = () => {
    resetDraft();
    navigateToStep('basics', null, { from: 'published' });
  };

  const duplicate = async () => {
    setError('');
    if (!draft.classId) {
      replaceDraft({
        ...draft,
        classId: null,
        slug: '',
        published: false,
        title: `${draft.title} (copy)`,
        savedSessionIds: [],
        sessions: draft.sessions.map((session, index) => ({
          ...session,
          key: `s${index + 1}`,
          serverId: undefined,
          saved: undefined,
          error: undefined,
        })),
        nextSessionKey: Math.max(draft.nextSessionKey, draft.sessions.length + 1),
      });
      navigateToStep('basics', null, { from: 'published' });
      return;
    }
    setDuplicating(true);
    try {
      const cls = await getClass(draft.classId);
      replaceDraft(draftFromClass(cls, timeZone, { copy: true }));
      setDuplicating(false);
      navigateToStep('basics', null, { from: 'published' });
    } catch (caught) {
      setDuplicating(false);
      setError(caught instanceof Error ? caught.message : 'Could not duplicate this class.');
    }
  };

  return (
    <div
      className="tt-success"
      style={{
        maxWidth: 760,
        margin: '24px auto 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Success">
        <circle cx="32" cy="32" r="32" fill={colors.coral} />
        <path d="M18 33l9.5 9.5L46 22.5" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div>
        <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Your class is live
        </h1>
        <p style={{ margin: 0, color: colors.muted, fontSize: 17 }}>{view.doneLine}</p>
      </div>

      {error && (
        <div role="alert" style={{ color: colors.coralText, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: '#FFFFFF',
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          padding: 28,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'center',
          textAlign: 'left',
          boxShadow: '0 6px 24px rgba(22,22,26,0.05)',
        }}
      >
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700 }}>Share your booking link</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                flex: '1 1 220px',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '12px 14px',
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 12,
                background: colors.panel,
                fontSize: 15,
                overflowWrap: 'anywhere',
              }}
            >
              {shareLink}
            </div>
            <button
              type="button"
              onClick={copyLink}
              style={{
                minHeight: 48,
                padding: '0 20px',
                border: 'none',
                background: colors.ink,
                color: '#FFFFFF',
                borderRadius: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <button
            type="button"
            onClick={shareWhatsApp}
            style={{
              alignSelf: 'flex-start',
              minHeight: 48,
              padding: '0 20px',
              border: `1px solid ${colors.whatsapp}`,
              background: '#FFFFFF',
              color: colors.whatsapp,
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share on WhatsApp
          </button>
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div
            className="tt-qr"
            role="img"
            aria-label="QR code for the booking link"
            style={{
              width: 132,
              height: 132,
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
              background: colors.panel,
            }}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div style={{ color: colors.muted, fontSize: 13 }}>QR code for posters and flyers</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={downloadQr} style={ghostButtonStyle}>
              Download QR
            </button>
            <button type="button" onClick={shareWhatsApp} style={ghostButtonStyle}>
              Share
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={createAnother}
          style={{
            minHeight: 48,
            padding: '0 22px',
            border: 'none',
            background: colors.coral,
            color: '#FFFFFF',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Create another class
        </button>
        <button type="button" onClick={() => void duplicate()} disabled={duplicating} style={ghostButtonStyle}>
          {duplicating ? 'Duplicating…' : 'Duplicate this class'}
        </button>
        <a href="/dashboard/" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 22px', color: colors.secondary, fontWeight: 600 }}>
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
