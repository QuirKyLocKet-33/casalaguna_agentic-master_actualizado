import subprocess
import json

# ================================
# PRUEBA FORMAL PARA META WHATSAPP API
# ================================

# Esta prueba demuestra el envío de un mensaje de texto utilizando curl
# a la WhatsApp Cloud API de Meta.

# ================================
# CONFIGURACIÓN DE LA PRUEBA
# ================================

PHONE_NUMBER_ID = "894525647087417"
ACCESS_TOKEN = "EAAXTubXdiPQBQtPlHyoQCw1DLSVZCJ7MkVr8OAimReeU3cQ3r5UY7MydvvYn4ZCUIZCoezq1ZAGYd2SYayOlzn3vFc2CiQxi1ZCRNZCjfLWVZAIJRWFCckSuQXR5YC6CUxU3CgMEyW2oCbId7jwBobRpsZB9c4RB2zkn5TvZCvrQmJMFKtpoWMUF6jTCeyzrZAOZAhl2QZDZD"

# Número destino (con código de país, sin +)
TO_NUMBER = "5218331375763"

# Mensaje de prueba
MESSAGE_TEXT = "Hola, este es un mensaje de prueba desde la API de WhatsApp."

# ================================
# CONSTRUCCIÓN DEL PAYLOAD JSON
# ================================

data = {
    "messaging_product": "whatsapp",
    "to": TO_NUMBER,
    "type": "text",
    "text": {
        "body": MESSAGE_TEXT
    }
}

json_payload = json.dumps(data)

# ================================
# EJECUCIÓN DE LA PRUEBA CON CURL
# ================================

url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"

curl_command = [
    "curl",
    "-X", "POST",
    url,
    "-H", "Authorization: Bearer " + ACCESS_TOKEN,
    "-H", "Content-Type: application/json",
    "-d", json_payload
]

print("🚀 Iniciando prueba formal de envío de mensaje a WhatsApp via curl...")
print(f"📤 Enviando mensaje a: {TO_NUMBER}")
print(f"💬 Mensaje: {MESSAGE_TEXT}")
print(f"🔗 URL: {url}")
print("\nEjecutando comando curl:\n" + " ".join(curl_command) + "\n")

# Ejecutar el comando curl
result = subprocess.run(curl_command, capture_output=True, text=True)

print("📊 Resultados de la prueba:")
print(f"Exit Code: {result.returncode}")
print(f"Stdout:\n{result.stdout}")
if result.stderr:
    print(f"Stderr:\n{result.stderr}")

if result.returncode == 0:
    print("\n✅ Prueba exitosa: Mensaje enviado correctamente.")
else:
    print("\n❌ Prueba fallida: Error al enviar el mensaje.")
