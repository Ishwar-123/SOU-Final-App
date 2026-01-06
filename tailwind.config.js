/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        dark: '#1e293b',
        light: '#f8fafc',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
