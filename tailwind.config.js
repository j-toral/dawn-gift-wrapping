/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './assets/**/*.js',
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './templates/**/*.liquid',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
};
