"""
Message Service - Coordinador centralizado de mensajes.

Coordina la comunicación entre los conectores y la lógica de negocio del bot.
Mantiene el estado de conversaciones y enruta mensajes correctamente.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from laguna import CasaLagunaBot
from connectors.base import MessageModel, ResponseModel


logger = logging.getLogger(__name__)


class MessageService:
    """
    Servicio centralizado que:
    1. Recibe mensajes normalizados de cualquier conector
    2. Los procesa con la lógica de negocio (CasaLagunaBot)
    3. Retorna respuestas formateadas
    
    Mantiene estado de conversaciones por (canal, user_id).
    """
    
    def __init__(self, bot: CasaLagunaBot):
        """
        Inicializa el servicio de mensajes.
        
        Args:
            bot: Instancia de CasaLagunaBot (lógica de negocio)
        """
        self.bot = bot
        # Conversaciones en memoria: {f"{channel}:{user_id}": {"messages": [], "state": {}}}
        self.conversations: Dict[str, Dict[str, Any]] = {}
        logger.info("✅ MessageService inicializado")
    
    def _get_conversation_key(self, channel: str, user_id: str) -> str:
        """Genera clave única para una conversación."""
        return f"{channel}:{user_id}"
    
    def _get_or_create_conversation(self, channel: str, user_id: str) -> Dict[str, Any]:
        """Obtiene o crea una conversación."""
        key = self._get_conversation_key(channel, user_id)
        
        if key not in self.conversations:
            self.conversations[key] = {
                "messages": [],
                "state": {},
                "created_at": datetime.now().isoformat(),
                "channel": channel,
                "user_id": user_id
            }
            logger.debug(f"[{channel}] Nueva conversación creada para {user_id}")
        
        return self.conversations[key]
    
    async def process_message(self, message: MessageModel) -> ResponseModel:
        """
        Procesa un mensaje normalizado y retorna una respuesta.
        
        Args:
            message: MessageModel normalizado del conector
            
        Returns:
            ResponseModel con la respuesta del bot
        """
        logger.info(
            f"[{message.channel}] Procesando mensaje de {message.user_id}: "
            f"{message.message[:50]}..."
        )
        
        # Obtener o crear conversación
        conversation = self._get_or_create_conversation(
            message.channel, 
            message.user_id
        )
        
        # Registrar mensaje entrante
        conversation["messages"].append({
            "role": "user",
            "content": message.message,
            "timestamp": message.timestamp,
            "metadata": message.metadata
        })
        
        try:
            # Procesar con el bot (CasaLagunaBot)
            bot_response = self.bot.responder(message.message)
            
            # Registrar respuesta
            conversation["messages"].append({
                "role": "assistant",
                "content": bot_response,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.debug(f"[{message.channel}] Respuesta generada para {message.user_id}")
            
            return ResponseModel(
                message=bot_response,
                status="success",
                metadata={
                    "channel": message.channel,
                    "user_id": message.user_id,
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        except Exception as e:
            logger.exception(f"❌ Error procesando mensaje: {str(e)}")
            
            return ResponseModel(
                message="Lo siento, ocurrió un error procesando tu mensaje. "
                        "Por favor intenta de nuevo.",
                status="error",
                metadata={
                    "error": str(e),
                    "channel": message.channel,
                    "user_id": message.user_id,
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    def get_conversation_history(self, channel: str, user_id: str) -> list:
        """
        Obtiene el historial de conversación de un usuario.
        
        Args:
            channel: Nombre del canal
            user_id: ID del usuario
            
        Returns:
            Lista de mensajes de la conversación
        """
        key = self._get_conversation_key(channel, user_id)
        
        if key not in self.conversations:
            return []
        
        return self.conversations[key]["messages"]
    
    def clear_conversation(self, channel: str, user_id: str) -> bool:
        """
        Limpia el historial de conversación.
        
        Args:
            channel: Nombre del canal
            user_id: ID del usuario
            
        Returns:
            True si se limpió exitosamente
        """
        key = self._get_conversation_key(channel, user_id)
        
        if key in self.conversations:
            del self.conversations[key]
            logger.info(f"[{channel}] Conversación de {user_id} limpiada")
            return True
        
        return False
