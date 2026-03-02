import subprocess
import json

# ================================
# PRUEBA FORMAL PARA META INSTAGRAM API
# ================================

# Esta prueba demuestra el envío de un mensaje de texto utilizando curl
# a la Instagram Messaging API de Meta.

# ================================
# CONFIGURACIÓN DE LA PRUEBA
# ================================

# ID de la cuenta de Instagram que envía el mensaje
SENDER_ID = "17841477951657842"  # Reemplaza con el ID de tu cuenta de Instagram

# ID de la cuenta de Instagram destinataria
RECIPIENT_ID = "17841477951657842"  # Reemplaza con el ID del usuario receptor

INSTAGRAM_TOKEN = "IGAAgrkxw2CdVBZAGJjM1h1UEZAWcHRIQzFZAZAGZA4QzVoblZAUNHh0dGZAHVWRhOEJRUlJkMVYwQXh0SjZANSURuWE9vVDRrLVExWmFReEFwX0h1X3RqTG9QRm5YMk5hNU04aURUakVVS1E0R1JvRVJuT25RdHVfc3RMMDhJNWVOT21DbwZDZD"

# Verificar que los valores estén configurados
if SENDER_ID == "SENDER_ID" or RECIPIENT_ID == "RECIPIENT_ID" or INSTAGRAM_TOKEN == "YOUR_TOKEN":
    print("❌ Error: Configura los valores de SENDER_ID, RECIPIENT_ID e INSTAGRAM_TOKEN antes de ejecutar la prueba.")
    exit(1)

# Mensaje de prueba
MESSAGE_TEXT = "Hola, este es un mensaje de prueba desde la API de Instagram."

# ================================
# CONSTRUCCIÓN DEL PAYLOAD JSON
# Según la API de Instagram: message y recipient deben ser strings JSON
# ================================

data = {
    "message": json.dumps({"text": MESSAGE_TEXT}),
    "recipient": json.dumps({"id": RECIPIENT_ID})
}

json_payload = json.dumps(data)

# ================================
# EJECUCIÓN DE LA PRUEBA CON CURL
# ================================

url = f"https://graph.instagram.com/v21.0/{SENDER_ID}/messages"

curl_command = [
    "curl",
    "-X", "POST",
    url,
    "-H", "Authorization: Bearer " + INSTAGRAM_TOKEN,
    "-H", "Content-Type: application/json",
    "-d", json_payload
]

print("🚀 Iniciando prueba formal de envío de mensaje entre cuentas de Instagram via curl...")
print(f"📤 Enviando mensaje DE: {SENDER_ID}")
print(f"📥 Enviando mensaje A: {RECIPIENT_ID}")
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

# Evaluar la respuesta
if result.returncode == 0:
    try:
        response_json = json.loads(result.stdout)
        
        # Verificar si hay un error en la respuesta
        if "error" in response_json:
            error_info = response_json["error"]
            print(f"\n❌ Error de la API: {error_info.get('message', 'Error desconocido')}")
            print(f"   Código: {error_info.get('code', 'N/A')}")
            print(f"   Subtipo: {error_info.get('error_subcode', 'N/A')}")
        else:
            print("\n✅ Prueba exitosa: Mensaje enviado correctamente.")
            if "message_id" in response_json:
                print(f"   ID del mensaje: {response_json['message_id']}")
    except json.JSONDecodeError:
        print("\n❌ Error: No se pudo parsear la respuesta JSON.")
else:
    print("\n❌ Prueba fallida: Error al ejecutar curl.")
