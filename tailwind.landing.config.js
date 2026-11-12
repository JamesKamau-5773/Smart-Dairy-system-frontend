import baseConfig from './tailwind.config.js';

// Landing page only: reuse the app theme but scan just the landing sources,
// so the public page ships a small stylesheet instead of the whole app's CSS.
// Brand blue, ink and border greys come from the shared theme. The tokens below
// exist only on the marketing page (design-reference/landing-reference.dc.html).
export default {
  ...baseConfig,
  content: ['./index.html', './src/landing/**/*.js'],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      fontFamily: {
        ...baseConfig.theme.extend.fontFamily,
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        ...baseConfig.theme.extend.colors,
        navy: {
          DEFAULT: '#0B2A40', // top bar
          900: '#0B1E2D', // behind photo bands
          950: '#071826', // footer
        },
        // Light text and accents on navy and photo scrims
        mist: {
          100: '#F1F5F9',
          200: '#E8EEF3',
          300: '#E2ECF3',
          400: '#C7D7E5',
        },
        glow: {
          DEFAULT: '#9FD3F2',
          strong: '#8CCBF0',
        },
        ground: '#F6F8FA',
        'brand-tint': '#E6F1F8',
      },
    },
  },
};
