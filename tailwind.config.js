/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary
        primary: {
          DEFAULT: '#8b5cf6', // Violet-500
          hover: '#7c3aed',   // Violet-600
        },
        // Accent
        accent: {
          DEFAULT: '#f43f5e', // Rose-500
          orange: '#f97316',  // Orange-500
        },
        // Neutral (Dark Mode)
        dark: {
          main: '#0f0f0f',    // Deep Black
          surface: '#1a1a1a', // Dark Gray
          elevate: '#27272a', // Zinc-800
        },
        // Semantic Colors
        bg: {
          main: 'rgb(var(--color-bg-main) / <alpha-value>)',
          surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
          elevate: 'rgb(var(--color-bg-elevate) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          tertiary: '#52525b',
        },
        border: 'rgb(var(--color-border) / 0.1)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      },
      borderColor: {
        DEFAULT: 'rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
