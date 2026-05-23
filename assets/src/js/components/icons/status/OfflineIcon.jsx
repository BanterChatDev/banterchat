export function OfflineIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <mask id="offline-cutout">
        <rect width="16" height="16" fill="white" />
        <circle cx="8" cy="8" r="3.2" fill="black" />
      </mask>
      <circle cx="8" cy="8" r="8" mask="url(#offline-cutout)" />
    </svg>
  );
}