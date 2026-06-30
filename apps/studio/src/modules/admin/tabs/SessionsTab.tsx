import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useAdmin, AdminSession } from '../../../hooks/useAdmin';
import { useAuth } from '../../auth/SecurityContextProvider';
import { formatDateTimeInTimeZone } from '../../../utils/datetime';
import { ADMIN_SEARCH_MIN_CHARS, normalizeAdminSearchTerm } from '../utils/search';
import { SlideDrawer } from '../../../components/data/SlideDrawer';

interface SessionsTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

export function isSessionActive(session: AdminSession, now: Date = new Date()): boolean {
  const rawExpiry = session.expiresAt?.trim();
  if (!rawExpiry) return true;
  const expiry = new Date(rawExpiry);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry > now;
}

export function normalizeSessionSearchTerm(input: string): string {
  return normalizeAdminSearchTerm(input, ADMIN_SEARCH_MIN_CHARS);
}

const SESSIONS_PAGE_SIZE = 20;

const SessionsTab: React.FC<SessionsTabProps> = ({ onNotify, setLoading }) => {
  const {
    getSessions,
    invalidateSession: invalidateSessionRequest,
    invalidateUserSessions: invalidateUserSessionsRequest,
  } = useAdmin();
  const { timeZone } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'invalidated'>('active');
  const [selectedSession, setSelectedSession] = useState<AdminSession | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSessions = useCallback(async (overridePage?: number) => {
    setLoading(true);
    try {
      const result = await getSessions({
        page: overridePage ?? page,
        limit: SESSIONS_PAGE_SIZE,
        search: search || undefined,
        status: statusFilter,
        sortBy: 'last_seen_at',
        sortDir: 'desc',
      });
      setSessions(result.sessions);
      setTotal(result.total);
      setPages(result.pages);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al cargar sesiones');
      setSessions([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [getSessions, onNotify, page, search, setLoading, statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleInvalidateSession = async (sessionId: string) => {
    if (!window.confirm('¿Invalidar esta sesión? El usuario será desconectado.')) return;

    setLoading(true);
    try {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      await invalidateSessionRequest(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onNotify('success', 'Sesión invalidada');
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al invalidar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateUserSessions = async (userId: string) => {
    const userSessions = sessions.filter((s) => s.userId === userId);
    if (!window.confirm(`¿Invalidar ${userSessions.length} sesión(es) del usuario?`)) return;

    setLoading(true);
    try {
      await invalidateUserSessionsRequest(userId);
      setSessions((prev) => prev.filter((s) => s.userId !== userId));
      onNotify('success', `${userSessions.length} sesión(es) invalidada(s)`);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al invalidar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateVisibleSessions = async () => {
    const userIds = Array.from(new Set(visibleSessions.map((s) => s.userId)));
    if (userIds.length === 0) {
      onNotify('info', 'No hay sesiones visibles para invalidar');
      return;
    }
    if (!window.confirm(`¿Invalidar sesiones de ${userIds.length} usuario(s) visibles en la página actual?`)) return;

    setLoading(true);
    try {
      for (const userId of userIds) {
        await invalidateUserSessionsRequest(userId);
      }
      await loadSessions(page);
      onNotify('success', `Sesiones invalidadas para ${userIds.length} usuario(s)`);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al invalidar sesiones visibles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(normalizeSessionSearchTerm(value));
      setPage(1);
    }, 350);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const changePage = (next: number) => {
    if (next < 1 || next > Math.max(1, pages)) return;
    setPage(next);
  };

  const now = new Date();
  const activeCount = sessions.filter((s) => isSessionActive(s, now)).length;
  const expiredCount = sessions.length - activeCount;
  const visibleSessions = sessions;
  const start = Math.max(1, Math.min(page - 2, Math.max(1, pages) - 4));
  const pageWindow = Array.from({ length: Math.min(5, Math.max(1, pages)) }, (_, i) => start + i);

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Buscar por sesión, usuario o IP"
            className="w-full pl-10 pr-8 py-2 bg-slate-700/80 border border-slate-600 rounded text-sm text-white"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'expired' | 'invalidated');
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-700/80 border border-slate-600 rounded text-sm text-white"
        >
          <option value="active">Activas</option>
          <option value="expired">Expiradas</option>
          <option value="invalidated">Invalidadas</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={handleInvalidateVisibleSessions}
          className="px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 font-semibold text-sm md:justify-self-end"
        >
          <LogOut className="w-4 h-4 inline mr-2" />
          Invalidar Todas las Sesiones
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-3">
          <p className="text-xs text-slate-400">Sesiones totales</p>
          <p className="text-xl font-semibold text-white">{total}</p>
        </div>
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-900/10 p-3">
          <p className="text-xs text-emerald-300/80">Activas</p>
          <p className="text-xl font-semibold text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
          <p className="text-xs text-slate-400">Expiradas</p>
          <p className="text-xl font-semibold text-slate-300">{expiredCount}</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="border border-slate-600 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-700">
              <tr className="border-b border-slate-600">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">ID Sesión</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">IP Address</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Última Actividad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map((session) => (
                <tr
                  key={session.id}
                  className={`border-b border-slate-600 hover:bg-slate-600/20 cursor-pointer ${selectedSession?.id === session.id ? 'bg-slate-700/30' : ''}`}
                  onClick={() => setSelectedSession(session)}
                >
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{session.id}</td>
                  <td className="px-4 py-3 text-white">{session.userId}</td>
                  <td className="px-4 py-3 text-slate-300">{session.ipAddress}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {formatDateTimeInTimeZone(session.lastActivity, timeZone)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        isSessionActive(session)
                          ? 'bg-emerald-900/30 text-emerald-300'
                          : 'bg-slate-900/30 text-slate-400'
                      }`}
                    >
                      {isSessionActive(session) ? 'Activa' : 'Expirada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleInvalidateSession(session.id);
                      }}
                      disabled={!isSessionActive(session)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 text-red-300 text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Invalidar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
          <span>
            {total === 0 ? 'Sin resultados' : `Página ${page} de ${Math.max(1, pages)} · ${total} sesión${total !== 1 ? 'es' : ''} · ${SESSIONS_PAGE_SIZE} por página`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >«</button>
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronLeft className="w-4 h-4" /></button>
            {pageWindow.map((p) => (
              <button
                key={p}
                onClick={() => changePage(p)}
                className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
              >{p}</button>
            ))}
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= Math.max(1, pages)}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight className="w-4 h-4" /></button>
            <button
              onClick={() => changePage(Math.max(1, pages))}
              disabled={page >= Math.max(1, pages)}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >»</button>
          </div>
        </div>
      </div>

      {visibleSessions.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No hay sesiones para mostrar con el filtro actual</p>
        </div>
      )}

      {selectedSession && (
        <SlideDrawer
          open
          title={`Detalle de sesión · ${selectedSession.id}`}
          onClose={() => setSelectedSession(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-600 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-400">ID Sesión</p>
              <p className="text-xs text-slate-200 font-mono mb-2">{selectedSession.id}</p>
              <p className="text-xs text-slate-400">Usuario</p>
              <p className="text-sm text-slate-200 mb-2">{selectedSession.userId}</p>
              <p className="text-xs text-slate-400">IP</p>
              <p className="text-sm text-slate-200 mb-2">{selectedSession.ipAddress || 'N/A'}</p>
              <p className="text-xs text-slate-400">User-Agent</p>
              <p className="text-sm text-slate-200 break-words mb-2">{selectedSession.userAgent || 'N/A'}</p>
              <p className="text-xs text-slate-400">Creada</p>
              <p className="text-sm text-slate-200 mb-2">{formatDateTimeInTimeZone(selectedSession.createdAt, timeZone)}</p>
              <p className="text-xs text-slate-400">Última actividad</p>
              <p className="text-sm text-slate-200 mb-2">{formatDateTimeInTimeZone(selectedSession.lastActivity, timeZone)}</p>
              <p className="text-xs text-slate-400">Expira</p>
              <p className="text-sm text-slate-200">{selectedSession.expiresAt ? formatDateTimeInTimeZone(selectedSession.expiresAt, timeZone) : 'N/A'}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleInvalidateUserSessions(selectedSession.userId)}
                className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                Invalidar sesiones del usuario
              </button>
              <button
                type="button"
                onClick={() => handleInvalidateSession(selectedSession.id)}
                disabled={!isSessionActive(selectedSession)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 text-red-300 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Invalidar esta sesión
              </button>
            </div>
          </div>
        </SlideDrawer>
      )}
    </div>
  );
};

export default SessionsTab;
