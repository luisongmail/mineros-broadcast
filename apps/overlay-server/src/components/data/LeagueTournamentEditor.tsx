import { useEffect, useMemo, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockCategories, mockLeagues, mockTeams, mockTournaments } from './mockData';
import { SearchSelect } from './SearchSelect';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, dangerButtonClass, fieldClass, primaryButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass, tableClass, tableBodyClass, tableHeadRowClass, tableRowClass } from './shared';
import { normalizeCategory, normalizeLeague, normalizeTeam, normalizeTournament, type Category, type League, type Team, type Tournament, type TournamentGroup } from './types';

const emptyLeague = (): League => ({ id: '', name: '', shortName: '', country: '', logoAssetId: '', active: true });
const emptyTournament = (): Tournament => ({
  id: '',
  name: '',
  shortName: '',
  type: 'league',
  season: '',
  leagueId: '',
  categoryId: '',
  structureType: 'round_robin',
  roundRobinRounds: 1,
  hasPlayoffs: false,
  playoffFormat: '',
  startDate: '',
  endDate: '',
  status: 'upcoming',
  groups: [],
  standings: [],
});

export function LeagueTournamentEditor() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [leagueForm, setLeagueForm] = useState<League>(emptyLeague());
  const [tournamentForm, setTournamentForm] = useState<Tournament>(emptyTournament());
  const [groupName, setGroupName] = useState('');
  const [pendingTeamsByGroup, setPendingTeamsByGroup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [leaguePayload, tournamentPayload, categoryPayload, teamPayload] = await Promise.all([
          request<unknown[]>('/api/leagues'),
          request<unknown[]>('/api/tournaments'),
          request<unknown[]>('/api/categories'),
          request<unknown[]>('/api/teams'),
        ]);

        if (!cancelled) {
          const nextLeagues = leaguePayload.map(normalizeLeague);
          const nextTournaments = tournamentPayload.map(normalizeTournament);
          setLeagues(nextLeagues);
          setTournaments(nextTournaments);
          setCategories(categoryPayload.map(normalizeCategory));
          setTeams(teamPayload.map(normalizeTeam));
          setSelectedLeagueId(nextLeagues[0]?.id ?? '');
          setSelectedTournamentId(nextTournaments[0]?.id ?? '');
        }
      } catch (loadError) {
        if (!cancelled) {
          setLeagues(mockLeagues);
          setTournaments(mockTournaments);
          setCategories(mockCategories);
          setTeams(mockTeams);
          setSelectedLeagueId(mockLeagues[0]?.id ?? '');
          setSelectedTournamentId(mockTournaments[0]?.id ?? '');
          setError(`${toErrorMessage(loadError, 'No se pudo cargar ligas y torneos.')} Mostrando datos mock.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const tournamentsForLeague = useMemo(() => tournaments.filter((item) => item.leagueId === selectedLeagueId), [tournaments, selectedLeagueId]);
  const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId) ?? null;
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const teamMap = useMemo(() => new Map(teams.map((item) => [item.id, item.shortName || item.fullName])), [teams]);

  useEffect(() => {
    if (!selectedLeagueId) return;
    const nextTournamentId = tournamentsForLeague[0]?.id ?? '';
    setSelectedTournamentId((current) => (tournamentsForLeague.some((item) => item.id === current) ? current : nextTournamentId));
  }, [selectedLeagueId, tournamentsForLeague]);

  useEffect(() => {
    const league = leagues.find((item) => item.id === selectedLeagueId);
    if (league) setLeagueForm(league);
  }, [leagues, selectedLeagueId]);

  useEffect(() => {
    const tournament = tournaments.find((item) => item.id === selectedTournamentId);
    if (tournament) setTournamentForm(tournament);
  }, [selectedTournamentId, tournaments]);

  const upsertLeague = (entry: League) => setLeagues((current) => (current.some((item) => item.id === entry.id) ? current.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...current]));
  const upsertTournament = (entry: Tournament) => setTournaments((current) => (current.some((item) => item.id === entry.id) ? current.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...current]));

  const saveLeague = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const method = leagueForm.id ? 'PUT' : 'POST';
      const path = leagueForm.id ? `/api/leagues/${leagueForm.id}` : '/api/leagues';
      const payload = normalizeLeague(await request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leagueForm),
      }));
      upsertLeague(payload);
      setSelectedLeagueId(payload.id);
      setMessage(`Liga ${leagueForm.id ? 'actualizada' : 'creada'}.`);
    } catch (saveError) {
      const local = { ...leagueForm, id: leagueForm.id || generateId('league') };
      upsertLeague(local);
      setSelectedLeagueId(local.id);
      setError(toErrorMessage(saveError, 'No se pudo guardar la liga.'));
      setMessage('Cambio de liga aplicado localmente.');
    } finally {
      setSaving(false);
    }
  };

  const saveTournament = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const method = tournamentForm.id ? 'PUT' : 'POST';
      const path = tournamentForm.id ? `/api/tournaments/${tournamentForm.id}` : '/api/tournaments';
      const payload = normalizeTournament(await request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id:      tournamentForm.leagueId,
          category_id:    tournamentForm.categoryId,
          name:           tournamentForm.name,
          short_name:     tournamentForm.shortName,
          type:           tournamentForm.type || 'league',
          season:         tournamentForm.season || null,
          structure_type: tournamentForm.structureType,
          num_rounds:     tournamentForm.roundRobinRounds,
          has_playoffs:   tournamentForm.hasPlayoffs,
          playoff_format: tournamentForm.playoffFormat || null,
          start_date:     tournamentForm.startDate || null,
          end_date:       tournamentForm.endDate   || null,
          status:         tournamentForm.status,
        }),
      }));
      upsertTournament(payload);
      setSelectedTournamentId(payload.id);
      setMessage(`Torneo ${tournamentForm.id ? 'actualizado' : 'creado'}.`);
    } catch (saveError) {
      const local = { ...tournamentForm, id: tournamentForm.id || generateId('tournament') };
      upsertTournament(local);
      setSelectedTournamentId(local.id);
      setError(toErrorMessage(saveError, 'No se pudo guardar el torneo.'));
      setMessage('Cambio de torneo aplicado localmente.');
    } finally {
      setSaving(false);
    }
  };

  const persistGroups = async (tournamentId: string, groups: TournamentGroup[]) => {
    setTournaments((current) => current.map((item) => (item.id === tournamentId ? { ...item, groups } : item)));
    setTournamentForm((current) => (current.id === tournamentId ? { ...current, groups } : current));

    try {
      await request(`/api/tournaments/${tournamentId}/groups`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
      setMessage('Grupos actualizados.');
      setError(null);
    } catch (groupError) {
      setError(`${toErrorMessage(groupError, 'No se pudieron sincronizar los grupos.')} Cambios conservados localmente.`);
    }
  };

  const addGroup = async () => {
    if (!selectedTournament || !groupName.trim()) return;
    const nextGroup = { id: generateId('group'), name: groupName.trim(), teamIds: [] };
    const groups = [...selectedTournament.groups, nextGroup];
    setGroupName('');

    try {
      await request(`/api/tournaments/${selectedTournament.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextGroup),
      });
    } catch {
      // Persist locally even if backend is not ready.
    }

    await persistGroups(selectedTournament.id, groups);
  };

  const removeGroup = async (groupId: string) => {
    if (!selectedTournament) return;
    const groups = selectedTournament.groups.filter((group) => group.id !== groupId);

    try {
      await request(`/api/tournaments/${selectedTournament.id}/groups/${groupId}`, { method: 'DELETE' });
    } catch {
      // Removed locally below.
    }

    await persistGroups(selectedTournament.id, groups);
  };

  const addTeamToGroup = async (groupId: string) => {
    if (!selectedTournament) return;
    const teamId = pendingTeamsByGroup[groupId];
    if (!teamId) return;
    const groups = selectedTournament.groups.map((group) => group.id === groupId ? { ...group, teamIds: [...group.teamIds, teamId] } : group);
    setPendingTeamsByGroup((current) => ({ ...current, [groupId]: '' }));
    await persistGroups(selectedTournament.id, groups);
  };

  const removeTeamFromGroup = async (groupId: string, teamId: string) => {
    if (!selectedTournament) return;
    const groups = selectedTournament.groups.map((group) => group.id === groupId ? { ...group, teamIds: group.teamIds.filter((item) => item !== teamId) } : group);
    await persistGroups(selectedTournament.id, groups);
  };

  const deleteLeague = async (id: string) => {
    setLeagues((current) => current.filter((item) => item.id !== id));
    if (selectedLeagueId === id) setSelectedLeagueId('');

    try {
      await request(`/api/leagues/${id}`, { method: 'DELETE' });
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar la liga.')} Eliminada solo localmente.`);
    }
  };

  const deleteTournament = async (id: string) => {
    setTournaments((current) => current.filter((item) => item.id !== id));
    if (selectedTournamentId === id) setSelectedTournamentId('');

    try {
      await request(`/api/tournaments/${id}`, { method: 'DELETE' });
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar el torneo.')} Eliminado solo localmente.`);
    }
  };

  if (loading) return <LoadingState message="Cargando ligas y torneos..." />;

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <div className="grid gap-3 xl:grid-cols-[220px,minmax(0,1fr)]">
        <SectionCard title="Ligas" actions={<button type="button" className={secondaryButtonClass} onClick={() => setLeagueForm(emptyLeague())}>Nueva</button>}>
          <div className="space-y-2">
            {leagues.map((league) => (
              <button key={league.id} type="button" onClick={() => setSelectedLeagueId(league.id)} className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${selectedLeagueId === league.id ? 'border-mineros-gold/50 bg-mineros-gold/10 text-white' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'}`}>
                <div className="font-semibold">{league.name}</div>
                <div className="text-xs text-white/40">{league.shortName || league.country || 'Sin metadata'}</div>
              </button>
            ))}
            {leagues.length === 0 && <EmptyState message="No hay ligas registradas." />}
          </div>
          <form className="mt-4 space-y-3" onSubmit={(event) => { void saveLeague(event); }}>
            <Field label="Nombre"><input required className={fieldClass} value={leagueForm.name} onChange={(event) => setLeagueForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Nombre corto"><input className={fieldClass} value={leagueForm.shortName} onChange={(event) => setLeagueForm((current) => ({ ...current, shortName: event.target.value }))} /></Field>
            <Field label="País"><input className={fieldClass} value={leagueForm.country} onChange={(event) => setLeagueForm((current) => ({ ...current, country: event.target.value }))} /></Field>
            <Field label="Logo asset ID"><input className={fieldClass} placeholder="ej: teams/logo-mineros" value={leagueForm.logoAssetId} onChange={(event) => setLeagueForm((current) => ({ ...current, logoAssetId: event.target.value }))} /></Field>
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={leagueForm.active} onChange={(event) => setLeagueForm((current) => ({ ...current, active: event.target.checked }))} />Activa</label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" className={secondaryButtonClass} onClick={() => setLeagueForm(emptyLeague())}>Cancelar</button>
              {leagueForm.id && <button type="button" className={dangerButtonClass} onClick={() => { void deleteLeague(leagueForm.id); }}>Eliminar</button>}
            </div>
          </form>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Torneos" actions={<button type="button" className={secondaryButtonClass} onClick={() => setTournamentForm({ ...emptyTournament(), leagueId: selectedLeagueId })}>Nuevo</button>}>
            {tournamentsForLeague.length === 0 ? (
              <EmptyState message="No hay torneos para la liga seleccionada." />
            ) : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr className={tableHeadRowClass}>
                      <th className={tableHeaderClass}>Nombre</th>
                      <th className={tableHeaderClass}>Categoría</th>
                      <th className={tableHeaderClass}>Tipo</th>
                      <th className={tableHeaderClass}>Status</th>
                      <th className={tableHeaderClass}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {tournamentsForLeague.map((tournament) => (
                      <tr key={tournament.id} className={tableRowClass}>
                        <td className={tableCellClass}>{tournament.name}</td>
                        <td className={`${tableCellClass} text-white/50`}>{categoryMap.get(tournament.categoryId) ?? '—'}</td>
                        <td className={`${tableCellClass} text-white/40`}>{tournament.structureType}</td>
                        <td className={tableCellClass}>{tournament.status}</td>
                        <td className={tableCellClass} onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <button type="button" className={secondaryButtonClass} onClick={() => { setSelectedTournamentId(tournament.id); setTournamentForm(tournament); }}>Editar</button>
                            <button type="button" className={dangerButtonClass} onClick={() => { void deleteTournament(tournament.id); }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title={tournamentForm.id ? 'Editar torneo' : 'Nuevo torneo'}>
            <form className="space-y-3" onSubmit={(event) => { void saveTournament(event); }}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nombre"><input required className={fieldClass} value={tournamentForm.name} onChange={(event) => setTournamentForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                <Field label="Nombre corto"><input className={fieldClass} value={tournamentForm.shortName} onChange={(event) => setTournamentForm((current) => ({ ...current, shortName: event.target.value }))} /></Field>
                <Field label="Liga"><SearchSelect options={leagues.map((l) => ({ value: l.id, label: l.name }))} value={tournamentForm.leagueId} onChange={(v) => setTournamentForm((c) => ({ ...c, leagueId: v }))} placeholder="Seleccionar liga…" /></Field>
                <Field label="Categoría"><SearchSelect options={categories.map((c) => ({ value: c.id, label: c.name }))} value={tournamentForm.categoryId} onChange={(v) => setTournamentForm((c) => ({ ...c, categoryId: v }))} placeholder="Seleccionar categoría…" /></Field>
                <Field label="Tipo de torneo"><SearchSelect options={[{ value: 'league', label: 'Liga' }, { value: 'tournament', label: 'Torneo' }, { value: 'exhibition', label: 'Exhibición' }, { value: 'playoff', label: 'Playoff' }]} value={tournamentForm.type} onChange={(v) => setTournamentForm((c) => ({ ...c, type: v }))} /></Field>
                <Field label="Temporada"><input className={fieldClass} placeholder="ej: 2025" value={tournamentForm.season} onChange={(event) => setTournamentForm((current) => ({ ...current, season: event.target.value }))} /></Field>
                <Field label="Estructura"><SearchSelect options={[{ value: 'round_robin', label: 'Round Robin' }, { value: 'single_elimination', label: 'Eliminación directa' }, { value: 'group_stage', label: 'Fase de grupos' }, { value: 'exhibition', label: 'Exhibición' }]} value={tournamentForm.structureType} onChange={(v) => setTournamentForm((c) => ({ ...c, structureType: v as Tournament['structureType'] }))} /></Field>
                {tournamentForm.structureType === 'round_robin' && <Field label="Número de vueltas"><input className={fieldClass} type="number" min={1} value={tournamentForm.roundRobinRounds} onChange={(event) => setTournamentForm((current) => ({ ...current, roundRobinRounds: Number(event.target.value) || 1 }))} /></Field>}
                <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80"><input type="checkbox" checked={tournamentForm.hasPlayoffs} onChange={(event) => setTournamentForm((current) => ({ ...current, hasPlayoffs: event.target.checked, playoffFormat: event.target.checked ? current.playoffFormat || 'semifinal_final' : '' }))} />Tiene playoffs</label>
                {tournamentForm.hasPlayoffs && <Field label="Formato playoff"><SearchSelect options={[{ value: 'semifinal_final', label: 'Semifinal + Final' }, { value: 'quarterfinal_semi_final', label: 'Cuartos + Semi + Final' }]} value={tournamentForm.playoffFormat} onChange={(v) => setTournamentForm((c) => ({ ...c, playoffFormat: v as Tournament['playoffFormat'] }))} /></Field>}
                <Field label="Fecha inicio"><input className={fieldClass} type="date" value={tournamentForm.startDate} onChange={(event) => setTournamentForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
                <Field label="Fecha fin"><input className={fieldClass} type="date" value={tournamentForm.endDate} onChange={(event) => setTournamentForm((current) => ({ ...current, endDate: event.target.value }))} /></Field>
                <Field label="Status"><SearchSelect options={[{ value: 'upcoming', label: 'Próximo' }, { value: 'active', label: 'Activo' }, { value: 'finished', label: 'Finalizado' }]} value={tournamentForm.status} onChange={(v) => setTournamentForm((c) => ({ ...c, status: v as Tournament['status'] }))} /></Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" className={secondaryButtonClass} onClick={() => setTournamentForm({ ...emptyTournament(), leagueId: selectedLeagueId })}>Cancelar</button>
                {tournamentForm.id && <button type="button" className={dangerButtonClass} onClick={() => { void deleteTournament(tournamentForm.id); }}>Eliminar</button>}
              </div>
            </form>
          </SectionCard>

          {selectedTournament && selectedTournament.structureType === 'group_stage' && (
            <SectionCard title="Grupos">
              <div className="mb-3 flex gap-2">
                <input className={fieldClass} placeholder="Grupo A" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                <button type="button" className={primaryButtonClass} onClick={() => { void addGroup(); }}>Agregar grupo</button>
              </div>
              <div className="space-y-3">
                {selectedTournament.groups.map((group) => {
                  const availableTeams = teams.filter((team) => !group.teamIds.includes(team.id));
                  return (
                    <div key={group.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-white">{group.name}</h4>
                        <button type="button" className={dangerButtonClass} onClick={() => { void removeGroup(group.id); }}>Eliminar grupo</button>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {group.teamIds.length === 0 ? <span className="text-sm text-white/40">Sin equipos asignados.</span> : group.teamIds.map((teamId) => (
                          <button key={teamId} type="button" className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 hover:border-red-400 hover:text-red-300 transition" onClick={() => { void removeTeamFromGroup(group.id, teamId); }}>
                            {teamMap.get(teamId) ?? teamId} ×
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <SearchSelect
                          options={[{ value: '', label: 'Agregar equipo…' }, ...availableTeams.map((t) => ({ value: t.id, label: t.fullName }))]}
                          value={pendingTeamsByGroup[group.id] ?? ''}
                          onChange={(v) => setPendingTeamsByGroup((c) => ({ ...c, [group.id]: v }))}
                          placeholder="Agregar equipo…"
                        />
                        <button type="button" className={secondaryButtonClass} onClick={() => { void addTeamToGroup(group.id); }} disabled={!pendingTeamsByGroup[group.id]}>Agregar</button>
                      </div>
                    </div>
                  );
                })}
                {selectedTournament.groups.length === 0 && <EmptyState message="Este torneo no tiene grupos todavía." />}
              </div>
            </SectionCard>
          )}

          {selectedTournament?.status === 'active' && (
            <SectionCard title="Tabla de posiciones">
              {selectedTournament.standings.length === 0 ? (
                <EmptyState message="No hay tabla de posiciones disponible todavía." />
              ) : (
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr className={tableHeadRowClass}>
                        {['Pos', 'Equipo', 'JG', 'JP', 'JE', 'PCT', 'RA', 'RC', 'Dif'].map((label) => <th key={label} className={tableHeaderClass}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody className={tableBodyClass}>
                      {[...selectedTournament.standings]
                        .sort((a, b) => (b.pct - a.pct) || (b.runDiff - a.runDiff))
                        .map((row, index) => (
                          <tr key={row.teamId} className={tableRowClass}>
                            <td className={`${tableCellClass} text-white/40 font-mono text-center`}>{index + 1}</td>
                            <td className={tableCellClass}>{teamMap.get(row.teamId) ?? row.teamId}</td>
                            <td className={`${tableCellClass} text-white/50 tabular-nums`}>{row.wins}</td>
                            <td className={`${tableCellClass} text-white/50 tabular-nums`}>{row.losses}</td>
                            <td className={`${tableCellClass} text-white/50 tabular-nums`}>{row.ties}</td>
                            <td className={`${tableCellClass} font-mono tabular-nums`}>{row.pct.toFixed(3)}</td>
                            <td className={`${tableCellClass} text-white/50 tabular-nums`}>{row.runsAllowed}</td>
                            <td className={`${tableCellClass} text-white/50 tabular-nums`}>{row.runsScored}</td>
                            <td className={`${tableCellClass} font-mono tabular-nums ${row.runDiff > 0 ? 'text-emerald-300' : row.runDiff < 0 ? 'text-red-400' : 'text-white/40'}`}>{row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
