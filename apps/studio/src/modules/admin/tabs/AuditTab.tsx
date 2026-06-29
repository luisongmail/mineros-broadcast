import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  result: 'allowed' | 'denied';
  timestamp: Date;
}

interface AuditTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const AuditTab: React.FC<AuditTabProps> = ({ onNotify, setLoading }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resultFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/audit/logs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const mappedLogs = (data.logs || []).map((log: any) => ({
        id: log.id || log.audit_id,
        action: log.action,
        userId: log.user_id || log.actor_id,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        result: log.result === 'allowed' ? 'allowed' : 'denied',
        timestamp: new Date(log.timestamp || log.created_at),
      }));

      setLogs(mappedLogs);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al cargar auditoría');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = [
        ['ID Auditoría', 'Acción', 'Usuario', 'Tipo Recurso', 'ID Recurso', 'Resultado', 'Timestamp'],
        ...logs.map((log) => [
          log.id,
          log.action,
          log.userId,
          log.resourceType,
          log.resourceId,
          log.result,
          log.timestamp.toISOString(),
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
                <td className="px-4 py-3 text-slate-300">{log.userId}</td>
                <td className="px-4 py-3 text-slate-300">
                  {log.resourceType}/{log.resourceId}
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
                  {log.timestamp.toLocaleString('es-CL')}
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
