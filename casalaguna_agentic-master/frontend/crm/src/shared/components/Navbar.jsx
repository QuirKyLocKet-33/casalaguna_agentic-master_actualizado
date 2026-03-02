import React, { useState } from 'react';
import { FaBell, FaSignOutAlt, FaTimes, FaBars, FaSearch, FaEllipsisV, FaMoon, FaSun } from 'react-icons/fa';
import { authService } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ darkMode, toggleDarkMode, notificationCount, connectionStatus, urgentCount = 0, notifications = [], onUrgentClick, onMarkAsRead, onToggleMobileMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleBellClick = () => {
    setShowNotificationsPanel(!showNotificationsPanel);
  };

  const handleNotificationClick = (notification) => {
    if (onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onUrgentClick) {
      onUrgentClick();
    }
    setShowNotificationsPanel(false);
  };

  // Obtener título de la página actual
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/panel')) return 'Panel de Control';
    if (path.includes('/chats')) return 'Conversaciones';
    if (path.includes('/reservations')) return 'Reservas';
    if (path.includes('/clients')) return 'Clientes';
    if (path.includes('/admin')) return 'Administración';
    return 'Casa Laguna';
  };

  return (
    <nav className="navbar">
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={onToggleMobileMenu}>
        <FaBars size={20} />
      </button>

      {/* Logo y título */}
      <div className="navbar-brand">
        <span className="brand-icon"></span>
        <div className="brand-text">
          <h1 className="brand-name">Casa Laguna</h1>
          <span className="page-title">ReserveFlow</span>
        </div>
      </div>

      {/* Barra de búsqueda (desktop) */}
      <div className={`navbar-search ${showSearch ? 'active' : ''}`}>
        <FaSearch className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar conversaciones, clientes..." 
          className="search-input"
        />
        <button className="search-close" onClick={() => setShowSearch(false)}>
          <FaTimes size={14} />
        </button>
      </div>

      {/* Acciones */}
      <div className="navbar-actions">
        {/* Búsqueda mobile */}
        <button className="action-btn search-toggle" onClick={() => setShowSearch(!showSearch)}>
          <FaSearch size={18} />
        </button>

        {/* Estado de conexión */}
        <div className="connection-pill">
          <span className={`connection-dot ${connectionStatus}`}></span>
          <span className="connection-label">{connectionStatus === 'connected' ? 'Agente IA en línea' : 'Offline'}</span>
        </div>

        {/* Theme toggle */}
        {toggleDarkMode && (
          <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
            <span className={`theme-toggle-track ${darkMode ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb">
                {darkMode ? <FaMoon className="theme-icon moon" /> : <FaSun className="theme-icon sun" />}
              </span>
              <span className="theme-toggle-stars">
                <span className="star s1"></span>
                <span className="star s2"></span>
                <span className="star s3"></span>
              </span>
            </span>
          </button>
        )}

        {/* Notificaciones */}
        <div className="notifications-wrapper">
          <button className="action-btn notifications-btn" onClick={handleBellClick}>
            <FaBell size={20} />
            {urgentCount > 0 && (
              <span className="notification-count">{urgentCount > 9 ? '9+' : urgentCount}</span>
            )}
          </button>
          
          {showNotificationsPanel && (
            <>
              <div className="notifications-backdrop" onClick={() => setShowNotificationsPanel(false)}></div>
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Notificaciones</h4>
                  <span className="notif-count">{notifications.filter(n => !n.leida).length} nuevas</span>
                </div>
                
                <div className="dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="empty-state">
                      <FaBell size={32} />
                      <p>Sin notificaciones</p>
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notif, idx) => (
                      <div 
                        key={notif.id || idx}
                        className={`notif-item ${notif.leida ? 'read' : 'unread'}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="notif-indicator"></div>
                        <div className="notif-body">
                          <p className="notif-title">{notif.usuario_nombre || 'Usuario Web'}</p>
                          <p className="notif-text">{notif.motivo}</p>
                          <span className="notif-time">
                            {new Date(notif.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 6 && (
                  <div className="dropdown-footer">
                    <button className="view-all-btn">Ver todas ({notifications.length})</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Separador */}
        <div className="action-divider"></div>

        {/* Perfil / Logout */}
        <button className="action-btn logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <FaSignOutAlt size={18} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
