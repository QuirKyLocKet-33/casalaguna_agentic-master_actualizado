import React, { useState, useMemo, useEffect } from 'react';
import { FaComments, FaSearch, FaFilter, FaTimes, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import ChatDetail from './ChatDetail';
import eventEmitter from '../../../shared/services/eventEmitter';
import './ChatsPanel.css';

function ChatsPanel({ conversations, selectedConversation, onSelectConversation, setNotificationCount, onConversationsUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Escuchar evento de conversación inactiva
  useEffect(() => {
    const handleConversationInactive = (data) => {
      console.log('🔴 [ChatsPanel] Conversación marcada como inactiva:', data);
      // Recargar conversaciones cuando una se marca como inactiva
      if (onConversationsUpdate) {
        onConversationsUpdate();
      }
    };

    eventEmitter.on('conversacion_inactiva', handleConversationInactive);

    return () => {
      eventEmitter.off('conversacion_inactiva', handleConversationInactive);
    };
  }, [onConversationsUpdate]);

  const allConversations = useMemo(() => {
    let convs = [];
    Object.keys(conversations).forEach(date => {
      conversations[date].forEach(conv => {
        convs.push({ ...conv, date });
      });
    });

    if (filterActive) {
      convs = convs.filter(conv => conv.is_active);
    }

    if (searchTerm) {
      convs = convs.filter(conv =>
        conv.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.messages && conv.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    return convs.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return 0;
    });
  }, [conversations, searchTerm, filterActive]);

  const handleSelectConversation = (conv) => {
    onSelectConversation(conv);
    setShowDetail(true);
    if (conv.is_active) {
      setNotificationCount(prev => Math.max(0, prev - 1));
    }
  };

  if (showDetail && selectedConversation) {
    return (
      <div className="chats-panel">
        <div className="chats-header">
          <button className="back-btn" onClick={() => setShowDetail(false)}>
            ← Volver a Conversaciones
          </button>
        </div>
        <ChatDetail conversation={selectedConversation} />
      </div>
    );
  }

  return (
    <div className="chats-panel">
      <div className="chats-header">
        <h2><FaComments style={{ marginRight: '10px' }} />Conversaciones</h2>
      </div>

      <div className="chats-search">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className={`filter-toggle ${filterActive ? 'active' : ''}`}
          onClick={() => setFilterActive(!filterActive)}
          title="Mostrar solo activas"
        >
          <FaFilter /> Solo Activas
        </button>
      </div>

      <div className="conversations-list">
        {allConversations.length === 0 ? (
          <div className="empty-state">
            <FaComments size={48} />
            <p>No hay conversaciones</p>
          </div>
        ) : (
          allConversations.map(conv => (
            <div
              key={conv.id}
              className={`conversation-card ${selectedConversation && selectedConversation.id === conv.id ? 'selected' : ''} ${conv.is_active ? 'active' : ''}`}
              onClick={() => handleSelectConversation(conv)}
            >
              <div className="conv-header">
                <div className="conv-title">
                  <span className={`status-dot ${conv.is_active ? 'active' : 'inactive'}`}></span>
                  <h3>{conv.user_id}</h3>
                  {!conv.is_active && (
                    <span style={{
                      color: '#888',
                      fontSize: '12px',
                      marginLeft: '8px',
                      fontWeight: 400
                    }}>
                      Inactivo
                    </span>
                  )}
                </div>
                <span className="channel-badge">{conv.channel || 'Web'}</span>
                {conv.handoff_state === 'human_active' && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    background: '#2563eb',
                    color: 'white',
                    borderRadius: '4px',
                    marginLeft: '4px'
                  }}>Admin</span>
                )}
                {conv.handoff_state === 'closed' && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    background: '#6b7280',
                    color: 'white',
                    borderRadius: '4px',
                    marginLeft: '4px'
                  }}>🔒 Cerrada</span>
                )}
              </div>

              <div className="conv-info">
                <span className="info-item">
                  <FaPhone size={12} /> {conv.phone || 'N/A'}
                </span>
                <span className="info-item">
                  <FaMapMarkerAlt size={12} /> {conv.location || 'N/A'}
                </span>
              </div>

              <div className="conv-preview">
                {conv.messages && conv.messages.length > 0 && (
                  <p>{conv.messages[conv.messages.length - 1].content.substring(0, 60)}...</p>
                )}
              </div>

              <div className="conv-footer">
                <span className="timestamp">{conv.date}</span>
                {conv.has_reservation && <span className="reservation-tag">📅 Reserva</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatsPanel;
