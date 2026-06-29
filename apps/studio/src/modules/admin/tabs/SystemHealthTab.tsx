import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  database: {
    status: 'connected' | 'disconnected';
    latency: string;
  };
  auth: { status: 'operational' | 'degraded' };
  mfa: { status: 'operational' | 'degraded' };
  audit: { status: 'operational' | 'degraded' };
  uptime: number;
  timestamp: Date;
  metrics: {
    auditQueueDepth: number;
    recentAdminActions: number;
    suspendedUsers: number;
    failedMfaAttempts: number;
  };
}

interface SystemHealthTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const SystemHealthTab: React.FC<SystemHealthTabProps> = ({ onNotify }) => {
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
    try {
      // Mock system health data
      setHealth({
        status: 'healthy',
        database: {
          status: 'connected',
          latency: '12ms',
        },
        auth: { status: 'operational' },
        mfa: { status: 'operational' },
        audit: { status: 'operational' },
        uptime: 3600,
        timestamp: new Date(),
        metrics: {
          auditQueueDepth: 0,
          recentAdminActions: 5,
          suspendedUsers: 2,
          failedMfaAttempts: 23,
        },
      });
    } catch (error) {
      onNotify('error', 'Error al cargar estado del sistema');
    }
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const isHealthy = status === 'connected' || status === 'operational';
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

  const OverallStatus: React.FC<{ status: string }> = ({ status }) => {
    const colorMap = {
      healthy: 'bg-emerald-900/20 border-emerald-700/50 text-emerald-300',
      degraded: 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300',
      critical: 'bg-red-900/20 border-red-700/50 text-red-300',
    };
    const iconMap = {
      healthy: <CheckCircle className="w-5 h-5" />,
      degraded: <AlertTriangle className="w-5 h-5" />,
      critical: <AlertCircle className="w-5 h-5" />,
    };

    return (
      <div className={`border rounded-lg p-4 flex gap-3 ${colorMap[status as keyof typeof colorMap]}`}>
        {iconMap[status as keyof typeof iconMap]}
        <div>
          <p className="font-semibold capitalize">{status}</p>
          <p className="text-sm mt-1">
            {status === 'healthy' && 'Todos los componentes funcionan correctamente'}
            {status === 'degraded' && 'Algunos componentes están funcionando con degradación'}
            {status === 'critical' && 'Sistema crítico requiere atención inmediata'}
          </p>
        </div>
      </div>
    );
  };

  if (!health) {
    return <div className="text-center py-8 text-slate-400">Cargando...</div>;
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <OverallStatus status={health.status} />

      {/* Auto Refresh Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border border-slate-500"
          />
          <span className="text-slate-300">Actualizar automáticamente (cada 5s)</span>
        </label>
      </div>

      {/* Component Status Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <h3 className="font-semibold text-white mb-3">Base de Datos</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Estado</span>
              <StatusBadge status={health.database.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Latencia</span>
              <span className="text-white font-mono">{health.database.latency}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <h3 className="font-semibold text-white mb-3">Autenticación</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Estado</span>
              <StatusBadge status={health.auth.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Uptime</span>
              <span className="text-white font-mono">{formatUptime(health.uptime)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <h3 className="font-semibold text-white mb-3">MFA</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Estado</span>
              <StatusBadge status={health.mfa.status} />
            </div>
          </div>
        </div>

        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <h3 className="font-semibold text-white mb-3">Auditoría</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Estado</span>
              <StatusBadge status={health.audit.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
        <h3 className="font-semibold text-white mb-4">Métricas</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Cola de Auditoría</p>
            <p className="text-2xl font-bold text-white">{health.metrics.auditQueueDepth}</p>
            <p className="text-xs text-slate-500 mt-1">eventos pendientes</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Acciones Admin Recientes</p>
            <p className="text-2xl font-bold text-white">{health.metrics.recentAdminActions}</p>
            <p className="text-xs text-slate-500 mt-1">últimas 24 horas</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Usuarios Suspendidos</p>
            <p className="text-2xl font-bold text-white">{health.metrics.suspendedUsers}</p>
            <p className="text-xs text-slate-500 mt-1">actualmente</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Intentos MFA Fallidos</p>
            <p className="text-2xl font-bold text-white">{health.metrics.failedMfaAttempts}</p>
            <p className="text-xs text-slate-500 mt-1">últimas 24 horas</p>
          </div>
        </div>
      </div>

      {/* Last Update */}
      <p className="text-xs text-slate-500 text-right">
        Última actualización: {health.timestamp.toLocaleTimeString('es-CL')}
      </p>
    </div>
  );
};

export default SystemHealthTab;
