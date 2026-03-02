import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import eventEmitter from './shared/services/eventEmitter';
import './App.css';

// Módulos
import PanelModule from './modules/panel/PanelModule';
import ChatsModule from './modules/chats/ChatsModule';
import ReservationsModule from './modules/reservations/ReservationsModule';
import ClientsModule from './modules/clients/ClientsModule';
import AdminModule from './modules/admin/AdminModule';

// Estados globales del CRM
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Siempre autenticado
  const [user, setUser] = useState({ name: 'Usuario', role: 'admin' }); // Usuario por defecto
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false); // Sin loading

  // Removido: useEffect de verificación de autenticación

  // ============================================================
  // INICIAR POLLING GLOBAL DE WEBHOOKS
  // ============================================================
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[App] 🚀 Iniciando polling global de webhooks...');
      eventEmitter.startPolling();

      // Limpiar al desmontar (pero no detener, para que continúe en otras rutas)
      return () => {
        // No detenemos el polling aquí - debe ser global
      };
    }
  }, [isAuthenticated]);

  if (loading) {
    return <div className="app-loading">Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Todas las rutas disponibles sin autenticación */}
        <Route path="/panel/*" element={<PanelModule user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser} />} />
        <Route path="/chats/*" element={<ChatsModule user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser} />} />
        <Route path="/reservations/*" element={<ReservationsModule user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser} />} />
        <Route path="/clients/*" element={<ClientsModule user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser} />} />
        <Route path="/admin/*" element={<AdminModule user={user} darkMode={darkMode} setDarkMode={setDarkMode} setUser={setUser} />} />
        {/* Redireccionar a panel por defecto */}
        <Route path="/" element={<Navigate to="/panel" replace />} />
        <Route path="/login/*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;