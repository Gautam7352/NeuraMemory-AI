module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'supermemory-blue': '#0a1a3a',
        'supermemory-gradient-start': '#0a1a3a',
        'supermemory-gradient-end': '#1a237e',
        'supermemory-glow': '#00bfff',
        'supermemory-dark': '#0a0a23',
        'supermemory-accent': '#1a237e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
