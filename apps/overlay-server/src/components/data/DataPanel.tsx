import { useState } from 'react';

import { GamePanel } from '../GamePanel';
import { SponsorsTab } from '../SponsorsTab';
import { VenuesTab } from '../VenuesTab';
import { CategoryEditor } from './CategoryEditor';
import { LigasEditor } from './LigasEditor';
import { RosterEditor } from './RosterEditor';
import { TeamEditor } from './TeamEditor';
import { TorneosEditor } from './TorneosEditor';

type Section = 'games' | 'teams' | 'roster' | 'categories' | 'leagues' | 'tournaments' | 'sponsors' | 'venues';

const TOOLS: { id: Section; icon: string; label: string; tooltip: string }[] = [
  { id: 'games',       icon: '⚾', label: 'Partidos',      tooltip: 'Gestionar partidos'                  },
  { id: 'teams',       icon: '👕', label: 'Equipos',       tooltip: 'Crear y editar equipos'              },
  { id: 'roster',      icon: '👥', label: 'Roster',         tooltip: 'Jugadores y cuerpo técnico'          },
  { id: 'categories',  icon: '🏷️', label: 'Categorías',    tooltip: 'Categorías deportivas'               },
  { id: 'leagues',     icon: '🏆', label: 'Ligas',          tooltip: 'Ligas deportivas'                    },
  { id: 'tournaments', icon: '🥎', label: 'Torneos',        tooltip: 'Torneos (independientes o de liga)'  },
  { id: 'sponsors',    icon: '🤝', label: 'Sponsors',       tooltip: 'Patrocinadores del broadcast'        },
  { id: 'venues',      icon: '🏟️', label: 'Estadios',      tooltip: 'Estadios y sedes'                    },
];

function ToolbarButton({
  tool,
  active,
  onClick,
}: {
  tool: (typeof TOOLS)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
          active
            ? 'bg-mineros-gold text-broadcast-black'
            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="text-sm leading-none">{tool.icon}</span>
        <span>{tool.label}</span>
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {tool.tooltip}
      </div>
    </div>
  );
}

export function DataPanel({ currentGameId = '' }: { currentGameId?: string }) {
  const [active, setActive] = useState<Section>('games');

  return (
    <div className="flex flex-col h-full text-white">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/10 flex-wrap">
        {TOOLS.map((tool) => (
          <ToolbarButton key={tool.id} tool={tool} active={active === tool.id} onClick={() => setActive(tool.id)} />
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto pt-3">
        {active === 'games'       && <GamePanel currentGameId={currentGameId} embedded />}
        {active === 'teams'       && <TeamEditor />}
        {active === 'roster'      && <RosterEditor />}
        {active === 'categories'  && <CategoryEditor />}
        {active === 'leagues'     && <LigasEditor />}
        {active === 'tournaments' && <TorneosEditor />}
        {active === 'sponsors'    && <SponsorsTab />}
        {active === 'venues'      && <VenuesTab embedded />}
      </div>
    </div>
  );
}
