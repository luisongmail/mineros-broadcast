import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SocialLowerThirdOverlay } from './SocialLowerThirdOverlay';
import type { SocialLowerThirdData } from './types';

const VALID: SocialLowerThirdData = {
  social: {
    primaryHandle: '@clubminerosdesantiago',
    instagram: { handle: '@clubmineros', label: 'Fotos y reels' },
    youtube: { handle: 'ClubMineros', label: 'En vivo' },
  },
  message: { type: 'follow', title: 'Siguenos en redes', subtitle: 'Contenido exclusivo', cta: 'Comparte' },
};

describe('SocialLowerThirdOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<SocialLowerThirdOverlay data={VALID} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra el handle principal', () => {
    render(<SocialLowerThirdOverlay data={VALID} />);
    expect(screen.getByText('@clubminerosdesantiago')).toBeTruthy();
  });
  it('muestra el titulo del mensaje', () => {
    render(<SocialLowerThirdOverlay data={VALID} />);
    expect(screen.getByText('Siguenos en redes')).toBeTruthy();
  });
  it('muestra instagram cuando existe', () => {
    render(<SocialLowerThirdOverlay data={VALID} />);
    expect(screen.getByText('@clubmineros')).toBeTruthy();
  });
  it('muestra youtube cuando existe', () => {
    render(<SocialLowerThirdOverlay data={VALID} />);
    expect(screen.getByText('ClubMineros')).toBeTruthy();
  });
  it('muestra el CTA cuando existe', () => {
    render(<SocialLowerThirdOverlay data={VALID} />);
    expect(screen.getByText('Comparte')).toBeTruthy();
  });
  it('renderiza variante minimal_handle', () => {
    const { container } = render(<SocialLowerThirdOverlay data={VALID} variant="minimal_handle" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('renderiza variante dual_channel', () => {
    const { container } = render(<SocialLowerThirdOverlay data={VALID} variant="dual_channel" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <SocialLowerThirdOverlay data={{ social: { primaryHandle: '' }, message: { title: '' } }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });
  it('oculta instagram cuando no existe', () => {
    const data = { ...VALID, social: { primaryHandle: '@clubmineros' } };
    render(<SocialLowerThirdOverlay data={data} />);
    expect(screen.queryByText('Instagram')).toBeNull();
  });
});
