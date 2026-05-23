import React from 'react';

const VARIANTS = {
  error:   'bg-[rgb(var(--accent-danger-rgb)/0.1)] border-[rgb(var(--accent-danger-rgb)/0.25)] text-[var(--accent-danger)]',
  success: 'bg-[rgb(var(--accent-success-rgb)/0.1)] border-[rgb(var(--accent-success-rgb)/0.25)] text-[var(--accent-success)]',
  info:    'bg-[rgb(var(--accent-info-rgb)/0.1)] border-[rgb(var(--accent-info-rgb)/0.25)] text-[var(--accent-info)]',
  warning: 'bg-[rgb(var(--accent-warning-rgb)/0.1)] border-[rgb(var(--accent-warning-rgb)/0.25)] text-[var(--accent-warning)]',
};

export default function Alert({ variant = 'error', className = '', children }) {
  return (
    <div className={`px-3 py-2 rounded-md border text-sm ${VARIANTS[variant] || VARIANTS.error} ${className}`}>
      {children}
    </div>
  );
}