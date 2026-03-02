#!/bin/bash

# ==================================================================
# SETUP RÁPIDO - Integración WhatsApp Business con Casa Laguna Bot
# ==================================================================

echo "================================"
echo "🍽️  CASA LAGUNA - WhatsApp Setup"
echo "================================"
echo ""

# 1. Crear archivo .env si no existe
if [ ! -f ../app/.env ]; then
    echo "📝 Creando archivo .env en backend/app/"
    cat > ../app/.env << 'EOF'
# Variables de entorno para Casa Laguna Bot

# OpenAI API
OPENAI_API_KEY=your_openai_key_here

# WhatsApp Business Cloud API
WHATSAPP_TOKEN=your_access_token_here
PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=casa_laguna_verify_token_2024

# Base de datos (si es necesario)
DATABASE_URL=sqlite:///casa_laguna.db
EOF
    echo "✅ .env creado. Por favor, actualiza las credenciales."
else
    echo "✅ Archivo .env ya existe en backend/app/"
fi

echo ""
echo "================================"
echo "📋 PRÓXIMOS PASOS:"
echo "================================"
echo ""
echo "1. Actualiza las variables en: backend/app/.env"
echo "   - WHATSAPP_TOKEN (Access Token)"
echo "   - PHONE_NUMBER_ID (Phone Number ID)"
echo "   - OPENAI_API_KEY"
echo ""
echo "2. Inicia el servidor:"
echo "   cd ../app"
echo "   conda activate chatbot"
echo "   python3 main.py"
echo ""
echo "3. En otra terminal, expone con ngrok:"
echo "   ngrok http 8000"
echo ""
echo "4. Configura el webhook en WhatsApp Cloud API:"
echo "   - URL: https://tu-ngrok-url.io/webhook"
echo "   - Verify Token: casa_laguna_verify_token_2024"
echo "   - Eventos: messages, message_status"
echo ""
echo "5. Prueba la integración:"
echo "   python3 whatsapp_integration.py --mode test"
echo ""
echo "================================"
