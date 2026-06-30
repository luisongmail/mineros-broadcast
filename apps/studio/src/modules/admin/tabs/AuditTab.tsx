import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useAdmin, AuditEntry } from '../../../hooks/useAdmin';
import { useAuth } from '../../auth/SecurityContextProvider';
import { formatDateTimeInTimeZone } from '../../../utils/datetime';
import { normalizeAdminSearchTerm } from '../utils/search';
import { SlideDrawer } from '../../../components/data/SlideDrawer';

interface AuditTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
  onRegisterExport?: (handler: (() => void) | null) => void;
}

const AuditTab: React.FC<AuditTabProps> = ({ onNotify, setLoading, onRegisterExport }) => {
  const { getAuditLogs } = useAdmin();
  const { timeZone } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLogs = useCallback(async (overridePage?: number) => {
    setLoading(true);
    try {
      const filters: {
        action?: string;
        result?: 'allowed' | 'denied';
        search?: string;
        page?: number;
        limit?: number;
      } = {
        page: overridePage ?? page,
        limit: 50,
      };
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (resultFilter === 'allowed' || resultFilter === 'denied') filters.result = resultFilter;
      if (search.trim()) filters.search = search.trim();

      const result = await getAuditLogs(filters);
      setLogs(result.entries);
      setTotal(result.total);
      setPages(result.pages);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al cargar auditoría');
      setLogs([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, getAuditLogs, onNotify, page, resultFilter, search, setLoading]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const csv = [
        ['ID Auditoría', 'Acción', 'Actor', 'Recurso', 'Resultado', 'Timestamp'],
        ...logs.map((log) => [
          log.id,
          log.action,
          log.actor,
          log.resource,
          log.result,
          log.timestamp,
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      a.click();
      onNotify('success', 'Auditoría exportada');
    } catch (error) {
      onNotify('error', 'Error al exportar auditoría');
    }
  }, [logs, onNotify]);

  useEffect(() => {
    if (!onRegisterExport) return;
    onRegisterExport(() => handleExport);
    return () => onRegisterExport(null);
  }, [handleExport, onRegisterExport]);

  const actions = Array.from(new Set(logs.map((l) => l.action)));
  const allowedCount = logs.filter((l) => l.result === 'allowed').length;
  const deniedCount = logs.filter((l) => l.result === 'denied').length;
  const start = Math.max(1, Math.min(page - 2, Math.max(1, pages) - 4));
  const pageWindow = Array.from({ length: Math.min(5, Math.max(1, pages)) }, (_, i) => start + i);

  const formatTimestamp = (value: string) => {
    if (!value) return 'N/A';
    const formatted = formatDateTimeInTimeZone(value, timeZone);
    return formatted === value && Number.isNaN(new Date(value).getTime()) ? 'N/A' : formatted;
  };

  const formatTimestampParts = (value: string): { date: string; time: string } | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
      date: date.toLocaleDateString('es-CL', { timeZone }),
      time: date.toLocaleTimeString('es-CL', { timeZone, hour12: false }),
    };
  };

  const closeLogDetail = () => setSelectedLog(null);

  const stringifyJson = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(normalizeAdminSearchTerm(value));
      setPage(1);
    }, 400);
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

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Buscar por actor, recurso o ID auditoría"
            className="w-full pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded text-white"
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
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
        >
          <option value="all">Todas las acciones</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select
          value={resultFilter}
          onChange={(e) => {
            setResultFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
        >
          <option value="all">Todos los resultados</option>
          <option value="allowed">Permitido</option>
          <option value="denied">Denegado</option>
        </select>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-3">
          <p className="text-xs text-slate-400">Eventos visibles</p>
          <p className="text-xl font-semibold text-white">{logs.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-900/10 p-3">
          <p className="text-xs text-emerald-300/80">Permitidos</p>
          <p className="text-xl font-semibold text-emerald-300">{allowedCount}</p>
        </div>
        <div className="rounded-lg border border-red-800/60 bg-red-900/10 p-3">
          <p className="text-xs text-red-300/80">Denegados</p>
          <p className="text-xl font-semibold text-red-300">{deniedCount}</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="border border-slate-600 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-700">
              <tr className="border-b border-slate-600">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Acción</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Recurso</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Resultado</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300 min-w-[11rem]">Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-600 hover:bg-slate-600/20 cursor-pointer ${selectedLog?.id === log.id ? 'bg-slate-700/30' : ''}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-white">{log.action}</td>
                  <td className="px-4 py-3 text-white">{log.actor}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.resource}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        log.result === 'allowed'
                          ? 'bg-emerald-900/30 text-emerald-300'
                          : 'bg-red-900/30 text-red-300'
                      }`}
                    >
                      {log.result === 'allowed' ? 'Permitido' : 'Denegado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                    {(() => {
                      const parts = formatTimestampParts(log.timestamp);
                      if (!parts) return 'N/A';
                      return (
                        <div className="leading-tight">
                          <div>{parts.date}</div>
                          <div className="text-slate-400">{parts.time}</div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
          <span>
            {total === 0 ? 'Sin resultados' : `Página ${page} de ${Math.max(1, pages)} · ${total} evento${total !== 1 ? 's' : ''} · 50 por página`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(1)}
              disabled={page <= 1}
              aria-label="Primera página"
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >«</button>
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
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
              aria-label="Página siguiente"
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight className="w-4 h-4" /></button>
            <button
              onClick={() => changePage(Math.max(1, pages))}
              disabled={page >= Math.max(1, pages)}
              aria-label="Última página"
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >»</button>
          </div>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No se encontraron registros de auditoría</p>
        </div>
      )}

      {selectedLog && (
        <SlideDrawer
          open
          title={`Detalle de auditoría · ${selectedLog.id}`}
          onClose={closeLogDetail}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-600 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-400">ID Auditoría</p>
              <p className="text-xs text-slate-200 font-mono mb-2">{selectedLog.id || 'N/A'}</p>
              <p className="text-xs text-slate-400">Acción</p>
              <p className="text-sm text-white mb-2">{selectedLog.action}</p>
              <p className="text-xs text-slate-400">Actor</p>
              <p className="text-sm text-slate-200 mb-2">{selectedLog.actor}</p>
              <p className="text-xs text-slate-400">Recurso</p>
              <p className="text-sm text-slate-200 mb-2">{selectedLog.resource}</p>
              <p className="text-xs text-slate-400">Hora</p>
              <p className="text-sm text-slate-200">{formatTimestamp(selectedLog.timestamp)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Datos completos</p>
              <div>
                <p className="text-xs text-slate-400 mb-1">Authorization</p>
                <pre className="text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded p-3 overflow-auto">
                  {stringifyJson(selectedLog.details?.authorizationJson) || '{}'}
                </pre>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Request/Change</p>
                <pre className="text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded p-3 overflow-auto">
                  {stringifyJson(selectedLog.details?.requestJson) || '{}'}
                </pre>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Integrity</p>
                <pre className="text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded p-3 overflow-auto">
                  {stringifyJson(selectedLog.details?.integrityJson) || '{}'}
                </pre>
              </div>
            </div>
          </div>
        </SlideDrawer>
      )}
    </div>
  );
};

export default AuditTab;
