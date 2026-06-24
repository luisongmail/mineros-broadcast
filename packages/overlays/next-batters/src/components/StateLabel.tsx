import type { BatterState } from '../types';

const labels: Record<BatterState, string> = {
  current: 'AL BATE',
  on_deck: 'EN ESPERA',
  in_the_hole: 'SIGUIENTE',
  third_next: 'LUEGO',
};

export function StateLabel({ state }: { state: BatterState }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{labels[state]}</span>;
}
