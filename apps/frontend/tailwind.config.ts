import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/domains/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        stamp: {
          '0%': { transform: 'scale(3) rotate(inherit)', opacity: '0' },
          '50%': { transform: 'scale(0.8) rotate(inherit)', opacity: '1' },
          '75%': { transform: 'scale(1.1) rotate(inherit)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(inherit)', opacity: '1' },
        },
        'pop-spin': {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.95)' },
        },
        'elastic-pop': {
          '0%': { transform: 'scale(3)', opacity: '0' },
          '30%': { transform: 'scale(0.5)', opacity: '1' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slam-effect': {
          '0%': { transform: 'scale(5)', opacity: '0' },
          '40%': { transform: 'scale(1)', opacity: '1' },
          '60%': { transform: 'scale(1.1)' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glitch-snap': {
          '0%': { transform: 'scale(2) skew(30deg)', opacity: '0', filter: 'blur(10px)' },
          '20%': { transform: 'scale(1) skew(-20deg)', opacity: '1' },
          '40%': { transform: 'skew(10deg)', opacity: '0.8', filter: 'blur(0px)' },
          '50%': { transform: 'skew(-10deg) translate(-5px, 0)', opacity: '1', filter: 'blur(2px)' },
          '60%': { transform: 'skew(5deg)', opacity: '0.9' },
          '70%': { transform: 'skew(-5deg) translate(5px, 0)' },
          '80%': { transform: 'skew(2deg)', opacity: '1' },
          '90%': { transform: 'skew(-2deg)' },
          '100%': { transform: 'scale(1) skew(0)', opacity: '1', filter: 'none' },
        },
      },
      animation: {
        stamp: 'stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pop-spin': 'pop-spin 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        float: 'float 1.5s ease-in-out infinite',
        twinkle: 'twinkle 2s ease-in-out infinite',
        'elastic-pop': 'elastic-pop 0.6s ease-out both',
        'slam-effect': 'slam-effect 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'glitch-snap': 'glitch-snap 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
