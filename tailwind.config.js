/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./assets/src/js/**/*.{js,jsx}",
    "./assets/public/index.html",
    "./assets/public/tos.html",
    "./assets/public/privacy.html",
    "./assets/public/appeal.html",
    "./assets/public/info.html",
  ],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--content-base) / <alpha-value>)',
      },
      maxWidth: {
        'modal-sm': 'clamp(20rem, 28vw, 28rem)',
        'modal-md': 'clamp(26rem, 38vw, 42rem)',
        'modal-lg': 'clamp(32rem, 50vw, 56rem)',
        'modal-xl': 'clamp(36rem, 80vw, 72rem)',
      },
      spacing: {
        'fluid-2': 'clamp(0.625rem, 0.6vmin + 0.4rem, 0.875rem)',
        'fluid-3': 'clamp(0.875rem, 0.7vmin + 0.6rem, 1.125rem)',
        'fluid-4': 'clamp(1.125rem, 0.8vmin + 0.8rem, 1.5rem)',
        'fluid-6': 'clamp(1.625rem, 1vmin + 1.2rem, 2.25rem)',
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 0.3vmin + 0.65rem, 0.875rem)',
        'fluid-sm': 'clamp(0.8125rem, 0.35vmin + 0.7rem, 0.9375rem)',
        'fluid-lg': 'clamp(1.0625rem, 0.5vmin + 0.9rem, 1.25rem)',
      },
      borderRadius: {
        'fluid-3': 'clamp(0.75rem, 1.5vmin, 1.25rem)',
      },
      fontFamily: {
        heading: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'highlight-flash': 'highlightFlash 1.5s ease-out forwards',
        'msg-in': 'msgIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'modal-backdrop': 'modalBackdrop 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'modal-backdrop-out': 'modalBackdropOut 0.15s cubic-bezier(0.4,0,1,1) forwards',
        'modal-pop': 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'modal-pop-out': 'modalPopOut 0.18s cubic-bezier(0.4,0,1,1) forwards',
        'popover-in': 'popoverIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
        'popover-out': 'popoverOut 0.18s cubic-bezier(0.4,0,1,1) forwards',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snappy': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255,255,255,0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(255,255,255,0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        highlightFlash: {
          '0%': { backgroundColor: 'rgba(88, 101, 242, 0.15)' },
          '30%': { backgroundColor: 'rgba(88, 101, 242, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },
        msgIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalBackdrop: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalPop: {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalBackdropOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        modalPopOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
        },
        popoverIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        popoverOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.97) translateY(2px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 50%, 90%': { transform: 'translateX(-4px)' },
          '30%, 70%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};