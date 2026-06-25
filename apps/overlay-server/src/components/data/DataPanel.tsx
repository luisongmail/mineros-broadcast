import { useState } from 'react';

import { CategoryEditor } from './CategoryEditor';
import { LeagueTournamentEditor } from './LeagueTournamentEditor';
import { RosterEditor } from './RosterEditor';
import { SponsorEditor } from './SponsorEditor';
import { TeamEditor } from './TeamEditor';

const tabs = [
  { id: 'teams', label: 'Equipos', component: <TeamEditor /> },
  { id: 'roster', label: 'Jugadores / Roster', component: <RosterEditor /> },
  { id: 'categories', label: 'Categorías', component: <CategoryEditor /> },
  { id: 'leagues', label: 'Ligas y Torneos', component: <LeagueTournamentEditor /> },
  { id: 'sponsors', label: 'Sponsors', component: <SponsorEditor /> },
] as const;

export function DataPanel() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('teams');
  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="space-y-3 text-white">
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-1">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{current.label}</p>
        {current.component}
      </div>
    </div>
  );
}
