import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../shared/components/Navbar';
import Sidebar from '../../shared/components/Sidebar';
import { crmService, chatsService } from '../../shared/services/api';
import { FaRobot, FaUser, FaHandPaper, FaUndo, FaTimes, FaInfoCircle, FaBell, FaArrowLeft } from 'react-icons/fa';
import eventEmitter from '../../shared/services/eventEmitter';
import './Chats.css';

function ChatsModule({ user, darkMode, setDarkMode, setUser }) {
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [handoffState, setHandoffState] = useState(selectedChat?.handoff_state || 'bot_active');
  const [urgentChats, setUrgentChats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages?.length]);

  // Función para cargar chats
  const loadChats = async () => {
    try {
      const response = await chatsService.getChats();
      console.log('✅ Chats cargados desde /crm/chats:', response);
      
      if (response.chats && response.chats.length > 0) {
        setChats(response.chats);
        
        // Actualizar el chat seleccionado usando función de actualización
        // para obtener el valor más reciente de selectedChat
        setSelectedChat(prev =>
          prev ? response.chats.find(c => c.usuario_id === prev.usuario_id) : null
        );
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error cargando chats:', error);
      setLoading(false);
    }
  };

  // Cargar chats inicialmente
  useEffect(() => {
    loadChats();
  }, []);

  // Registrar listener para webhooks ANTES de que lleguen eventos
  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log('📨 Webhook recibido en ChatsModule:', data);
      // Recargar chats cuando hay un nuevo mensaje
      loadChats();
    };

    const handleUrgentSupport = (data) => {
      console.log('🚨 SOPORTE URGENTE RECIBIDO:', data);
      const usuarioId = data.usuario_id;
      setUrgentChats(prev => ({
        ...prev,
        [usuarioId]: true
      }));
      
      // Agregar a la lista de notificaciones
      const notification = {
        id: `urgent_${usuarioId}_${Date.now()}`,
        usuario_id: usuarioId,
        timestamp: new Date(data.timestamp || Date.now()),
        motivo: data.motivo || 'usuario solicita apoyo',
        leida: false
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Mantener máximo 50
      
      // Mostrar notificación visual/sonora si es necesario
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Soporte Urgente', {
          body: `${usuarioId} solicita apoyo personalizado del restaurante`,
          icon: '🔴'
        });
      }
    };

    const handleAutoClose = (data) => {
      console.log('⏱️ Conversación auto-cerrada:', data);
      loadChats();
      // Si el chat auto-cerrado es el seleccionado, actualizar estado
      setSelectedChat(prev => {
        if (prev && prev.usuario_id === data.usuario_id) {
          setHandoffState('closed');
        }
        return prev;
      });
    };

    // Registrar listeners
    eventEmitter.on('mensaje_nuevo', handleNewMessage);
    eventEmitter.on('crm_update', (data) => {
      loadChats();
    });
    eventEmitter.on('soporte_urgente', handleUrgentSupport);
    eventEmitter.on('conversation_auto_closed', handleAutoClose);

    // Cleanup
    return () => {
      eventEmitter.off('mensaje_nuevo', handleNewMessage);
      eventEmitter.off('crm_update');
      eventEmitter.off('soporte_urgente', handleUrgentSupport);
      eventEmitter.off('conversation_auto_closed', handleAutoClose);
    };
  }, []); // Sin dependencias para que se registre solo una vez

  // Actualizar handoffState cuando cambia el chat seleccionado o su estado
  useEffect(() => {
    if (selectedChat) {
      setHandoffState(selectedChat.handoff_state || 'bot_active');
    }
  }, [selectedChat?.usuario_id, selectedChat?.handoff_state]);

  // Auto-close en frontend: verificar cada 30s si el chat seleccionado lleva 4+ min inactivo
  useEffect(() => {
    const INACTIVITY_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutos
    const CHECK_INTERVAL_MS = 30 * 1000; // cada 30s

    const checkInactivity = () => {
      if (!selectedChat) return;
      const lastTs = selectedChat.timestamp_actualizado;
      if (!lastTs) return;
      const elapsed = Date.now() - new Date(lastTs).getTime();
      if (elapsed >= INACTIVITY_TIMEOUT_MS && handoffState !== 'closed') {
        console.log('⏱️ [Frontend] Chat inactivo por 4+ min, marcando como cerrado');
        setHandoffState('closed');
        loadChats();
      }
    };

    const timer = setInterval(checkInactivity, CHECK_INTERVAL_MS);
    // Verificar inmediatamente al montar
    checkInactivity();

    return () => clearInterval(timer);
  }, [selectedChat?.usuario_id, selectedChat?.timestamp_actualizado, handoffState]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setHandoffState(chat.handoff_state || 'bot_active');
    setMobileView('conversation');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    try {
      console.log('💬 Admin enviando mensaje a:', selectedChat.usuario_id);
      await crmService.sendAdminMessage(selectedChat.usuario_id, messageText);
      setMessageText('');
      
      // Limpiar el estado urgente cuando el admin responde
      setUrgentChats(prev => {
        const updated = { ...prev };
        delete updated[selectedChat.usuario_id];
        return updated;
      });
      
      // Recargar para ver el nuevo mensaje
      await loadChats();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleTakeover = async () => {
    if (!selectedChat) return;
    setActionLoading(true);
    try {
      await crmService.takeover(selectedChat.usuario_id);
      setHandoffState('human_active');
      await loadChats();
    } catch (err) {
      console.error('Error en takeover:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedChat) return;
    setActionLoading(true);
    try {
      await crmService.release(selectedChat.usuario_id);
      setHandoffState('bot_active');
      await loadChats();
    } catch (err) {
      console.error('Error en release:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedChat) return;
    setActionLoading(true);
    try {
      await crmService.closeConversation(selectedChat.usuario_id);
      setHandoffState('closed');
      await loadChats();
    } catch (err) {
      console.error('Error cerrando conversación:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isHumanActive = handoffState === 'human_active';
  const isClosed = handoffState === 'closed';
  const isBotActive = handoffState === 'bot_active';
  const urgentCount = Object.keys(urgentChats).length;

  const handleUrgentClick = () => {
    // Filtrar para mostrar solo los chats urgentes
    const urgentUserIds = Object.keys(urgentChats);
    // Scroll al primer chat urgente si existe
    const firstUrgent = chats.find(c => urgentUserIds.includes(c.usuario_id));
    if (firstUrgent) {
      handleSelectChat(firstUrgent);
      // Scroll el elemento urgente a la vista
      setTimeout(() => {
        const urgentElement = document.querySelector('.chat-item.urgent');
        if (urgentElement) {
          urgentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleMarkNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, leida: true } : notif
      )
    );
  };

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Mobile chat navigation: 'list' shows chat list, 'conversation' shows the selected chat
  const [mobileView, setMobileView] = useState('list');

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Navbar 
        user={user} 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        urgentCount={Object.values(notifications).filter(n => !n.leida).length}
        notifications={notifications}
        onUrgentClick={handleUrgentClick}
        onMarkAsRead={handleMarkNotificationAsRead}
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
          <div className="chats-container">
            <div className="chats-layout">
              {/* Lista de chats */}
              <div className={`chats-list ${mobileView === 'conversation' ? 'mobile-hidden' : 'mobile-visible'}`}>
                <h2>Conversaciones</h2>
                {loading ? (
                  <p className="loading">Cargando chats...</p>
                ) : chats.length === 0 ? (
                  <p className="empty">No hay conversaciones activas</p>
                ) : (
                  <div className="chats-items">
                    {chats.map((chat) => (
                      <div
                        key={chat.usuario_id || chat.id}
                        className={`chat-item ${selectedChat?.usuario_id === chat.usuario_id ? 'active' : ''} ${urgentChats[chat.usuario_id] ? 'urgent' : ''}`}
                        onClick={() => handleSelectChat(chat)}
                      >
                        <div className="chat-header">
                          <h3>
                            {chat.usuario_nombre || 'Usuario Web'}
                            {urgentChats[chat.usuario_id] && <FaBell className="urgent-icon" title="Soporte urgente solicitado" />}
                          </h3>
                          {/* Eliminado: estado activo/inactivo */}
                          {chat.handoff_state === 'human_active' && <span className="handoff-badge admin">Admin</span>}
                          {chat.handoff_state === 'closed' && <span className="handoff-badge closed">🔒 Cerrada</span>}
                        </div>
                        <p className="chat-preview">
                          {chat.messages && chat.messages.length > 0
                            ? chat.messages[chat.messages.length - 1].texto.substring(0, 50) + '...'
                            : 'Sin mensajes'}
                        </p>
                        <span className="chat-time">{new Date(chat.timestamp_actualizado).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detalle del chat */}
              <div className={`chat-detail ${mobileView === 'conversation' ? 'mobile-visible' : 'mobile-hidden'}`}>
                {selectedChat ? (
                  <>
                    <div className="chat-detail-header">
                      <button className="mobile-back-btn" onClick={handleBackToList}>
                        <FaArrowLeft /> Chats
                      </button>
                      <h2>{selectedChat.usuario_nombre || 'Usuario Web'}</h2>
                      <div className="chat-info">
                        <span>{selectedChat.canal}</span>
                        <span className={`has-reservation ${selectedChat.tiene_reservacion ? 'yes' : 'no'}`}>
                          {selectedChat.tiene_reservacion ? 'Con reserva' : 'Sin reserva'}
                        </span>
                      </div>
                    </div>

                    {/* ---- BARRA DE ESTADO DE HANDOFF ---- */}
                    <div className={`handoff-bar ${handoffState}`}>
                      <div className="handoff-bar-info">
                        {isBotActive && (
                          <>
                            <FaRobot className="handoff-icon" />
                            <span>Bot activo — responde automáticamente</span>
                          </>
                        )}
                        {isHumanActive && (
                          <>
                            <FaUser className="handoff-icon pulse" />
                            <span>Tú controlas la conversación — el bot está silenciado</span>
                          </>
                        )}
                        {isClosed && (
                          <>
                            <FaInfoCircle className="handoff-icon" />
                            <span>Conversación cerrada</span>
                          </>
                        )}
                      </div>
                      <div className="handoff-bar-actions">
                        {isBotActive && (
                          <button className="handoff-btn takeover" onClick={handleTakeover} disabled={actionLoading} title="Tomar control de la conversación">
                            <FaHandPaper /> Tomar control
                          </button>
                        )}
                        {isHumanActive && (
                          <>
                            <button className="handoff-btn release" onClick={handleRelease} disabled={actionLoading} title="Devolver al bot">
                              <FaUndo /> Devolver al bot
                            </button>
                            <button className="handoff-btn close" onClick={handleClose} disabled={actionLoading} title="Cerrar conversación">
                              <FaTimes /> Cerrar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="chat-messages">
                      {selectedChat.messages && selectedChat.messages.length > 0 ? (
                        (() => {
                          // Normalizar tipos: backend envía "usuario" pero el CSS usa "user"
                          const normalizeType = (t) => t === 'usuario' ? 'user' : t;
                          // Encontrar el índice del último mensaje saliente (bot/admin)
                          const lastAdminIdx = selectedChat.messages.reduce(
                            (last, m, i) => m.type === 'admin' ? i : last, -1
                          );
                          return selectedChat.messages.map((msg, idx) => {
                            const msgType = normalizeType(msg.type);
                            let tickClass = '';
                            if (msg.type === 'admin') {
                              if (msg.ticksAnimated) {
                                tickClass = 'ticks-seen';
                              } else if (idx === lastAdminIdx) {
                                tickClass = 'ticks-animate';
                              } else {
                                tickClass = 'ticks-seen';
                              }
                            }
                            // Si la animación se dispara, marcamos el mensaje como animado (solo en render del último admin)
                            if (msg.type === 'admin' && idx === lastAdminIdx && !msg.ticksAnimated) {
                              setTimeout(() => {
                                msg.ticksAnimated = true;
                              }, 2500); // duración de la animación aprox
                            }
                            return (
                              <div key={idx} className={`message ${msgType}`}>
                                <div className="message-content">
                                  <p>{msg.texto}</p>
                                  <span className="time">
                                    {new Date(msg.timestamp).toLocaleString()}
                                    {msg.type === 'admin' && (
                                      <span className={`msg-ticks ${tickClass}`}>
                                        <span className="tick t1">✓</span>
                                        <span className="tick t2">✓</span>
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()
                      ) : (
                        <p className="no-messages">No hay mensajes aún</p>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleSendMessage}>
                      <input
                        type="text"
                        placeholder={isClosed ? "Conversación cerrada" : isBotActive ? "Presiona 'Tomar el control' para escribir..." : "Escribir respuesta como administrador..."}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="chat-input"
                        disabled={!isHumanActive}
                      />
                      <button type="submit" className="send-btn" disabled={!isHumanActive}>
                        Enviar
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="no-chat-selected">
                    <p>Selecciona una conversación para ver los detalles</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatsModule;
