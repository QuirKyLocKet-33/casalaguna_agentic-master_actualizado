"""
Utilidades para manejo de reservaciones
Módulo para facilitar operaciones con la base de datos PostgreSQL de reservaciones
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Importar funciones de la base de datos
from database import (
    crear_reservacion as db_crear_reservacion,
    obtener_reservacion_por_id as db_obtener_reservacion_por_id,
    obtener_reservaciones_por_fecha as db_obtener_reservaciones_por_fecha,
    obtener_todas_las_reservaciones as db_obtener_todas_las_reservaciones,
    actualizar_status_reservacion as db_actualizar_status_reservacion,
    eliminar_reservacion as db_eliminar_reservacion,
    obtener_estadisticas as db_obtener_estadisticas,
    inicializar_bd
)

# ============================================================
# INICIALIZACIÓN
# ============================================================

# Inicializar la base de datos al importar este módulo
try:
    inicializar_bd()
except Exception as e:
    logging.warning(f"⚠️ Error inicializando BD en reservation_utils: {e}")

# ============================================================
# FUNCIONES DE UTILIDAD - WRAPPER DE LA BD
# ============================================================

def generar_id_reservacion() -> str:
    """Genera un ID único para la reservación (delegado a database.py)"""
    from database import generar_id_reservacion as db_generar_id
    return db_generar_id()


def obtener_reservaciones(fecha: Optional[str] = None) -> Dict | List:
    """
    Obtiene las reservaciones de la base de datos.
    
    Args:
        fecha: Si se proporciona, retorna solo las reservaciones de ese día.
               Formato esperado: DD/MM/YYYY
    
    Returns:
        Dict: Si fecha es None, retorna diccionario organizado por fecha
        List: Si fecha es especificada, retorna lista de reservaciones de ese día
    """
    try:
        if fecha:
            # Obtener solo las de una fecha específica
            return db_obtener_reservaciones_por_fecha(fecha)
        else:
            # Obtener todas organizadas por fecha
            return db_obtener_todas_las_reservaciones()
    
    except Exception as e:
        logging.error(f"❌ Error obteniendo reservaciones: {e}")
        return {} if not fecha else []


def guardar_nueva_reservacion(
    nombre: str,
    telefono: str,
    fecha_nacimiento: str,
    personas: int,
    fecha_hora: str
) -> Optional[Dict]:
    """
    Guarda una nueva reservación en la base de datos PostgreSQL.
    
    Args:
        nombre: Nombre del cliente
        telefono: Número de teléfono
        fecha_nacimiento: Fecha de nacimiento (DD/MM/YYYY)
        personas: Número de personas
        fecha_hora: Fecha y hora de la reservación (DD/MM/YYYY HH:MM)
    
    Returns:
        Dict: Los datos de la reservación guardada con ID generado
        None: Si hay error
    """
    try:
        # Validar datos básicos
        if not all([nombre, telefono, fecha_nacimiento, personas, fecha_hora]):
            logging.error("❌ Faltan datos requeridos para la reservación")
            return None
        
        # Usar función de la BD
        resultado = db_crear_reservacion(
            nombre=nombre,
            telefono=telefono,
            fecha_nacimiento=fecha_nacimiento,
            personas=personas,
            fecha_hora=fecha_hora
        )
        
        return resultado
    
    except Exception as e:
        logging.error(f"❌ Error guardando reservación: {e}")
        return None


def obtener_reservaciones_por_fecha(fecha: str) -> List[Dict]:
    """
    Obtiene todas las reservaciones de una fecha específica.
    
    Args:
        fecha: Formato DD/MM/YYYY
    
    Returns:
        List: Lista de reservaciones de ese día
    """
    return db_obtener_reservaciones_por_fecha(fecha)


def obtener_estadisticas() -> Dict:
    """
    Obtiene estadísticas generales de las reservaciones.
    
    Returns:
        Dict con información sobre total de reservaciones, fechas, etc.
    """
    try:
        return db_obtener_estadisticas()
    except Exception as e:
        logging.error(f"❌ Error obteniendo estadísticas: {e}")
        return {
            "error": str(e),
            "total_reservaciones": 0
        }


def validar_fecha_hora(fecha_hora: str) -> bool:
    """
    Valida que la fecha y hora tengan el formato correcto.
    
    Args:
        fecha_hora: Formato esperado: DD/MM/YYYY HH:MM
    
    Returns:
        bool: True si es válido, False en caso contrario
    """
    try:
        parts = fecha_hora.split()
        if len(parts) != 2:
            return False
        
        fecha, hora = parts
        
        # Validar formato de fecha
        datetime.strptime(fecha, "%d/%m/%Y")
        
        # Validar formato de hora
        datetime.strptime(hora, "%H:%M")
        
        return True
    
    except ValueError:
        return False


def buscar_reservacion_por_id(res_id: str) -> Optional[Dict]:
    """
    Busca una reservación por su ID en la base de datos.
    
    Args:
        res_id: ID de la reservación (formato: RES########)
    
    Returns:
        Dict: La reservación encontrada
        None: Si no se encuentra
    """
    try:
        return db_obtener_reservacion_por_id(res_id)
    
    except Exception as e:
        logging.error(f"❌ Error buscando reservación: {e}")
        return None


def actualizar_status_reservacion(res_id: str, nuevo_status: str) -> bool:
    """
    Actualiza el estado de una reservación en la base de datos.
    
    Args:
        res_id: ID de la reservación
        nuevo_status: Nuevo estado (ej: "confirmada", "cancelada", "completada")
    
    Returns:
        bool: True si se actualizó exitosamente, False en caso contrario
    """
    try:
        return db_actualizar_status_reservacion(res_id, nuevo_status)
    
    except Exception as e:
        logging.error(f"❌ Error actualizando status: {e}")
        return False


def eliminar_reservacion(res_id: str) -> bool:
    """
    Elimina una reservación (soft delete - cambia status a 'cancelada').
    
    Args:
        res_id: ID de la reservación
    
    Returns:
        bool: True si se eliminó (o canceló), False si no se encontró
    """
    return db_eliminar_reservacion(res_id)


def buscar_reservacion_por_id(res_id: str) -> Optional[Dict]:
    """
    Busca una reservación por su ID en todo el archivo.
    
    Args:
        res_id: ID de la reservación (formato: RES########)
    
    Returns:
        Dict: La reservación encontrada
        None: Si no se encuentra
    """
    try:
        datos = obtener_reservaciones()
        
        for fecha, reservaciones in datos.items():
            for reservacion in reservaciones:
                if reservacion.get("id") == res_id:
                    return reservacion
        
        return None
    
    except Exception as e:
        logging.error(f"❌ Error buscando reservación: {e}")
        return None


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
        datos = obtener_reservaciones()
        
        for fecha, reservaciones in datos.items():
            for i, reservacion in enumerate(reservaciones):
                if reservacion.get("id") == res_id:
                    reservaciones[i]["status"] = nuevo_status
                    reservaciones[i]["timestamp_actualizado"] = datetime.now().isoformat()
                    
                    # Guardar
                    with open(RESERVATIONS_FILE, "w", encoding="utf-8") as f:
                        json.dump(datos, f, indent=2, ensure_ascii=False)
                    
                    logging.info(f"✅ Status actualizado para {res_id}: {nuevo_status}")
                    return True
        
        logging.warning(f"⚠️ Reservación no encontrada: {res_id}")
        return False
    
    except Exception as e:
        logging.error(f"❌ Error actualizando status: {e}")
        return False


def eliminar_reservacion(res_id: str) -> bool:
    """
    Elimina una reservación (soft delete - cambia status a 'cancelada').
    
    Args:
        res_id: ID de la reservación
    
    Returns:
        bool: True si se eliminó (o canceló), False si no se encontró
    """
    return actualizar_status_reservacion(res_id, "cancelada")
