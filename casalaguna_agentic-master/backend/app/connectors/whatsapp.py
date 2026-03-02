"""
WhatsApp Connector - Template para integración con WhatsApp Business API.

INSTRUCCIONES DE IMPLEMENTACIÓN:

1. Configura variables de entorno en backend/.env:
   - WHATSAPP_TOKEN: Tu token de acceso de Meta
   - PHONE_NUMBER_ID: ID del número de teléfono de negocio
   - WHATSAPP_VERIFY_TOKEN: Token para verificar webhooks

2. Completa los métodos marcados con TODO

3. Registra los endpoints en main.py (ver ejemplo al final)

4. Prueba con: POST http://localhost:8000/webhook/whatsapp
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
from .base import BaseConnector, MessageModel


logger = logging.getLogger(__name__)


class WhatsAppConnector(BaseConnector):
    """
    Conector para Meta WhatsApp Business API.
    
    Maneja:
    - Recepción de mensajes vía webhooks
    - Envío de mensajes a usuarios
    - Validación de webhooks
    """
    
    def __init__(self):
        """Inicializa el conector de WhatsApp."""
        super().__init__("whatsapp")
        
        self.api_token = os.getenv("WHATSAPP_TOKEN")
        self.phone_number_id = os.getenv("PHONE_NUMBER_ID")
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo_token")
        self.api_version = "v19.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
        if not self.api_token or not self.phone_number_id:
            logger.warning("⚠️ WhatsApp no está configurado completamente")
            logger.warning(f"   Token: {'SET' if self.api_token else 'NOT SET'}")
            logger.warning(f"   Phone ID: {'SET' if self.phone_number_id else 'NOT SET'}")
    
    async def send_message(self, user_id: str, message: str, **kwargs) -> bool:
        """
        Envía un mensaje de texto a un usuario de WhatsApp.
        
        Args:
            user_id: Número de teléfono del usuario (formato: 52XXXXXXXXXX)
            message: Contenido del mensaje (máx 4096 caracteres)
            **kwargs: Parámetros adicionales
            
        Returns:
            True si fue enviado exitosamente, False en caso contrario
        """
        if not self.api_token or not self.phone_number_id:
            logger.error("WhatsApp no configurado")
            return False
        
        # Limitar longitud
        if len(message) > 4000:
            message = message[:4000] + "..."
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": user_id,
            "type": "text",
            "text": {"body": message}
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"[WhatsApp] Enviando mensaje a {user_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"✅ Mensaje enviado a {user_id}")
                return True
            else:
                logger.error(f"❌ Error enviando a WhatsApp: {response.status_code}")
                logger.error(f"   Detalles: {response.text}")
                return False
                
        except Exception as e:
            logger.exception(f"Error enviando mensaje por WhatsApp: {e}")
            return False
    
    async def validate_webhook(self, payload: Dict[str, Any]) -> bool:
        """
        Valida que un webhook provenga de Meta (WhatsApp).
        
        Args:
            payload: Payload del webhook
            
        Returns:
            True si es válido, False en caso contrario
            
        TODO: Implementar validación de firma HMAC de Meta
        """
        # TODO: Validar firma HMAC del webhook
        # Ver: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/validate-webhooks
        logger.debug("[WhatsApp] Webhook recibido")
        return True
    
    def extract_phone_number(self, webhook_data: Dict[str, Any]) -> Optional[str]:
        """
        Extrae el número de teléfono del webhook.
        
        Args:
            webhook_data: Payload del webhook
            
        Returns:
            Número de teléfono en formato internacional (52XXXXXXXXXX) o None
        """
        try:
            for entry in webhook_data.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    for contact in value.get("contacts", []):
                        wa_id = contact.get("wa_id")
                        if wa_id:
                            return wa_id
                    
                    for message in value.get("messages", []):
                        phone = message.get("from")
                        if phone:
                            return phone
        
        except Exception as e:
            logger.error(f"Error extrayendo número de teléfono: {e}")
        
        return None
    
    async def process_message(self, webhook_data: Dict[str, Any]) -> Optional[MessageModel]:
        """
        Procesa un mensaje del webhook de WhatsApp.
        
        Args:
            webhook_data: Payload completo del webhook
            
        Returns:
            MessageModel normalizado o None si no hay mensaje
        """
        try:
            for entry in webhook_data.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Procesar mensajes de texto
                    for message in value.get("messages", []):
                        if message.get("type") == "text":
                            user_id = message.get("from", "unknown")
                            message_text = message.get("text", {}).get("body", "")
                            message_id = message.get("id")
                            
                            # Obtener nombre del contacto si está disponible
                            user_name = None
                            for contact in value.get("contacts", []):
                                if contact.get("wa_id") == user_id:
                                    user_name = contact.get("profile", {}).get("name")
                            
                            logger.info(
                                f"[WhatsApp] Mensaje de {user_id} ({user_name}): "
                                f"{message_text[:50]}..."
                            )
                            
                            return self.normalize_message(
                                user_id=user_id,
                                user_name=user_name,
                                message=message_text,
                                metadata={
                                    "whatsapp_message_id": message_id,
                                    "timestamp": message.get("timestamp")
                                }
                            )
                        
                        # TODO: Soportar otros tipos de mensajes
                        # - Imágenes: message.get("type") == "image"
                        # - Audio: message.get("type") == "audio"
                        # - Documentos: message.get("type") == "document"
                        # - Ubicación: message.get("type") == "location"
                        else:
                            logger.info(f"[WhatsApp] Mensaje tipo {message.get('type')} recibido")
                    
                    # TODO: Procesar cambios de estado (entregado, leído, etc)
                    for status in value.get("statuses", []):
                        logger.debug(f"[WhatsApp] Status change: {status}")
        
        except Exception as e:
            logger.exception(f"Error procesando webhook de WhatsApp: {e}")
        
        return None


# ============================================================
# EJEMPLO DE INTEGRACIÓN EN main.py
# ============================================================

"""
# En main.py, agregar:

from connectors import WhatsAppConnector

# Inicializar
whatsapp_connector = WhatsAppConnector()

# Endpoint de verificación de webhook (GET)
@app.get("/webhook/whatsapp")
def webhook_verify_whatsapp(mode: str = None, challenge: str = None, verify_token: str = None):
    '''Verifica el webhook de WhatsApp'''
    
    if verify_token == whatsapp_connector.verify_token:
        logger.info("✅ WhatsApp webhook verificado")
        return int(challenge)
    else:
        logger.error("❌ Token de verificación inválido")
        raise HTTPException(status_code=403, detail="Token inválido")

# Endpoint para recibir mensajes (POST)
@app.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request):
    '''Recibe mensajes de WhatsApp'''
    
    try:
        data = await request.json()
        
        logger.info(f"📨 Webhook WhatsApp recibido")
        logger.debug(f"Payload: {data}")
        
        # Validar webhook
        if not await whatsapp_connector.validate_webhook(data):
            logger.error("Webhook inválido")
            return {"status": "error"}
        
        # Procesar mensaje
        message = await whatsapp_connector.process_message(data)
        
        if message:
            logger.info(f"Processing message from {message.user_id}")
            
            # Procesar con MessageService (igual que web)
            response = await message_service.process_message(message)
            
            # Enviar respuesta al usuario
            await whatsapp_connector.send_message(
                user_id=message.user_id,
                message=response.message
            )
            
            logger.info(f"✅ Respuesta enviada a {message.user_id}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.exception(f"Error en webhook WhatsApp: {e}")
        return {"status": "error", "detail": str(e)}

# Test endpoint para enviar mensaje manual
@app.post("/whatsapp/send-test")
async def whatsapp_send_test(to_number: str, message: str):
    '''Envía un mensaje de prueba'''
    
    success = await whatsapp_connector.send_message(to_number, message)
    
    return {
        "success": success,
        "to": to_number,
        "message": message
    }
"""
