import type { CSSProperties } from 'react';

export const colors = {
  page: '#F6F3EE',
  ink: '#16161A',
  coral: '#CC4E32',
  coralText: '#A63A22',
  eyebrow: '#C2410C',
  selected: '#FFF6F2',
  coralChip: '#FCE9E2',
  border: '#E6E1D8',
  inputBorder: '#CFC8BB',
  divider: '#EDE8DF',
  panel: '#F8F6F2',
  sessionRow: '#FBFAF7',
  muted: '#5F5F66',
  mutedSoft: '#6B6B72',
  secondary: '#4A4A50',
  switchOff: '#B9B2A5',
  success: '#14532D',
  successFill: '#EEF7F1',
  successPill: '#E8F6EE',
  successBorder: '#BFE0CC',
  whatsapp: '#0B6B5C',
  phone: '#26262C',
  phoneBorder: '#3A3A42',
  chat: '#E4EAEE',
  payoutBorder: '#F0C4B6',
  pillFill: '#F3F0EA',
  track: '#EEEAE3',
} as const;

export const fontFamily = "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif";

export const optionCardStyle = (selected: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  textAlign: 'left',
  cursor: 'pointer',
  flex: '1 1 150px',
  minWidth: 0,
  padding: '14px 16px',
  borderRadius: 14,
  background: selected ? colors.selected : '#FFFFFF',
  border: selected ? `2px solid ${colors.coral}` : `1px solid ${colors.inputBorder}`,
  color: colors.ink,
  margin: selected ? 0 : 1,
});

export const switchTrackStyle = (on: boolean): CSSProperties => ({
  flex: 'none',
  position: 'relative',
  width: 52,
  height: 30,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  background: on ? colors.coral : colors.switchOff,
  transition: 'background 0.18s ease',
});

export const switchKnobStyle = (on: boolean): CSSProperties => ({
  position: 'absolute',
  top: 3,
  left: on ? 25 : 3,
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: '#FFFFFF',
  transition: 'left 0.18s ease',
});

export const primaryButtonStyle: CSSProperties = {
  minHeight: 50,
  padding: '0 28px',
  border: 'none',
  background: colors.coral,
  color: '#FFFFFF',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(204,78,50,0.28)',
};

export const secondaryButtonStyle: CSSProperties = {
  minHeight: 48,
  padding: '0 22px',
  border: `1px solid ${colors.inputBorder}`,
  background: '#FFFFFF',
  color: colors.ink,
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const textButtonStyle: CSSProperties = {
  minHeight: 48,
  padding: '0 14px',
  border: 'none',
  background: 'none',
  color: colors.secondary,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'underline',
};

export const formCardStyle: CSSProperties = {
  flex: '999 1 560px',
  minWidth: 0,
  boxSizing: 'border-box',
  background: '#FFFFFF',
  border: `1px solid ${colors.border}`,
  borderRadius: 24,
  boxShadow: '0 6px 24px rgba(22,22,26,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
};

export const previewShellStyle: CSSProperties = {
  flex: '1 1 300px',
  minWidth: 0,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

export const previewCardStyle: CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${colors.border}`,
  borderRadius: 28,
  boxShadow: '0 10px 30px rgba(22,22,26,0.07)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

export const fieldStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

export const labelStyle: CSSProperties = {
  fontWeight: 700,
};

export const hintStyle: CSSProperties = {
  color: colors.muted,
  fontSize: 14,
};

export const errorTextStyle: CSSProperties = {
  color: colors.coralText,
  fontSize: 14,
  fontWeight: 600,
};
