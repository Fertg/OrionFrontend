import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Logo, WordMark } from './Logo.jsx';
import { IconHome, IconList, IconRepeat, IconSettings } from './Icons.jsx';
import { InstallBanner } from './InstallBanner.jsx';
import './AppLayout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Resumen', icon: IconHome, exact: true },
  { to: '/historico', label: 'Histórico', icon: IconList },
  { to: '/suscripciones', label: 'Suscripciones', icon: IconRepeat },
  { to: '/ajustes', label: 'Ajustes', icon: IconSettings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      {/* Sidebar — solo desktop */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo size={24} />
          <WordMark />
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className="nav-item"
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
              <button onClick={handleLogout} className="btn-ghost logout-btn">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Topbar — solo mobile */}
      <header className="topbar">
        <div className="topbar-brand">
          <Logo size={20} />
          <WordMark />
        </div>
        <button onClick={handleLogout} className="topbar-logout" title="Cerrar sesión">
          ⏻
        </button>
      </header>

      <main className="main">
        <InstallBanner />
        <Outlet />
      </main>

      {/* Bottom nav — solo mobile */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className="bottom-nav-item"
          >
            <item.icon size={20} />
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
