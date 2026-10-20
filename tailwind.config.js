/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        whatsapp: {
          light: '#d9fdd3',
          tailLight: '#baf0b0',
          dark: '#005c4b',
          teal: '#00a884',
          deepTeal: '#008069',
          blueTick: '#53bdeb',
          chatBgLight: '#efeae2',
          chatBgDark: '#0b141a',
          incomingLight: '#ffffff',
          incomingDark: '#202c33',
        },
        obsidian: {
          800: '#141c2e',
          850: '#0f1728',
          900: '#0a0f1d',
          950: '#060913',
        },
        navy: {
          800: '#0f172a',
          900: '#0b1220',
          950: '#070b14',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 10px 30px -12px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        premium: '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        glow: '0 0 25px -5px rgba(20, 184, 166, 0.25)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'crypto-mesh': 'radial-gradient(circle at 50% 0%, rgba(20, 184, 166, 0.12) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};
