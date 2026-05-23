import { Card } from './Card';

export function Section({ title, desc, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-semibold text-white/90 mb-1">{title}</h2>
      {desc && <p className="text-[12px] text-app-text-muted mb-4">{desc}</p>}
      <Card className="divide-y divide-app-border">{children}</Card>
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px] text-app-text">{label}</span>
      <div>{children}</div>
    </div>
  );
}