import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas:    'var(--ds-bg-canvas)',
        surface:   'var(--ds-bg-surface)',
        elevated:  'var(--ds-bg-elevated)',
        overlay:   'var(--ds-bg-overlay)',
        accent: {
          DEFAULT: 'var(--ds-accent)',
          hover:   'var(--ds-accent-hover)',
          active:  'var(--ds-accent-active)',
          subtle:  'var(--ds-accent-subtle)',
          glow:    'var(--ds-accent-glow)',
        },
        success: {
          DEFAULT: 'var(--ds-success)',
          subtle:  'var(--ds-success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--ds-warning)',
          subtle:  'var(--ds-warning-subtle)',
        },
        error: {
          DEFAULT: 'var(--ds-error)',
          subtle:  'var(--ds-error-subtle)',
        },
        info: {
          DEFAULT: 'var(--ds-info)',
          subtle:  'var(--ds-info-subtle)',
        },
      },
      textColor: {
        primary:   'var(--ds-text-primary)',
        secondary: 'var(--ds-text-secondary)',
        tertiary:  'var(--ds-text-tertiary)',
        muted:     'var(--ds-text-muted)',
        inverse:   'var(--ds-text-inverse)',
      },
      borderColor: {
        DEFAULT:   'var(--ds-border)',
        subtle:    'var(--ds-border-subtle)',
        hover:     'var(--ds-border-hover)',
        focus:     'var(--ds-border-focus)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm:   'var(--ds-radius-sm)',
        md:   'var(--ds-radius-md)',
        lg:   'var(--ds-radius-lg)',
        xl:   'var(--ds-radius-xl)',
        full: 'var(--ds-radius-full)',
      },
    },
  },
  plugins: [],
}
export default config

