import type { DraftView } from '../messages';
import { colors, previewCardStyle } from '../ui';

function QrBox({ svg, size = 92, background = '#FFFFFF' }: { svg: string; size?: number; background?: string }) {
  if (!svg) {
    return <div style={{ width: size, height: size, flex: 'none', borderRadius: 12, border: `1px solid ${colors.border}`, background }} />;
  }
  return (
    <div
      className="tt-qr"
      aria-label="QR code for the booking link"
      role="img"
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        background,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}>
      <rect x="2" y="3.5" width="14" height="12" rx="2" fill="none" stroke={colors.coral} strokeWidth="1.6" />
      <path d="M2 7.5h14M6 2v3M12 2v3" fill="none" stroke={colors.coral} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}>
      <path d="M9 16s5-4.2 5-8.2A5 5 0 004 7.8C4 11.8 9 16 9 16z" fill="none" stroke={colors.coral} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="7.8" r="1.8" fill="none" stroke={colors.coral} strokeWidth="1.6" />
    </svg>
  );
}

export function PeopleIcon({ color = colors.coral }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}>
      <circle cx="6.5" cy="6.5" r="2.5" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="12.5" cy="7.5" r="2" fill="none" stroke={color} strokeWidth="1.6" />
      <path
        d="M2 15c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11.5 11.2c2.2-.3 4.5.8 4.5 3.3"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4" cy="9" r="2.2" fill="none" stroke={colors.ink} strokeWidth="1.6" />
      <circle cx="13.5" cy="4" r="2.2" fill="none" stroke={colors.ink} strokeWidth="1.6" />
      <circle cx="13.5" cy="14" r="2.2" fill="none" stroke={colors.ink} strokeWidth="1.6" />
      <path d="M6 8l5.5-3M6 10l5.5 3" fill="none" stroke={colors.ink} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export interface BookingPreviewProps {
  view: DraftView;
  hostName: string;
  hostInitial: string;
  shareLink: string;
  qr: string;
  shareOpen: boolean;
  copied: boolean;
  onToggleShare: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onMore: () => void;
  onDownloadQr: () => void;
  limited: boolean;
  capacity: number;
  checkIcon?: boolean;
}

export function BookingPreview({
  view,
  hostName,
  hostInitial,
  shareLink,
  qr,
  shareOpen,
  copied,
  onToggleShare,
  onCopy,
  onWhatsApp,
  onMore,
  onDownloadQr,
  limited,
  capacity,
}: BookingPreviewProps) {
  return (
    <div style={{ ...previewCardStyle, padding: '18px 20px 22px' }} className="tt-preview-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 14,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              flex: 'none',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: colors.coralChip,
              color: colors.coralText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 17,
            }}
          >
            {hostInitial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hostName}
            </span>
            <span style={{ fontSize: 13.5, color: colors.muted }}>Booking page</span>
          </div>
        </div>
        <span
          style={{
            flex: 'none',
            background: colors.pillFill,
            color: colors.secondary,
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 999,
          }}
        >
          {view.courseLabel}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: 128,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1B1B20, #3A3A42)',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            maxWidth: 'calc(100% - 24px)',
            boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.6)',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            padding: '5px 12px',
            borderRadius: 999,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {view.locPill}
        </span>
      </div>

      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.2, overflowWrap: 'anywhere' }}>
        {view.titleText}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, color: colors.secondary }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <CalendarIcon />
          <span>{view.startsLine}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <PinIcon />
          <span style={{ overflowWrap: 'anywhere' }}>{view.whereLine}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <PeopleIcon />
          <span>{view.seatLine}</span>
        </div>
      </div>

      {limited && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 8, borderRadius: 999, background: colors.track, overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: colors.coral, borderRadius: 999 }} />
          </div>
          <div
            style={{
              alignSelf: 'flex-end',
              background: colors.successPill,
              border: `1px solid ${colors.successBorder}`,
              color: colors.success,
              fontSize: 13,
              fontWeight: 700,
              padding: '3px 12px',
              borderRadius: 999,
            }}
          >
            {capacity} seats left
          </div>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{view.priceBadge}</div>
        <div style={{ color: colors.muted, fontSize: 14 }}>{view.instalLine}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'center',
            background: colors.coral,
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 16,
            padding: 15,
            borderRadius: 14,
            boxShadow: '0 8px 18px rgba(204,78,50,0.28)',
          }}
        >
          Reserve my seat
        </div>
        <div style={{ color: colors.mutedSoft, fontSize: 13 }}>No account needed</div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          onClick={onToggleShare}
          aria-expanded={shareOpen}
          style={{
            minHeight: 48,
            border: `1px solid ${colors.inputBorder}`,
            background: '#FFFFFF',
            borderRadius: 12,
            fontWeight: 700,
            color: colors.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <ShareIcon />
          Share with friends
        </button>

        {shareOpen && (
          <div
            className="tt-fade-up"
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <QrBox svg={qr} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>Scan to book</span>
                <span style={{ fontSize: 14, color: colors.muted, overflowWrap: 'anywhere' }}>{shareLink}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={onCopy}
                style={{
                  minHeight: 44,
                  padding: '0 16px',
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
              <button
                type="button"
                onClick={onWhatsApp}
                style={{
                  minHeight: 44,
                  padding: '0 16px',
                  border: `1px solid ${colors.whatsapp}`,
                  background: '#FFFFFF',
                  color: colors.whatsapp,
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                WhatsApp
              </button>
              <button type="button" onClick={onMore} style={ghostButtonStyle}>
                More
              </button>
              <button type="button" onClick={onDownloadQr} style={ghostButtonStyle}>
                Download QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const ghostButtonStyle = {
  minHeight: 44,
  padding: '0 16px',
  border: `1px solid ${colors.inputBorder}`,
  background: '#FFFFFF',
  color: colors.ink,
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
} as const;
