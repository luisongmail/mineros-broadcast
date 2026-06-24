import type { Config } from 'tailwindcss';

const tailwindConfig = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        minerosRed: '#D71920',
        minerosNavy: '#1B2F5B',
        minerosGold: '#D4AF37',
        minerosDark: '#0D1B30',
        broadcastBlack: '#0D0D0D',
        'mineros-red': '#D71920',
        'mineros-navy': '#1B2F5B',
        'mineros-gold': '#D4AF37',
        'mineros-dark': '#0D1B30',
        'broadcast-black': '#0D0D0D',
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'Arial', 'sans-serif'],
        inter: ['Inter', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        broadcast: '0px 2px 8px rgba(0,0,0,.25)',
      },
    },
  },
} satisfies Config;

export default tailwindConfig;
