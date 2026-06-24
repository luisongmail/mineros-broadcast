export const colors = {
  minerosRed: '#D71920',
  minerosNavy: '#1B2F5B',
  minerosGold: '#D4AF37',
  broadcastBlack: '#0D0D0D',
  white: '#FFFFFF',
} as const;

export const typography = {
  primary: '"Bebas Neue", Arial, sans-serif',
  secondary: 'Inter, Arial, sans-serif',
} as const;

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const radius = {
  component: 6,
  badge: 4,
  fullscreen: 8,
} as const;

export const canvas = {
  width: 1920,
  height: 1080,
  columns: 24,
  rows: 12,
} as const;

export const safeArea = 60;
export const shadow = '0px 2px 8px rgba(0,0,0,.25)';

export const designTokens = {
  colors,
  typography,
  spacing,
  radius,
  safeArea,
  canvas,
  shadow,
} as const;
