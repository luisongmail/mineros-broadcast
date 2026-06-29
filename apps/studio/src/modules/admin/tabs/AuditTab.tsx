import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAdmin, AuditEntry } from '../../../hooks/useAdmin';

interface AuditTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const AuditTab: React.FC<AuditTabProps> = ({ onNotify, setLoading }) => {
  const admin = useAdmin();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resultFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (resultFilter !== 'all') filters.result = resultFilter;

      const result = await admin.getAuditLogs(filters);
      setLogs(result.entries);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
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
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResult = resultFilter === 'all' || log.result === resultFilter;
    return matchesAction && matchesResult;
  });

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
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
          onChange={(e) => setResultFilter(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
        >
          <option value="all">Todos los resultados</option>
          <option value="allowed">Permitido</option>
          <option value="denied">Denegado</option>
        </select>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600/50 hover:bg-slate-600 text-white ml-auto"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto border border-slate-600 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-600/50 border-b border-slate-600">
              <th className="px-4 py-3 text-left font-semibold text-slate-300">ID Auditoría</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Acción</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Recurso</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Resultado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-600 hover:bg-slate-600/20">
                <td className="px-4 py-3 text-slate-300 font-mono">{log.id}</td>
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
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(log.timestamp).toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No se encontraron registros de auditoría</p>
        </div>
      )}
    </div>
  );
};

export default AuditTab;
