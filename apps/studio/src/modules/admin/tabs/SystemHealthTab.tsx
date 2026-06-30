import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAdmin, SystemHealth } from '../../../hooks/useAdmin';
import { useAuth } from '../../auth/SecurityContextProvider';
import { formatDateTimeInTimeZone } from '../../../utils/datetime';

interface SystemHealthTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const SystemHealthTab: React.FC<SystemHealthTabProps> = ({ onNotify, setLoading }) => {
  const admin = useAdmin();
  const { timeZone } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealth();
    if (autoRefresh) {
      const interval = setInterval(loadHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await admin.getSystemHealth();
      setHealth(data || null);
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al cargar estado del sistema');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const isHealthy = status === 'connected' || status === 'operational' || status === 'healthy';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
          isHealthy
            ? 'bg-emerald-900/30 text-emerald-300'
            : 'bg-yellow-900/30 text-yellow-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-yellow-400'}`}
        />
        {status}
      </span>
    );
  };

  if (!health) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-400 mb-4" />
        <p className="text-slate-300">Cargando estado del sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Estado General</h3>
            <p className="text-slate-400 text-sm">Última actualización: {formatDateTimeInTimeZone(health.timestamp, timeZone)}</p>
          </div>
          <div className="flex items-center gap-3">
            {health.status === 'healthy' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
            {health.status === 'degraded' && <AlertTriangle className="w-8 h-8 text-yellow-400" />}
            {health.status === 'unhealthy' && <AlertCircle className="w-8 h-8 text-red-400" />}
            <span
              className={`text-2xl font-bold ${
                health.status === 'healthy'
                  ? 'text-emerald-400'
                  : health.status === 'degraded'
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {health.status === 'healthy' ? 'Saludable' : health.status === 'degraded' ? 'Degradado' : 'Crítico'}
            </span>
          </div>
        </div>
      </div>

      {/* Component Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-700/20 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-semibold">Base de Datos</span>
            <StatusBadge status={health.db} />
          </div>
          <p className="text-xs text-slate-400">Conexión: {health.db === 'connected' ? 'Conectada' : 'No configurada'}</p>
        </div>

        <div className="bg-slate-700/20 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-semibold">Tiempo Activo</span>
            <span className="text-emerald-300 text-sm font-mono">{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
          </div>
          <p className="text-xs text-slate-400">{health.uptime} segundos</p>
        </div>
      </div>

      {/* Memory Usage */}
      {health.memory && (
        <div className="bg-slate-700/20 border border-slate-600 rounded-lg p-4">
          <h4 className="text-slate-300 font-semibold mb-3">Memoria</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Usada</p>
              <p className="text-lg font-mono text-emerald-300">
                {(health.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Total</p>
              <p className="text-lg font-mono text-slate-300">
                {(health.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-900/50 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{
                width: `${(health.memory.heapUsed / health.memory.heapTotal) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Auto-refresh Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoRefresh"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          className="w-4 h-4 rounded bg-slate-700 border-slate-600 checked:bg-blue-600"
        />
        <label htmlFor="autoRefresh" className="text-sm text-slate-300 cursor-pointer">
          Actualización automática cada 5 segundos
        </label>
      </div>
    </div>
  );
};

export default SystemHealthTab;
