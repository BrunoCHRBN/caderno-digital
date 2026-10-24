/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          light: '#F3F4F6',
          dark: '#111827'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1F2937'
        },
        canvas: {
          light: '#FFFFFF',
          dark: '#18181B'
        },
        subtle: {
          light: '#E5E7EB',
          dark: '#374151'
        },
        grid: {
          light: '#E2E8F0',
          dark: '#2D3748'
        }
      }
    },
  },
  plugins: [],
}

