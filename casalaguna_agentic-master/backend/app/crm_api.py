"""
CRM API - Endpoints para el panel administrativo del bot
"""

import logging
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database import (
    obtener_todas_las_reservaciones,
    obtener_todos_customers,
    crear_conversacion,
    obtener_conversacion_activa,
    agregar_mensaje_db,
    actualizar_conversacion_db,
    obtener_todas_conversaciones_agrupadas,
    obtener_mensajes_pendientes_admin,
    contar_mensajes_totales,
    actualizar_status_reservacion,
    obtener_reservacion_por_id,
    calcular_avg_response_time,
    obtener_response_times_bd,  # [MOD] Import agregado para obtener tiempos individuales de BD
)
from modules.auth.routes import router as auth_router
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crm", tags=["crm"])

# Incluir router de autenticación
router.include_router(auth_router)

# ============================================================
# SISTEMA DE WEBHOOKS Y EVENTOS EN TIEMPO REAL
# ============================================================

# Almacenar eventos recibidos del widget/chatbot
# Formato: {event_id: {timestamp, tipo, datos, leído}}
webhook_events = {}
event_counter = 0  # Contador para ID único de eventos


def record_crm_event(tipo: str, datos: dict, fuente: str = "backend") -> dict:
    """Registra un evento consumible por el CRM vía polling en /crm/events.

    Mantiene el mismo esquema usado por el frontend (evento.tipo / evento.datos).
    """
    global event_counter, webhook_events

    event_counter += 1
    event_id = f"evt_{event_counter}_{int(datetime.now().timestamp() * 1000)}"
    current_time = datetime.now().isoformat()

    webhook_events[event_id] = {
        "id": event_id,
        "tipo": tipo,
        "datos": datos,
        "timestamp": current_time,
        "fuente": fuente,
        "leido": False,
    }

    # Mantener un tamaño acotado para evitar crecimiento indefinido en memoria
    max_events = 500
    if len(webhook_events) > max_events:
        # Borrar los más antiguos en orden de inserción
        keys = list(webhook_events.keys())
        for k in keys[: len(keys) - max_events]:
            webhook_events.pop(k, None)

    return webhook_events[event_id]

# Almacenar conversaciones agrupadas por fecha y usuario
conversations_by_date = defaultdict(dict)

# ═══════════════════════════════════════════════════
# Historial de tiempos de respuesta del bot (en ms)
# Se registra cada vez que el bot responde a un usuario
# ═══════════════════════════════════════════════════
response_times_ms = []  # Lista de {"timestamp": ISO, "ms": int}
MAX_RESPONSE_TIMES = 500  # Mantener últimos 500 registros

# ============================================================
# MODELOS PARA WEBHOOKS Y EVENTOS
# ============================================================

class WebhookEvent(BaseModel):
    """Evento enviado desde el widget/chatbot al CRM"""
    tipo: str  # mensaje_nuevo, reservacion, contacto, etc
    datos: dict  # Datos específicos del evento
    timestamp: str = None  # Se asigna en el backend
    fuente: str = "widget"  # De dónde viene el evento

class EventResponse(BaseModel):
    """Respuesta de evento"""
    event_id: str
    status: str
    timestamp: str

# Modelo para mensaje de admin
class AdminMessage(BaseModel):
    message: str

# Modelo para actualizar nombre de usuario
class UpdateUserName(BaseModel):
    nombre: str

# ============================================================
# ESTADOS DE CONVERSACIÓN PARA HANDOFF ADMIN ↔ BOT
# ============================================================
# bot_active    → El bot responde normalmente
# human_active  → Un admin tomó el control, el bot NO responde
# closed        → Conversación cerrada
CONV_STATE_BOT = "bot_active"
CONV_STATE_HUMAN = "human_active"
CONV_STATE_CLOSED = "closed"


def get_conversation_state(user_id: str) -> str:
    """Retorna el estado actual de la conversación de un usuario."""
    today = datetime.now().strftime("%Y-%m-%d")
    conv = conversations_by_date.get(today, {}).get(user_id)
    if not conv:
        return CONV_STATE_BOT
    return conv.get("handoff_state", CONV_STATE_BOT)


def update_user_name(user_id: str, nombre: str) -> dict | None:
    """Actualiza el nombre del usuario en su conversación actual. Persiste en BD."""
    today = datetime.now().strftime("%Y-%m-%d")
    conv = conversations_by_date.get(today, {}).get(user_id)
    if not conv:
        return None
    
    conv["usuario_nombre"] = nombre
    conv["last_timestamp"] = datetime.now().isoformat()

    # Persistir en PostgreSQL
    actualizar_conversacion_db(conv["id"], usuario_nombre=nombre)
    
    # Emitir evento para notificar al CRM
    record_crm_event("usuario_nombre_actualizado", {
        "usuario_id": user_id,
        "nombre": nombre,
        "timestamp": datetime.now().isoformat()
    }, fuente="backend")
    
    logger.info(f"Nombre del usuario {user_id} actualizado a: {nombre}")
    return conv


def set_conversation_state(user_id: str, state: str, admin_name: str = None) -> dict | None:
    """Cambia el estado de la conversación y emite eventos al CRM y al widget. Persiste en BD."""
    today = datetime.now().strftime("%Y-%m-%d")
    conv = conversations_by_date.get(today, {}).get(user_id)
    if not conv:
        return None

    conv_id = conv["id"]
    old_state = conv.get("handoff_state", CONV_STATE_BOT)
    conv["handoff_state"] = state
    conv["last_timestamp"] = datetime.now().isoformat()

    if state == CONV_STATE_HUMAN:
        conv["admin_intervened"] = True
        conv["assigned_admin"] = admin_name or "Admin"
    elif state == CONV_STATE_BOT:
        conv["admin_intervened"] = False
        conv["assigned_admin"] = None

    # Persistir cambio de estado en PostgreSQL
    actualizar_conversacion_db(
        conv_id,
        handoff_state=state,
        admin_intervened=conv.get("admin_intervened", False),
        assigned_admin=conv.get("assigned_admin"),
    )

    # Agregar mensaje de sistema visible en el historial
    system_content = {
        CONV_STATE_HUMAN: f"🔔 {conv.get('assigned_admin', 'Admin')} ha tomado el control de la conversación.",
        CONV_STATE_BOT: "🤖 La conversación ha sido devuelta al asistente virtual.",
        CONV_STATE_CLOSED: "🔒 La conversación ha sido cerrada.",
    }.get(state, "")
    if system_content:
        conv["messages"].append({
            "role": "system",
            "content": system_content,
            "timestamp": datetime.now().isoformat(),
            "sent_to_widget": False,
        })
        # Persistir mensaje de sistema en BD
        agregar_mensaje_db(conv_id, "system", system_content)

    # Emitir eventos
    record_crm_event("conversation_update", {"conversation": conv}, fuente="backend")
    record_crm_event("handoff_state_change", {
        "user_id": user_id,
        "old_state": old_state,
        "new_state": state,
        "admin": conv.get("assigned_admin"),
    }, fuente="backend")

    logger.info(f"🔄 Handoff: {user_id} → {old_state} ➜ {state}")
    return conv


# ============================================================
# ENDPOINTS PARA WEBHOOKS (Recibir eventos del widget)
# ============================================================

@router.post("/webhook/events", response_model=EventResponse)
async def receive_webhook_event(event: WebhookEvent):
    """
    Recibe eventos desde el widget/chatbot.
    
    Ejemplo de uso desde el widget:
    ```javascript
    fetch('http://localhost:8000/crm/webhook/events', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        tipo: 'mensaje_nuevo',
        datos: {
          usuario_id: 'user123',
          mensaje: 'Hola',
          timestamp: new Date().toISOString()
        },
        fuente: 'widget'
      })
    })
    ```
    """
    global event_counter, webhook_events
    
    try:

        current_time = datetime.now().isoformat()

        # Procesar evento especial para marcar usuario como inactivo
        if event.tipo == "usuario_inactivo":
            usuario_id = event.datos.get("usuario_id")
            today = datetime.now().strftime("%Y-%m-%d")
            conv = conversations_by_date.get(today, {}).get(usuario_id)
            if conv:
                conv["is_active"] = False
                conv["last_timestamp"] = current_time
                logger.info(f"🔴 Usuario {usuario_id} marcado como inactivo por recarga. Futuros mensajes serán ignorados.")
                send_conversation_update_sync(conv)
                
                # Emitir evento para notificar al CRM que debe actualizar las conversaciones
                try:
                    record_crm_event("conversacion_inactiva", {
                        "usuario_id": usuario_id,
                        "is_active": False,
                        "timestamp": current_time
                    }, fuente=event.fuente or "widget")
                    logger.info(f"✅ Evento 'conversacion_inactiva' emitido para {usuario_id}")
                except Exception as e:
                    logger.warning(f"⚠️ No se pudo emitir evento de inactividad: {e}")
            else:
                logger.warning(f"⚠️ No se encontró conversación para marcar como inactiva: {usuario_id}")

        # Guardar evento
        saved_event = record_crm_event(event.tipo, event.datos, fuente=event.fuente)

        logger.info(f"✅ Webhook recibido: {event.tipo} - {saved_event['id']}")

        return EventResponse(
            event_id=saved_event["id"],
            status="recibido",
            timestamp=current_time
        )
        
    except Exception as e:
        logger.error(f"❌ Error recibiendo webhook: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/events")
def get_events(since: int = 0):
    """
    Obtiene eventos nuevos desde el CRM.
    
    Parámetro 'since' = ID del último evento recibido.
    Si since=0, retorna todos los eventos.
    
    Respuesta:
    ```json
    {
      "eventos": [
        {
          "id": "evt_1_1707...",
          "tipo": "mensaje_nuevo",
          "datos": {...},
          "timestamp": "2026-02-09T10:30:00",
          "fuente": "widget"
        }
      ],
      "total": 1
    }
    ```
    """
    try:
        eventos_list = list(webhook_events.values())
        
        # Filtrar por since si es necesario
        if since > 0:
            eventos_list = [e for e in eventos_list if int(e["id"].split("_")[1]) > since]
        
        return {
            "eventos": eventos_list,
            "total": len(eventos_list),
            "ultimo_event_id": webhook_events[list(webhook_events.keys())[-1]]["id"] if webhook_events else None
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo eventos: {e}")
        return {"eventos": [], "total": 0, "error": str(e)}


@router.delete("/events/{event_id}")
def clear_event(event_id: str):
    """
    Marca un evento como leído/procesado.
    """
    try:
        if event_id in webhook_events:
            webhook_events[event_id]["leido"] = True
            logger.info(f"Evento marcado como leído: {event_id}")
            return {"status": "ok", "event_id": event_id}
        else:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
    except Exception as e:
        logger.error(f"Error marcando evento: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/events")
def clear_all_events():
    """
    Borra todos los eventos (para limpiar).
    """
    global webhook_events
    count = len(webhook_events)
    webhook_events = {}
    logger.info(f"Eventos limpiados: {count} eventos eliminados")
    return {"status": "ok", "eventos_eliminados": count}


@router.get("/metrics")
def get_metrics():
    """
    Retorna métricas generales del bot:
    - Total de mensajes
    - Total de reservaciones
    - Clientes únicos
    - Tasa de conversión
    - Actividad hoy
    - Últimas reservaciones
    """
    try:
        # Obtener datos de la BD
        reservaciones = obtener_todas_las_reservaciones()
        
        # Contar totales
        total_reservations = 0
        unique_clients = set()
        today_reservations = 0
        
        for fecha, reservas_list in reservaciones.items():
            total_reservations += len(reservas_list)
            for res in reservas_list:
                unique_clients.add(res.get('telefono', ''))
                # Contar reservaciones de hoy
                if fecha == datetime.now().strftime("%Y-%m-%d"):
                    today_reservations += 1
        
        # Calcular métricas desde BD
        total_messages = contar_mensajes_totales()
        conversion_rate = (total_reservations / max(total_messages, 1)) * 100 if total_messages > 0 else 0
        
        # Actividad hoy
        today = datetime.now().strftime("%Y-%m-%d")
        today_messages = contar_mensajes_totales(date=today)
        today_activity = [
            {"type": "Mensajes", "count": today_messages},
            {"type": "Reservaciones", "count": today_reservations},
        ]
        
        # Últimas reservaciones
        recent_reservations = []
        for fecha in sorted(reservaciones.keys(), reverse=True):
            for res in reservaciones[fecha][-3:]:  # Últimas 3
                recent_reservations.append(res)
                if len(recent_reservations) >= 5:
                    break
            if len(recent_reservations) >= 5:
                break
        
        # [MOD] Cálculo de tiempo promedio de respuesta REAL
        # Combina TODO el historial de la BD + tiempos de la sesión actual
        # en un solo promedio global representativo
        # Modificar: agregar/quitar fuentes de datos, cambiar fórmula de promedio
        avg_response_time = 0
        all_times = []
        
        # [MOD] 1) Todos los tiempos individuales del historial de BD
        db_times = obtener_response_times_bd()
        if db_times:
            all_times.extend(db_times)
        
        # [MOD] 2) Tiempos en memoria (sesión actual del servidor)
        if response_times_ms:
            all_times.extend([rt["ms"] for rt in response_times_ms])
        
        if all_times:
            avg_response_time = round(sum(all_times) / len(all_times))
        
        return {
            "total_messages": total_messages,
            "total_reservations": total_reservations,
            "unique_clients": len(unique_clients),
            "conversion_rate": round(conversion_rate, 2),
            "avg_response_time": avg_response_time,
            "today_activity": today_activity,
            "recent_reservations": recent_reservations[:5],
            "status": "online"
        }
    
    except Exception as e:
        logger.exception(f"Error obteniendo métricas: {e}")
        return {
            "total_messages": 0,
            "total_reservations": 0,
            "unique_clients": 0,
            "conversion_rate": 0,
            "error": str(e)
        }


@router.get("/conversations")
def get_conversations():
    """
    Retorna el historial de conversaciones agrupadas por fecha, ordenadas por día descendente.
    Combina datos en memoria (sesión activa) con historial persistido en PostgreSQL.
    """
    try:
        # 1. Cargar todas las conversaciones históricas desde PostgreSQL
        db_grouped = obtener_todas_conversaciones_agrupadas()

        # 2. Mezclar con las conversaciones en memoria (las de memoria tienen prioridad)
        result = dict(db_grouped)  # Copiar las de BD
        now = datetime.now()

        for date, mem_convs in conversations_by_date.items():
            # Recolectar IDs ya presentes en BD para esta fecha
            existing_ids = {c["id"] for c in result.get(date, [])}

            if date not in result:
                result[date] = []

            for user_id, conv in mem_convs.items():
                if conv["id"] in existing_ids:
                    # Reemplazar la versión de BD con la de memoria (más actual)
                    result[date] = [c for c in result[date] if c["id"] != conv["id"]]
                result[date].append(conv)

        # 3. Ordenar y calcular is_active
        for date in result:
            result[date].sort(key=lambda x: x.get("last_timestamp", ""), reverse=True)
            for conv in result[date]:
                if conv.get("is_active") is False:
                    continue
                last_ts = conv.get("last_timestamp", "")
                if last_ts:
                    try:
                        last_msg_time = datetime.fromisoformat(last_ts)
                        conv["is_active"] = (now - last_msg_time) < timedelta(minutes=5)
                    except Exception:
                        conv["is_active"] = False
                else:
                    conv["is_active"] = False

        # Ordenar fechas descendente
        result = dict(sorted(result.items(), reverse=True))
        return result
    except Exception as e:
        logger.exception(f"Error obteniendo conversaciones: {e}")
        return {}


@router.get("/clients")
def get_clients():
    """
    Retorna lista de clientes registrados
    """
    try:
        customers = obtener_todos_customers()
        if not customers:
            return []
        
        # Formatear datos
        clients = []
        for customer in customers:
            clients.append({
                "id": customer.get('id'),
                "nombre": customer.get('nombre'),
                "telefono": customer.get('telefono'),
                "fecha_nacimiento": customer.get('fecha_nacimiento'),
                "total_reservaciones": customer.get('total_reservaciones', 0),
                "updated_at": datetime.now().isoformat(),
                "status": "active"
            })
        
        return clients
    
    except Exception as e:
        logger.exception(f"Error obteniendo clientes: {e}")
        return []


@router.post("/conversations/{conversation_id}/admin_message")
def send_admin_message(conversation_id: str, admin_msg: AdminMessage):
    """
    Permite al admin enviar un mensaje en una conversación, interviniendo y desactivando el bot
    Usa Webhooks (event broadcaster) en lugar de WebSocket para actualizaciones
    """
    # conversation_id formato: user_id o extraer user_id del ID
    user_id = conversation_id.split('_')[0] if '_' in conversation_id else conversation_id
    
    logger.info(f"Admin enviando mensaje a {user_id}: {admin_msg.message}")
    register_admin_message(user_id, admin_msg.message)

    # Retornar la conversación actualizada
    today = datetime.now().strftime("%Y-%m-%d")
    updated_conv = conversations_by_date.get(today, {}).get(user_id)

    # Emitir eventos para que el CRM se actualice en tiempo real
    try:
        if updated_conv:
            record_crm_event("conversation_update", {"conversation": updated_conv}, fuente="backend")
        metrics = get_metrics()
        conversations = get_conversations()
        clients = get_clients()
        record_crm_event(
            "crm_update",
            {"metrics": metrics, "conversations": conversations, "clients": clients},
            fuente="backend",
        )
    except Exception as e:
        logger.warning(f"⚠️ No se pudo emitir evento de actualización CRM: {e}")
    
    return {
        "status": "ok", 
        "message": "Mensaje enviado",
        "conversation": updated_conv if updated_conv else {"error": "Conversación no encontrada"}
    }


@router.get("/conversations/{user_id}/pending_messages")
def get_pending_admin_messages(user_id: str):
    """
    Retorna los mensajes de admin pendientes para un usuario
    """
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        conv = conversations_by_date.get(today, {}).get(user_id)
        
        pending = []
        if conv:
            for msg in conv.get("messages", []):
                if msg.get("role") == "admin" and not msg.get("sent_to_widget", False):
                    pending.append({"role": "admin", "content": msg["content"]})
                    msg["sent_to_widget"] = True
            logger.debug(f"Mensajes pendientes para {user_id}: {len(pending)}")
        else:
            logger.warning(f"Conversación no encontrada para {user_id}")
        
        return {"pending_messages": pending}
    except Exception as e:
        logger.exception(f"Error obteniendo mensajes pendientes: {e}")
        return {"pending_messages": []}


# ============================================================
# ENDPOINTS DE HANDOFF: TAKEOVER / RELEASE / CLOSE
# ============================================================

@router.post("/conversations/{conversation_id}/takeover")
def takeover_conversation(conversation_id: str):
    """
    El admin toma el control de la conversación.
    El bot deja de responder; el admin chatea directamente con el usuario.
    """
    user_id = conversation_id.split('_')[0] if '_' in conversation_id else conversation_id
    conv = set_conversation_state(user_id, CONV_STATE_HUMAN, admin_name="Admin")
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    _emit_full_crm_update()
    return {"status": "ok", "state": CONV_STATE_HUMAN, "conversation": conv}


@router.post("/conversations/{conversation_id}/release")
def release_conversation(conversation_id: str):
    """
    El admin devuelve la conversación al bot.
    """
    user_id = conversation_id.split('_')[0] if '_' in conversation_id else conversation_id
    conv = set_conversation_state(user_id, CONV_STATE_BOT)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    _emit_full_crm_update()
    return {"status": "ok", "state": CONV_STATE_BOT, "conversation": conv}


@router.post("/conversations/{conversation_id}/close")
def close_conversation(conversation_id: str):
    """
    El admin cierra la conversación.
    """
    user_id = conversation_id.split('_')[0] if '_' in conversation_id else conversation_id
    conv = set_conversation_state(user_id, CONV_STATE_CLOSED)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv["is_active"] = False
    _emit_full_crm_update()
    return {"status": "ok", "state": CONV_STATE_CLOSED, "conversation": conv}


@router.get("/conversations/{user_id}/status")
def get_conversation_status(user_id: str):
    """
    Endpoint consumido por el widget para saber el estado de la conversación.
    Retorna: handoff_state, assigned_admin, mensajes de sistema pendientes.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    conv = conversations_by_date.get(today, {}).get(user_id)
    if not conv:
        return {"handoff_state": CONV_STATE_BOT, "assigned_admin": None, "system_messages": []}

    # Recopilar mensajes de sistema no enviados al widget
    pending_system = []
    for msg in conv.get("messages", []):
        if msg.get("role") == "system" and not msg.get("sent_to_widget", False):
            pending_system.append({"role": "system", "content": msg["content"]})
            msg["sent_to_widget"] = True

    return {
        "handoff_state": conv.get("handoff_state", CONV_STATE_BOT),
        "assigned_admin": conv.get("assigned_admin"),
        "system_messages": pending_system,
    }


@router.post("/urgent-support")
def request_urgent_support(data: dict):
    """
    Endpoint para notificar al CRM cuando un usuario solicita soporte urgente.
    Se emite un evento urgente que el CRM debe mostrar como prioridad.
    """
    try:
        user_id = data.get("usuario_id")
        motivo = data.get("motivo", "usuario solicita apoyo")
        timestamp = data.get("timestamp", datetime.now().isoformat())
        
        if not user_id:
            return {"status": "error", "message": "usuario_id requerido"}
        
        logger.warning(f"🚨 SOPORTE URGENTE SOLICITADO: {user_id} - {motivo}")
        
        # Obtener nombre del usuario si existe
        today = datetime.now().strftime("%Y-%m-%d")
        usuario_nombre = None
        if user_id in conversations_by_date[today]:
            usuario_nombre = conversations_by_date[today][user_id].get("usuario_nombre")
        
        # Emitir evento urgente para el CRM
        record_crm_event(
            "soporte_urgente",
            {
                "usuario_id": user_id,
                "usuario_nombre": usuario_nombre,
                "motivo": motivo,
                "timestamp": timestamp,
                "prioridad": "alta"
            },
            fuente="widget"
        )
        
        # Si existe una conversación registrada, marcarla como que necesita atención urgente
        today = datetime.now().strftime("%Y-%m-%d")
        if user_id in conversations_by_date[today]:
            conv = conversations_by_date[today][user_id]
            conv["urgent_support_requested"] = True
            conv["urgent_timestamp"] = timestamp
            
            # Emitir actualización para que el CRM lo vea
            _emit_full_crm_update()
        
        return {"status": "ok", "message": "Notificación de soporte urgente registrada"}
    
    except Exception as e:
        logger.exception(f"Error procesando soporte urgente: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/conversations/{user_id}/update-name")
def update_conversation_user_name(user_id: str, data: UpdateUserName):
    """
    Endpoint para actualizar el nombre del usuario en su conversación.
    Se usa cuando el usuario proporciona su nombre durante la reservación.
    """
    try:
        result = update_user_name(user_id, data.nombre)
        if result:
            # Emitir actualización completa del CRM
            _emit_full_crm_update()
            return {"status": "ok", "message": f"Nombre actualizado a: {data.nombre}"}
        else:
            return {"status": "error", "message": "Conversación no encontrada"}
    except Exception as e:
        logger.exception(f"Error actualizando nombre del usuario: {e}")
        return {"status": "error", "message": str(e)}


def _emit_full_crm_update():
    """Emite un crm_update completo para que el dashboard se refresque."""
    try:
        metrics = get_metrics()
        conversations = get_conversations()
        clients = get_clients()
        record_crm_event("crm_update", {
            "metrics": metrics,
            "conversations": conversations,
            "clients": clients,
        }, fuente="backend")
    except Exception as e:
        logger.warning(f"⚠️ Error emitiendo crm_update completo: {e}")


# ============================================================
# AUTO-CLOSE: Cerrar conversaciones inactivas tras 4 minutos
# ============================================================

INACTIVITY_TIMEOUT_MINUTES = 4


async def auto_close_inactive_conversations():
    """
    Background task que revisa cada 30 segundos si hay conversaciones
    activas sin actividad por más de INACTIVITY_TIMEOUT_MINUTES minutos.
    Si las encuentra, las cierra automáticamente.
    """
    import asyncio
    logger.info(f"⏱️ Auto-close task iniciado (timeout: {INACTIVITY_TIMEOUT_MINUTES} min)")

    while True:
        try:
            await asyncio.sleep(30)  # Revisar cada 30 segundos
            now = datetime.now()
            today = now.strftime("%Y-%m-%d")
            closed_count = 0

            # Iterar sobre todas las fechas (no solo hoy)
            for date_key in list(conversations_by_date.keys()):
                convs = conversations_by_date.get(date_key, {})
                for user_id, conv in list(convs.items()):
                    # Solo cerrar si la conversación NO está ya cerrada
                    current_state = conv.get("handoff_state", CONV_STATE_BOT)
                    if current_state == CONV_STATE_CLOSED:
                        continue
                    # Solo cerrar si está marcada como activa
                    if conv.get("is_active") is False:
                        continue

                    last_ts = conv.get("last_timestamp", "")
                    if not last_ts:
                        continue

                    try:
                        last_msg_time = datetime.fromisoformat(last_ts)
                    except Exception:
                        continue

                    elapsed = now - last_msg_time
                    if elapsed >= timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES):
                        # Cerrar la conversación automáticamente
                        logger.info(
                            f"⏱️ Auto-cerrando conversación de {user_id} "
                            f"(inactiva por {elapsed.total_seconds():.0f}s)"
                        )

                        conv["handoff_state"] = CONV_STATE_CLOSED
                        conv["is_active"] = False
                        conv["last_timestamp"] = now.isoformat()

                        # Agregar mensaje de sistema
                        system_msg = "⏱️ Conversación finalizada automáticamente por inactividad."
                        conv["messages"].append({
                            "role": "system",
                            "content": system_msg,
                            "timestamp": now.isoformat(),
                            "sent_to_widget": False,
                        })

                        # Persistir en PostgreSQL
                        conv_id = conv.get("id")
                        if conv_id:
                            try:
                                actualizar_conversacion_db(
                                    conv_id,
                                    handoff_state=CONV_STATE_CLOSED,
                                    admin_intervened=conv.get("admin_intervened", False),
                                    assigned_admin=conv.get("assigned_admin"),
                                )
                                agregar_mensaje_db(conv_id, "system", system_msg)
                            except Exception as db_err:
                                logger.warning(f"⚠️ Error persistiendo auto-close en BD: {db_err}")

                        # Emitir eventos para el CRM
                        record_crm_event("conversation_auto_closed", {
                            "usuario_id": user_id,
                            "timestamp": now.isoformat(),
                            "reason": "inactivity_timeout",
                        }, fuente="backend")
                        record_crm_event("conversation_update", {
                            "conversation": conv,
                        }, fuente="backend")
                        record_crm_event("handoff_state_change", {
                            "user_id": user_id,
                            "old_state": current_state,
                            "new_state": CONV_STATE_CLOSED,
                            "admin": None,
                        }, fuente="backend")

                        closed_count += 1

            if closed_count > 0:
                _emit_full_crm_update()
                logger.info(f"⏱️ Auto-close: {closed_count} conversación(es) cerrada(s)")

        except Exception as e:
            logger.error(f"❌ Error en auto_close_inactive_conversations: {e}")


async def send_conversation_update(conversation: dict):
    """
    Registra una actualización de conversación en el event broadcaster
    El frontend hará polling para obtener estas actualizaciones
    """
    try:
        record_crm_event("conversation_update", {"conversation": conversation}, fuente="backend")
        logger.debug(f"Actualización de conversación registrada para {conversation.get('user_id')}")
    except Exception as e:
        logger.error(f"Error registrando actualización de conversación: {e}")


def send_conversation_update_sync(conversation: dict):
    """
    Versión sync de send_conversation_update para usar en funciones sync
    """
    try:
        record_crm_event("conversation_update", {"conversation": conversation}, fuente="backend")
        logger.debug(f"Actualización de conversación registrada para {conversation.get('user_id')}")
    except Exception as e:
        logger.error(f"Error registrando actualización de conversación: {e}")

def register_conversation(channel: str, user_id: str, message: str, response: str, has_reservation: bool = False, response_time_ms: int = None):
    """
    Registra una conversación en el historial del CRM, agrupando por fecha y usuario.
    Persiste en PostgreSQL y mantiene copia en memoria para velocidad.
    
    Args:
        response_time_ms: Tiempo real en milisegundos que tardó el bot en responder.
    """
    try:
        timestamp = datetime.now().isoformat()
        date = datetime.now().strftime("%Y-%m-%d")

        # ═══ Registrar tiempo de respuesta real ═══
        if response_time_ms is not None and response_time_ms > 0:
            response_times_ms.append({"timestamp": timestamp, "ms": response_time_ms})
            # Mantener tamaño acotado
            if len(response_times_ms) > MAX_RESPONSE_TIMES:
                del response_times_ms[:len(response_times_ms) - MAX_RESPONSE_TIMES]
            logger.debug(f"⏱️ Tiempo de respuesta registrado: {response_time_ms}ms para {user_id}")
        
        if user_id not in conversations_by_date[date]:
            # Crear nueva conversación en memoria
            conversations_by_date[date][user_id] = {
                "id": f"{user_id}_{int(datetime.now().timestamp())}",
                "user_id": user_id,
                "usuario_nombre": None,
                "channel": channel,
                "messages": [],
                "has_reservation": has_reservation,
                "admin_intervened": False,
                "handoff_state": CONV_STATE_BOT,
                "assigned_admin": None,
                "created_at": timestamp,
                "last_timestamp": timestamp,
                "is_active": True,
                "date": date
            }
            # Persistir en PostgreSQL
            crear_conversacion(user_id, channel)
        else:
            # Si la conversación fue marcada como inactiva (por recarga), ignorar este mensaje
            if conversations_by_date[date][user_id].get("is_active") is False:
                logger.debug(f"Ignorando mensaje de {user_id} porque la conversación está marcada como inactiva")
                return
        
        conv_id = conversations_by_date[date][user_id]["id"]

        # Calcular timestamps reales: usuario en timestamp, bot después de response_time_ms
        user_dt = datetime.fromisoformat(timestamp)
        # El bot responde después del tiempo real de procesamiento
        if response_time_ms and response_time_ms > 0:
            bot_dt = user_dt + timedelta(milliseconds=response_time_ms)
        else:
            # Fallback: asumir 1 segundo si no hay dato
            bot_dt = user_dt + timedelta(seconds=1)
        bot_timestamp = bot_dt.isoformat()

        # Agregar mensaje a la conversación existente (memoria)
        conversations_by_date[date][user_id]["messages"].append({
            "role": "user",
            "content": message,
            "timestamp": timestamp
        })
        conversations_by_date[date][user_id]["messages"].append({
            "role": "bot", 
            "content": response,
            "timestamp": bot_timestamp
        })
        
        # Persistir mensajes en PostgreSQL con timestamps correctos
        agregar_mensaje_db(conv_id, "user", message, sent_at=user_dt)
        agregar_mensaje_db(conv_id, "bot", response, sent_at=bot_dt)

        # Actualizar flags y timestamp
        if has_reservation:
            conversations_by_date[date][user_id]["has_reservation"] = True
            actualizar_conversacion_db(conv_id, has_reservation=True)
        conversations_by_date[date][user_id]["last_timestamp"] = timestamp
        
        # Limitar mensajes por conversación (últimos 50) en memoria
        if len(conversations_by_date[date][user_id]["messages"]) > 50:
            conversations_by_date[date][user_id]["messages"] = conversations_by_date[date][user_id]["messages"][-50:]
        
        logger.debug(f"Mensaje registrado en conversación (memoria + BD): {date} - {user_id}")
        
        # Registrar actualización de esta conversación vía event broadcaster
        send_conversation_update_sync(conversations_by_date[date][user_id])
    
    except Exception as e:
        logger.exception(f"Error registrando conversación: {e}")


def is_admin_intervened(user_id: str) -> bool:
    """
    Verifica si el admin ha intervenido (tomó el control) de la conversación.
    Retorna True si el estado es 'human_active'.
    """
    return get_conversation_state(user_id) == CONV_STATE_HUMAN


def register_admin_message(user_id: str, message: str):
    """
    Registra un mensaje de admin en una conversación y marca como intervenida.
    Persiste en PostgreSQL.
    """
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        timestamp = datetime.now().isoformat()
        
        conv = conversations_by_date.get(today, {}).get(user_id)
        if not conv:
            logger.warning(f"Conversación no encontrada para user_id: {user_id}")
            return
        
        conv_id = conv["id"]

        # Marcar conversación como intervenida por admin
        conv["admin_intervened"] = True
        
        # Agregar mensaje de admin (memoria)
        conv["messages"].append({
            "role": "admin",
            "content": message,
            "timestamp": timestamp,
            "sent_to_widget": False
        })
        
        conv["last_timestamp"] = timestamp

        # Persistir en PostgreSQL
        agregar_mensaje_db(conv_id, "admin", message, sent_to_widget=False)
        actualizar_conversacion_db(conv_id, admin_intervened=True)

        logger.info(f"Mensaje de admin registrado para {user_id} (memoria + BD)")
        
        # Emitir evento de actualización de conversación (NO como mensaje_nuevo
        # para evitar que se duplique como mensaje de bot en get_chats)
        send_conversation_update_sync(conv)
        
    except Exception as e:
        logger.exception(f"Error registrando mensaje de admin: {e}")

# ============================================================
# ENDPOINTS PARA CHATS
# ============================================================

@router.get("/chats")
def get_chats():
    """
    Obtiene todos los chats (activos + historial de BD).
    Combina webhooks en memoria con conversaciones persistidas en PostgreSQL.
    """
    try:
        chats_dict = {}

        # ============================================================
        # 1. CARGAR HISTORIAL DESDE POSTGRESQL
        # ============================================================
        db_conversations = obtener_todas_conversaciones_agrupadas()
        for date, convs in db_conversations.items():
            for conv in convs:
                user_id = conv.get("user_id", "Unknown")
                if user_id not in chats_dict:
                    role_map = {"user": "usuario", "bot": "bot", "admin": "admin", "system": "system"}
                    messages = []
                    for msg in conv.get("messages", []):
                        messages.append({
                            "type": role_map.get(msg.get("role"), msg.get("role", "bot")),
                            "texto": msg.get("content", ""),
                            "timestamp": msg.get("timestamp", "")
                        })
                    chats_dict[user_id] = {
                        "usuario_id": user_id,
                        "canal": conv.get("channel", "widget"),
                        "estado": "activo" if conv.get("is_active") else "inactivo",
                        "messages": messages,
                        "timestamp_actualizado": conv.get("last_timestamp", ""),
                        "handoff_state": conv.get("handoff_state", CONV_STATE_BOT),
                        "assigned_admin": conv.get("assigned_admin"),
                        "admin_intervened": conv.get("admin_intervened", False),
                        "tiene_reservacion": conv.get("has_reservation", False),
                        "usuario_nombre": conv.get("usuario_nombre"),
                    }

        # ============================================================
        # 2. AGREGAR / ACTUALIZAR CON WEBHOOKS EN MEMORIA (sesión activa)
        # Solo para usuarios que NO están ya en la BD (evita duplicados)
        # ============================================================
        sorted_events = sorted(
            webhook_events.items(),
            key=lambda x: x[1].get("timestamp", "")
        )
        
        # Recordar qué user_ids ya vinieron de la BD para no duplicar sus mensajes
        users_from_db = set(chats_dict.keys())
        
        for event_id, evento in sorted_events:
            if evento["tipo"] == "mensaje_nuevo":
                user_id = evento["datos"].get("usuario_id", "Unknown")
                
                # Si el usuario ya tiene mensajes cargados de la BD,
                # NO agregar mensajes de webhook (ya están persistidos).
                # Solo actualizar timestamp y flags.
                if user_id in users_from_db:
                    chats_dict[user_id]["timestamp_actualizado"] = evento["timestamp"]
                    if evento["datos"].get("tiene_reservacion"):
                        chats_dict[user_id]["tiene_reservacion"] = True
                    continue
                
                if user_id not in chats_dict:
                    chats_dict[user_id] = {
                        "usuario_id": user_id,
                        "canal": evento["datos"].get("canal", "widget"),
                        "estado": "activo",
                        "messages": [],
                        "timestamp_actualizado": evento["timestamp"],
                        "handoff_state": CONV_STATE_BOT
                    }
                
                mensaje_user = evento["datos"].get("mensaje", "")
                if mensaje_user:
                    chats_dict[user_id]["messages"].append({
                        "type": "usuario",
                        "texto": mensaje_user,
                        "timestamp": evento["timestamp"]
                    })
                
                respuesta = evento["datos"].get("respuesta", "")
                if respuesta:
                    chats_dict[user_id]["messages"].append({
                        "type": "bot",
                        "texto": respuesta,
                        "timestamp": evento["timestamp"]
                    })
                
                chats_dict[user_id]["timestamp_actualizado"] = evento["timestamp"]
                chats_dict[user_id]["tiene_reservacion"] = evento["datos"].get("tiene_reservacion", False)
        
        # ============================================================
        # 3. ENRIQUECER CON conversations_by_date (handoff, nombre, etc.)
        # ============================================================
        today = datetime.now().strftime("%Y-%m-%d")
        for user_id in chats_dict:
            conv = conversations_by_date.get(today, {}).get(user_id)
            if conv:
                chats_dict[user_id]["handoff_state"] = conv.get("handoff_state", CONV_STATE_BOT)
                chats_dict[user_id]["assigned_admin"] = conv.get("assigned_admin")
                chats_dict[user_id]["admin_intervened"] = conv.get("admin_intervened", False)
                if conv.get("usuario_nombre"):
                    chats_dict[user_id]["usuario_nombre"] = conv["usuario_nombre"]
        
        # Convertir a lista ordenada por timestamp (más recientes primero)
        chats = sorted(
            chats_dict.values(),
            key=lambda x: x.get("timestamp_actualizado", ""),
            reverse=True
        )
        
        logger.info(f"📋 Chats retornados (BD + memoria): {len(chats)}")
        return {"chats": chats, "total": len(chats)}
    except Exception as e:
        logger.error(f"Error obteniendo chats: {e}")
        return {"chats": [], "total": 0, "error": str(e)}


# ============================================================
# ENDPOINTS PARA RESERVATIONS
# ============================================================

class UpdateReservationStatus(BaseModel):
    status: str


@router.get("/reservations")
def get_reservations():
    """
    Obtiene todas las reservaciones desde PostgreSQL.
    """
    try:
        reservaciones = obtener_todas_las_reservaciones()
        reservas_list = []

        for fecha, reservas in reservaciones.items():
            for reserva in reservas:
                reservas_list.append({
                    "id": reserva.get("id", ""),
                    "nombre": reserva.get("nombre", ""),
                    "telefono": reserva.get("telefono", ""),
                    "fecha_nacimiento": reserva.get("fecha_nacimiento", ""),
                    "personas": reserva.get("personas", 0),
                    "fecha_hora": reserva.get("fecha_hora", ""),
                    "timestamp": reserva.get("timestamp", ""),
                    "status": reserva.get("status", "confirmada"),
                    "timestamp_actualizado": reserva.get("timestamp_actualizado", ""),
                })

        # Ordenar por timestamp descendente (más recientes primero)
        reservas_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return {"reservations": reservas_list, "total": len(reservas_list)}
    except Exception as e:
        logger.error(f"Error obteniendo reservaciones: {e}")
        return {"reservations": [], "total": 0, "error": str(e)}


@router.put("/reservations/{reservation_id}/status")
def update_reservation_status(reservation_id: str, body: UpdateReservationStatus):
    """
    Actualiza el estado de una reservación (confirmada, cancelada, completada).
    """
    try:
        success = actualizar_status_reservacion(reservation_id, body.status)
        if not success:
            raise HTTPException(status_code=404, detail="Reservación no encontrada")

        reserva = obtener_reservacion_por_id(reservation_id)
        return {"status": "ok", "reservation": reserva}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando reservación: {e}")
        raise HTTPException(status_code=500, detail=str(e))