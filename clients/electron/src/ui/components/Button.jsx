export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', className = '', size = 'md' }) {
  const variants = {
    primary: 'bg-app-accent hover:bg-app-accent-hover text-white',
    secondary: 'bg-transparent text-app-text-muted hover:text-app-text border border-app-border hover:border-app-border-2',
    danger: 'bg-red-500/80 hover:bg-red-500 text-white',
    ghost: 'bg-transparent text-app-text-muted hover:text-app-text hover:bg-app-bg-3',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-3 py-1.5 text-[12px]',
    lg: 'px-4 py-2.5 text-[13px]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}