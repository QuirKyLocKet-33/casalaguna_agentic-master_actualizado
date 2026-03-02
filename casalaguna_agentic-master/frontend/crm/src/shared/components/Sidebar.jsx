// Componente para manejar error de carga de imagen de avatar
function AvatarImage({ url, size = 40, selected, reloadKey }) {
  const [error, setError] = React.useState(false);
  React.useEffect(() => { setError(false); }, [reloadKey, url]);
  return error ? (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, color: '#bbb', border: selected ? '2px solid #007bff' : 'none' }} title="No se pudo cargar">
      <span role="img" aria-label="error">⚠️</span>
    </div>
  ) : (
    <img
      src={url}
      alt="avatar"
      style={{ width: size, height: size, borderRadius: '50%', border: selected ? '2px solid #007bff' : 'none' }}
      onError={() => setError(true)}
    />
  );
}
import React, { useState } from 'react';
import { 
  FaHome, 
  FaComments, 
  FaCalendar, 
  FaUsers, 
  FaCog,
  FaTimes,
  FaPen,
  FaCheck,
  FaUserAstronaut,
  FaUserNinja,
  FaUserSecret,
  FaUserTie,
  FaUserMd,
  FaUserGraduate,
  FaUserShield,
  FaUser,
  FaUserCog,
  FaRobot,
  FaCrown,
  FaGem
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/api';
import './Sidebar.css';


// Galería de avatares visuales (DiceBear Avatars)

// Galería de avatares agrupados por temática
const AVATAR_GROUPS = [
  {
    label: 'Robots',
    avatars: Array.from({ length: 24 }, (_, i) => `/avatars/robot${i+1}.png`)
  },
  {
    label: 'Personas',
    avatars: Array.from({ length: 24 }, (_, i) => `/avatars/persona${i+1}.png`)
  },
  {
    label: 'Pixel Art',
    avatars: Array.from({ length: 24 }, (_, i) => `/avatars/pixel${i+1}.png`)
  },
  {
    label: 'Abstractos',
    avatars: Array.from({ length: 24 }, (_, i) => `/avatars/abstract${i+1}.png`)
  },
  {
    label: 'Formas',
    avatars: Array.from({ length: 24 }, (_, i) => `/avatars/forma${i+1}.png`)
  },
];

function Sidebar({ user, notificationCount, isMobileOpen, onCloseMobile, onUserUpdate }) {
  // Estado para paginación de avatares por grupo
  const [avatarPages, setAvatarPages] = React.useState({});
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarReloadKey, setAvatarReloadKey] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  
  const menuItems = [
    { id: 'panel', label: 'Panel', path: '/panel', icon: FaHome, badge: null },
    { id: 'chats', label: 'Chats', path: '/chats', icon: FaComments, badge: notificationCount > 0 ? notificationCount : null },
    { id: 'reservations', label: 'Reservas', path: '/reservations', icon: FaCalendar, badge: null },
    { id: 'clients', label: 'Clientes', path: '/clients', icon: FaUsers, badge: null },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLinkClick = () => {
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const displayName = user?.display_name || user?.username || 'Admin';

  const avatarUrl = user?.avatar_icon || null;


  const openProfileModal = () => {
    setTempName(displayName);
    setSelectedAvatar(avatarUrl || '');
    setAvatarReloadKey(k => k + 1); // fuerza recarga de imágenes
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await authService.updateProfile({
        display_name: tempName || null,
        avatar_icon: selectedAvatar || null // ahora es la URL de la imagen
      });
      if (response.user && onUserUpdate) {
        onUserUpdate(response.user);
      }
      setShowProfileModal(false);
      setEditingName(false);
    } catch (err) {
      console.error('Error actualizando perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditName = () => {
    setTempName(displayName);
    setEditingName(true);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}
      
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile header */}
        <div className="sidebar-mobile-header">
          <span className="sidebar-title">Menú</span>
          <button className="sidebar-close-btn" onClick={onCloseMobile}>
            <FaTimes />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="sidebar-user">
            <div className="user-avatar-wrapper" onClick={openProfileModal} title="Cambiar avatar de perfil">
              <div className="user-avatar">
                {avatarUrl ? (
                  <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AvatarImage url={avatarUrl} size={42} reloadKey={avatarReloadKey} />
                  </div>
                ) : (
                  <span style={{ fontSize: 32 }}>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="avatar-edit-badge">
                <FaPen size={8} />
              </div>
            </div>
            <div className="user-info">
              <div className="user-name-row">
                <span className="user-name">{displayName}</span>
                <button className="edit-name-btn" onClick={openProfileModal} title="Editar nombre">
                  <FaPen size={10} />
                </button>
              </div>
              <span className="user-role">Administrador</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="nav-label">NAVEGACIÓN</span>
          <div className="menu">
            {menuItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`menu-item ${active ? 'active' : ''}`}
                  title={item.label}
                  onClick={handleLinkClick}
                >
                  <div className="menu-item-icon">
                    <Icon />
                  </div>
                  <span className="menu-label">{item.label}</span>
                  {item.badge && (
                    <span className="badge">{item.badge > 99 ? '99+' : item.badge}</span>
                  )}
                  {active && <div className="active-indicator" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Link to="/admin" className="settings-link" onClick={handleLinkClick}>
            <FaCog />
            <span>Configuración</span>
          </Link>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <>
          <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)} />
          <div className="profile-modal">
            <div className="profile-modal-header">
              <h3>Editar Perfil</h3>
              <button className="profile-modal-close" onClick={() => setShowProfileModal(false)}>
                <FaTimes size={14} />
              </button>
            </div>

            <div className="profile-modal-body">
              {/* Name editing */}
              <div className="profile-section">
                <label className="profile-label">Nombre</label>
                <div className="profile-name-edit">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="profile-name-input"
                    placeholder="Tu nombre..."
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Avatar selection visual, agrupado por temática */}
              <div className="profile-section">
                <label className="profile-label">Avatar visual</label>
                {AVATAR_GROUPS.map(group => {
                  const page = avatarPages[group.label] || 1;
                  const showCount = page * 12;
                  const hasMore = group.avatars.length > showCount;
                  return (
                    <div key={group.label} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{group.label}</div>
                      <div className="avatar-grid">
                        {group.avatars.slice(0, showCount).map(url => (
                          <button
                            key={url}
                            className={`avatar-option ${selectedAvatar === url ? 'selected' : ''}`}
                            onClick={() => setSelectedAvatar(url)}
                            title={`Seleccionar avatar de ${group.label}`}
                          >
                            <AvatarImage url={url} selected={selectedAvatar === url} reloadKey={avatarReloadKey} />
                            {selectedAvatar === url && (
                              <span className="avatar-check"><FaCheck size={12} /></span>
                            )}
                          </button>
                        ))}
                      </div>
                      {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: 6 }}>
                          <button
                            className="avatar-see-more-btn"
                            onClick={() => setAvatarPages(p => ({ ...p, [group.label]: (p[group.label] || 1) + 1 }))}
                          >
                            Ver más
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setShowProfileModal(false)}>
                Cancelar
              </button>
              <button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Sidebar;
