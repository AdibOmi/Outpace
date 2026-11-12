// Outline icons (Lucide-style, 24px grid, drawn at 16–18px) and the brand mark.
// All decorative: aria-hidden.

function Svg({ size = 18, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const NAV_PATHS = {
  // Brief the agent — document
  setup: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  // Add accounts — people
  accounts: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  // Run outreach — send
  run: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  // Review drafts — message
  feedback: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  // Follow-ups — clock
  cadence: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
};

export function NavIcon({ id, size }) {
  return <Svg size={size}>{NAV_PATHS[id]}</Svg>;
}

export function ChevronRight({ size = 14 }) {
  return (
    <Svg size={size}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

// Outpace brand mark — comet orb: the agent racing through work.
// Same shape as public/favicon.svg.
export function CometLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="outpace-comet" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="22">
          <stop offset="0" stopColor="var(--accent-text)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g fill="var(--accent-text)">
        <path d="M13.6 7.9 6 8.6l7.6.7Z" opacity="0.55" />
        <path d="M12.3 10.5 1.5 12l10.8 1.5Z" opacity="0.85" />
        <path d="M13.6 14.7 4 15.4l9.6.7Z" opacity="0.4" />
      </g>
      <circle cx="17" cy="12" r="5" fill="url(#outpace-comet)" />
    </svg>
  );
}

export function Sparkle({ size = 14 }) {
  return (
    <Svg size={size}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </Svg>
  );
}
