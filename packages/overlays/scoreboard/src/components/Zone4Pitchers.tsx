import { TeamBadge } from './TeamBadge';
import type { ScoreboardOverlayData, ScoreboardPitcherLine } from '../types';

function PitcherCard({ pitcher, assetBaseUrl }: { pitcher: ScoreboardPitcherLine; assetBaseUrl?: string }) {
  const metrics = [
    `${pitcher.ip ?? '--'} IP`,
    `${pitcher.runsAllowed ?? '--'} R`,
    `${pitcher.hitsAllowed ?? '--'} H`,
    `${pitcher.walks ?? '--'} BB`,
    `${pitcher.strikeouts ?? '--'} K`,
  ];

  return (
    <div className="rounded-[6px] border border-white/8 bg-black/20 px-5 py-5">
      <div className="flex items-center gap-4">
        <TeamBadge abbr={pitcher.teamAbbr} assetBaseUrl={assetBaseUrl} logoAssetId={pitcher.teamLogoAssetId} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bebas text-[28px] uppercase leading-none tracking-[0.03em] text-white">
            {pitcher.playerNumber ? `#${pitcher.playerNumber} ` : ''}
            {pitcher.playerName}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[15px] font-semibold text-[#9CA3AF]">
            {metrics.map((metric) => (
              <span key={`${pitcher.playerId}-${metric}`}>{metric}</span>
            ))}
            <span className="font-bebas text-[24px] leading-none text-[#D4AF37]">{pitcher.pitchCount ?? '--'} PIT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Zone4Pitchers({ data, assetBaseUrl }: { data: ScoreboardOverlayData; assetBaseUrl?: string }) {
  return (
    <section className="flex h-full flex-col rounded-[6px] border border-white/8 bg-[#111111] px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
      <div className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">Lanzadores</div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <PitcherCard assetBaseUrl={assetBaseUrl} pitcher={data.pitchers.away} />
        <PitcherCard assetBaseUrl={assetBaseUrl} pitcher={data.pitchers.home} />
      </div>
    </section>
  );
}
