export function SlowmodeIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="13" r="8" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4l2.5 2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3h6M12 3v2" />
    </svg>
  );
}