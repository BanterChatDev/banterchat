module.exports = {
  content: [
    './src/ui/pages/**/*.{js,jsx}',
    './src/ui/components/**/*.{js,jsx}',
    './src/ui/dist/*.html',
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#1a1d23',
        'app-bg-2': '#0f1115',
        'app-bg-3': '#252830',
        'app-border': '#2c2f36',
        'app-border-2': '#404449',
        'app-text': '#d8d8d8',
        'app-text-muted': '#8b8e95',
        'app-text-dim': '#6a6d74',
        'app-accent': '#4c8aff',
        'app-accent-hover': '#5a95ff',
        'app-danger': '#ff6b6b',
        'app-success': '#5cb874',
      },
      fontFamily: {
        sans: ['-apple-system', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};