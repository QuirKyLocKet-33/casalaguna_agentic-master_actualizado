# main.py
import json  # Para respuestas JSON si es necesario
import logging
import os
import httpx
from datetime import datetime  # Añadir para timestamps

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

from laguna import CasaLagunaBot
from connectors import WebWidgetConnector
from services import MessageService
from crm_api import router as crm_router, register_conversation, is_admin_intervened, record_crm_event, get_conversation_state, CONV_STATE_BOT, CONV_STATE_HUMAN, CONV_STATE_CLOSED, update_user_name, auto_close_inactive_conversations

# Importar funciones de base de datos
from database import (
    inicializar_bd,
    crear_reservacion,
    obtener_reservacion_por_id,
    obtener_reservaciones_por_fecha,
    obtener_todas_las_reservaciones,
    actualizar_status_reservacion,
    eliminar_reservacion,
    obtener_estadisticas,
    crear_customer,
    incrementar_reservaciones_cliente,
    obtener_todos_customers
)

# ============================================================
# CONFIGURACIÓN GENERAL
# ============================================================

import asyncio

app = FastAPI(
    title="Casa Laguna RAG Bot",
    description="API para el asistente virtual de Casa Laguna",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_auto_close_task():
    """Inicia la tarea de fondo para cerrar conversaciones inactivas."""
    asyncio.create_task(auto_close_inactive_conversations())
    logging.info("⏱️ Background task de auto-close de conversaciones registrado")


# ============================================================
# CORS (NECESARIO PARA FRONTEND WEB)
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # demo interna
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas del CRM
app.include_router(crm_router)

# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# ============================================================
# INICIALIZAR BOT Y SERVICIOS (SINGLETON)
# ============================================================

try:
    logging.info("🚀 Inicializando CasaLagunaBot...")
    bot = CasaLagunaBot()
    logging.info("✅ Bot inicializado correctamente.")
except Exception as e:
    logging.exception("❌ Error inicializando el bot")
    raise e

# Inicializar servicios
try:
    logging.info("🚀 Inicializando MessageService...")
    message_service = MessageService(bot)
    web_widget_connector = WebWidgetConnector()
    logging.info("✅ Servicios inicializados correctamente.")
except Exception as e:
    logging.exception("❌ Error inicializando servicios")
    raise e

# ============================================================

# ============================================================
# WEBHOOK EVENTS SYSTEM (para CRM updates en tiempo real)
# ============================================================

class EventBroadcaster:
    """
    Sistema de eventos para notificar cambios sin mantener conexiones abiertas
    """
    def __init__(self):
        self.last_event_id = 0
        self.events = []
        self.max_events = 100
    
    def record_event(self, event_type: str, data: dict):
        """
        Registra un evento que puede ser consultado vía polling
        """
        self.last_event_id += 1
        event = {
            "id": self.last_event_id,
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.events.append(event)
        
        # Mantener últimos N eventos
        if len(self.events) > self.max_events:
            self.events = self.events[-self.max_events:]
        
        logging.debug(f"Evento registrado: {event_type}")
        return event
    
    def get_events_since(self, last_event_id: int = 0) -> list:
        """
        Retorna eventos desde un ID específico (para polling del frontend)
        """
        if not last_event_id:
            return self.events[-10:]  # Últimos 10 eventos
        
        return [e for e in self.events if e["id"] > last_event_id]

event_broadcaster = EventBroadcaster()


# WHATSAPP CONFIG
# ============================================================

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo_token")

if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
    logging.warning(f"⚠️ Variables de entorno de WhatsApp no configuradas")
    logging.warning(f"   WHATSAPP_TOKEN: {'SET' if WHATSAPP_TOKEN else 'NOT SET'}")
    logging.warning(f"   PHONE_NUMBER_ID: {'SET' if WHATSAPP_PHONE_NUMBER_ID else 'NOT SET'}")

WHATSAPP_API_VERSION = "v19.0"
WHATSAPP_BASE_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"

# ============================================================
# MODELOS DE REQUEST / RESPONSE
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None  # reservado para futuro

class ChatResponse(BaseModel):
    messages: list  # Lista de {role: "bot"|"admin"|"system", content: str}
    handoff_state: str = "bot_active"  # Estado actual de la conversación

class WhatsAppTestRequest(BaseModel):
    to_number: str
    message: str | None = "Hola desde Casa Laguna Bot 🤖"

class ReservationData(BaseModel):
    nombre: str
    telefono: str
    fecha_nacimiento: str
    personas: int
    fecha_hora: str

class MessageRequest(BaseModel):
    """Request para procesar mensajes desde conectores (WhatsApp, etc)"""
    user_id: str
    user_name: str | None = None
    message: str
    source: str = "whatsapp"  # whatsapp, web, widget, etc
    metadata: dict | None = None

# ============================================================
# FUNCIONES AUXILIARES PARA RESERVACIONES (USANDO BD)
# ============================================================

# Inicializar base de datos al arrancar la aplicación
try:
    logging.info("🔧 Inicializando base de datos de reservaciones...")
    inicializar_bd()
    logging.info("✅ Base de datos de reservaciones lista")
except Exception as e:
    logging.exception("❌ Error inicializando base de datos")
    raise e

# Nota: Las funciones de BD se importan al inicio del archivo
# - crear_reservacion(nombre, telefono, fecha_nacimiento, personas, fecha_hora) -> Dict
# - obtener_reservacion_por_id(res_id) -> Dict | None
# - obtener_reservaciones_por_fecha(fecha) -> List[Dict]
# - obtener_todas_las_reservaciones() -> Dict[fecha -> List[Dict]]
# - actualizar_status_reservacion(res_id, nuevo_status) -> bool
# - eliminar_reservacion(res_id) -> bool
# - obtener_estadisticas() -> Dict

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
def healthcheck():
    return {
        "status": "ok",
        "bot": "Casa Laguna",
        "message": "API activa",
        "timestamp": datetime.now().isoformat()
    }

# ------------------------------------------------------------
# ENDPOINT DE DIAGNÓSTICO
# ------------------------------------------------------------

@app.get("/whatsapp/debug")
def whatsapp_debug():
    """Endpoint para diagnóstico de configuración WhatsApp"""
    return {
        "has_token": bool(WHATSAPP_TOKEN),
        "has_phone_id": bool(WHATSAPP_PHONE_NUMBER_ID),
        "phone_id": WHATSAPP_PHONE_NUMBER_ID,
        "api_version": WHATSAPP_API_VERSION,
        "base_url": WHATSAPP_BASE_URL,
        "verify_token": WHATSAPP_VERIFY_TOKEN,
        "env_vars_present": {
            "WHATSAPP_TOKEN": "WHATSAPP_TOKEN" in os.environ,
            "PHONE_NUMBER_ID": "PHONE_NUMBER_ID" in os.environ,
            "WHATSAPP_VERIFY_TOKEN": "WHATSAPP_VERIFY_TOKEN" in os.environ
        },
        "server_time": datetime.now().isoformat()
    }

# ------------------------------------------------------------
# CHAT WEB / FRONTEND (Usando MessageService con WebWidgetConnector)
# ------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Endpoint para chat del widget web.
    
    Flujo:
    1. Recibe mensaje del widget
    2. Procesa a través de WebWidgetConnector
    3. MessageService lo procesa con el bot
    4. Retorna respuesta
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje está vacío")

    try:
        # Generar ID único para el usuario del widget
        user_id = req.session_id or "Usuario Web"
        
        logging.info(f"💬 Usuario (web): {req.message}")
        
        # Obtener estado de handoff
        current_state = get_conversation_state(user_id)
        messages_to_send = []
        response_message = ""
        
        if current_state == CONV_STATE_CLOSED:
            # Conversación cerrada — no procesar
            response_message = "Esta conversación ha sido cerrada. Puedes iniciar una nueva conversación recargando la página."
            messages_to_send.append({"role": "system", "content": response_message})
            return ChatResponse(messages=messages_to_send, handoff_state=current_state)

        if current_state == CONV_STATE_HUMAN:
            # Admin tiene el control — solo registrar el mensaje del usuario, NO generar respuesta bot
            logging.info(f"🧑‍💼 Modo humano activo para {user_id}. Bot silenciado.")
            
            # Registrar el mensaje del usuario en la conversación (sin respuesta bot)
            today = datetime.now().strftime("%Y-%m-%d")
            from crm_api import conversations_by_date as conv_store, get_metrics, get_conversations, get_clients
            conv = conv_store.get(today, {}).get(user_id)
            if conv:
                conv["messages"].append({
                    "role": "user",
                    "content": req.message,
                    "timestamp": datetime.now().isoformat()
                })
                conv["last_timestamp"] = datetime.now().isoformat()

                # Persistir el mensaje del usuario en PostgreSQL
                from database import agregar_mensaje_db
                agregar_mensaje_db(conv["id"], "user", req.message)

                # Notificar al CRM que hay un nuevo mensaje del usuario
                record_crm_event("conversation_update", {"conversation": conv}, fuente="backend")
                record_crm_event("crm_update", {
                    "metrics": get_metrics(),
                    "conversations": get_conversations(),
                    "clients": get_clients(),
                }, fuente="backend")
            
            # Enviar webhook al CRM
            import requests
            try:
                requests.post(
                    "http://localhost:8000/crm/webhook/events",
                    json={
                        "tipo": "mensaje_nuevo",
                        "datos": {
                            "usuario_id": user_id,
                            "mensaje": req.message,
                            "respuesta": "",
                            "canal": "web",
                            "timestamp": datetime.now().isoformat(),
                            "tiene_reservacion": False,
                            "handoff_state": CONV_STATE_HUMAN
                        },
                        "fuente": "widget"
                    },
                    timeout=5
                )
            except Exception:
                pass

            # Recopilar mensajes pendientes del admin
            if conv:
                for msg in conv["messages"]:
                    if msg.get("role") in ("admin", "system") and not msg.get("sent_to_widget", False):
                        messages_to_send.append({"role": msg["role"], "content": msg["content"]})
                        msg["sent_to_widget"] = True

            return ChatResponse(messages=messages_to_send, handoff_state=current_state)

        # ---- ESTADO NORMAL: bot_active ----
        # Procesar mensaje a través del conector
        import time as _time
        _t_start = _time.time()
        normalized_message = await web_widget_connector.process_message(
            user_id=user_id,
            message=req.message,
            session_id=req.session_id
        )
        
        # Procesar con MessageService
        response = await message_service.process_message(normalized_message)
        response_message = response.message
        _t_end = _time.time()
        _response_time_ms = int((_t_end - _t_start) * 1000)
        logging.info(f"🤖 Respuesta generada correctamente en {_response_time_ms}ms")
        
        # Registrar en CRM para el dashboard
        has_reservation = (
            "✅ Reservación:" in response_message and
            "👤" in response_message and
            "📱" in response_message and
            "🎂" in response_message and
            "👥" in response_message and
            "📅" in response_message
        )

        register_conversation(
            channel="web",
            user_id=user_id,
            message=req.message,
            response=response_message,
            has_reservation=has_reservation,
            response_time_ms=_response_time_ms
        )
        
        # ============================================================
        # ENVIAR WEBHOOK REAL AL CRM (Evento de nuevo mensaje)
        # ============================================================
        import requests
        try:
            webhook_payload = {
                "tipo": "mensaje_nuevo",
                "datos": {
                    "usuario_id": user_id,
                    "mensaje": req.message,
                    "respuesta": response_message,
                    "canal": "web",
                    "timestamp": datetime.now().isoformat(),
                    "tiene_reservacion": has_reservation
                },
                "fuente": "widget"
            }
            
            requests.post(
                "http://localhost:8000/crm/webhook/events",
                json=webhook_payload,
                timeout=5
            )
            logging.info(f"✅ Webhook enviado al CRM: {webhook_payload['tipo']}")
        except Exception as e:
            logging.warning(f"⚠️ Error enviando webhook al CRM: {e}")
        
        # Notificar al CRM a través del stream /crm/events (mismo canal que ya consume el frontend)
        from crm_api import get_metrics, get_conversations, get_clients
        metrics = get_metrics()
        conversations = get_conversations()
        clients = get_clients()
        record_crm_event(
            "crm_update",
            {"metrics": metrics, "conversations": conversations, "clients": clients},
            fuente="backend",
        )
        
        reservation_id = None
        if has_reservation:
            reservation_id = await procesar_reservacion_completa(response_message, user_id)
        
        # Procesar reservación si se detecta
        if has_reservation:
            try:
                await procesar_reservacion_completa(response_message, user_id)
                logging.info("✅ Reservación procesada desde /chat")
            except Exception as e:
                logging.error(f"Error procesando reservación desde /chat: {e}")
        
        # Obtener mensajes del admin/system pendientes
        today = datetime.now().strftime("%Y-%m-%d")
        from crm_api import conversations_by_date
        conv = conversations_by_date.get(today, {}).get(user_id)
        if conv:
            for msg in conv["messages"]:
                if msg.get("role") in ("admin", "system") and not msg.get("sent_to_widget", False):
                    messages_to_send.append({"role": msg["role"], "content": msg["content"]})
                    msg["sent_to_widget"] = True
        
        # Agregar respuesta del bot si existe
        if response_message:
            messages_to_send.append({"role": "bot", "content": response_message})
        
        # Agregar mensaje de confirmación si se creó reservación
        if reservation_id:
            messages_to_send.append({"role": "bot", "content": f"Reservación confirmada con ID: {reservation_id}"})

        # (Evitar emitir dos veces el mismo crm_update en /chat)

        return ChatResponse(messages=messages_to_send, handoff_state=get_conversation_state(user_id))

    except Exception as e:
        logging.exception("❌ Error durante la conversación")
        raise HTTPException(
            status_code=500,
            detail="Error interno al procesar la consulta"
        )

# ------------------------------------------------------------
# API GENERAL PARA PROCESAR MENSAJES (WhatsApp, etc)
# ------------------------------------------------------------

@app.post("/api/message")
async def process_message_api(req: MessageRequest):
    """
    Endpoint genérico para procesar mensajes desde conectores.
    
    Soporta:
    - WhatsApp
    - Widget Web
    - Otros canales
    
    Parámetros:
    - user_id: ID único del usuario (teléfono para WhatsApp)
    - user_name: Nombre del usuario (opcional)
    - message: Texto del mensaje
    - source: Canal de origen (whatsapp, web, etc)
    - metadata: Datos adicionales (message_id, timestamp, etc)
    """
    if not req.message.strip():
        return {
            "error": "Mensaje vacío",
            "response": "Por favor envía un mensaje válido"
        }

    try:
        logging.info(f"📨 Mensaje de {req.source} ({req.user_id}): {req.message[:100]}")
        
        # Procesar el mensaje con el bot (medir tiempo real)
        import time as _time
        _t_start = _time.time()
        response_text = bot.responder(req.message)
        _t_end = _time.time()
        _response_time_ms = int((_t_end - _t_start) * 1000)
        
        logging.info(f"🤖 Respuesta generada en {_response_time_ms}ms: {response_text[:100]}")
        
        # Registrar en CRM
        has_reservation = (
            "✅ Reservación:" in response_text and
            "👤" in response_text and
            "📱" in response_text and
            "🎂" in response_text and
            "👥" in response_text and
            "📅" in response_text
        )
        
        # Si es WhatsApp, extraer el nombre del teléfono o usar el proporcionado
        user_display_name = req.user_name or req.user_id
        
        register_conversation(
            channel=req.source,
            user_id=req.user_id,
            message=req.message,
            response=response_text,
            has_reservation=has_reservation,
            response_time_ms=_response_time_ms
        )
        
        # Procesar reservación si se detecta
        if has_reservation:
            try:
                await procesar_reservacion_completa(response_text, req.user_id)
                logging.info("✅ Reservación procesada desde API")
            except Exception as e:
                logging.error(f"Error procesando reservación desde API: {e}")
        
        # Broadcast al CRM
        try:
            from crm_api import get_metrics, get_conversations, get_clients
            metrics = get_metrics()
            conversations = get_conversations()
            clients = get_clients()

            record_crm_event(
                "crm_update",
                {"metrics": metrics, "conversations": conversations, "clients": clients},
                fuente="backend",
            )
        except Exception as e:
            logging.debug(f"No se pudo registrar update de CRM: {e}")
        
        return {
            "success": True,
            "response": response_text,
            "source": req.source,
            "user_id": req.user_id,
            "has_reservation": has_reservation
        }
        
    except Exception as e:
        logging.exception(f"Error procesando mensaje de {req.source}")
        return {
            "success": False,
            "error": str(e),
            "response": "Disculpa, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo."
        }

# ------------------------------------------------------------
# RESERVACIONES
# ------------------------------------------------------------

@app.post("/reservations/save")
def save_reservation(reserva: ReservationData):
    """Guarda una nueva reservación en la base de datos y registra el cliente"""
    try:
        # 1. Primero guardar el cliente en la tabla customers
        logging.info(f"💾 Guardando cliente: {reserva.nombre} ({reserva.telefono})")
        cliente_result = crear_customer(
            nombre=reserva.nombre,
            telefono=reserva.telefono,
            fecha_nacimiento=reserva.fecha_nacimiento
        )
        
        if cliente_result:
            logging.info(f"✅ Cliente guardado: {cliente_result['id']}")
            
            # 2. Incrementar contador de reservaciones del cliente
            incrementar_reservaciones_cliente(cliente_result['id'])
            logging.info("📊 Contador de reservaciones incrementado")
        else:
            logging.warning("⚠️ No se pudo guardar cliente (posiblemente ya existe)")
        
        # 3. Crear la reservación
        resultado = crear_reservacion(
            nombre=reserva.nombre,
            telefono=reserva.telefono,
            fecha_nacimiento=reserva.fecha_nacimiento,
            personas=reserva.personas,
            fecha_hora=reserva.fecha_hora
        )
        
        if resultado:
            return {
                "success": True,
                "message": f"✅ Reservación confirmada con ID: {resultado['id']}",
                "reservation_id": resultado["id"],
                "customer_id": cliente_result.get("id") if cliente_result else None,
                "data": resultado
            }
        else:
            raise HTTPException(status_code=400, detail="Error al crear la reservación")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"❌ Error en /reservations/save: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservations")
def get_reservations(fecha: str | None = None):
    """Obtiene las reservaciones de la base de datos"""
    try:
        if fecha:
            # Obtener reservaciones de una fecha específica
            datos = obtener_reservaciones_por_fecha(fecha)
            return {
                "success": True,
                "fecha_filtro": fecha,
                "total": len(datos),
                "reservaciones": datos
            }
        else:
            # Obtener todas las reservaciones organizadas por fecha
            datos = obtener_todas_las_reservaciones()
            return {
                "success": True,
                "fecha_filtro": None,
                "reservaciones": datos
            }
    except Exception as e:
        logging.exception(f"❌ Error en /reservations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservations/date/{fecha}")
def get_reservations_by_date(fecha: str):
    """Obtiene reservaciones de una fecha específica de la base de datos"""
    try:
        datos = obtener_reservaciones_por_fecha(fecha)
        return {
            "success": True,
            "fecha": fecha,
            "total": len(datos),
            "reservaciones": datos
        }
    except Exception as e:
        logging.exception(f"❌ Error en /reservations/date: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservations/id/{res_id}")
def get_reservation_by_id(res_id: str):
    """Obtiene una reservación por su ID"""
    try:
        reservacion = obtener_reservacion_por_id(res_id)
        
        if reservacion:
            return {
                "success": True,
                "reservacion": reservacion
            }
        else:
            raise HTTPException(status_code=404, detail=f"Reservación {res_id} no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"❌ Error en /reservations/id/{res_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/reservations/{res_id}/status")
def update_reservation_status(res_id: str, nuevo_status: str):
    """Actualiza el estado de una reservación"""
    try:
        resultado = actualizar_status_reservacion(res_id, nuevo_status)
        
        if resultado:
            return {
                "success": True,
                "message": f"✅ Status actualizado a: {nuevo_status}",
                "reservation_id": res_id,
                "status": nuevo_status
            }
        else:
            raise HTTPException(status_code=404, detail=f"Reservación {res_id} no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"❌ Error en /reservations/{res_id}/status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/reservations/{res_id}")
def delete_reservation(res_id: str):
    """Cancela una reservación (soft delete)"""
    try:
        resultado = eliminar_reservacion(res_id)
        
        if resultado:
            return {
                "success": True,
                "message": f"✅ Reservación {res_id} cancelada",
                "reservation_id": res_id,
                "status": "cancelada"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Reservación {res_id} no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"❌ Error en DELETE /reservations/{res_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservations/stats")
def get_reservation_stats():
    """Obtiene estadísticas de las reservaciones"""
    try:
        stats = obtener_estadisticas()
        return {
            "success": True,
            "estadisticas": stats
        }
    except Exception as e:
        logging.exception(f"❌ Error en /reservations/stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# WHATSAPP TEST (ENVÍO MANUAL) - VERSIÓN MEJORADA CON LOGS
# ------------------------------------------------------------

@app.post("/whatsapp/test")
def whatsapp_test():
    """Envía un mensaje de prueba por WhatsApp con logs detallados"""
    
    # Verificación detallada de variables
    if not WHATSAPP_TOKEN:
        logging.error("❌ WHATSAPP_TOKEN no configurado")
        raise HTTPException(
            status_code=500,
            detail="WHATSAPP_TOKEN no configurado"
        )
    
    if not WHATSAPP_PHONE_NUMBER_ID:
        logging.error("❌ PHONE_NUMBER_ID no configurado")
        raise HTTPException(
            status_code=500,
            detail="PHONE_NUMBER_ID no configurado"
        )

    logging.info(f"📱 Enviando mensaje de prueba WhatsApp...")
    logging.info(f"   Phone ID: {WHATSAPP_PHONE_NUMBER_ID}")
    logging.info(f"   API Version: {WHATSAPP_API_VERSION}")
    logging.info(f"   Número destino: 528331375763")
    
    url = f"{WHATSAPP_BASE_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    logging.info(f"   URL de destino: {url}")

    payload = {
        "messaging_product": "whatsapp",
        "to": "528331375763",
        "type": "text",
        "text": {
            "body": "Hola 👋 Soy Abigail. Tu bot de Casa Laguna ya puede enviar mensajes por WhatsApp 🍽️"
        }
    }

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        logging.info(f"📤 Enviando solicitud a WhatsApp API...")
        logging.info(f"   Payload: {payload}")
        
        response = httpx.post(
            url, 
            json=payload, 
            headers=headers, 
            timeout=30.0,
            verify=True
        )
        
        logging.info(f"📥 Respuesta recibida:")
        logging.info(f"   Status Code: {response.status_code}")
        logging.info(f"   Headers: {dict(response.headers)}")
        logging.info(f"   Body: {response.text}")
        
        if response.status_code == 200:
            logging.info("✅ Mensaje WhatsApp enviado correctamente")
            try:
                response_json = response.json()
                logging.info(f"   Response JSON: {response_json}")
                return response_json
            except Exception as json_error:
                logging.warning(f"⚠️ No se pudo parsear JSON: {json_error}")
                return {"raw_response": response.text}
        
        elif response.status_code >= 400:
            logging.error(f"❌ Error de WhatsApp API ({response.status_code})")
            
            # Intentar obtener detalles del error
            error_details = response.text
            try:
                error_json = response.json()
                error_details = str(error_json)
                if "error" in error_json:
                    error_info = error_json.get("error", {})
                    logging.error(f"   Error code: {error_info.get('code')}")
                    logging.error(f"   Error type: {error_info.get('type')}")
                    logging.error(f"   Error message: {error_info.get('message')}")
                    logging.error(f"   Error subcode: {error_info.get('error_subcode')}")
            except:
                pass
                
            raise HTTPException(
                status_code=500,
                detail=f"Error WhatsApp API: {error_details}"
            )
            
    except httpx.RequestError as e:
        logging.exception(f"❌ Error de conexión con WhatsApp API: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión: {str(e)}"
        )
    except Exception as e:
        logging.exception(f"❌ Error inesperado: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado: {str(e)}"
        )

@app.post("/whatsapp/send")
def whatsapp_send(req: WhatsAppTestRequest):
    """Envía mensaje a un número específico"""
    
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        raise HTTPException(status_code=500, detail="WhatsApp no configurado")

    # Limpiar y formatear número
    to_number = req.to_number.strip().replace("+", "").replace(" ", "").replace("-", "")
    
    logging.info(f"📤 Enviando mensaje WhatsApp a {to_number}")
    
    url = f"{WHATSAPP_BASE_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {
            "body": req.message or "Mensaje de prueba desde Casa Laguna Bot"
        }
    }

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
        
        if response.status_code == 200:
            data = response.json()
            logging.info(f"✅ Mensaje enviado a {to_number}")
            return {
                "success": True,
                "to": to_number,
                "message_id": data.get('messages', [{}])[0].get('id'),
                "whatsapp_id": data.get('contacts', [{}])[0].get('wa_id')
            }
        else:
            logging.error(f"❌ Error: {response.status_code} - {response.text}")
            return {
                "success": False,
                "error": response.text,
                "status_code": response.status_code
            }
            
    except Exception as e:
        logging.exception(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# WHATSAPP WEBHOOK - VERSIÓN MEJORADA
# ============================================================

@app.get("/webhook")
def webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    mode: str = None,
    challenge: str = None,
    verify_token: str = None
):
    """Endpoint para verificación de WhatsApp Webhook en /webhook"""
    # Capturar parámetros con prefijo hub. o sin prefijo
    mode = hub_mode or mode
    challenge = hub_challenge or challenge
    verify_token = hub_verify_token or verify_token
    
    logging.info(f"🔍 Webhook verification request received")
    logging.info(f"   Endpoint: /webhook")
    logging.info(f"   Mode: {mode}")
    logging.info(f"   Challenge: {challenge}")
    logging.info(f"   Verify Token: {verify_token}")
    logging.info(f"   Expected Token: {WHATSAPP_VERIFY_TOKEN}")
    
    if verify_token == WHATSAPP_VERIFY_TOKEN:
        logging.info("✅ Webhook verificado correctamente")
        return int(challenge)
    else:
        logging.warning("❌ Webhook verificación fallida")
        logging.warning(f"   Token recibido: {verify_token}")
        logging.warning(f"   Token esperado: {WHATSAPP_VERIFY_TOKEN}")
        raise HTTPException(status_code=403, detail="Token inválido")

@app.get("/webhook/whatsapp")
def webhook_verify_whatsapp(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    mode: str = None,
    challenge: str = None,
    verify_token: str = None
):
    """Endpoint para verificación de WhatsApp Webhook en /webhook/whatsapp"""
    # Capturar parámetros con prefijo hub. o sin prefijo
    mode = hub_mode or mode
    challenge = hub_challenge or challenge
    verify_token = hub_verify_token or verify_token
    
    logging.info(f"🔍 Webhook verification request received")
    logging.info(f"   Endpoint: /webhook/whatsapp")
    logging.info(f"   Mode: {mode}")
    logging.info(f"   Challenge: {challenge}")
    logging.info(f"   Verify Token: {verify_token}")
    logging.info(f"   Expected Token: {WHATSAPP_VERIFY_TOKEN}")
    
    if verify_token == WHATSAPP_VERIFY_TOKEN:
        logging.info("✅ Webhook verificado correctamente")
        return int(challenge)
    else:
        logging.warning("❌ Webhook verificación fallida")
        logging.warning(f"   Token recibido: {verify_token}")
        logging.warning(f"   Token esperado: {WHATSAPP_VERIFY_TOKEN}")
        raise HTTPException(status_code=403, detail="Token inválido")

@app.post("/webhook")
async def webhook_receive(request: Request):
    """Recibe webhooks de WhatsApp con más logging"""
    
    # Primero loguear headers para debugging
    headers = dict(request.headers)
    logging.info("=" * 60)
    logging.info("📨 NUEVO WEBHOOK RECIBIDO")
    logging.info(f"📋 Headers: {headers}")
    
    try:
        # Leer el cuerpo
        body = await request.body()
        body_str = body.decode('utf-8')
        logging.info(f"📦 Raw body ({len(body_str)} chars): {body_str[:500]}...")
        
        if not body_str.strip():
            logging.warning("⚠️ Webhook recibido con cuerpo vacío")
            return {"status": "empty body"}
        
        # Parsear JSON
        data = json.loads(body_str)
        
        # Log detallado
        logging.info(f"🔍 Estructura JSON recibida:")
        logging.info(json.dumps(data, indent=2, ensure_ascii=False))
        
        # Procesar entrada
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Mensajes
                if "messages" in value:
                    for message in value["messages"]:
                        await process_whatsapp_message(message, value)
                
                # Estados de mensaje
                elif "statuses" in value:
                    for status in value["statuses"]:
                        await process_message_status(status)
                
                # Otros eventos
                else:
                    logging.info(f"📊 Otro tipo de evento: {value.keys()}")
        
        return {"status": "ok"}
        
    except json.JSONDecodeError as e:
        logging.error(f"❌ Error parseando JSON: {e}")
        if 'body_str' in locals():
            logging.error(f"Raw body: {body_str[:1000]}")
        return {"status": "error", "detail": "Invalid JSON"}
        
    except Exception as e:
        logging.exception(f"❌ Error procesando webhook: {e}")
        return {"status": "error", "detail": str(e)}

@app.post("/webhook/whatsapp")
async def webhook_receive_whatsapp(request: Request):
    """Recibe webhooks de WhatsApp en /webhook/whatsapp"""
    return await webhook_receive(request)

async def process_whatsapp_message(message: dict, context: dict):
    """Procesa un mensaje de WhatsApp"""
    from_number = message.get("from", "unknown")
    text = message.get("text", {}).get("body", "")
    message_id = message.get("id", "unknown")
    message_type = message.get("type", "unknown")
    timestamp = message.get("timestamp", "unknown")
    
    logging.info(f"💬 MENSAJE RECIBIDO:")
    logging.info(f"   ID: {message_id}")
    logging.info(f"   De: {from_number}")
    logging.info(f"   Tipo: {message_type}")
    logging.info(f"   Texto: {text}")
    logging.info(f"   Timestamp: {timestamp}")
    
    # Solo responder mensajes de texto por ahora
    if message_type == "text" and text.strip():
        try:
            logging.info(f"🤖 Procesando mensaje con bot...")
            respuesta = bot.responder(text)
            logging.info(f"🤖 Respuesta generada: {respuesta[:200]}")
            
            # Verificar si la respuesta contiene una reservación completa
            has_reservation = (
                "✅ Reservación:" in respuesta and
                "👤" in respuesta and
                "📱" in respuesta and
                "🎂" in respuesta and
                "👥" in respuesta and
                "📅" in respuesta
            )
            if has_reservation:
                logging.info("🎯 Detectada reservación completa, procesando...")
                logging.info(f"📝 Respuesta completa: {respuesta}")
                try:
                    await procesar_reservacion_completa(respuesta, from_number)
                    logging.info("✅ Procesamiento de reservación completado")
                except Exception as e:
                    logging.exception(f"❌ Error procesando reservación: {e}")
            else:
                logging.info("ℹ️ Respuesta normal, no contiene reservación completa")
            
            # Enviar respuesta
            await send_whatsapp_message(from_number, respuesta)
            
        except Exception as e:
            logging.exception(f"❌ Error generando respuesta: {e}")
            # Enviar mensaje de error
            error_msg = "Lo siento, hubo un error procesando tu mensaje. Por favor, intenta de nuevo."
            await send_whatsapp_message(from_number, error_msg)
    
    elif message_type != "text":
        logging.info(f"ℹ️ Mensaje de tipo {message_type}, ignorando por ahora")
        # Podrías manejar otros tipos (imágenes, audio, etc.) aquí

async def procesar_reservacion_completa(respuesta_bot: str, numero_whatsapp: str) -> str | None:
    """
    Procesa una respuesta del bot que contiene una reservación completa.
    Extrae los datos y guarda tanto la reservación como el cliente.
    
    Args:
        respuesta_bot: Respuesta completa del bot
        numero_whatsapp: Número de WhatsApp del cliente
    """
    try:
        import re
        
        logging.info("🔍 Extrayendo datos de reservación...")
        logging.info(f"📄 Respuesta del bot: {respuesta_bot}")
        
        # Extraer solo la sección de reservación (desde "✅ Reservación:")
        reservacion_pattern = r'✅ Reservación:(.*)'
        reservacion_match = re.search(reservacion_pattern, respuesta_bot, re.DOTALL)
        
        if not reservacion_match:
            logging.error("❌ No se encontró la sección de reservación en la respuesta")
            return
        
        reservacion_text = reservacion_match.group(1).strip()
        # Limpiar el texto: remover líneas vacías y espacios extra
        lines = [line.strip() for line in reservacion_text.split('\n') if line.strip()]
        reservacion_text = '\n'.join(lines)
        logging.info(f"📋 Texto de reservación extraído (limpio): {reservacion_text}")
        
        # Extraer datos usando expresiones regulares del texto limpio (modo multiline)
        nombre_match = re.search(r'(?m)^👤\s*(.+)$', reservacion_text)
        telefono_match = re.search(r'(?m)^📱\s*(.+)$', reservacion_text)
        fecha_nac_match = re.search(r'(?m)^🎂\s*(.+)$', reservacion_text)
        personas_match = re.search(r'(?m)^👥\s*(\d+)', reservacion_text)
        fecha_hora_match = re.search(r'(?m)^📅\s*(.+)$', reservacion_text)
        
        logging.info("🔍 Resultados de extracción:")
        logging.info(f"   Nombre match: {nombre_match.group(1) if nombre_match else 'None'}")
        logging.info(f"   Teléfono match: {telefono_match.group(1) if telefono_match else 'None'}")
        logging.info(f"   Fecha nac match: {fecha_nac_match.group(1) if fecha_nac_match else 'None'}")
        logging.info(f"   Personas match: {personas_match.group(1) if personas_match else 'None'}")
        logging.info(f"   Fecha hora match: {fecha_hora_match.group(1) if fecha_hora_match else 'None'}")
        
        if not all([nombre_match, telefono_match, fecha_nac_match, personas_match, fecha_hora_match]):
            logging.error("❌ No se pudieron extraer todos los datos de la reservación")
            return
        
        # Extraer valores
        nombre = nombre_match.group(1).strip()
        telefono = telefono_match.group(1).strip()
        fecha_nacimiento = fecha_nac_match.group(1).strip()
        personas_str = personas_match.group(1).strip()
        fecha_hora = fecha_hora_match.group(1).strip()
        
        logging.info("✅ Datos extraídos:")
        logging.info(f"   👤 Nombre: '{nombre}'")
        logging.info(f"   📱 Teléfono: '{telefono}'")
        logging.info(f"   🎂 Fecha nacimiento: '{fecha_nacimiento}'")
        logging.info(f"   👥 Personas str: '{personas_str}'")
        logging.info(f"   📅 Fecha y hora: '{fecha_hora}'")
        
        # Convertir personas a entero
        try:
            personas = int(personas_str)
            logging.info(f"   ✅ Personas convertido a int: {personas}")
        except ValueError:
            logging.error(f"❌ Error convirtiendo personas '{personas_str}' a entero")
            return
        
        # 1. Guardar cliente en tabla customers
        logging.info("💾 Guardando cliente...")
        cliente_result = crear_customer(
            nombre=nombre,
            telefono=telefono,
            fecha_nacimiento=fecha_nacimiento
        )
        
        if cliente_result:
            logging.info(f"✅ Cliente guardado: {cliente_result['id']}")
            
            # 2. Incrementar contador de reservaciones del cliente
            incrementar_reservaciones_cliente(cliente_result['id'])
            logging.info("📊 Contador de reservaciones incrementado")
        else:
            logging.warning("⚠️ No se pudo guardar cliente (posiblemente ya existe)")
        
        # 3. Crear reservación
        logging.info("📝 Creando reservación...")
        reservacion_result = crear_reservacion(
            nombre=nombre,
            telefono=telefono,
            fecha_nacimiento=fecha_nacimiento,
            personas=personas,
            fecha_hora=fecha_hora
        )
        
        if reservacion_result:
            logging.info(f"✅ Reservación creada: {reservacion_result['id']}")
            
            # Actualizar nombre del usuario en su conversación
            update_user_name(numero_whatsapp, nombre)
            logging.info(f"👤 Nombre del usuario {numero_whatsapp} actualizado a: {nombre}")
            
            # Enviar confirmación al usuario (comentado por ahora para debug)
            # confirmacion_msg = (
            #     f"🎉 ¡Reservación confirmada!\n\n"
            #     f"📋 ID de reservación: {reservacion_result['id']}\n"
            #     f"👤 {nombre}\n"
            #     f"📱 {telefono}\n"
            #     f"👥 {personas} persona{'s' if personas != 1 else ''}\n"
            #     f"📅 {fecha_hora}\n\n"
            #     f"¡Te esperamos en Casa Laguna! 🍽️"
            # )
            # 
            # await send_whatsapp_message(numero_whatsapp, confirmacion_msg)
            logging.info("📤 Confirmación enviada al cliente (simulado)")
            return reservacion_result['id']
        
        else:
            logging.error("❌ Error creando reservación")
            # error_msg = "Hubo un error guardando tu reservación. Por favor, contacta directamente al restaurante."
            # await send_whatsapp_message(numero_whatsapp, error_msg)
            return None
        
    except Exception as e:
        logging.exception(f"❌ Error procesando reservación completa: {e}")
        # error_msg = "Hubo un error procesando tu reservación. Por favor, intenta de nuevo."
        # await send_whatsapp_message(numero_whatsapp, error_msg)
        return None

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

async def send_whatsapp_message(to: str, text: str):
    """
    Envía mensaje de texto al usuario usando WhatsApp Business API
    """
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        logging.error("❌ No se puede enviar mensaje: WhatsApp no configurado")
        return

    url = f"{WHATSAPP_BASE_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    # Limitar longitud del mensaje (máximo 4096 chars para WhatsApp)
    if len(text) > 4000:
        text = text[:4000] + "..."
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text}
    }

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        logging.info(f"📤 Enviando mensaje WhatsApp a {to}")
        logging.info(f"   Texto: {text[:100]}...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            
            logging.info(f"📥 Respuesta API WhatsApp:")
            logging.info(f"   Status: {r.status_code}")
            
            if r.status_code == 200:
                try:
                    response_json = r.json()
                    message_id = response_json.get('messages', [{}])[0].get('id', 'unknown')
                    logging.info(f"   ✅ Mensaje enviado correctamente (ID: {message_id})")
                except:
                    logging.info(f"   ✅ Mensaje enviado: {r.text}")
            elif r.status_code >= 400:
                logging.error(f"❌ Error enviando mensaje: {r.status_code}")
                logging.error(f"   Detalles: {r.text}")
            else:
                logging.info(f"   Respuesta: {r.text}")
                
    except Exception as e:
        logging.exception(f"❌ Error en send_whatsapp_message: {e}")

# ============================================================
# WEBHOOK ENDPOINTS - Polling para actualizaciones en tiempo real
# ============================================================

@app.get("/webhook/events")
def get_crm_events(since: int = 0):
    """
    Endpoint Webhook para que el frontend haga polling de eventos
    El frontend consulta periódicamente para obtener eventos nuevos
    
    Args:
        since: ID del último evento recibido (para obtener solo eventos nuevos)
    
    Returns:
        Lista de eventos nuevos desde el último ID
    """
    events = event_broadcaster.get_events_since(since)
    return {
        "events": events,
        "last_event_id": event_broadcaster.last_event_id if events else since,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/webhook/status")
def webhook_status():
    """
    Endpoint para verificar que el servidor está activo
    Usado por el frontend para determinar si puede confiar en el polling
    """
    return {
        "status": "active",
        "last_event_id": event_broadcaster.last_event_id,
        "events_count": len(event_broadcaster.events),
        "timestamp": datetime.now().isoformat()
    }

# ============================================================
# ENDPOINT DE PRUEBA DE WEBHOOK
# ============================================================

@app.post("/debug-reservacion")
async def debug_reservacion():
    """
    Endpoint de debug para probar el procesamiento de reservaciones
    """
    from database import obtener_todos_customers
    
    respuesta_bot = """✅ Reservación:
👤 [Ana García]
📱 [+52 55 9876 5432]
🎂 [20/08/1985]
👥 [2]
📅 [30/01/2026 19:30]
[RESERVACION_COMPLETA_FINAL]"""
    
    numero_whatsapp = "525598765432"
    
    logging.info("🐛 DEBUG: Probando procesamiento de reservación...")
    
    try:
        await procesar_reservacion_completa(respuesta_bot, numero_whatsapp)
        logging.info("✅ DEBUG: Procesamiento completado exitosamente")
        
        # Obtener clientes para verificar
        clientes = obtener_todos_customers()
        logging.info(f"📊 Total clientes en BD: {len(clientes)}")
        for cliente in clientes[-3:]:  # Mostrar los últimos 3
            logging.info(f"   👤 {cliente['nombre']} - {cliente['telefono']} - {cliente['total_reservaciones']} reservaciones")
        
        return {
            "status": "success",
            "message": "Procesamiento completado. Revisa los logs para detalles.",
            "total_customers": len(clientes)
        }
        
    except Exception as e:
        logging.exception(f"❌ DEBUG: Error en procesamiento: {e}")
        return {
            "status": "error", 
            "message": str(e)
        }
    """Endpoint para probar manualmente el webhook"""
    test_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": WHATSAPP_PHONE_NUMBER_ID,
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "1234567890",
                        "phone_number_id": WHATSAPP_PHONE_NUMBER_ID
                    },
                    "contacts": [{
                        "profile": {"name": "Test User"},
                        "wa_id": "528331375763"
                    }],
                    "messages": [{
                        "from": "528331375763",
                        "id": "test_msg_id_" + str(int(datetime.now().timestamp())),
                        "timestamp": str(int(datetime.now().timestamp())),
                        "type": "text",
                        "text": {"body": "Hola, esto es una prueba del webhook"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    # Simular la recepción llamando al webhook directamente
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    response = client.post("/webhook", json=test_payload)
    
    return {
        "simulated": True,
        "test_payload": test_payload,
        "response_status": response.status_code,
        "response_body": response.json()
    }