/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peblo: {
          blue: "#1E88E5",
          dark: "#0F172A",
          accent: "#FF9800",
          card: "#1E293B",
          border: "#334155"
        }
      }
    },
  },
  plugins: [],
}
