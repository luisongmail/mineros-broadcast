import { useState, type ReactNode } from 'react';
import { useAuth } from './SecurityContextProvider';

export interface ProtectedActionProps {
  /** Contenido del componente (ej: botón) */
  children: ReactNode | ((props: { isLoading: boolean }) => ReactNode);
  /** Acción que se va a proteger (ej: 'delete_user', 'modify_policy') */
  action: string;
  /** Tipo de recurso */
  resourceType?: string;
  /** Callback cuando la acción es autorizada */
  onAuthorized: (stepUpToken?: string) => Promise<void> | void;
  /** Mostrar modal de re-verificación */
  requiresStepUp?: boolean;
  /** CSS classes para el wrapper */
  className?: string;
}

/**
 * ProtectedAction — Envuelve una acción sensible (botón, link, etc.)
 * Si requiere step-up MFA, abre un modal para re-verificar identidad antes de ejecutar.
 *
 * Uso:
 *   <ProtectedAction
 *     action="delete_user"
 *     requiresStepUp={true}
 *     onAuthorized={async () => { await deleteUser(userId); }}
 *   >
 *     <button>Eliminar Usuario</button>
 *   </ProtectedAction>
 */
export function ProtectedAction({
  children,
  action,
  resourceType: _resourceType,
  onAuthorized,
  requiresStepUp = false,
  className,
}: ProtectedActionProps) {
  const auth = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState('');

  const handleClick = async () => {
    // Si no requiere step-up o ya está verificado → ejecutar directamente
    if (!requiresStepUp || auth.stepUpToken) {
      try {
        setIsVerifying(true);
        await onAuthorized(auth.stepUpToken ?? undefined);
      } catch (err) {
        console.error(`[ProtectedAction] Error executing action ${action}:`, err);
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // Requiere step-up pero no está verificado → mostrar modal
    setShowStepUpModal(true);
  };

  const handleStepUpVerify = async () => {
    setStepUpError('');
    setIsVerifying(true);

    try {
      // Aquí se enviaría el código a un endpoint de step-up
      // Por ahora es un placeholder que simula la verificación
      if (stepUpCode.length !== 6) {
        setStepUpError('El código debe tener 6 dígitos');
        return;
      }

      // TODO: Integrar con endpoint /api/auth/step-up/verify
      console.log('[ProtectedAction] Verifying step-up code:', stepUpCode);

      // Simular verificación exitosa
      setShowStepUpModal(false);
      setStepUpCode('');

      // Ejecutar la acción protegida
      await onAuthorized(auth.stepUpToken ?? undefined);
    } catch (err) {
      setStepUpError('Error al verificar. Intenta de nuevo.');
      console.error('[ProtectedAction] Step-up verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      {/* Wrapper para el children con handling de click */}
      <div className={className} onClick={handleClick} role="button" tabIndex={0}>
        {typeof children === 'function'
          ? children({ isLoading: isVerifying })
          : children}
      </div>

      {/* Modal de step-up */}
      {showStepUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">Re-verificación requerida</h2>
            <p className="text-gray-400 text-sm mb-6">
              Esta acción requiere re-verificar tu identidad. Ingresa el código de 6 dígitos de tu autenticador.
            </p>

            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={stepUpCode}
              onChange={(e) => setStepUpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={isVerifying}
              autoFocus
              className="w-full px-4 py-4 text-center text-3xl tracking-widest bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 mb-4"
            />

            {stepUpError && <p className="text-red-400 text-sm mb-4">{stepUpError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStepUpModal(false);
                  setStepUpCode('');
                  setStepUpError('');
                }}
                disabled={isVerifying}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStepUpVerify}
                disabled={stepUpCode.length !== 6 || isVerifying}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
