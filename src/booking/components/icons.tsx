const INK = '#16161A';

export function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4" cy="9" r="2.2" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="13.5" cy="4" r="2.2" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="13.5" cy="14" r="2.2" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M6 8l5.5-3M6 10l5.5 3" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="6" y="6" width="9.5" height="9.5" rx="2" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M12 3.5H4.5a1 1 0 00-1 1V13" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="2" fill="none" stroke="#6B6B72" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="#6B6B72" strokeWidth="1.5" />
    </svg>
  );
}

export function CalendarIcon({ color = '#0B6B5C' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3.5" width="14" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M2 7.5h14M6 2v3M12 2v3" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircle({ fill = '#CC4E32', label = 'Success' }: { fill?: string; label?: string }) {
  return (
    <svg className="booking-check" viewBox="0 0 64 64" role="img" aria-label={label}>
      <circle cx="32" cy="32" r="32" fill={fill} />
      <path
        d="M18 33l9.5 9.5L46 22.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M9 2.2a6.6 6.6 0 00-5.6 10l-.7 2.6 2.7-.7A6.6 6.6 0 109 2.2z"
        fill="none"
        stroke="#0B6B5C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 6.3c.2-.3.5-.3.7 0l.6 1c.1.2.1.4 0 .5l-.4.5c.4.9 1.1 1.5 2 1.9l.5-.5c.2-.1.4-.1.5 0l1 .6c.3.2.3.5 0 .7-.4.4-1.2.7-1.8.4-2.3-.9-3.6-2.2-4.2-4.3-.2-.5.2-1.2.6-1.5z"
        fill="#0B6B5C"
      />
    </svg>
  );
}
