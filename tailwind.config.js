/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3770FF',
          50: '#EFF4FF',
          100: '#DBE6FF',
          200: '#B3CCFF',
          300: '#80A8FF',
          400: '#4D84FF',
          500: '#3770FF',
          600: '#2C5BD6',
          700: '#2348AD',
          800: '#1A3680',
          900: '#0F224D',
        },
        ink: {
          DEFAULT: '#273339',
          50: '#F5F7F8',
          100: '#E9EDEE',
          200: '#C8D2D6',
          300: '#9FAEB4',
          400: '#6B7C84',
          500: '#475861',
          600: '#3A4850',
          700: '#273339',
          800: '#1B252B',
          900: '#0F171B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(39, 51, 57, 0.06), 0 1px 2px rgba(39, 51, 57, 0.04)',
        'card-hover': '0 8px 24px rgba(39, 51, 57, 0.08), 0 2px 6px rgba(39, 51, 57, 0.04)',
      },
    },
  },
  plugins: [],
};
