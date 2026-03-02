import React, { useState, useEffect } from 'react';
import Navbar from '../../shared/components/Navbar';
import Sidebar from '../../shared/components/Sidebar';
import { clientsService } from '../../shared/services/api';
import './Clients.css';

function ClientsModule({ user, darkMode, setDarkMode, setUser }) {
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await clientsService.getClients();
        setClients(data);
      } catch (error) {
        console.error('Error cargando clientes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Navbar 
        user={user} 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        connectionStatus="connected"
      />
      <div className="app-container">
        <Sidebar 
          user={user}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onUserUpdate={setUser}
        />
        <div className="main-content">
          <div className="clients-container">
            <h1>Clientes</h1>
            {loading ? (
              <p>Cargando clientes...</p>
            ) : (
              <p>Módulo de clientes en desarrollo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientsModule;
