import { useState } from 'react';
import { useInstallPrompt } from '../utils/pwa.js';
import { Logo } from './Logo.jsx';
import './InstallBanner.css';

export function InstallBanner() {
  const { canInstall, isIOS, install, dismiss } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!canInstall) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIosHelp(true);
      return;
    }
    await install();
  };

  return (
    <>
      <div className="install-banner">
        <div className="install-banner-icon">
          <Logo size={20} />
        </div>
        <div className="install-banner-content">
          <div className="install-banner-title">Instala Orion en tu móvil</div>
          <div className="install-banner-sub">Para acceder con un toque desde la pantalla de inicio</div>
        </div>
        <button className="install-banner-btn" onClick={handleInstall}>
          Instalar
        </button>
        <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">
          ×
        </button>
      </div>

      {showIosHelp && (
        <div className="install-modal-backdrop" onClick={() => setShowIosHelp(false)}>
          <div className="install-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="install-modal-title">Instalar en iPhone</h3>
            <ol className="install-steps">
              <li>
                Pulsa el botón <strong>Compartir</strong>
                <span className="ios-share-icon" aria-hidden="true">
                  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                    <path d="M9 1v14M4 6l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                {' '}en la barra de Safari
              </li>
              <li>Desplázate y pulsa <strong>Añadir a pantalla de inicio</strong></li>
              <li>Toca <strong>Añadir</strong> arriba a la derecha</li>
            </ol>
            <button className="btn btn-primary install-modal-ok" onClick={() => {
              setShowIosHelp(false);
              dismiss();
            }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
