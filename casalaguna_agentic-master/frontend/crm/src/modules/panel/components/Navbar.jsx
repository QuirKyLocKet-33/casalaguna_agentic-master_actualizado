import React from 'react';
import { FaBell, FaUser, FaCog } from 'react-icons/fa';
import './Navbar.css';

function Navbar({ darkMode, toggleDarkMode, notificationCount }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">Casa Laguna CRM</h1>
        <p className="tagline">Gestor de Reservas y Chats</p>
      </div>
      
      <div className="navbar-right">
        <div className="notification-bell">
          <FaBell size={20} />
          {notificationCount > 0 && (
            <span className="notification-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
          )}
        </div>
        
        <div className="navbar-divider"></div>
        
        <button className="navbar-btn settings-btn" title="Configuración">
          <FaCog size={18} />
        </button>
        
        <div className="user-profile">
          <FaUser size={20} />
          <span>Admin</span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
