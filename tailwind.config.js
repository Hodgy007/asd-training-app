/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ambitious about Autism brand colours
        primary: {
          50: '#fff4e6',
          100: '#ffe4bf',
          200: '#ffd099',
          300: '#ffb84d',
          400: '#ffa726',
          500: '#f5821f',
          600: '#e06800',
          700: '#c05500',
          800: '#9a4300',
          900: '#6b2e00',
        },
        aaa: {
          orange: '#f5821f',
          'orange-light': '#fcaf17',
          green: '#34b44a',
          blue: '#056bb0',
          'blue-light': '#44c7ee',
          pink: '#e13caf',
          lime: '#b2d234',
        },
        calm: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        sage: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#34b44a',
          600: '#2a9d3c',
          700: '#1f7a2d',
        },
        warm: {
          50: '#fff4e6',
          100: '#ffe4bf',
          200: '#ffd099',
          300: '#ffb84d',
          400: '#ffa726',
          500: '#f5821f',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
