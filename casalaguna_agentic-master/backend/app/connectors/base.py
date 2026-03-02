"""
Base Connector - Clase abstracta para todos los conectores de canales.

Define la interfaz común que deben implementar todos los conectores
(Web Widget, WhatsApp, Instagram, Facebook Messenger, etc).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class MessageModel(BaseModel):
    """Modelo común para mensajes entre conectores y backend."""
    
    channel: str  # "web", "whatsapp", "instagram", "facebook_messenger"
    user_id: str  # Identificador único del usuario en el canal
    user_name: Optional[str] = None
    message: str  # Contenido del mensaje
    timestamp: str  # ISO format: "2026-01-29T10:30:00"
    metadata: Dict[str, Any] = {}  # Datos específicos del canal


class ResponseModel(BaseModel):
    """Modelo común para respuestas del backend a los conectores."""
    
    message: str
    metadata: Dict[str, Any] = {}
    status: str = "success"  # "success", "error", "pending"


class BaseConnector(ABC):
    """
    Clase abstracta base para todos los conectores de canales.
    
    Un conector es responsable de:
    1. Recibir mensajes del canal externo (WhatsApp, Web, Instagram, etc)
    2. Convertirlos a formato común (MessageModel)
    3. Enviar respuestas del backend de vuelta al canal
    """
    
    def __init__(self, channel_name: str):
        """
        Inicializa el conector.
        
        Args:
            channel_name: Nombre único del canal (ej: "web", "whatsapp", "instagram")
        """
        self.channel_name = channel_name
    
    @abstractmethod
    async def send_message(self, user_id: str, message: str, **kwargs) -> bool:
        """
        Envía un mensaje al usuario a través del canal.
        
        Args:
            user_id: ID único del usuario en el canal
            message: Contenido del mensaje a enviar
            **kwargs: Parámetros específicos del canal
            
        Returns:
            True si fue enviado exitosamente, False en caso contrario
        """
        pass
    
    @abstractmethod
    async def validate_webhook(self, payload: Dict[str, Any]) -> bool:
        """
        Valida que un webhook provenga del canal autorizado.
        
        Args:
            payload: Payload del webhook
            
        Returns:
            True si es válido, False en caso contrario
        """
        pass
    
    def get_channel_name(self) -> str:
        """Retorna el nombre del canal."""
        return self.channel_name
    
    def normalize_message(self, user_id: str, user_name: Optional[str], 
                         message: str, metadata: Dict[str, Any]) -> MessageModel:
        """
        Convierte un mensaje del canal a formato común.
        
        Args:
            user_id: ID único del usuario
            user_name: Nombre del usuario (opcional)
            message: Contenido del mensaje
            metadata: Metadatos específicos del canal
            
        Returns:
            MessageModel normalizado
        """
        from datetime import datetime
        
        return MessageModel(
            channel=self.channel_name,
            user_id=user_id,
            user_name=user_name,
            message=message,
            timestamp=datetime.now().isoformat(),
            metadata=metadata
        )
