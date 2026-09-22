/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'from-amber-500',
    'to-orange-400',
    'to-amber-600',
    'to-yellow-400',
    'from-purple-500',
    'from-purple-600',
    'to-pink-500',
    'from-emerald-500',
    'from-emerald-600',
    'to-teal-400',
    'to-teal-500',
    'from-blue-600',
    'to-cyan-400',
    'to-cyan-500',
  ],
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
