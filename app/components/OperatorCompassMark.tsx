export function OperatorCompassMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      focusable="false"
    >
      <circle cx="32" cy="32" r="28" fill="#f4efe4" stroke="#121311" strokeWidth="3" />
      <path d="M32 4v9M32 51v9M4 32h9M51 32h9" stroke="#121311" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 47 32 12l15 35-15-8z" fill="#121311" />
      <path d="M32 14 24 35l8-4 8 4z" fill="#a93628" />
      <path d="M28 45c0-5 5-7 5-12 4 3 7 7 7 11 0 5-3 9-8 9-4 0-7-3-7-7 0-2 1-4 3-6 0 2 0 3 0 5z" fill="#a93628" />
      <path d="M30.5 11h3v35h-3z" fill="#f4efe4" opacity=".9" />
      <path d="M28 11h8l1.5 4h-11z" fill="#121311" />
      <circle cx="30" cy="13" r="1" fill="#f4efe4" />
      <circle cx="34" cy="13" r="1" fill="#f4efe4" />
    </svg>
  );
}
