/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        projection: {
          dark: '#0b1020',
          light: '#f7f4ec',
          accent: '#d6a94a',
        },
      },
      boxShadow: {
        soft: '0 12px 40px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
