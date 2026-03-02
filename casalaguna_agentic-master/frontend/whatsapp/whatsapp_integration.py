"""
Integration WhatsApp Business con Casa Laguna Bot - Versión mejorada

Este script puede funcionar de dos maneras:
1. Como cliente (test): envía un mensaje al bot y lo proporciona
2. Como servidor simple: recibe webhooks (útil para pruebas locales)
"""

import requests
import sys
import os
import json
from pathlib import Path
from typing import Optional

# ================================
# CONFIGURAR PATHS PARA IMPORTAR BOT
# ================================

backend_path = Path(__file__).parent.parent.parent / "backend" / "app"
sys.path.insert(0, str(backend_path))

# ================================
# VARIABLES DE CONFIGURACIÓN
# ================================

# Credenciales de WhatsApp (usa variables de entorno en producción)
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID", "894525647087417")
ACCESS_TOKEN = os.getenv("WHATSAPP_TOKEN", "EAAXTubXdiPQBQtPlHyoQCw1DLSVZCJ7MkVr8OAimReeU3cQ3r5UY7MydvvYn4ZCUIZCoezq1ZAGYd2SYayOlzn3vFc2CiQxi1ZCRNZCjfLWVZAIJRWFCckSuQXR5YC6CUxU3CgMEyW2oCbId7jwBobRpsZB9c4RB2zkn5TvZCvrQmJMFKtpoWMUF6jTCeyzrZAOZAhl2QZDZD")

# URL base de WhatsApp Cloud API
WHATSAPP_API_VERSION = "v19.0"
WHATSAPP_BASE_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"


# ================================
# IMPORTAR BOT
# ================================

def init_bot():
    """Inicializa el bot de Casa Laguna"""
    try:
        from laguna import CasaLagunaBot
        print("🤖 Inicializando bot de Casa Laguna...")
        bot = CasaLagunaBot()
        print("✅ Bot inicializado correctamente.\n")
        return bot
    except Exception as e:
        print(f"❌ Error inicializando bot: {e}")
        return None


# ================================
# FUNCIONES AUXILIARES
# ================================

def get_bot_response(bot, user_message: str) -> str:
    """
    Obtiene la respuesta del bot para un mensaje del usuario
    
    Args:
        bot: Instancia del CasaLagunaBot
        user_message: Mensaje del usuario
        
    Returns:
        Respuesta del bot
    """
    if not bot:
        return "Bot no inicializado"
    
    try:
        response = bot.responder(user_message)
        return response
    except Exception as e:
        print(f"❌ Error obteniendo respuesta del bot: {e}")
        return f"Error al procesar el mensaje: {str(e)}"


def send_whatsapp_message(to_number: str, message_text: str) -> dict:
    """
    Envía un mensaje de texto a través de WhatsApp Cloud API
    
    Args:
        to_number: Número de destino (con código de país, sin +)
        message_text: Texto del mensaje
        
    Returns:
        Respuesta de la API
    """
    url = f"{WHATSAPP_BASE_URL}/{PHONE_NUMBER_ID}/messages"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Limitar a 4096 caracteres máximo
    if len(message_text) > 4000:
        message_text = message_text[:4000] + "..."
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {
            "body": message_text
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        print(f"❌ Error enviando mensaje: {e}")
        return {"error": str(e)}


def simulate_message(bot, user_number: str, user_message: str) -> None:
    """
    Simula la recepción de un mensaje: obtiene respuesta del bot y la "envía"
    
    Args:
        bot: Instancia del bot
        user_number: Número del usuario simulado
        user_message: Mensaje del usuario
    """
    print("=" * 70)
    print("📱 SIMULANDO MENSAJE DE USUARIO")
    print("=" * 70)
    print(f"👤 De: {user_number}")
    print(f"💬 Mensaje: {user_message}\n")
    
    # Obtener respuesta del bot
    print("🤖 Bot procesando...")
    bot_response = get_bot_response(bot, user_message)
    print(f"✅ Respuesta del bot:\n{bot_response}\n")
    
    # Enviar al número
    print(f"📤 Enviando respuesta a {user_number}...")
    result = send_whatsapp_message(user_number, bot_response)
    
    print("\n📊 Resultado de envío:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("=" * 70 + "\n")


def test_mode():
    """Modo de prueba: simula varios mensajes"""
    print("\n🧪 MODO DE PRUEBA - Simulando mensajes\n")
    
    bot = init_bot()
    if not bot:
        return
    
    # Mensajes de prueba
    test_messages = [
        ("5218331375763", "¿Qué menú tienen disponible?"),
        ("5218331375763", "¿Dónde están ubicados?"),
        ("5218331375763", "Quiero hacer una reservación para 4 personas el sábado a las 8pm"),
    ]
    
    for number, message in test_messages:
        simulate_message(bot, number, message)
        print("\n")


def interactive_mode():
    """Modo interactivo: permite enviar mensajes manualmente"""
    print("\n💬 MODO INTERACTIVO - Ingresa mensajes manualmente\n")
    
    bot = init_bot()
    if not bot:
        return
    
    print("Ingresa mensajes para probar el bot.")
    print("Escribe 'salir' para terminar.\n")
    
    while True:
        try:
            user_number = input("📱 Número de WhatsApp (ej: 5218331375763): ").strip()
            if user_number.lower() == "salir":
                break
            
            user_message = input("💬 Mensaje: ").strip()
            if user_message.lower() == "salir":
                break
            
            if user_message and user_number:
                simulate_message(bot, user_number, user_message)
            
        except KeyboardInterrupt:
            print("\n\nSaliendo...")
            break
        except Exception as e:
            print(f"Error: {e}")


# ================================
# MAIN
# ================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Integración WhatsApp Business con Casa Laguna Bot"
    )
    parser.add_argument(
        "--mode",
        choices=["test", "interactive"],
        default="test",
        help="Modo de ejecución: test (predefinido) o interactive (manual)"
    )
    parser.add_argument(
        "--number",
        type=str,
        help="Número de WhatsApp para enviar (solo con --mode manual)"
    )
    parser.add_argument(
        "--message",
        type=str,
        help="Mensaje a enviar (solo con --mode manual)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🍽️  CASA LAGUNA - WhatsApp Business Integration")
    print("=" * 70 + "\n")
    
    if args.mode == "test":
        test_mode()
    elif args.mode == "interactive":
        if args.number and args.message:
            bot = init_bot()
            if bot:
                simulate_message(bot, args.number, args.message)
        else:
            interactive_mode()
    
    print("✅ Proceso completado.\n")
