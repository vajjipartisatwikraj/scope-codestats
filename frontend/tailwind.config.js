/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        scope: {
          ink: '#070b18',
          deep: '#0d1630',
          panel: '#121f3e',
          line: '#1c2d5c',
          text: '#f4f8ff',
          muted: '#9db0d3',
          blue: '#2f81ff',
          violet: '#6d6bff',
          cyan: '#3de3ff',
        },
      },
      fontFamily: {
        sans: ['Sora', 'Nekst', 'Segoe UI', 'sans-serif'],
        display: ['Clash Display', 'Sora', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(109,107,255,0.35), 0 18px 45px rgba(47,129,255,0.32)',
      },
      backgroundImage: {
        'scope-glow': 'radial-gradient(circle at 25% 20%, rgba(109,107,255,0.25), transparent 30%), radial-gradient(circle at 80% 0%, rgba(61,227,255,0.2), transparent 35%), linear-gradient(165deg, #070b18 0%, #0d1630 45%, #0a1330 100%)',
      },
    },
  },
  plugins: [],
};
