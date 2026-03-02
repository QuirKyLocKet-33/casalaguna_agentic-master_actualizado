import React, { useState, useEffect } from 'react';
import Navbar from '../../shared/components/Navbar';
import Sidebar from '../../shared/components/Sidebar';
import { adminService } from '../../shared/services/api';
import './Admin.css';

function AdminModule({ user, darkMode, setDarkMode, setUser }) {
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const data = await adminService.getSystemStats();
        setStats(data);
      } catch (error) {
        console.error('Error cargando datos de admin:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Navbar 
        user={user} 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="app-container">
        <Sidebar 
          user={user}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onUserUpdate={setUser}
        />
        <div className="main-content">
          <div className="admin-container">
            <h1>Administración</h1>
            {loading ? (
              <p>Cargando datos de administración...</p>
            ) : (
              <p>Módulo de administración en desarrollo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminModule;
