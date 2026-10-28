/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#980868',
          50: '#3b1631',
          100: '#522044',
          200: '#71305a',
          300: '#a94482',
          400: '#c01080',
          500: '#980868',
          600: '#810657',
          700: '#d32392',
          800: '#ef6db8',
          900: '#ffd0e8',
        },
        ink: {
          DEFAULT: '#f8f8f8',
          50: '#101010',
          100: '#202830',
          200: '#383838',
          300: '#9298a0',
          400: '#c8ccd2',
          500: '#b0c8d0',
          600: '#d5d8dd',
          700: '#f8f8f8',
          800: '#080f15',
          900: '#05080b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 28px rgba(0, 0, 0, 0.22)',
        'card-hover': '0 18px 42px rgba(0, 0, 0, 0.34)',
      },
    },
  },
  plugins: [],
};
