export function KeyIcon({ className = "w-5 h-5", strokeWidth = 1.5 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM10.5 9.5L3 17v4h4l1-1v-2h2v-2h2l1.5-1.5" />
    </svg>
  );
}