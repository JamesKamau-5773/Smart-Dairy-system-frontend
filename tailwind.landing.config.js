import baseConfig from './tailwind.config.js';

// Landing page only: reuse the app theme but scan just the landing sources,
// so the public page ships a small stylesheet instead of the whole app's CSS.
export default {
  ...baseConfig,
  content: ['./index.html', './src/landing/**/*.js'],
};
