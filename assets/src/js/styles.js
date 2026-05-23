export const MOBILE_BREAKPOINT = 1024;
export function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
}

export const S = {
  popup: 'bg-[var(--bg-deepest)] border border-white/[0.08] shadow-2xl',
  popupItem: 'w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 transition-colors',
  popupItemHover: 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]',
  popupItemDanger: 'text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.08]',
  popupSep: 'my-1 border-t border-white/[0.06] mx-2',
  pill: 'inline-flex items-center gap-1 h-7 px-2 text-xs transition-all duration-200 ease-out border select-none cursor-pointer active:scale-95',
  pillActive: 'bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.3)] hover:bg-[rgb(var(--accent-rgb)/0.25)]',
  pillInactive: 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1]',
  hoverOnly: 'opacity-0 group-hover:opacity-100',
  msgRow: 'group hover:bg-white/[0.02] -mx-2 px-2',
};