import React, { useMemo, useState } from 'react';
import { FaUsers, FaSearch, FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import './ClientsPanel.css';

function ClientsPanel({ conversations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  const clients = useMemo(() => {
    const clientMap = {};
    
    Object.keys(conversations).forEach(date => {
      conversations[date].forEach(conv => {
        if (!clientMap[conv.user_id]) {
          clientMap[conv.user_id] = {
            id: conv.user_id,
            user_id: conv.user_id,
            messageCount: 0,
            hasReservation: false,
            isActive: false,
            channel: conv.channel,
            lastContact: date
          };
        }
        clientMap[conv.user_id].messageCount += conv.messages ? conv.messages.length : 0;
        if (conv.has_reservation) clientMap[conv.user_id].hasReservation = true;
        if (conv.is_active) clientMap[conv.user_id].isActive = true;
      });
    });

    const clientsList = Object.values(clientMap);
    return clientsList.filter(c =>
      c.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.messageCount - a.messageCount);
  }, [conversations, searchTerm]);

  return (
    <div className="clients-panel">
      <div className="clients-header">
        <h2><FaUsers style={{ marginRight: '10px' }} />Gestión de Clientes</h2>
      </div>

      <div className="clients-container">
        <div className="clients-list-section">
          <div className="clients-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="clients-list">
            {clients.length === 0 ? (
              <div className="empty-state">
                <FaUsers size={48} />
                <p>No hay clientes registrados</p>
              </div>
            ) : (
              clients.map(client => (
                <div
                  key={client.id}
                  className={`client-card ${selectedClient?.id === client.id ? 'active' : ''}`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="client-avatar">
                    <FaUsers size={20} />
                  </div>
                  <div className="client-info">
                    <h4>{client.user_id}</h4>
                    <p>{client.messageCount} mensajes • {client.channel}</p>
                  </div>
                  <div className="client-indicators">
                    {client.isActive && <span className="indicator active" title="Activo"></span>}
                    {client.hasReservation && <span className="indicator reservation" title="Tiene reserva">📅</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedClient && (
          <div className="client-detail-section">
            <div className="detail-header">
              <h3>{selectedClient.user_id}</h3>
              <div className="detail-rating">
                <FaStar size={16} /> 4.5
              </div>
            </div>

            <div className="detail-content">
              <div className="detail-section">
                <h4>Información de Contacto</h4>
                <div className="info-item">
                  <FaPhone size={14} />
                  <span>+34 666 777 888</span>
                </div>
                <div className="info-item">
                  <FaEnvelope size={14} />
                  <span>cliente@email.com</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Estadísticas</h4>
                <div className="stats">
                  <div className="stat">
                    <span className="label">Mensajes</span>
                    <span className="value">{selectedClient.messageCount}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Reservas</span>
                    <span className="value">{selectedClient.hasReservation ? '1' : '0'}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Canal</span>
                    <span className="value">{selectedClient.channel}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Notas Internas</h4>
                <textarea
                  placeholder="Agregar notas sobre este cliente..."
                  className="notes-field"
                  rows="4"
                />
              </div>

              <div className="detail-actions">
                <button className="btn btn-primary">Enviar Mensaje</button>
                <button className="btn btn-secondary">Crear Reserva</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientsPanel;
