import { colors } from '../ui';
import type { DraftView } from '../messages';
import { PeopleIcon } from './Preview';

function CalendarSmallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3.5" width="14" height="12" rx="2" fill="none" stroke={colors.whatsapp} strokeWidth="1.6" />
      <path d="M2 7.5h14M6 2v3M12 2v3" fill="none" stroke={colors.whatsapp} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PhonePreview({
  view,
  hostName,
  hostInitial,
  showGroupBtn,
}: {
  view: DraftView;
  hostName: string;
  hostInitial: string;
  showGroupBtn: boolean;
}) {
  return (
    <div
      style={{
        flex: '1 1 300px',
        minWidth: 0,
        maxWidth: 400,
        background: colors.phone,
        border: `8px solid ${colors.phoneBorder}`,
        borderRadius: 32,
        overflow: 'hidden',
      }}
    >
      <div style={{ background: '#12302A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 'none',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#E0674A',
            color: colors.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {hostInitial}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>{hostName}</span>
          <span style={{ fontSize: 12.5, color: '#A8D5C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {view.titleText}
          </span>
        </div>
      </div>
      <div
        style={{
          background: colors.chat,
          padding: '16px 12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          color: colors.ink,
          fontSize: 14.5,
          lineHeight: 1.45,
        }}
      >
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: '92%',
            background: '#FFFFFF',
            padding: '10px 13px',
            borderRadius: '4px 14px 14px 14px',
            whiteSpace: 'pre-line',
            overflowWrap: 'anywhere',
          }}
        >
          {view.confirmText}
        </div>
        <div
          style={{
            alignSelf: 'flex-start',
            width: '92%',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            padding: '6px 10px',
            borderRadius: '4px 4px 4px 14px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 0',
              color: colors.whatsapp,
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <CalendarSmallIcon />
            Add to calendar
          </div>
          {showGroupBtn && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 0',
                borderTop: '1px solid #E3E8F1',
                color: colors.whatsapp,
                fontWeight: 700,
                fontSize: 14.5,
              }}
            >
              <PeopleIcon color={colors.whatsapp} />
              Join the class group
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReminderTimeline({ view }: { view: DraftView }) {
  return (
    <div
      style={{
        flex: '1 1 260px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '18px 20px',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Reminder timeline</div>
      {view.timeline.map((row) => (
        <div
          key={`${row.when}-${row.what}`}
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 0',
            borderTop: `1px solid ${colors.border}`,
            fontSize: 15,
          }}
        >
          <div style={{ flex: '0 0 120px', fontWeight: 700, color: colors.secondary }}>{row.when}</div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>{row.what}</div>
        </div>
      ))}
    </div>
  );
}
