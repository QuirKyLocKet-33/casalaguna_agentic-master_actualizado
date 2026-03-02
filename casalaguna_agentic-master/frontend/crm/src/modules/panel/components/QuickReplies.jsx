import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEdit } from 'react-icons/fa';
import './QuickReplies.css';

function QuickReplies({ onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const quickReplies = [
    { id: 1, text: 'Hola, ¿en qué te puedo ayudar?', emoji: '👋' },
    { id: 2, text: '¿Cuántas personas son para la reserva?', emoji: '👥' },
    { id: 3, text: 'Perfecto, te confirmo tu reserva', emoji: '✅' },
    { id: 4, text: 'Lamentablemente esa fecha no está disponible', emoji: '❌' },
    { id: 5, text: 'Aquí están nuestras opciones de menú especial', emoji: '🍽️' },
    { id: 6, text: 'Te enviaré un recordatorio 24 horas antes', emoji: '🔔' },
  ];

  return (
    <div className="quick-replies">
      <button className="toggle-btn" onClick={() => setExpanded(!expanded)}>
        <span>Respuestas Rápidas</span>
        {expanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="replies-container">
          <div className="replies-list">
            {quickReplies.map(reply => (
              <button
                key={reply.id}
                className="reply-btn"
                onClick={() => {
                  onSelect(reply.text);
                  setExpanded(false);
                }}
                title={reply.text}
              >
                <span className="reply-emoji">{reply.emoji}</span>
                <span className="reply-text">{reply.text.substring(0, 45)}...</span>
              </button>
            ))}
          </div>
          <button className="edit-templates-btn">
            <FaEdit size={14} /> Editar Plantillas
          </button>
        </div>
      )}
    </div>
  );
}

export default QuickReplies;
