"""
Conectores de canales de comunicación.

Arquitectura:
- BaseConnector: Clase abstracta que define la interfaz común
- Cada conector específico (Web, WhatsApp, Instagram, etc.) hereda de BaseConnector
- MessageService: Coordinador centralizado que enruta mensajes entre conectores y la lógica de negocio

Conectores disponibles:
- WebWidgetConnector: ✅ Funcional - Widget web
- WhatsAppConnector: ⏳ Template listo - Requiere configuración
- InstagramConnector: ❌ Próximo
- FacebookMessengerConnector: ❌ Próximo
"""

from .base import BaseConnector
from .web_widget import WebWidgetConnector
from .whatsapp import WhatsAppConnector

__all__ = ["BaseConnector", "WebWidgetConnector", "WhatsAppConnector"]
