/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '320px',   // Mobile devices
      'sm': '640px',   // Large phones
      'md': '768px',   // Tablets
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large desktop
    },
    extend: {
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
      colors: {
        brand: {
          DEFAULT: '#0369A1',
          dark: '#0C4A6E',
          accent: '#38BDF8',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.44)',
          warm: 'rgba(234, 245, 255, 0.8)',
          raised: 'rgba(255, 255, 255, 0.64)',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
        },
        danger: {
          DEFAULT: '#EF4444',
          surface: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        hardlock: {
          DEFAULT: '#7F1D1D',
          surface: '#FECACA',
          'on-surface': '#450A0A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        brutalist: '0 8px 32px rgba(2, 132, 199, 0.12)',
        'brutalist-hover': '0 12px 40px rgba(2, 132, 199, 0.18)',
      },
      borderWidth: {
        '3': '1px',
      },
      spacing: {
        'sidebar': '15rem',
        'header': '3.5rem',
      }
    },
  },
  plugins: [],
}