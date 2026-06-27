import React, { useState } from 'react';
import { useAuth } from '../auth/SecurityContextProvider';

interface SimulationResult {
  decision: 'allow' | 'deny';
  ruleId: string;
  reason: string;
  requiresStepUp: boolean;
  policyVersion: string;
}

const RESOURCE_TYPES = ['Game', 'Tournament', 'League', 'Season', 'User', 'System'];

const COMMON_ACTIONS = [
  'game.view',
  'game.scoreEventCreate',
  'game.scoreEventDelete',
  'game.assignScorer',
  'game.finalizeStats',
  'game.manualCorrection',
  'user.view',
  'user.invite',
  'user.suspend',
  'role.assign',
  'role.revoke',
  'audit.view',
];

export function PermissionSimulatorPage() {
  const { getAccessToken } = useAuth();

  const [userId, setUserId] = useState('');
  const [resourceType, setResourceType] = useState('Game');
  const [resourceId, setResourceId] = useState('');
  const [action, setAction] = useState('game.view');
  const [customAction, setCustomAction] = useState('');

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulate(e: React.FormEvent) {
    e.preventDefault();
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const effectiveAction = action === '__custom__' ? customAction : action;
    if (!effectiveAction) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/security/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: effectiveAction,
          resourceType,
          resourceId: resourceId || 'global',
          // Si se especifica un userId distinto al propio se usa el endpoint de simulación
          simulateUserId: userId || undefined,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as SimulationResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-xl font-bold text-gray-900">Simulador de Permisos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Verifica qué decisión tomaría el motor de autorización para una acción específica.
      </p>

      <form onSubmit={(e) => void simulate(e)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        {/* userId opcional */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Usuario a simular <span className="text-gray-400">(vacío = tú mismo)</span>
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="usr_abc123…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Tipo de recurso */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de recurso</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* ID del recurso */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ID del recurso <span className="text-gray-400">(vacío = "global")</span>
          </label>
          <input
            type="text"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            placeholder="game_abc123…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Acción */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Acción</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {COMMON_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
            <option value="__custom__">Otra acción…</option>
          </select>
        </div>

        {action === '__custom__' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Acción personalizada</label>
            <input
              type="text"
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              placeholder="resource.action"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-navy-700 bg-[#1B2F5B] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Simulando…' : 'Simular autorización'}
        </button>
      </form>

      {/* Resultado */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-lg border p-5 ${
            result.decision === 'allow'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl">{result.decision === 'allow' ? '✅' : '🚫'}</span>
            <span
              className={`text-lg font-bold ${
                result.decision === 'allow' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {result.decision === 'allow' ? 'PERMITIDO' : 'DENEGADO'}
            </span>
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Regla:</dt>
              <dd className="font-mono text-gray-800">{result.ruleId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Razón:</dt>
              <dd className="text-gray-800">{result.reason}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Step-up req.:</dt>
              <dd className={result.requiresStepUp ? 'font-medium text-amber-700' : 'text-gray-500'}>
                {result.requiresStepUp ? 'Sí — requiere verificación adicional' : 'No'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Política:</dt>
              <dd className="font-mono text-gray-500">v{result.policyVersion}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
