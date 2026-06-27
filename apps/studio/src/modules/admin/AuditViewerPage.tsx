import { useState, useEffect } from 'react';
import { useAuth } from '../auth/SecurityContextProvider';

interface AuditEntry {
  auditId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'allowed' | 'denied';
  createdAt: string;
}

export function AuditViewerPage() {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const fetchAudit = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actorFilter) params.set('actorUserId', actorFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resourceType', resourceFilter);

      const res = await fetch(`/api/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Sin permiso para ver el audit log');
      const data = (await res.json()) as { entries: AuditEntry[] };
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAudit(); }, [accessToken]);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Audit Log</h1>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Actor (userId)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Acción (game.view)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <input
          type="text"
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          placeholder="Recurso (Game, User…)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          onClick={() => void fetchAudit()}
          className="rounded bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Filtrar
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Timestamp</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Actor</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Acción</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Recurso</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.auditId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-500">
                    {new Date(e.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 font-mono text-gray-700" title={e.actorUserId}>
                    {e.actorUserId.slice(0, 12)}…
                  </td>
                  <td className="px-3 py-2 text-gray-700">{e.action}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {e.resourceType}/{e.resourceId.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        e.result === 'allowed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {e.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">Sin entradas de audit</p>
          )}
        </div>
      )}
    </div>
  );
}
