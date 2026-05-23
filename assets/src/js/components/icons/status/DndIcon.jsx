export function DndIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <mask id="dnd-cutout">
        <rect width="16" height="16" fill="white" />
        <rect x="3.2" y="6.4" width="9.6" height="3.2" rx="1.6" fill="black" />
      </mask>
      <circle cx="8" cy="8" r="8" mask="url(#dnd-cutout)" />
    </svg>
  );
}