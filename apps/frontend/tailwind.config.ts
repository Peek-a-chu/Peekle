import type { Config } from 'tailwindcss'

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
        border: '#F7E8F0', // 전역 테두리
        input: '#F7E8F0',  // Input 컴포넌트 테두리
        ring: '#E24EA0',   // 포커스 링

        // 사이트 배경 및 글자
        background: '#F7F8FC', // 사이트 전체 배경
        foreground: '#111827', // 기본 글자 색상

        // 메인 컬러 (Primary)
        primary: {
          DEFAULT: '#E24EA0',
          foreground: '#FFFFFF',
          hover: '#D93A95',
          active: '#C92F86',
        },

        // 보조 컬러 (Secondary)
        secondary: {
          DEFAULT: '#FCE7F3',
          foreground: '#E24EA0',
          hover: '#F9D1E3',
          active: '#F6BAD2',
        },

        // 카드 1 
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
          border: '#F7E8F0',
        },

        // 카드 2
        muted: {
          DEFAULT: '#FAFAFF',
          foreground: '#111827',
          border: '#F7E8F0',
        },

        // 상태 컬러 (성공/경고/위험)
        // --- 성공 (Success) ---
        success: {
          DEFAULT: '#16A34A',
          foreground: '#111827',

          light: {
            DEFAULT: '#DCFCE7',
            foreground: '#6B7280',
          }
        },

        // --- 경고 (Warning) ---
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#111827',

          light: {
            DEFAULT: '#FEF3C7',
            foreground: '#92400E',
          }
        },

        // --- 위험 (Destructive) ---
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',

          light: {
            DEFAULT: '#FEE2E2',
            foreground: '#991B1B',
          }
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
export default config
