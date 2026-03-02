import React from 'react';
import { FaHome, FaComments, FaCalendar, FaUsers, FaCog } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar({ activeTab, setActiveTab, notificationCount }) {
  const menuItems = [
    { id: 'dashboard', label: 'Panel', icon: FaHome, badge: null },
    { id: 'chats', label: 'Chats', icon: FaComments, badge: notificationCount > 0 ? notificationCount : null },
    { id: 'reservations', label: 'Reservas', icon: FaCalendar, badge: null },
    { id: 'clients', label: 'Clientes', icon: FaUsers, badge: null },
  ];

  return (
    <aside className="sidebar">
      <div className="menu">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
            >
              <Icon className="menu-icon" />
              <span className="menu-label">{item.label}</span>
              {item.badge && (
                <span className="badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="settings-btn" title="Configuración">
          <FaCog size={20} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
