import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', '"Cascadia Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        editor: 'var(--bg-editor)',
        'block-hover': 'var(--bg-block-hover)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        border: 'var(--border)',
        accent: 'var(--accent)',
      },
      maxWidth: {
        editor: '720px',
      },
    },
  },
  plugins: [],
} satisfies Config;
