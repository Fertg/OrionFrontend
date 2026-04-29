import { useEffect, useState } from 'react';

const SW_PATH = '/sw.js';
const DISMISSED_KEY = 'orion.installPromptDismissed';

/**
 * Registra el service worker al montar la app.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (window.location.hostname === 'localhost') {
    // En dev no nos interesa el SW (cachea cosas raras del HMR)
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_PATH)
      .then((reg) => {
        // Si hay nueva versión, escucha el evento
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay nueva versión disponible. La activamos en silencio.
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => { /* sin ruido */ });

    // Cuando el SW nuevo toma control, recargamos para coger los assets nuevos
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

/**
 * Hook para detectar si la PWA es instalable y exponer una función install().
 *
 * Devuelve:
 *   { canInstall, isInstalled, isIOS, install, dismiss }
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ¿Ya está instalada? (modo standalone)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // ¿El usuario la dismissed antes?
    if (localStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si se instala mientras tenemos el prompt activo
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    // El usuario lo rechazó — no insistimos esta sesión
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
    return false;
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  // iOS no soporta beforeinstallprompt — detectamos si es Safari de iOS
  // y no está ya instalada para mostrar instrucciones manuales
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);

  const canInstall = !isInstalled && !dismissed && (!!deferredPrompt || isIOS);

  return { canInstall, isInstalled, isIOS, install, dismiss };
}
