import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jasmine: {
          50: '#fff5f7',
          100: '#ffe4ea',
          200: '#fecdd8',
          300: '#fea3b7',
          400: '#fb7093',
          500: '#f43f73',
          DEFAULT: '#ffe4ea',
        },
        ayato: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f6',
          500: '#0e8ce4',
          600: '#026ec1',
          DEFAULT: '#e0effe',
        },
        sakura: {
          light: '#fff0f3',
          DEFAULT: '#ffb3c1',
          dark: '#fb6f92',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
