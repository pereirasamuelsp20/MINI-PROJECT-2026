/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        mesh: {
          dark: '#080606',
          frame: '#100909',
          card: '#181111',
          cardBorder: '#4d2c29',
          redPrimary: '#ff263d',
          redGlow: '#f22535',
          alert: '#ff4d43',
        },
        power: {
          bg: '#000000',
          card: '#030a03',
          border: '#0d3815',
          text: '#00ff41',
          textMuted: '#15803d',
          accent: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};

