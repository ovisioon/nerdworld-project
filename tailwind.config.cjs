/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00B4FF',
          500: '#00B4FF',
          400: '#39C8FF',
          300: '#7FE2FF',
          700: '#00A3E0',
          800: '#0369A1'
        },
        surface: '#071428',
        page: '#041026',
        muted: '#94A3B8'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial']
      },
      boxShadow: {
        'soft-lg': '0 10px 30px rgba(4,16,38,0.5)'
      }
    }
  },
  plugins: []
}
