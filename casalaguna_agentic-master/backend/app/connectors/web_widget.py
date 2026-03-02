"""
Web Widget Connector - Conecta el widget web con el backend centralizado.
"""

import logging
from typing import Dict, Any, Optional
from .base import BaseConnector, MessageModel, ResponseModel


logger = logging.getLogger(__name__)


class WebWidgetConnector(BaseConnector):
    """
    Conector para el widget web de Casa Laguna.
    
    El widget web se comunica directamente con el backend a través de HTTP.
    Este conector actúa como intermediario para mantener la interfaz común.
    """
    
    def __init__(self):
        """Inicializa el conector del widget web."""
        super().__init__("web")
    
    async def send_message(self, user_id: str, message: str, **kwargs) -> bool:
        """
        Envía un mensaje al usuario del widget web.
        
        En la arquitectura actual, el widget web recibe respuestas
        directamente a través del endpoint REST. Este método es para
        mantener la interfaz común de conectores.
        
        Args:
            user_id: ID de sesión del usuario
            message: Contenido del mensaje
            **kwargs: Parámetros adicionales (no usados en web)
            
        Returns:
            True (siempre exitoso en este caso)
        """
        logger.debug(f"[WebWidget] Enviar mensaje a usuario {user_id}: {message[:50]}...")
        # El widget web recibe mensajes a través del endpoint REST /chat
        # Este método es para mantener compatibilidad con la interfaz base
        return True
    
    async def validate_webhook(self, payload: Dict[str, Any]) -> bool:
        """
        Valida webhooks del widget web.
        
        El widget web no usa webhooks, se comunica directamente vía HTTP.
        Esta validación siempre retorna True.
        
        Args:
            payload: Payload del webhook (no usado)
            
        Returns:
            True siempre
        """
        logger.debug("[WebWidget] Validando webhook (no aplica para widget web)")
        return True
    
    async def process_message(self, user_id: str, message: str, 
                             session_id: Optional[str] = None) -> MessageModel:
        """
        Procesa un mensaje entrante del widget web.
        
        Args:
            user_id: ID único del usuario del widget (IP, browser ID, etc)
            message: Contenido del mensaje
            session_id: ID de sesión opcional
            
        Returns:
            MessageModel normalizado
        """
        logger.info(f"[WebWidget] Procesando mensaje de usuario {user_id}")
        
        metadata = {}
        if session_id:
            metadata["session_id"] = session_id
        
        return self.normalize_message(
            user_id=user_id,
            user_name=None,  # El widget web no proporciona nombre en primera instancia
            message=message,
            metadata=metadata
        )
    
    def get_response_data(self, response: ResponseModel) -> Dict[str, Any]:
        """
        Convierte una ResponseModel a formato JSON para el widget web.
        
        Args:
            response: Respuesta del backend
            
        Returns:
            Diccionario con la respuesta formateada
        """
        return {
            "answer": response.message,
            "status": response.status,
            "metadata": response.metadata
        }
