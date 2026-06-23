import { beforeEach, describe, expect, it } from 'vitest';

import { designTokens } from './tokens';

describe('tokens del Design System', () => {
  let tokens: typeof designTokens;

  beforeEach(() => {
    tokens = designTokens;
  });

  describe('paleta oficial', () => {
    it('colores tienen los valores hex exactos del design system', () => {
      expect(tokens.colors.minerosRed).toBe('#D71920');
      expect(tokens.colors.minerosNavy).toBe('#1B2F5B');
      expect(tokens.colors.minerosGold).toBe('#D4AF37');
      expect(tokens.colors.broadcastBlack).toBe('#0D0D0D');
    });
  });

  describe('layout base', () => {
    it('canvas tiene dimensiones correctas (1920x1080)', () => {
      expect(tokens.canvas.width).toBe(1920);
      expect(tokens.canvas.height).toBe(1080);
    });

    it('safeArea es 60px', () => {
      expect(tokens.safeArea).toBe(60);
    });

    it('grid es 24 columnas x 12 filas', () => {
      expect(tokens.canvas.columns).toBe(24);
      expect(tokens.canvas.rows).toBe(12);
    });
  });

  describe('espaciado y tipografía', () => {
    it('escala de espaciado incluye todos los valores [4,8,12,16,24,32,48,64]', () => {
      expect(tokens.spacing).toEqual([4, 8, 12, 16, 24, 32, 48, 64]);
    });

    it('tipografía principal es Bebas Neue', () => {
      expect(tokens.typography.primary).toContain('Bebas Neue');
    });
  });

  describe('bordes', () => {
    it('borde de componente es 6px, badge 4px', () => {
      expect(tokens.radius.component).toBe(6);
      expect(tokens.radius.badge).toBe(4);
    });
  });
});
