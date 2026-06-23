export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        minerosRed: '#D71920',
        minerosNavy: '#1B2F5B',
        minerosGold: '#D4AF37',
        broadcastBlack: '#0D0D0D',
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
} as const;

export default tailwindConfig;
