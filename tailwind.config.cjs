/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bravoure': {
          black: '#0F0F0F',
          white: '#FFFFFF',
          gray: {
            50: '#FAFAFA',
            100: '#F4F4F5',
            200: '#E4E4E7',
            300: '#D4D4D8',
            400: '#A1A1AA',
            500: '#71717A',
            600: '#52525B',
            700: '#3F3F46',
            800: '#27272A',
            900: '#18181B',
          },
          blue: '#2563eb',
          orange: '#f97316',
          red: '#dc2626',
        },
        warning: 'var(--color-warning)',
        critical: 'var(--color-critical)',
        exceeded: 'var(--color-exceeded)',
        normal: 'var(--color-normal)',
      },
      fontFamily: {
        sans: ['"SuisseIntl"', 'system-ui', 'sans-serif'],
        display: ['"SuisseIntl"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 