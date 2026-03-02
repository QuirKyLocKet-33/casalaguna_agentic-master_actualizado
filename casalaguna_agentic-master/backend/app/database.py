"""
Módulo de Base de Datos PostgreSQL para Reservaciones
Maneja la conexión, creación de tablas y operaciones CRUD
"""

import os
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    load_dotenv(env_path)
except:
    pass  # Si dotenv no está disponible, usar variables del sistema

# ============================================================
# CONFIGURACIÓN DE LA BASE DE DATOS
# ============================================================

# Construir URL de conexión desde variables de entorno
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "casa_laguna")

# Construir URL de conexión
# Usar TCP/IP con localhost:5432
if DB_PASSWORD:
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Sin credenciales - requiere peer authentication en pg_hba.conf
    DATABASE_URL = f"postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Crear engine
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para declaración de modelos
Base = declarative_base()

# ============================================================
# MODELOS DE SQLALCHEMY
# ============================================================

class AdminUserModel(Base):
    """Modelo de tabla para usuarios administrativos"""
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="admin")
    display_name = Column(String(100), nullable=True)
    avatar_icon = Column(String(50), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el modelo a diccionario"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "display_name": self.display_name,
            "avatar_icon": self.avatar_icon,
            "is_active": bool(self.is_active),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ReservacionModel(Base):
    """Modelo de tabla para reservaciones en PostgreSQL"""
    __tablename__ = "reservaciones"
    
    id = Column(String(50), primary_key=True, unique=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=False)
    fecha_nacimiento = Column(String(10), nullable=False)  # DD/MM/YYYY
    personas = Column(Integer, nullable=False)
    fecha_hora = Column(String(16), nullable=False)  # DD/MM/YYYY HH:MM
    timestamp = Column(DateTime, nullable=False, default=datetime.now)
    status = Column(String(20), nullable=False, default="confirmada")
    timestamp_actualizado = Column(DateTime, nullable=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el modelo a diccionario"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "fecha_nacimiento": self.fecha_nacimiento,
            "personas": self.personas,
            "fecha_hora": self.fecha_hora,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "status": self.status,
            "timestamp_actualizado": self.timestamp_actualizado.isoformat() if self.timestamp_actualizado else None
        }


# ============================================================
# FUNCIONES DE INICIALIZACIÓN
# ============================================================

def inicializar_bd():
    """
    Crea todas las tablas en la base de datos si no existen.
    Debe llamarse al iniciar la aplicación.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logging.info("✅ Base de datos inicializada correctamente")
    except Exception as e:
        logging.error(f"❌ Error inicializando base de datos: {e}")
        raise


def obtener_sesion() -> Session:
    """
    Obtiene una sesión de base de datos.
    Se debe usar con 'with' para garantizar cierre.
    """
    return SessionLocal()


# ============================================================
# FUNCIONES CRUD PARA RESERVACIONES
# ============================================================

def generar_id_reservacion() -> str:
    """Genera un ID único para la reservación"""
    import uuid
    return f"RES{uuid.uuid4().hex[:8].upper()}"


def crear_reservacion(
    nombre: str,
    telefono: str,
    fecha_nacimiento: str,
    personas: int,
    fecha_hora: str
) -> Optional[Dict]:
    """
    Crea una nueva reservación en la base de datos.
    
    Args:
        nombre: Nombre del cliente
        telefono: Número de teléfono
        fecha_nacimiento: Fecha de nacimiento (DD/MM/YYYY)
        personas: Número de personas
        fecha_hora: Fecha y hora de la reservación (DD/MM/YYYY HH:MM)
    
    Returns:
        Dict: Datos de la reservación creada
        None: Si hay error
    """
    try:
        # Validar datos básicos
        if not all([nombre, telefono, fecha_nacimiento, personas, fecha_hora]):
            logging.error("❌ Faltan datos requeridos para la reservación")
            logging.error(f"   nombre: '{nombre}'")
            logging.error(f"   telefono: '{telefono}'")
            logging.error(f"   fecha_nacimiento: '{fecha_nacimiento}'")
            logging.error(f"   personas: {personas}")
            logging.error(f"   fecha_hora: '{fecha_hora}'")
            return None
        
        # Normalizar datos para comparación
        nombre_norm = nombre.strip()
        telefono_norm = telefono.strip()
        fecha_nacimiento_norm = fecha_nacimiento.strip()
        fecha_hora_norm = fecha_hora.strip()
        
        # ✅ VERIFICAR SI YA EXISTE UNA RESERVACIÓN IDÉNTICA EN LOS ÚLTIMOS 60 SEGUNDOS
        # Esto evita duplicados causados por procesos concurrentes o múltiples llamadas
        sesion = obtener_sesion()
        try:
            desde = datetime.now() - timedelta(seconds=60)
            
            duplicado = sesion.query(ReservacionModel).filter(
                ReservacionModel.nombre == nombre_norm,
                ReservacionModel.telefono == telefono_norm,
                ReservacionModel.fecha_nacimiento == fecha_nacimiento_norm,
                ReservacionModel.personas == int(personas),
                ReservacionModel.fecha_hora == fecha_hora_norm,
                ReservacionModel.timestamp >= desde
            ).first()
            
            if duplicado:
                logging.warning(f"⚠️ DUPLICADO DETECTADO: Reservación idéntica ya existe")
                logging.warning(f"   ID existente: {duplicado.id}")
                logging.warning(f"   Nombre: {nombre_norm}, Teléfono: {telefono_norm}")
                logging.warning(f"   Fecha/Hora: {fecha_hora_norm}")
                return duplicado.to_dict()
        finally:
            sesion.close()
        
        # Crear nuevo registro
        reservacion = ReservacionModel(
            id=generar_id_reservacion(),
            nombre=nombre_norm,
            telefono=telefono_norm,
            fecha_nacimiento=fecha_nacimiento_norm,
            personas=int(personas),
            fecha_hora=fecha_hora_norm,
            timestamp=datetime.now(),
            status="confirmada"
        )
        
        # Guardar en base de datos
        sesion = obtener_sesion()
        try:
            sesion.add(reservacion)
            sesion.commit()
            
            logging.info(f"✅ Reservación guardada: {reservacion.id}")
            logging.info(f"   Nombre: {nombre_norm}")
            logging.info(f"   Fecha: {fecha_hora_norm}")
            logging.info(f"   Personas: {personas}")
            
            return reservacion.to_dict()
        except Exception as e:
            logging.error(f"❌ Error al guardar en DB: {e}")
            sesion.rollback()
            return None
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error creando reservación: {e}")
        return None


def obtener_reservacion_por_id(res_id: str) -> Optional[Dict]:
    """
    Obtiene una reservación por su ID.
    
    Args:
        res_id: ID de la reservación
    
    Returns:
        Dict: Datos de la reservación
        None: Si no se encuentra
    """
    try:
        sesion = obtener_sesion()
        try:
            reservacion = sesion.query(ReservacionModel).filter(
                ReservacionModel.id == res_id
            ).first()
            
            return reservacion.to_dict() if reservacion else None
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error buscando reservación: {e}")
        return None


def obtener_reservaciones_por_fecha(fecha: str) -> List[Dict]:
    """
    Obtiene todas las reservaciones de una fecha específica.
    
    Args:
        fecha: Formato DD/MM/YYYY
    
    Returns:
        List: Lista de reservaciones de ese día
    """
    try:
        sesion = obtener_sesion()
        try:
            reservaciones = sesion.query(ReservacionModel).filter(
                ReservacionModel.fecha_hora.startswith(fecha)
            ).all()
            
            return [r.to_dict() for r in reservaciones]
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo reservaciones por fecha: {e}")
        return []


def obtener_todas_las_reservaciones() -> Dict[str, List[Dict]]:
    """
    Obtiene todas las reservaciones, organizadas por fecha.
    Compatible con el formato anterior del JSON.
    
    Returns:
        Dict: Diccionario con fechas como claves y listas de reservaciones como valores
    """
    try:
        sesion = obtener_sesion()
        try:
            reservaciones = sesion.query(ReservacionModel).all()
            
            # Organizar por fecha para mantener compatibilidad con estructura JSON anterior
            resultado = {}
            for res in reservaciones:
                fecha = res.fecha_hora.split()[0]  # Extraer DD/MM/YYYY
                if fecha not in resultado:
                    resultado[fecha] = []
                resultado[fecha].append(res.to_dict())
            
            return resultado
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo todas las reservaciones: {e}")
        return {}


def actualizar_status_reservacion(res_id: str, nuevo_status: str) -> bool:
    """
    Actualiza el estado de una reservación.
    
    Args:
        res_id: ID de la reservación
        nuevo_status: Nuevo estado (ej: "confirmada", "cancelada", "completada")
    
    Returns:
        bool: True si se actualizó exitosamente, False en caso contrario
    """
    try:
        sesion = obtener_sesion()
        try:
            reservacion = sesion.query(ReservacionModel).filter(
                ReservacionModel.id == res_id
            ).first()
            
            if not reservacion:
                logging.warning(f"⚠️ Reservación no encontrada: {res_id}")
                return False
            
            reservacion.status = nuevo_status
            reservacion.timestamp_actualizado = datetime.now()
            sesion.commit()
            
            logging.info(f"✅ Status actualizado para {res_id}: {nuevo_status}")
            return True
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error actualizando status: {e}")
        return False


def eliminar_reservacion(res_id: str) -> bool:
    """
    Elimina una reservación (soft delete - cambia status a 'cancelada').
    
    Args:
        res_id: ID de la reservación
    
    Returns:
        bool: True si se eliminó, False si no se encontró
    """
    return actualizar_status_reservacion(res_id, "cancelada")


def eliminar_duplicados_reservaciones() -> Dict[str, any]:
    """
    Identifica y elimina reservaciones duplicadas en la base de datos.
    Una duplicación se define como dos o más reservaciones con los mismos datos
    (nombre, teléfono, fecha_nacimiento, personas, fecha_hora).
    
    Returns:
        Dict con información sobre los duplicados encontrados y eliminados
    """
    try:
        sesion = obtener_sesion()
        try:
            todas = sesion.query(ReservacionModel).all()
            
            # Agrupar por clave de duplicación
            grupos = {}
            for res in todas:
                clave = (res.nombre, res.telefono, res.fecha_nacimiento, res.personas, res.fecha_hora)
                if clave not in grupos:
                    grupos[clave] = []
                grupos[clave].append(res)
            
            # Encontrar y procesar duplicados
            duplicados_eliminados = 0
            detalles = []
            
            for clave, reservaciones in grupos.items():
                if len(reservaciones) > 1:
                    # Mantener el primero, marcar los demás como cancelados
                    nombre, telefono, fecha_nac, personas, fecha_hora = clave
                    logging.warning(f"⚠️ DUPLICADO ENCONTRADO: {nombre} ({telefono}) - {fecha_hora}")
                    logging.warning(f"   Total: {len(reservaciones)} reservaciones idénticas")
                    
                    # Mantener el más antiguo (primero en la lista ordenada por timestamp)
                    reservaciones_ordenadas = sorted(reservaciones, key=lambda x: x.timestamp)
                    mantener = reservaciones_ordenadas[0]
                    
                    for res in reservaciones_ordenadas[1:]:
                        logging.warning(f"   ❌ Cancelando: {res.id} (creada: {res.timestamp})")
                        res.status = "cancelada_duplicado"
                        res.timestamp_actualizado = datetime.now()
                        duplicados_eliminados += 1
                    
                    detalles.append({
                        "nombre": nombre,
                        "telefono": telefono,
                        "fecha_hora": fecha_hora,
                        "total_encontradas": len(reservaciones),
                        "mantenida": mantener.id,
                        "canceladas": [r.id for r in reservaciones_ordenadas[1:]]
                    })
            
            # Guardar cambios
            sesion.commit()
            
            resultado = {
                "status": "success",
                "total_reservaciones": len(todas),
                "grupos_duplicados": len([g for g in grupos.values() if len(g) > 1]),
                "duplicados_cancelados": duplicados_eliminados,
                "detalles": detalles
            }
            
            logging.info(f"✅ Limpieza de duplicados completada:")
            logging.info(f"   Total reservaciones: {len(todas)}")
            logging.info(f"   Duplicados cancelados: {duplicados_eliminados}")
            
            return resultado
            
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error eliminando duplicados: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


def obtener_estadisticas() -> Dict:
    """
    Obtiene estadísticas generales de las reservaciones.
    
    Returns:
        Dict con información sobre total de reservaciones, fechas, etc.
    """
    try:
        sesion = obtener_sesion()
        try:
            total = sesion.query(ReservacionModel).count()
            todas = sesion.query(ReservacionModel).all()
            
            fechas_unicas = set()
            for res in todas:
                fecha = res.fecha_hora.split()[0]
                fechas_unicas.add(fecha)
            
            return {
                "total_reservaciones": total,
                "fechas_con_reservas": sorted(list(fechas_unicas)),
                "total_dias_con_reservas": len(fechas_unicas),
                "base_datos": DB_NAME,
                "servidor": f"{DB_HOST}:{DB_PORT}"
            }
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo estadísticas: {e}")
        return {
            "error": str(e),
            "total_reservaciones": 0
        }


def limpiar_base_datos():
    """
    Elimina todas las reservaciones de la base de datos.
    ⚠️ USE WITH CAUTION - Esta operación es irreversible
    """
    try:
        sesion = obtener_sesion()
        try:
            sesion.query(ReservacionModel).delete()
            sesion.commit()
            logging.warning("⚠️ Todas las reservaciones han sido eliminadas")
            return True
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error limpiando base de datos: {e}")
        return False

# ============================================================
# MODELO DE CLIENTES (FIDELIZACIÓN)
# ============================================================

class CustomerModel(Base):
    """
    Modelo para almacenar datos de clientes con fidelización.
    """
    __tablename__ = "customers"

    id = Column(String, primary_key=True)
    nombre = Column(String(255), nullable=False, index=True)
    telefono = Column(String(20), nullable=False, unique=True, index=True)
    fecha_nacimiento = Column(String(20), nullable=True)
    timestamp_registro = Column(DateTime, default=datetime.now)
    timestamp_ultimo_acceso = Column(DateTime, default=datetime.now)
    total_reservaciones = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "fecha_nacimiento": self.fecha_nacimiento,
            "timestamp_registro": self.timestamp_registro.isoformat() if self.timestamp_registro else None,
            "timestamp_ultimo_acceso": self.timestamp_ultimo_acceso.isoformat() if self.timestamp_ultimo_acceso else None,
            "total_reservaciones": self.total_reservaciones
        }


# ============================================================
# MODELO DE CONVERSACIONES
# ============================================================

class ConversationModel(Base):
    """Modelo para almacenar conversaciones."""
    __tablename__ = "conversations"

    id = Column(String(100), primary_key=True)
    user_id = Column(String(255), nullable=False, index=True)
    usuario_nombre = Column(String(255), nullable=True)
    channel = Column(String(50), nullable=False, default="widget")
    has_reservation = Column(Boolean, default=False)
    admin_intervened = Column(Boolean, default=False)
    handoff_state = Column(String(30), nullable=False, default="bot_active")
    assigned_admin = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    last_timestamp = Column(DateTime, nullable=False, default=datetime.now)
    date = Column(String(10), nullable=False, index=True)

    conversation_messages = relationship(
        "ConversationMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessageModel.sent_at"
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "usuario_nombre": self.usuario_nombre,
            "channel": self.channel,
            "has_reservation": self.has_reservation,
            "admin_intervened": self.admin_intervened,
            "handoff_state": self.handoff_state,
            "assigned_admin": self.assigned_admin,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_timestamp": self.last_timestamp.isoformat() if self.last_timestamp else None,
            "date": self.date,
            "messages": [m.to_dict() for m in self.conversation_messages] if self.conversation_messages else []
        }


class ConversationMessageModel(Base):
    """Modelo para almacenar mensajes de una conversación."""
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, bot, admin, system
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, nullable=False, default=datetime.now)
    sent_to_widget = Column(Boolean, default=False)

    conversation = relationship("ConversationModel", back_populates="conversation_messages")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.sent_at.isoformat() if self.sent_at else None,
            "sent_to_widget": self.sent_to_widget
        }


# ============================================================
# FUNCIONES CRUD PARA CONVERSACIONES
# ============================================================

def generar_id_conversacion(user_id: str) -> str:
    """Genera un ID único para la conversación."""
    return f"{user_id}_{int(datetime.now().timestamp())}"


def crear_conversacion(user_id: str, channel: str = "widget") -> Optional[Dict]:
    """
    Crea una nueva conversación en la base de datos.
    """
    try:
        sesion = obtener_sesion()
        try:
            now = datetime.now()
            nueva = ConversationModel(
                id=generar_id_conversacion(user_id),
                user_id=user_id,
                channel=channel,
                date=now.strftime("%Y-%m-%d"),
                created_at=now,
                last_timestamp=now,
            )
            sesion.add(nueva)
            sesion.commit()
            sesion.refresh(nueva)
            logging.info(f"✅ Conversación creada en BD: {nueva.id}")
            return nueva.to_dict()
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error creando conversación: {e}")
        return None


def obtener_conversacion_activa(user_id: str, date: str = None) -> Optional[Dict]:
    """
    Obtiene la conversación activa de un usuario en una fecha dada.
    """
    try:
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        sesion = obtener_sesion()
        try:
            conv = sesion.query(ConversationModel).filter(
                ConversationModel.user_id == user_id,
                ConversationModel.date == date,
                ConversationModel.is_active == True
            ).order_by(ConversationModel.last_timestamp.desc()).first()
            if conv:
                return conv.to_dict()
            return None
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error obteniendo conversación activa: {e}")
        return None


def agregar_mensaje_db(conversation_id: str, role: str, content: str, sent_to_widget: bool = False, sent_at: datetime = None) -> Optional[Dict]:
    """
    Agrega un mensaje a una conversación existente en la BD.
    
    Args:
        sent_at: Timestamp explícito. Si es None, usa datetime.now().
    """
    try:
        sesion = obtener_sesion()
        try:
            now = sent_at if sent_at else datetime.now()
            msg = ConversationMessageModel(
                conversation_id=conversation_id,
                role=role,
                content=content,
                sent_at=now,
                sent_to_widget=sent_to_widget,
            )
            sesion.add(msg)
            # Actualizar last_timestamp de la conversación
            conv = sesion.query(ConversationModel).filter(
                ConversationModel.id == conversation_id
            ).first()
            if conv:
                conv.last_timestamp = now
            sesion.commit()
            logging.debug(f"Mensaje agregado a conversación {conversation_id}")
            return msg.to_dict()
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error agregando mensaje: {e}")
        return None


def actualizar_conversacion_db(conversation_id: str, **kwargs) -> Optional[Dict]:
    """
    Actualiza campos de una conversación (is_active, handoff_state, etc.).
    """
    try:
        sesion = obtener_sesion()
        try:
            conv = sesion.query(ConversationModel).filter(
                ConversationModel.id == conversation_id
            ).first()
            if not conv:
                return None
            for key, value in kwargs.items():
                if hasattr(conv, key):
                    setattr(conv, key, value)
            conv.last_timestamp = datetime.now()
            sesion.commit()
            sesion.refresh(conv)
            return conv.to_dict()
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error actualizando conversación: {e}")
        return None


def obtener_conversaciones_por_fecha(date: str = None) -> List[Dict]:
    """
    Obtiene todas las conversaciones de una fecha.
    """
    try:
        sesion = obtener_sesion()
        try:
            query = sesion.query(ConversationModel)
            if date:
                query = query.filter(ConversationModel.date == date)
            query = query.order_by(ConversationModel.last_timestamp.desc())
            convs = query.all()
            return [c.to_dict() for c in convs]
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error obteniendo conversaciones: {e}")
        return []


def obtener_todas_conversaciones_agrupadas() -> Dict[str, List[Dict]]:
    """
    Obtiene todas las conversaciones agrupadas por fecha.
    """
    try:
        sesion = obtener_sesion()
        try:
            convs = sesion.query(ConversationModel).order_by(
                ConversationModel.date.desc(),
                ConversationModel.last_timestamp.desc()
            ).all()
            result: Dict[str, List[Dict]] = {}
            for c in convs:
                d = c.date
                if d not in result:
                    result[d] = []
                result[d].append(c.to_dict())
            return result
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error obteniendo conversaciones agrupadas: {e}")
        return {}


def obtener_mensajes_pendientes_admin(conversation_id: str) -> List[Dict]:
    """
    Obtiene mensajes de admin que aún no se han enviado al widget y los marca como enviados.
    """
    try:
        sesion = obtener_sesion()
        try:
            msgs = sesion.query(ConversationMessageModel).filter(
                ConversationMessageModel.conversation_id == conversation_id,
                ConversationMessageModel.role == "admin",
                ConversationMessageModel.sent_to_widget == False
            ).order_by(ConversationMessageModel.sent_at).all()
            for m in msgs:
                m.sent_to_widget = True
            sesion.commit()
            return [m.to_dict() for m in msgs]
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error obteniendo mensajes pendientes: {e}")
        return []


def contar_mensajes_totales(date: str = None) -> int:
    """
    Cuenta el total de mensajes, opcionalmente filtrado por fecha.
    """
    try:
        sesion = obtener_sesion()
        try:
            query = sesion.query(ConversationMessageModel)
            if date:
                query = query.join(ConversationModel).filter(ConversationModel.date == date)
            return query.count()
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error contando mensajes: {e}")
        return 0


# ============================================================
# FUNCIONES CRUD PARA CLIENTES (FIDELIZACIÓN)
# ============================================================

def generar_id_customer() -> str:
    """Genera un ID único para el cliente"""
    import uuid
    return f"CUST{uuid.uuid4().hex[:8].upper()}"


def crear_customer(nombre: str, telefono: str, fecha_nacimiento: Optional[str] = None) -> Optional[Dict]:
    """
    Crea un nuevo cliente en la base de datos.

    Args:
        nombre: Nombre del cliente
        telefono: Número de teléfono (único)
        fecha_nacimiento: Fecha de nacimiento opcional (DD/MM/YYYY)

    Returns:
        Dict: Datos del cliente creado
        None: Si hay error
    """
    try:
        sesion = obtener_sesion()
        try:
            # Verificar que el teléfono no exista
            existente = sesion.query(CustomerModel).filter(
                CustomerModel.telefono == telefono
            ).first()

            if existente:
                logging.warning(f"⚠️ Cliente con teléfono {telefono} ya existe")
                return existente.to_dict()

            # Crear nuevo cliente
            nuevo_cliente = CustomerModel(
                id=generar_id_customer(),
                nombre=nombre,
                telefono=telefono,
                fecha_nacimiento=fecha_nacimiento,
                timestamp_registro=datetime.now(),
                timestamp_ultimo_acceso=datetime.now(),
                total_reservaciones=0
            )

            sesion.add(nuevo_cliente)
            sesion.commit()
            logging.info(f"✅ Cliente creado: {nombre} ({telefono})")
            return nuevo_cliente.to_dict()

        finally:
            sesion.close()

    except Exception as e:
        logging.error(f"❌ Error creando cliente: {e}")
        return None


def incrementar_reservaciones_cliente(customer_id: str) -> bool:
    """
    Incrementa el contador de reservaciones del cliente.

    Args:
        customer_id: ID del cliente

    Returns:
        bool: True si se actualizó, False si hay error
    """
    try:
        sesion = obtener_sesion()
        try:
            cliente = sesion.query(CustomerModel).filter(
                CustomerModel.id == customer_id
            ).first()

            if not cliente:
                logging.error(f"❌ Cliente no encontrado: {customer_id}")
                return False

            cliente.total_reservaciones += 1
            cliente.timestamp_ultimo_acceso = datetime.now()
            sesion.commit()
            logging.info(f"✅ Reservaciones incrementadas: {cliente.nombre} ({cliente.total_reservaciones})")
            return True

        finally:
            sesion.close()

    except Exception as e:
        logging.error(f"❌ Error incrementando reservaciones: {e}")
        return False


def buscar_customer_por_nombre(nombre: str) -> Optional[Dict]:
    """
    Busca un cliente por nombre (case-insensitive).
    
    Args:
        nombre: Nombre del cliente
    
    Returns:
        Dict: Datos del cliente
        None: Si no existe
    """
    try:
        sesion = obtener_sesion()
        try:
            cliente = sesion.query(CustomerModel).filter(
                CustomerModel.nombre.ilike(f"%{nombre}%")
            ).first()
            
            if cliente:
                logging.info(f"🔍 Cliente encontrado: {cliente.nombre}")
                return cliente.to_dict()
            
            logging.info(f"🔍 Cliente no encontrado: {nombre}")
            return None
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error buscando cliente por nombre: {e}")
        return None


def buscar_customer_por_telefono(telefono: str) -> Optional[Dict]:
    """
    Busca un cliente por teléfono.
    
    Args:
        telefono: Número de teléfono
    
    Returns:
        Dict: Datos del cliente
        None: Si no existe
    """
    try:
        sesion = obtener_sesion()
        try:
            cliente = sesion.query(CustomerModel).filter(
                CustomerModel.telefono == telefono
            ).first()
            
            if cliente:
                logging.info(f"📱 Cliente encontrado: {cliente.nombre}")
                return cliente.to_dict()
            
            logging.info(f"📱 Cliente no encontrado: {telefono}")
            return None
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error buscando cliente por teléfono: {e}")
        return None


def obtener_todos_customers() -> List[Dict]:
    """
    Obtiene todos los clientes registrados.
    
    Returns:
        List[Dict]: Lista de clientes
    """
    try:
        sesion = obtener_sesion()
        try:
            clientes = sesion.query(CustomerModel).all()
            logging.info(f"✅ Se obtuvieron {len(clientes)} clientes")
            return [cliente.to_dict() for cliente in clientes]
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo clientes: {e}")
        return []


# ============================================================
# FUNCIONES CRUD PARA ADMIN USERS
# ============================================================

def crear_admin_user(username: str, password: str, email: Optional[str] = None, role: str = "admin") -> Optional[Dict]:
    """
    Crea un nuevo usuario administrativo.
    
    Args:
        username: Nombre de usuario
        password: Contraseña en texto plano (será hasheada)
        email: Email del usuario (opcional)
        role: Rol del usuario (default: "admin")
    
    Returns:
        Dict: Datos del usuario creado
        None: Si hay error
    """
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(password)
        
        sesion = obtener_sesion()
        try:
            # Verificar si el usuario ya existe
            usuario_existente = sesion.query(AdminUserModel).filter(
                AdminUserModel.username == username
            ).first()
            
            if usuario_existente:
                logging.warning(f"⚠️ Usuario {username} ya existe")
                return None
            
            # Crear nuevo usuario
            nuevo_usuario = AdminUserModel(
                username=username,
                password_hash=password_hash,
                email=email,
                role=role,
                is_active=1
            )
            
            sesion.add(nuevo_usuario)
            sesion.commit()
            
            logging.info(f"✅ Usuario administrativo creado: {username}")
            return nuevo_usuario.to_dict()
        
        finally:
            sesion.close()
    
    except ImportError:
        logging.error("❌ passlib no está instalado. Instala con: pip install passlib[bcrypt]")
        return None
    except Exception as e:
        logging.error(f"❌ Error creando usuario admin: {e}")
        return None


def obtener_admin_user_por_username(username: str) -> Optional[AdminUserModel]:
    """
    Obtiene un usuario admin por nombre de usuario.
    
    Args:
        username: Nombre de usuario
    
    Returns:
        AdminUserModel: Usuario encontrado
        None: Si no existe
    """
    try:
        sesion = obtener_sesion()
        try:
            usuario = sesion.query(AdminUserModel).filter(
                AdminUserModel.username == username
            ).first()
            
            # Detach el objeto para poder usarlo fuera de la sesión
            if usuario:
                sesion.expunge(usuario)
            
            return usuario
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error buscando usuario admin: {e}")
        return None


def verificar_admin_password(username: str, password: str) -> bool:
    """
    Verifica si la contraseña de un usuario admin es correcta.
    
    Args:
        username: Nombre de usuario
        password: Contraseña en texto plano
    
    Returns:
        bool: True si la contraseña es correcta
    """
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        usuario = obtener_admin_user_por_username(username)
        
        if not usuario:
            logging.warning(f"⚠️ Usuario no encontrado: {username}")
            return False
        
        if not usuario.is_active:
            logging.warning(f"⚠️ Usuario inactivo: {username}")
            return False
        
        es_valida = pwd_context.verify(password, usuario.password_hash)
        
        if es_valida:
            logging.info(f"✅ Contraseña correcta para: {username}")
        else:
            logging.warning(f"⚠️ Contraseña incorrecta para: {username}")
        
        return es_valida
    
    except ImportError:
        logging.error("❌ passlib no está instalado")
        return False
    except Exception as e:
        logging.error(f"❌ Error verificando contraseña: {e}")
        return False


def obtener_todos_admin_users() -> List[Dict]:
    """
    Obtiene todos los usuarios administrativos.
    
    Returns:
        List[Dict]: Lista de usuarios admin
    """
    try:
        sesion = obtener_sesion()
        try:
            usuarios = sesion.query(AdminUserModel).all()
            logging.info(f"✅ Se obtuvieron {len(usuarios)} usuarios admin")
            return [usuario.to_dict() for usuario in usuarios]
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo usuarios admin: {e}")
        return []


def actualizar_admin_password(username: str, nueva_password: str) -> bool:
    """
    Actualiza la contraseña de un usuario admin.
    
    Args:
        username: Nombre de usuario
        nueva_password: Nueva contraseña en texto plano
    
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(nueva_password)
        
        sesion = obtener_sesion()
        try:
            usuario = sesion.query(AdminUserModel).filter(
                AdminUserModel.username == username
            ).first()
            
            if not usuario:
                logging.warning(f"⚠️ Usuario no encontrado: {username}")
                return False
            
            usuario.password_hash = password_hash
            usuario.updated_at = datetime.now()
            
            sesion.commit()
            
            logging.info(f"✅ Contraseña actualizada para: {username}")
            return True
        
        finally:
            sesion.close()
    
    except ImportError:
        logging.error("❌ passlib no está instalado")
        return False
    except Exception as e:
        logging.error(f"❌ Error actualizando contraseña: {e}")
        return False


def actualizar_admin_profile(username: str, display_name: Optional[str] = None, avatar_icon: Optional[str] = None) -> Optional[Dict]:
    """
    Actualiza el display_name y/o avatar_icon de un usuario admin.
    
    Args:
        username: Nombre de usuario
        display_name: Nuevo nombre para mostrar
        avatar_icon: Nuevo ícono de avatar
    
    Returns:
        Dict con datos actualizados, o None si falla
    """
    try:
        sesion = obtener_sesion()
        try:
            usuario = sesion.query(AdminUserModel).filter(
                AdminUserModel.username == username
            ).first()
            
            if not usuario:
                logging.warning(f"⚠️ Usuario no encontrado: {username}")
                return None
            
            if display_name is not None:
                usuario.display_name = display_name
            if avatar_icon is not None:
                usuario.avatar_icon = avatar_icon
            usuario.updated_at = datetime.now()
            
            sesion.commit()
            sesion.refresh(usuario)
            
            logging.info(f"✅ Perfil actualizado para: {username}")
            return usuario.to_dict()
        
        finally:
            sesion.close()
    
    except Exception as e:
        logging.error(f"❌ Error actualizando perfil: {e}")
        return None


# ════════════════════════════════════════════════════════════════
# CÁLCULO DE TIEMPO PROMEDIO DE RESPUESTA DESDE HISTORIAL DE BD
# ════════════════════════════════════════════════════════════════

# [MOD] Función agregada — Retorna TODOS los tiempos individuales de respuesta
# desde la BD para combinarlos con los de memoria en crm_api.py
# Modificar: filtro diff_ms (línea "if diff_ms > 0 and diff_ms <= 120000")
def obtener_response_times_bd() -> list:
    """
    Retorna TODOS los tiempos de respuesta individuales (en ms) del historial
    de mensajes en la BD. Analiza pares consecutivos user→bot.
    
    Returns:
        Lista de tiempos en milisegundos.
    """
    try:
        sesion = obtener_sesion()
        try:
            from sqlalchemy import text

            query_str = """
                SELECT conversation_id, role, sent_at
                FROM conversation_messages
                WHERE role IN ('user', 'bot')
                ORDER BY conversation_id, sent_at ASC
            """
            result = sesion.execute(text(query_str)).fetchall()

            if not result or len(result) < 2:
                return []

            response_times = []
            for i in range(len(result) - 1):
                curr = result[i]
                nxt = result[i + 1]

                curr_conv, curr_role, curr_time = curr[0], curr[1], curr[2]
                nxt_conv, nxt_role, nxt_time = nxt[0], nxt[1], nxt[2]

                if curr_conv == nxt_conv and curr_role == 'user' and nxt_role == 'bot':
                    diff_ms = int((nxt_time - curr_time).total_seconds() * 1000)
                    if diff_ms > 0 and diff_ms <= 120000:
                        response_times.append(diff_ms)

            return response_times
        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error obteniendo response times: {e}")
        return []


def calcular_avg_response_time(date: str = None) -> int:
    """
    Calcula el tiempo promedio de respuesta del bot (en ms) desde el historial
    de mensajes en la BD. Analiza pares consecutivos user→bot y calcula la
    diferencia de sent_at entre ellos.

    Args:
        date: Fecha en formato YYYY-MM-DD. Si es None, usa todos los mensajes.

    Returns:
        Promedio en milisegundos (int). 0 si no hay datos.
    """
    try:
        sesion = obtener_sesion()
        try:
            from sqlalchemy import text

            # Consulta: obtener todos los mensajes (role user o bot) ordenados
            # por conversación y fecha de envío
            query_str = """
                SELECT conversation_id, role, sent_at
                FROM conversation_messages
                WHERE role IN ('user', 'bot')
            """
            params = {}
            if date:
                query_str += " AND DATE(sent_at) = :fecha"
                params["fecha"] = date

            query_str += " ORDER BY conversation_id, sent_at ASC"

            result = sesion.execute(text(query_str), params).fetchall()

            if not result or len(result) < 2:
                return 0

            # Recorrer pares consecutivos buscando user→bot en la misma conversación
            response_times = []
            for i in range(len(result) - 1):
                curr = result[i]
                nxt = result[i + 1]

                # curr = (conversation_id, role, sent_at)
                curr_conv, curr_role, curr_time = curr[0], curr[1], curr[2]
                nxt_conv, nxt_role, nxt_time = nxt[0], nxt[1], nxt[2]

                # Solo pares user→bot en la misma conversación
                if curr_conv == nxt_conv and curr_role == 'user' and nxt_role == 'bot':
                    diff_ms = int((nxt_time - curr_time).total_seconds() * 1000)
                    # [MOD] Filtro cambiado: antes era "10 <= diff_ms <= 120000"
                    # Ahora acepta cualquier valor >0 para incluir historial completo
                    # Solo contar si es positivo y menor a 2 minutos
                    if diff_ms > 0 and diff_ms <= 120000:
                        response_times.append(diff_ms)

            if not response_times:
                return 0

            return round(sum(response_times) / len(response_times))

        finally:
            sesion.close()
    except Exception as e:
        logging.error(f"❌ Error calculando avg response time: {e}")
        return 0