import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  sessionId?: string;
  email?: string;
}

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const state = location.state as LocationState | null;
  const sessionId = state?.sessionId ?? '';
  const email = state?.email ?? 'usuario@playflow.cl';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code: code.trim() }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: { message?: string } };
        setError(errorData.error?.message ?? 'Código inválido o expirado.');
        return;
      }

      // En flujo real, aquí se emitirá el JWT y se navegará
      navigate('/admin/settings', { state: { sessionId } });
    } catch (err) {
      setError('Error al verificar TOTP. Intenta de nuevo.');
      console.error('[MfaVerify] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Verificación de dos factores</h1>
        <p className="text-gray-400 text-sm mb-8">Ingresa el código de tu autenticador</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Código TOTP</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={loading}
              autoFocus
              className="w-full px-4 py-4 text-center text-3xl tracking-widest bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
            />
            <small className="text-gray-400">6 dígitos de tu autenticador</small>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          <a href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}
