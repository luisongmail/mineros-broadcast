import { BroadcastShell } from '@mineros/design-system';

import { Zone1Header } from './components/Zone1Header';
import { Zone2LineScore } from './components/Zone2LineScore';
import { Zone3BattingTeam } from './components/Zone3BattingTeam';
import { Zone4Pitchers } from './components/Zone4Pitchers';
import { Zone5Sponsors } from './components/Zone5Sponsors';
import type { ScoreboardOverlayProps } from './types';

export function ScoreboardOverlay({ data, assetBaseUrl, isPaused = false }: ScoreboardOverlayProps) {
  return (
    <BroadcastShell>
      <div className="absolute inset-[60px] overflow-hidden rounded-[8px] border-2 border-[#D4AF37] bg-[#0D0D0D]/96 px-5 py-4 shadow-[0px_18px_40px_rgba(0,0,0,.42)]">
        <div className="flex h-full flex-col gap-2">
          <Zone1Header assetBaseUrl={assetBaseUrl} data={data} />
          <Zone2LineScore assetBaseUrl={assetBaseUrl} data={data} />
          <div className="grid min-h-0 flex-1 grid-cols-[1.65fr_1fr] gap-2">
            <Zone3BattingTeam assetBaseUrl={assetBaseUrl} data={data} />
            <Zone4Pitchers assetBaseUrl={assetBaseUrl} data={data} />
          </div>
          <Zone5Sponsors
            assetBaseUrl={assetBaseUrl}
            isPaused={isPaused}
            sponsorGrid={data.layout?.sponsorGrid}
            sponsors={data.sponsors}
          />
        </div>
      </div>
    </BroadcastShell>
  );
}
