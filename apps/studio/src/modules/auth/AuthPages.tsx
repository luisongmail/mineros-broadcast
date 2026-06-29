import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './SecurityContextProvider';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: { code: string; retryAfter?: number } };
      if (!res.ok) {
        if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
          setError(`Demasiados intentos. Espera ${data.error.retryAfter ?? 60} segundos.`);
        } else {
          setError('Ingresa un correo electrónico válido.');
        }
        return;
      }
      navigate('/auth/verify', { state: { email } });
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">PlayFlow</h1>
        <p className="text-gray-400 text-sm mb-8">Ingresa tu correo para recibir un código de acceso.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.cl"
            required
            autoFocus
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function OtpVerifyPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccessToken } = useAuth();

  const email = (location.state as { email?: string } | null)?.email ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json() as { 
        accessToken?: string; 
        mfaRequired?: boolean;
        sessionId?: string;
        error?: { code: string } 
      };
      if (!res.ok) {
        if (data.error?.code === 'OTP_MAX_ATTEMPTS') {
          setError('Máximo de intentos alcanzado. Solicita un nuevo código.');
        } else {
          setError('Código inválido o expirado.');
        }
        return;
      }
      // Si requiere MFA, ir a MFA verify
      if (data.mfaRequired && data.sessionId) {
        navigate('/auth/mfa', { state: { sessionId: data.sessionId, email } });
        return;
      }
      // Sin MFA, usar token directamente
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        navigate('/auth/select-scope');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Código de acceso</h1>
        <p className="text-gray-400 text-sm mb-8">
          Ingresa el código de 6 dígitos enviado a <strong className="text-gray-300">{email || 'tu correo'}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            autoFocus
            className="w-full px-4 py-4 text-center text-3xl tracking-widest bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Volver e ingresar otro correo
          </button>
        </form>
      </div>
    </div>
  );
}

export function ScopeSelectorPage() {
  const { availableScopes, setScope, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSelect(scope: typeof availableScopes[0]) {
    setScope(scope);
    navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Selecciona un contexto</h1>
            <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm">Salir</button>
        </div>
        {availableScopes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No tienes contextos disponibles.</p>
            <p className="text-gray-500 text-sm mt-2">Contacta a un administrador para que te asigne un rol.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableScopes.map((scope) => (
              <button
                key={`${scope.resourceType}-${scope.resourceId}`}
                onClick={() => handleSelect(scope)}
                className="w-full text-left px-4 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium group-hover:text-blue-300 transition-colors">{scope.name}</p>
                    <p className="text-gray-400 text-sm">{scope.role} · {scope.resourceType}</p>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
