export function Card({ children, className = '' }) {
  return <div className={`rounded-lg bg-app-bg-2 border border-app-border ${className}`}>{children}</div>;
}