import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../../shared/components/Navbar';
import Sidebar from '../../shared/components/Sidebar';
import { reservationsService } from '../../shared/services/api';
import { FaCalendarAlt, FaUsers, FaPhone, FaSearch, FaFilter, FaCheck, FaTimes, FaClock, FaUser, FaSyncAlt } from 'react-icons/fa';
import './Reservations.css';

const STATUS_MAP = {
  confirmada: { label: 'Confirmada', className: 'status-confirmed', icon: <FaCheck /> },
  cancelada:  { label: 'Cancelada',  className: 'status-cancelled', icon: <FaTimes /> },
  completada: { label: 'Completada', className: 'status-completed', icon: <FaCheck /> },
  pendiente:  { label: 'Pendiente',  className: 'status-pending',   icon: <FaClock /> },
};

function ReservationsModule({ user, darkMode, setDarkMode, setUser }) {
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await reservationsService.getReservations();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await reservationsService.updateReservationStatus(id, newStatus);
      setReservations(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );
      if (selectedReservation?.id === id) {
        setSelectedReservation(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      const matchSearch =
        !searchTerm ||
        r.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.telefono?.includes(searchTerm) ||
        r.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = reservations.length;
    const confirmadas = reservations.filter(r => r.status === 'confirmada').length;
    const canceladas = reservations.filter(r => r.status === 'cancelada').length;
    const completadas = reservations.filter(r => r.status === 'completada').length;
    return { total, confirmadas, canceladas, completadas };
  }, [reservations]);

  const formatDate = (fechaHora) => {
    if (!fechaHora) return '—';
    const parts = fechaHora.split(' ');
    return parts[0] || fechaHora;
  };

  const formatTime = (fechaHora) => {
    if (!fechaHora) return '—';
    const parts = fechaHora.split(' ');
    return parts[1] || '';
  };

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
          <div className="reservations-container">

            {/* Header */}
            <div className="res-header">
              <div className="res-header-left">
                <h1>Reservas</h1>
                <span className="res-count">{stats.total} registros</span>
              </div>
              <button className="res-refresh-btn" onClick={loadReservations} title="Actualizar">
                <FaSyncAlt className={loading ? 'spinning' : ''} />
              </button>
            </div>

            {/* Stats */}
            <div className="res-stats-row">
              <div className="res-stat-card">
                <span className="res-stat-value">{stats.total}</span>
                <span className="res-stat-label">Total</span>
              </div>
              <div className="res-stat-card confirmed">
                <span className="res-stat-value">{stats.confirmadas}</span>
                <span className="res-stat-label">Confirmadas</span>
              </div>
              <div className="res-stat-card completed">
                <span className="res-stat-value">{stats.completadas}</span>
                <span className="res-stat-label">Completadas</span>
              </div>
              <div className="res-stat-card cancelled">
                <span className="res-stat-value">{stats.canceladas}</span>
                <span className="res-stat-label">Canceladas</span>
              </div>
            </div>

            {/* Filters */}
            <div className="res-filters">
              <div className="res-search-box">
                <FaSearch className="res-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="res-status-filters">
                <button className={`res-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todas</button>
                <button className={`res-filter-btn ${statusFilter === 'confirmada' ? 'active' : ''}`} onClick={() => setStatusFilter('confirmada')}>Confirmadas</button>
                <button className={`res-filter-btn ${statusFilter === 'completada' ? 'active' : ''}`} onClick={() => setStatusFilter('completada')}>Completadas</button>
                <button className={`res-filter-btn ${statusFilter === 'cancelada' ? 'active' : ''}`} onClick={() => setStatusFilter('cancelada')}>Canceladas</button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="res-loading">
                <div className="res-spinner"></div>
                <p>Cargando reservas desde la base de datos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="res-empty">
                <FaCalendarAlt className="res-empty-icon" />
                <p>No se encontraron reservas</p>
              </div>
            ) : (
              <div className="res-layout">
                {/* Table */}
                <div className="res-table-wrap">
                  <table className="res-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Personas</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(res => {
                        const st = STATUS_MAP[res.status] || STATUS_MAP.pendiente;
                        return (
                          <tr
                            key={res.id}
                            className={selectedReservation?.id === res.id ? 'selected' : ''}
                            onClick={() => setSelectedReservation(res)}
                          >
                            <td className="res-id">{res.id}</td>
                            <td className="res-name"><FaUser className="inline-icon" /> {res.nombre}</td>
                            <td><FaPhone className="inline-icon" /> {res.telefono}</td>
                            <td><FaCalendarAlt className="inline-icon" /> {formatDate(res.fecha_hora)}</td>
                            <td><FaClock className="inline-icon" /> {formatTime(res.fecha_hora)}</td>
                            <td className="res-personas"><FaUsers className="inline-icon" /> {res.personas}</td>
                            <td><span className={`res-status-badge ${st.className}`}>{st.icon} {st.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Detail panel */}
                {selectedReservation && (
                  <div className="res-detail-panel">
                    <div className="res-detail-header">
                      <h3>Detalle de Reserva</h3>
                      <button className="res-detail-close" onClick={() => setSelectedReservation(null)}><FaTimes /></button>
                    </div>
                    <div className="res-detail-body">
                      <div className="res-detail-row">
                        <span className="res-detail-label">ID</span>
                        <span className="res-detail-value">{selectedReservation.id}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Cliente</span>
                        <span className="res-detail-value">{selectedReservation.nombre}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Teléfono</span>
                        <span className="res-detail-value">{selectedReservation.telefono}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Fecha de nacimiento</span>
                        <span className="res-detail-value">{selectedReservation.fecha_nacimiento || '—'}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Fecha y hora</span>
                        <span className="res-detail-value">{selectedReservation.fecha_hora}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Personas</span>
                        <span className="res-detail-value">{selectedReservation.personas}</span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Estado</span>
                        <span className={`res-status-badge ${(STATUS_MAP[selectedReservation.status] || STATUS_MAP.pendiente).className}`}>
                          {(STATUS_MAP[selectedReservation.status] || STATUS_MAP.pendiente).label}
                        </span>
                      </div>
                      <div className="res-detail-row">
                        <span className="res-detail-label">Registrada</span>
                        <span className="res-detail-value">{selectedReservation.timestamp ? new Date(selectedReservation.timestamp).toLocaleString() : '—'}</span>
                      </div>
                    </div>
                    <div className="res-detail-actions">
                      {selectedReservation.status !== 'completada' && (
                        <button className="res-action-btn complete" onClick={() => handleStatusChange(selectedReservation.id, 'completada')}>
                          <FaCheck /> Completar
                        </button>
                      )}
                      {selectedReservation.status !== 'cancelada' && (
                        <button className="res-action-btn cancel" onClick={() => handleStatusChange(selectedReservation.id, 'cancelada')}>
                          <FaTimes /> Cancelar
                        </button>
                      )}
                      {(selectedReservation.status === 'cancelada' || selectedReservation.status === 'completada') && (
                        <button className="res-action-btn confirm" onClick={() => handleStatusChange(selectedReservation.id, 'confirmada')}>
                          <FaCheck /> Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReservationsModule;
