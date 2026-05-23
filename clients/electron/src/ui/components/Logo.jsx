export function Logo({ size = 64, className = '' }) {
  return (
    <img
      src="assets/logo.webp"
      alt="banterchat"
      width={size}
      height={size}
      className={`select-none pointer-events-none ${className}`}
      draggable={false}
    />
  );
}