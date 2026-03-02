import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaUser, FaPaperPlane, FaSmile, FaFileAlt, FaComments, FaHandPaper, FaUndo, FaTimes, FaInfoCircle } from 'react-icons/fa';
import apiClient, { crmService } from '../shared/services/api';
import eventEmitter from '../shared/services/eventEmitter';
import QuickReplies from './QuickReplies';
import './ChatDetail.css';

function ChatDetail({ conversation }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentMessages, setCurrentMessages] = useState(conversation.messages || []);
  const [handoffState, setHandoffState] = useState(conversation.handoff_state || 'bot_active');
  const [actionLoading, setActionLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [lastConversationId, setLastConversationId] = useState(conversation?.id);

  // Auto-scroll a los últimos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Actualizar cuando la conversación cambia
  useEffect(() => {
    if (conversation && conversation.messages) {
      setCurrentMessages([...conversation.messages]);
      setLastConversationId(conversation.id);
      setHandoffState(conversation.handoff_state || 'bot_active');
    }
  }, [conversation?.id, conversation?.messages?.length, conversation?.handoff_state]);

  // Escuchar eventos de actualización de conversación en tiempo real
  useEffect(() => {
    const handleConversationUpdate = (data) => {
      if (data.conversation && data.conversation.id === lastConversationId) {
        if (data.conversation.messages && data.conversation.messages.length > currentMessages.length) {
          setCurrentMessages([...data.conversation.messages]);
        }
        if (data.conversation.handoff_state) {
          setHandoffState(data.conversation.handoff_state);
        }
      }
    };

    const handleCrmUpdate = (data) => {
      if (data.conversations && lastConversationId) {
        let updatedConversation = null;
        Object.keys(data.conversations).forEach(date => {
          if (Array.isArray(data.conversations[date])) {
            const conv = data.conversations[date].find(c => c.id === lastConversationId);
            if (conv) updatedConversation = conv;
          }
        });
        
        if (updatedConversation) {
          if (updatedConversation.messages) {
            setCurrentMessages([...updatedConversation.messages]);
          }
          if (updatedConversation.handoff_state) {
            setHandoffState(updatedConversation.handoff_state);
          }
        }
      }
    };

    const handleHandoffChange = (data) => {
      if (data.user_id === conversation?.user_id) {
        setHandoffState(data.new_state);
      }
    };

    const handleAutoClose = (data) => {
      if (data.usuario_id === conversation?.user_id) {
        console.log('⏱️ [ChatDetail] Conversación auto-cerrada:', data.usuario_id);
        setHandoffState('closed');
      }
    };

    eventEmitter.on('conversation_update', handleConversationUpdate);
    eventEmitter.on('crm_update', handleCrmUpdate);
    eventEmitter.on('handoff_state_change', handleHandoffChange);
    eventEmitter.on('conversation_auto_closed', handleAutoClose);

    return () => {
      eventEmitter.off('conversation_update', handleConversationUpdate);
      eventEmitter.off('crm_update', handleCrmUpdate);
      eventEmitter.off('handoff_state_change', handleHandoffChange);
      eventEmitter.off('conversation_auto_closed', handleAutoClose);
    };
  }, [lastConversationId, currentMessages.length, conversation?.user_id]);

  const sendMessage = async (text = message) => {
    if (!text.trim() || !conversation) return;

    setSending(true);
    try {
      await crmService.sendAdminMessage(conversation.id, text);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTakeover = async () => {
    setActionLoading(true);
    try {
      await crmService.takeover(conversation.id);
      setHandoffState('human_active');
    } catch (err) {
      console.error('Error en takeover:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    setActionLoading(true);
    try {
      await crmService.release(conversation.id);
      setHandoffState('bot_active');
    } catch (err) {
      console.error('Error en release:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await crmService.closeConversation(conversation.id);
      setHandoffState('closed');
    } catch (err) {
      console.error('Error cerrando conversación:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isHumanActive = handoffState === 'human_active';
  const isClosed = handoffState === 'closed';
  const isBotActive = handoffState === 'bot_active';

  return (
    <div className="chat-detail">
      <div className="chat-detail-header">
        <div className="client-info">
          <div className="client-avatar">
            <FaUser size={24} />
          </div>
          <div>
            <h3>{conversation.usuario_nombre || 'Usuario Web'}</h3>
            <p className={conversation.is_active ? 'status-active' : 'status-inactive'}>
              {conversation.is_active ? '🟢 En conversación' : '⚫ Inactivo'}
            </p>
          </div>
        </div>
        <div className="chat-actions">
          <span className="channel-info">{conversation.channel || 'Web'}</span>
          {conversation.has_reservation && <span className="has-reservation">📅 Tiene Reserva</span>}
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
          {isBotActive && conversation.is_active && (
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

      <div className="messages-container">
        {currentMessages && currentMessages.length > 0 ? (
          <>
            {currentMessages.map((msg, index) => (
              <div key={index} className={`message-bubble ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' && <FaUser size={16} />}
                  {msg.role === 'bot' && <FaRobot size={16} />}
                  {msg.role === 'admin' && <FaUser size={16} style={{ color: '#007bff' }} />}
                  {msg.role === 'system' && <FaInfoCircle size={16} style={{ color: '#6b7280' }} />}
                </div>
                <div className="message-content-wrapper">
                  <div className={`message-text ${msg.role}`}>
                    {msg.content}
                  </div>
                  <span className="message-time">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="no-messages">
            <FaComments size={48} />
            <p>Sin mensajes aún</p>
          </div>
        )}
      </div>

      {isHumanActive && <QuickReplies onSelect={(reply) => sendMessage(reply)} />}

      <div className="chat-input-area">
        <div className="input-wrapper">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
            placeholder={isClosed ? "Conversación cerrada" : isBotActive ? "Presiona 'Tomar el control' para escribir..." : "Escribe un mensaje al cliente..."}
            disabled={!isHumanActive}
            className="message-input"
          />
          <button className="emoji-btn" title="Emojis" disabled={!isHumanActive}>
            <FaSmile />
          </button>
          <button className="attach-btn" title="Adjuntar archivo" disabled={!isHumanActive}>
            <FaFileAlt />
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={sending || !message.trim() || !isHumanActive}
            className="send-btn"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatDetail;

