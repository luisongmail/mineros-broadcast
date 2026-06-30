import { useState } from 'react';

export interface StepUpModalProps {
  /** Mostrar modal */
  isOpen: boolean;
  /** Callback cuando el usuario verifica el código */
  onVerify: (code: string) => Promise<void>;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Acción que se está protegiendo (ej: "Eliminar usuario") */
  actionDescription?: string;
  /** Mostrar loader */
  isLoading?: boolean;
  /** Método de verificación */
  verificationMethod?: 'otp' | 'totp';
}

/**
 * StepUpModal — Modal para re-verificar identidad con MFA TOTP.
 * Se usa cuando una acción requiere step-up (re-autenticación con MFA).
 *
 * Uso:
 *   <StepUpModal
 *     isOpen={showModal}
 *     actionDescription="Eliminar usuario de base de datos"
 *     onVerify={async (code) => await verifyStepUp(code)}
 *     onClose={() => setShowModal(false)}
 *   />
 */
export function StepUpModal({
  isOpen,
  onVerify,
  onClose,
  actionDescription,
  isLoading = false,
  verificationMethod = 'otp',
}: StepUpModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    try {
      setLocalLoading(true);
      await onVerify(code);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar código');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const methodLabel =
    verificationMethod === 'totp'
      ? 'Ingresa el código de 6 dígitos de tu autenticador'
      : 'Ingresa el código OTP de 6 dígitos enviado a tu correo';

  const methodHelp =
    verificationMethod === 'totp'
      ? 'De Google Authenticator, Authy o similar'
      : 'Revisa tu bandeja de entrada y carpeta de spam';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-sm shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-2">Re-verificación requerida</h2>
        <p className="text-gray-400 text-sm mb-6">
          {actionDescription
            ? `Para ${actionDescription.toLowerCase()}, necesitamos que re-verifiques tu identidad.`
            : 'Esta acción requiere que re-verifiques tu identidad.'}
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {methodLabel}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            disabled={localLoading || isLoading}
            autoFocus
            className="w-full px-4 py-4 text-center text-3xl tracking-widest bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <p className="text-gray-500 text-xs mt-2">
            {methodHelp}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={localLoading || isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={code.length !== 6 || localLoading || isLoading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {localLoading || isLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-4 text-center">
          ¿No puedes completar la verificación?{' '}
          <button className="text-blue-400 hover:text-blue-300">Contacta soporte</button>
        </p>
      </div>
    </div>
  );
}
