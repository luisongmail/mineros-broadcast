export type OverlayCategory = 'Juego' | 'Comercial' | 'Informativo' | 'Operación';

export type OverlayTrigger = {
  id: string;
  name: string;
  category: OverlayCategory;
  description: string;
  persistent?: boolean;
};

export const OVERLAY_TRIGGERS: OverlayTrigger[] = [
  { id: 'scorebug', name: 'Scorebug', category: 'Juego', description: 'Marcador permanente.', persistent: true },
  { id: 'batter', name: 'Batter', category: 'Juego', description: 'Ficha del bateador actual.' },
  { id: 'pitcher', name: 'Pitcher', category: 'Juego', description: 'Ficha de la lanzadora o lanzador.' },
  { id: 'lineup', name: 'Lineup', category: 'Juego', description: 'Orden al bate completo.' },
  { id: 'next-batters', name: 'Next Batters', category: 'Juego', description: 'Próximos turnos ofensivos.' },
  { id: 'inning-transition', name: 'Inning Transition', category: 'Juego', description: 'Cambio de entrada.' },
  { id: 'final-score', name: 'Final Score', category: 'Juego', description: 'Cierre del partido.' },
  { id: 'substitution', name: 'Substitution', category: 'Operación', description: 'Cambio de jugadora o jugador.' },
  { id: 'game-event', name: 'Game Event', category: 'Operación', description: 'Evento destacado del juego.' },
  { id: 'announcement', name: 'Announcement', category: 'Informativo', description: 'Mensajes del club.' },
  { id: 'social-lower-third', name: 'Social Lower Third', category: 'Informativo', description: 'Redes sociales y CTA.' },
  { id: 'countdown', name: 'Countdown', category: 'Informativo', description: 'Cuenta regresiva previa.' },
  { id: 'sponsor-break', name: 'Sponsor Break', category: 'Comercial', description: 'Pausa comercial.' },
];

export const OVERLAY_GROUPS = Array.from(
  OVERLAY_TRIGGERS.reduce((groups, overlay) => {
    const current = groups.get(overlay.category) ?? [];
    current.push(overlay);
    groups.set(overlay.category, current);
    return groups;
  }, new Map<OverlayCategory, OverlayTrigger[]>()),
);
