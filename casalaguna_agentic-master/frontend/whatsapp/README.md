# Integración WhatsApp Business con Casa Laguna Bot

Esta integración permite que los clientes envíen mensajes a tu WhatsApp Business y el bot responda automáticamente.

## 📋 Requisitos

1. **Cuenta de WhatsApp Business** con acceso a Cloud API
2. **Access Token de WhatsApp**
3. **Phone Number ID** de tu número de WhatsApp Business
4. **Verify Token** (puedes crear cualquier string)

## 🚀 Pasos para la integración

### Paso 1: Configurar variables de entorno

Crea un archivo `.env` en `/backend/app/` con:

```env
WHATSAPP_TOKEN=tu_access_token_aqui
PHONE_NUMBER_ID=tu_phone_number_id_aqui
WHATSAPP_VERIFY_TOKEN=tu_verify_token_aqui
OPENAI_API_KEY=tu_openai_key_aqui
```

### Paso 2: Iniciar el servidor FastAPI

En la terminal `/backend/app/`:

```bash
conda activate chatbot
python3 main.py
```

El servidor estará en `http://localhost:8000`

### Paso 3: Exponer con ngrok (para webhooks públicos)

En otra terminal:

```bash
ngrok http 8000
```

Esto te dará una URL pública como: `https://abc123.ngrok.io`

### Paso 4: Configurar Webhook en WhatsApp Cloud API

1. Ve a [Facebook App Dashboard](https://developers.facebook.com/apps)
2. Selecciona tu app de WhatsApp Business
3. En **Configuration**, busca **Webhooks**
4. Haz clic en **Edit Subscription**
5. Ingresa:
   - **Callback URL**: `https://tu-url-ngrok.io/webhook`
   - **Verify Token**: El que pusiste en `.env` (WHATSAPP_VERIFY_TOKEN)

6. Suscribete a los eventos:
   - ✅ `messages`
   - ✅ `message_status`

### Paso 5: Probar la integración

Envía un mensaje a tu número de WhatsApp Business desde cualquier contacto.

El flujo será:
1. **Usuario envía** mensaje → WhatsApp Cloud API
2. **Webhook recibe** en `/webhook` del backend
3. **Bot procesa** con RAG y OpenAI
4. **Bot responde** automáticamente

## 🔍 Testing local

Para probar localmente sin webhooks públicos, usa:

```bash
python3 test.py
```

Esto simula un mensaje del usuario y prueba la integración completa.

## 📝 Archivos principales

- **test.py**: Script de prueba para simular mensajes
- **main.py** (`/backend/app/`): Servidor FastAPI con webhook
- **laguna.py** (`/backend/app/`): Bot con RAG

## ⚙️ Configuración avanzada

### Variables en main.py

```python
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")  # Access Token
WHATSAPP_PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")  # Tu Phone ID
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo_token")  # Para verificación
```

### Endpoints disponibles

- `GET /webhook` - Verificación del webhook
- `POST /webhook` - Recibe mensajes de WhatsApp
- `POST /chat` - Chat del widget web
- `GET /health` - Health check

## 🐛 Debugging

Si los webhooks no funcionan:

1. Verifica que el servidor esté corriendo: `curl http://localhost:8000/health`
2. Revisa los logs en la terminal del servidor
3. En ngrok, abre `http://localhost:4040` para ver requests
4. Asegúrate que el `WHATSAPP_VERIFY_TOKEN` sea idéntico en el código y en WhatsApp

## 📞 Soporte

Si tienes problemas:
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs en la terminal del servidor
3. Asegúrate que ngrok está corriendo cuando pruebes
