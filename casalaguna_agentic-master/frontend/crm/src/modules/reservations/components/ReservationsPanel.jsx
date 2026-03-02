import React, { useMemo, useState } from 'react';
import { FaCalendarAlt, FaSearch, FaClock, FaUsers } from 'react-icons/fa';
import './ReservationsPanel.css';

function ReservationsPanel({ conversations }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const reservations = useMemo(() => {
    let reservs = [];
    Object.keys(conversations).forEach(date => {
      conversations[date].forEach(conv => {
        if (conv.has_reservation) {
          reservs.push({
            ...conv,
            date,
            status: conv.is_active ? 'activa' : 'pendiente'
          });
        }
      });
    });
    
    return reservs.filter(r =>
      r.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.is_active ? -1 : 1);
  }, [conversations, searchTerm]);

  return (
    <div className="reservations-panel">
      <div className="reservations-header">
        <h2><FaCalendarAlt style={{ marginRight: '10px' }} />Gestión de Reservas</h2>
      </div>

      <div className="reservations-search">
        <FaSearch />
        <input
          type="text"
          placeholder="Buscar reservas por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="reservations-container">
        {reservations.length === 0 ? (
          <div className="empty-state">
            <FaCalendarAlt size={48} />
            <p>No hay reservas registradas</p>
          </div>
        ) : (
          <div className="reservations-grid">
            {reservations.map((res, idx) => (
              <div key={idx} className="reservation-card">
                <div className="card-header">
                  <h3>{res.user_id}</h3>
                  <span className={`status-badge ${res.status}`}>{res.status.toUpperCase()}</span>
                </div>

                <div className="card-content">
                  <div className="info-row">
                    <FaCalendarAlt size={16} />
                    <span><strong>Fecha:</strong> {res.date}</span>
                  </div>
                  <div className="info-row">
                    <FaClock size={16} />
                    <span><strong>Hora:</strong> 19:30</span>
                  </div>
                  <div className="info-row">
                    <FaUsers size={16} />
                    <span><strong>Personas:</strong> 4</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn btn-confirm">Confirmar</button>
                  <button className="btn btn-edit">Editar</button>
                  <button className="btn btn-cancel">Cancelar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReservationsPanel;
