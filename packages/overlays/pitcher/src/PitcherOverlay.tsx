import { BroadcastShell } from '@playflow/design-system';

import { PitcherHeader } from './components/PitcherHeader';
import { PitcherProfile } from './components/PitcherProfile';
import { PitcherStats } from './components/PitcherStats';
import type { PitcherData, PitcherOverlayProps } from './types';

function hasRequiredData(pitcher: PitcherData | undefined) {
  return Boolean(pitcher?.playerId && pitcher.name && pitcher.teamId);
}

function OverlayError({ message }: { message: string }) {
  return (
    <BroadcastShell>
      <div className="absolute bottom-[80px] left-[60px] rounded-[6px] border-2 border-mineros-red bg-broadcast-black/90 px-6 py-4 font-inter text-lg font-semibold text-white shadow-broadcast">
        {message}
      </div>
    </BroadcastShell>
  );
}

export function PitcherOverlay({ pitcher, assetBaseUrl }: PitcherOverlayProps) {
  if (!hasRequiredData(pitcher)) {
    return <OverlayError message="Datos de pitcher incompletos" />;
  }

  return (
    <BroadcastShell>
      <section className="absolute bottom-[80px] left-[60px] w-[980px] overflow-hidden rounded-[6px] border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
        <PitcherHeader teamId={pitcher.teamId} />
        <div className="flex items-stretch">
          <PitcherProfile assetBaseUrl={assetBaseUrl} pitcher={pitcher} />
          <PitcherStats stats={pitcher.stats} />
        </div>
      </section>
    </BroadcastShell>
  );
}
