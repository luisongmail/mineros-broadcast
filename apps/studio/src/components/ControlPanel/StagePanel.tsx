import type { ReactNode } from 'react';

type StagePanelVariant = 'preview' | 'program';
type StagePanelState = 'empty' | 'ready' | 'error' | 'live';

type StagePanelProps = {
  title: string;
  subtitle: string;
  variant: StagePanelVariant;
  state: StagePanelState;
  children: ReactNode;
};

const STATE_BADGES: Record<StagePanelState, string> = {
  empty: 'border-white/15 bg-white/5 text-white/55',
  ready: 'border-mineros-gold/40 bg-mineros-gold/15 text-mineros-gold',
  error: 'border-mineros-red/50 bg-mineros-red/15 text-red-200',
  live: 'border-mineros-red bg-mineros-red text-white',
};

const PANEL_BACKGROUNDS: Record<StagePanelVariant, string> = {
  preview: 'from-mineros-navy/50 via-slate-950 to-broadcast-black',
  program: 'from-broadcast-black via-slate-950 to-mineros-navy/30',
};

export function StagePanel({
  title,
  subtitle,
  variant,
  state,
  children,
}: StagePanelProps) {
  return (
    <section className="flex min-h-[24rem] flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-broadcast">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bebas text-2xl uppercase tracking-[0.22em] text-mineros-gold">{title}</p>
          <p className="truncate text-xs text-white/55">{subtitle}</p>
        </div>
        <span className={`rounded-[4px] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATE_BADGES[state]}`}>
          {state}
        </span>
      </header>

      <div className={`relative flex-1 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br ${PANEL_BACKGROUNDS[variant]}`}>
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: 'calc(100% / 24) calc(100% / 12)',
          }}
        />
        <div className="absolute inset-[60px] rounded-lg border border-dashed border-white/15" />
        <div className="relative z-10 flex h-full flex-col p-6">{children}</div>
      </div>
    </section>
  );
}
