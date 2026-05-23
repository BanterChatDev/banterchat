export function Input({ type = 'text', value, onChange, placeholder, autoFocus, onKeyDown, className = '', size = 'md' }) {
  const sizes = {
    sm: 'px-3 py-2 text-[12px]',
    md: 'px-3 py-2 text-[13px]',
    lg: 'px-4 py-3 text-[14px]',
  };
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`bg-app-bg-2 border border-app-border focus:border-app-accent outline-none rounded-md text-white transition-colors ${sizes[size]} ${className}`}
    />
  );
}