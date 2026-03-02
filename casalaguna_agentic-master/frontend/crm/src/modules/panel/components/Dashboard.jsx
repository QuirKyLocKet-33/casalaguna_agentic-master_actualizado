import React, { useMemo } from 'react';
import { FaComments, FaCalendarAlt, FaPercent } from 'react-icons/fa';
import './Dashboard.css';

function Dashboard({ metrics, conversations }) {
  const stats = useMemo(() => {
    let activeConversations = 0;
    let conversationsWithReservation = 0;

    if (conversations && typeof conversations === 'object') {
      Object.keys(conversations).forEach(date => {
        if (Array.isArray(conversations[date])) {
          conversations[date].forEach(conv => {
            if (conv.is_active) activeConversations++;
            if (conv.has_reservation) conversationsWithReservation++;
          });
        }
      });
    }

    return {
      ...metrics,
      activeConversations,
      conversationsWithReservation,
      conversion_rate: metrics?.conversion_rate || 0
    };
  }, [metrics, conversations]);

  if (!stats) {
    return (
      <div className="dashboard">
        <div className="loading">
          <p>Inicializando panel...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: 1,
      title: 'Conversaciones Activas',
      value: stats.activeConversations || 0,
      icon: FaComments,
      color: '#3b82f6',
      trend: '+2.3%'
    },
    {
      id: 2,
      title: 'Reservas Pendientes',
      value: stats.conversationsWithReservation || 0,
      icon: FaCalendarAlt,
      color: '#ec4899',
      trend: '+1.2%'
    },
    {
      id: 4,
      title: 'Tasa de Conversión',
      value: `${stats.conversion_rate || 0}%`,
      icon: FaPercent,
      color: '#f59e0b',
      trend: '+0.8%'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Panel de Control</h2>
        <p className="update-time">Última actualización hace unos segundos</p>
      </div>

      <div className="stats-grid">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.id} className="stat-card">
              <div className="stat-icon" style={{ color: card.color }}>
                <Icon size={28} />
              </div>
              <div className="stat-content">
                <p className="stat-label">{card.title}</p>
                <h3 className="stat-value">{card.value}</h3>
                <span className="stat-trend">{card.trend}</span>
              </div>
              <div className="stat-decoration" style={{ backgroundColor: card.color, opacity: 0.1 }}></div>
            </div>
          );
        })}
      </div>

      {/* [COPILOT-EDIT] INICIO: Tarjeta de Tiempo de Respuesta Promedio movida debajo de métricas */}
      <div className="response-time-wrapper">
        <div className="section response-time-card">
          <h3>Tiempo de Respuesta Promedio</h3>
          <div className="performance-stats">
            <div className="perf-item">
              <label>Tiempo de Respuesta Promedio</label>
              <div className="progress-bar">
                <div className="progress" style={{ width: '92%' }}></div>
              </div>
              <span>23 seg</span>
            </div>
          </div>
        </div>
      </div>
      {/* [COPILOT-EDIT] FIN */}

      <div className="dashboard-sections">
        <div className="section activity-section">
          <h3>Actividad Reciente</h3>
          <div className="activity-timeline">
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-text">
                <p><strong>Nueva reserva</strong> confirmada</p>
                <span className="time">Hace 2 minutos</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-text">
                <p><strong>Mensaje recibido</strong> de cliente</p>
                <span className="time">Hace 5 minutos</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-text">
                <p><strong>Conversación iniciada</strong> via WhatsApp</p>
                <span className="time">Hace 15 minutos</span>
              </div>
            </div>
          </div>
        </div>

        {/* [COPILOT-EDIT] INICIO: Removido Tiempo de Respuesta Promedio */}
        <div className="section performance-section">
          <h3>Desempeño del Bot</h3>
          <div className="performance-stats">
            <div className="perf-item">
              <label>Disponibilidad</label>
              <div className="progress-bar">
                <div className="progress" style={{ width: '99%' }}></div>
              </div>
              <span>99%</span>
            </div>
            <div className="perf-item">
              <label>Satisfacción de Clientes</label>
              <div className="progress-bar">
                <div className="progress" style={{ width: '87%' }}></div>
              </div>
              <span>87%</span>
            </div>
          </div>
        </div>
        {/* [COPILOT-EDIT] FIN */}
      </div>
    </div>
  );
}

export default Dashboard;
