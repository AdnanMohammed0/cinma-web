/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          850: '#0f0f18',
          800: '#14141e',
          750: '#191925',
          700: '#1e1e2e',
          600: '#2a2a3e',
        },
        red: {
          50: '#fff0f0',
          100: '#ffd6d6',
          200: '#ffb3b3',
          300: '#ff8080',
          400: '#ff4d4d',
          500: '#e50914',
          600: '#c20812',
          700: '#a00610',
          800: '#80050d',
          900: '#60040a',
        },
        surface: {
          DEFAULT: '#14141e',
          light: '#1e1e2e',
          card: '#1a1a28',
          hover: '#252538',
        },
      },
      screens: {
        mobile: { max: '767px' },
        tablet: { min: '768px', max: '1023px' },
        desktop: { min: '1024px' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
