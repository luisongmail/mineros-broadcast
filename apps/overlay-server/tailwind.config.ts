import type { Config } from 'tailwindcss';
import baseConfig from '../../packages/design-system/src/tailwind.config';

export default {
  ...baseConfig,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
    '../../packages/overlays/scorebug/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
