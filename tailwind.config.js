/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['attr', 'data-theme'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '320px',   
      'sm': '640px',   
      'md': '768px',   
      'lg': '1024px',  
      'xl': '1280px',  
      '2xl': '1536px', 
    },
    extend: {
      // 1. ENTERPRISE TYPOGRAPHY (Tighter line heights, smaller base sizes for dense data)
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px enterprise base
        'base': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'lg': ['1rem', { lineHeight: '1.5rem' }],         // 16px
        'xl': ['1.125rem', { lineHeight: '1.5rem' }],     // 18px (Tighter headers)
        '2xl': ['1.5rem', { lineHeight: '1.75rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2rem' }],      // 30px
      },
      
      // 2. SEMANTIC DESIGN TOKENS (Radii & Spacing)
      borderRadius: {
        'badge': '0.25rem',  // 4px
        'input': '0.375rem', // 6px
        'button': '0.5rem',  // 8px
        'card': '0.75rem',   // 12px (Use rounded-card instead of rounded-xl)
        'modal': '1rem',     // 16px
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // 3. BORDER-LED DEPTH (shadows intentionally disabled)
      boxShadow: {
        'sm': 'none',
        'DEFAULT': 'none',
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        'inner': 'none',
        'brutalist': 'none',
        'brutalist-hover': 'none',
      },

      // 4. FULL SEMANTIC COLOR SCALES
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8', // accent
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1', // DEFAULT
          800: '#075985',
          900: '#0c4a6e', // dark
          950: '#082f49',
          // Backwards compatibility aliases
          DEFAULT: '#0369A1', 
          dark: '#0C4A6E',
          accent: '#38BDF8',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569', 
          700: '#334155', // muted
          800: '#1e293b',
          900: '#0f172a', // DEFAULT
          950: '#020617', // strong
          // Backwards compatibility aliases
          DEFAULT: '#0F172A',
          strong: '#020617',
          muted: '#334155',
        },
        danger: {
          50: '#fef2f2', // surface
          100: '#fee2e2',
          // ... (Red scale)
          500: '#ef4444', // DEFAULT
          900: '#7f1d1d', // hardlock
          // Backwards compatibility aliases
          DEFAULT: '#EF4444',
          surface: '#FEF2F2',
        },
        warning: {
          50: '#fffbeb',
          // ... (Amber scale)
          500: '#f59e0b', // DEFAULT
          700: '#d97706', // dark
          // Backwards compatibility aliases
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.90)',
          warm: 'rgba(234, 245, 255, 0.8)',
          raised: 'rgba(255, 255, 255, 0.85)', // Increased opacity for better card contrast
        },
        hardlock: {
          DEFAULT: '#7F1D1D',
          surface: '#FEF2F2',
          'on-surface': '#450A0A'
        }
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        sans: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'], // Enterprise standard mono
      },
      borderWidth: {
        '3': '3px',
      },
      spacing: {
        'sidebar': '15rem',
        'header': '3.5rem',
      }
    },
  },
  plugins: [tailwindcssAnimate],
}