/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Airbnb Cereal App', 'system-ui', 'sans-serif'],
        'nunito': ['Airbnb Cereal App', 'system-ui', 'sans-serif'],
        'airbnb': ['Airbnb Cereal App', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
