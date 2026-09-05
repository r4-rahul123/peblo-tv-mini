/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        peblo: {
          brand: '#F59E0B',
          dark: '#0B0F19',
          card: '#131B2E',
          accent: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
};
