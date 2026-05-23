export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-app-accent' : 'bg-app-border'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}