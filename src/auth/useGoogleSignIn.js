import { useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Estado a nivel de módulo para evitar reinicializar GSI varias veces
// (React StrictMode + recargas de hooks pueden provocarlo).
let gsiInitialized = false;
let initializedCallback = null;

function initOnce(onCredentialDispatcher) {
  // Cada vez que se llama, actualizamos el dispatcher activo
  initializedCallback = onCredentialDispatcher;

  if (gsiInitialized) return true;
  if (!window.google?.accounts?.id) return false;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      // Llamamos siempre al dispatcher actual, no al cerrado en cierre
      if (response?.credential && initializedCallback) {
        initializedCallback(response.credential);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true, // evita problemas con Cross-Origin-Opener-Policy
    ux_mode: 'popup',
  });

  gsiInitialized = true;
  return true;
}

/**
 * Hook que renderiza el botón de Google Sign-In en el ref dado
 * y llama a onCredential con el ID token cuando el usuario autentica.
 */
export function useGoogleSignIn({ onCredential, onError }) {
  const buttonRef = useRef(null);
  const credentialHandler = useRef(onCredential);
  credentialHandler.current = onCredential;

  // Dispatcher estable que delega al callback más reciente
  const dispatch = useCallback((cred) => {
    credentialHandler.current?.(cred);
  }, []);

  useEffect(() => {
    if (!buttonRef.current) return;

    if (!GOOGLE_CLIENT_ID) {
      onError?.(new Error('Falta VITE_GOOGLE_CLIENT_ID en las variables de entorno'));
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50;

    const tryRender = () => {
      if (cancelled) return;

      const ready = initOnce(dispatch);
      if (!ready) {
        attempts++;
        if (attempts > maxAttempts) {
          onError?.(new Error('No se pudo cargar Google Sign-In. ¿Hay algún bloqueador de anuncios activo?'));
          return;
        }
        setTimeout(tryRender, 100);
        return;
      }

      if (!buttonRef.current || cancelled) return;

      // Limpia contenido previo (re-render del componente)
      buttonRef.current.innerHTML = '';

      try {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 280,
        });
      } catch (err) {
        onError?.(err);
      }
    };

    tryRender();

    return () => {
      cancelled = true;
    };
  }, [dispatch, onError]);

  return buttonRef;
}
