import os
import sys
import logging
import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from openai import OpenAI, OpenAIError
from rag_retriever import RAGRetriever

# ============================================================
# CONFIGURACIÓN GENERAL
# ============================================================

BOT_NAME = "Abigail"
MODEL_NAME = "gpt-4o-mini"
EXIT_COMMANDS = {"salir", "exit", "quit"}

WELCOME_MESSAGE = (
    "Hola, soy Abigail 👩‍🍳\n"
    "Tu asistente virtual de Casa Laguna.\n\n"
    "Estoy aquí para ayudarte con reservaciones 📅, menú 🍽️, ubicación 📍, "
    "horarios 🕒, eventos 🎉 y cualquier otra duda que tengas.\n\n"
    "¿En qué puedo ayudarte hoy? 😊"
)


def build_system_prompt(plantas_zonas: list[dict] = None) -> str:
    """
    Construye el system prompt con la estructura jerárquica de plantas y zonas.
    
    Args:
        plantas_zonas: Lista de dicts con estructura:
            [{"planta": "Planta baja", "zonas": [{"nombre": "Interior", ...}]}, ...]
    """
    # Construir descripción detallada de zonas por planta
    if plantas_zonas and len(plantas_zonas) > 0:
        lineas_zonas = []
        nombres_zonas_validos = []
        for planta in plantas_zonas:
            nombres_areas = [z["nombre"] for z in planta["zonas"]]
            nombres_zonas_validos.extend(nombres_areas)
            areas_str = ", ".join(nombres_areas)
            # Construir detalle de capacidad por zona
            detalles = []
            for z in planta["zonas"]:
                cap = f"{z['cap_min']}-{z['cap_max']}" if z['cap_min'] != z['cap_max'] else str(z['cap_min'])
                detalles.append(f"{z['nombre']} ({z['total_mesas']} mesas, {cap} personas)")
            detalles_str = ", ".join(detalles)
            lineas_zonas.append(
                f"  - {planta['planta']}: cuenta con {areas_str}. [{detalles_str}]"
            )
        zonas_bloque = "Distribución del restaurante:\n" + "\n".join(lineas_zonas)
        zonas_validas_str = ", ".join(nombres_zonas_validos)
        
        # Bloque de presentación para el usuario
        presentacion_zonas = []
        for planta in plantas_zonas:
            areas = [z["nombre"] for z in planta["zonas"]]
            presentacion_zonas.append(f"🏛️ {planta['planta']}: {', '.join(areas)}")
        presentacion_str = "\n   ".join(presentacion_zonas)
    else:
        zonas_bloque = "No hay zonas configuradas aún."
        zonas_validas_str = ""
        presentacion_str = "Sin zonas disponibles"

    return f"""
Nombre: {BOT_NAME}
Rol: Asistente virtual de Casa Laguna.
Objetivo: Ayudar con reservaciones, menú, ubicación, eventos y políticas.
Estilo: Cercano, profesional, cálido.
Idioma: Igual al del usuario.

{zonas_bloque}
Zonas válidas para reservar (nombres exactos): {zonas_validas_str}

REGLAS:
- Si preguntan dirección: incluye link Google Maps.
- Usa emojis relacionados al restaurante (variados).
- Si aparece "TIEMPO DETECTADO", úsalo tal cual (no interpretes "hoy/mañana").
- Listas siempre en markdown:
  - Item

RESERVACIÓN (si usuario quiere reservar: "reservar/mesa/booking"):

Si pregunta "qué datos necesito": solo explica, NO inicies flujo.

FLUJO (máximo 4 mensajes):
1) Pedir TODOS los datos en UN solo mensaje:
   Nombre, Teléfono (con código de país), Fecha de nacimiento, Número de personas, Fecha y hora de reservación.
2) Cuando el usuario responda, extraer los 5 datos, convertir CUALQUIER formato de fecha a DD/MM/YYYY y hora a HH:MM (24h). Mostrar resumen y preguntar en qué zona prefiere su mesa. SIEMPRE describir las plantas y sus áreas para que el usuario sepa qué opciones tiene:
   "📋 Datos de tu reservación:
   👤 NOMBRE
   📱 TELÉFONO
   🎂 NACIMIENTO
   👥 PERSONAS
   📅 FECHA Y HORA

   🏛️ ¿En qué zona prefieres tu mesa?
   {presentacion_str}

   Dime el nombre de la zona o si deseas corregir algún dato."
3) Cuando el usuario elija zona (o corrija datos), identificar a cuál de los nombres exactos de zona corresponde su elección y mostrar resumen final. El campo 📍 DEBE contener ÚNICAMENTE el nombre exacto de la zona (ej: "Interior", "Terraza"), NUNCA descripciones como "interior de la planta alta":
   "📋 Datos finales:
   👤 NOMBRE
   📱 TELÉFONO
   🎂 NACIMIENTO
   👥 PERSONAS
   📅 FECHA Y HORA
   📍 NOMBRE_EXACTO_DE_ZONA
   ¿Confirmas o deseas corregir algo?"
4) Si confirma, responder EXACTAMENTE SOLO esto (📍 DEBE ser SOLO el nombre exacto de la zona, una sola palabra o frase corta de la lista de zonas válidas):
     "✅ Reservación:
     👤 NOMBRE
     📱 TELÉFONO
     🎂 FECHA NACIMIENTO
     👥 PERSONAS
     📅 FECHA Y HORA
     📍 NOMBRE_EXACTO_DE_ZONA
     🆔 ID DE RESERVACIÓN"
   Si corrige, actualizar datos y repetir paso 3.

CANCELACIÓN DE RESERVACIÓN:
Si el usuario quiere cancelar una reservación ("cancelar reservación/cancelar mi reserva"):
1) Pedir el ID de reservación.
2) Cuando lo proporcione, responder EXACTAMENTE SOLO esto:
   "❌ Cancelar reservación:
   🆔 ID_PROPORCIONADO"
   NO agregar texto adicional.

NOTAS:
- Si faltan datos en la respuesta del usuario, pedir SOLO los faltantes en un mensaje.
- Normalizar fechas a DD/MM/YYYY sin importar el formato que use el usuario.
- CRÍTICO PARA ZONAS: El campo 📍 en los pasos 3 y 4 DEBE contener EXCLUSIVAMENTE uno de estos nombres exactos: {zonas_validas_str}. NUNCA escribir descripciones largas como "interior de la planta alta" o "terraza de arriba". Si el usuario dice "en el interior de la planta alta", tú debes traducirlo al nombre exacto correspondiente (ej: "interior"). Si el usuario dice solo un nombre de planta (ej. "planta alta") y esa planta tiene más de una zona, preguntar cuál zona específica prefiere.
"""


# Variable global para el system prompt (se construye al iniciar el bot)
SYSTEM_PROMPT = build_system_prompt(None)

# ============================================================
# PATHS DEL RAG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
VECTOR_DB_PATH = str(BASE_DIR / "data" / "embeddings" / "vector_db" / "v14")
COLLECTION_NAME = "casalaguna_rag"
MODEL_PATH = "intfloat/multilingual-e5-large"

# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)

# ============================================================
# FUNCIONES DE PROCESAMIENTO DE TIEMPO
# ============================================================

def detectar_y_convertir_tiempo(mensaje: str) -> tuple[str, str]:
    """
    Detecta expresiones de tiempo relativas en el mensaje y las convierte a fecha/hora concreta.
    
    Returns:
        tuple: (mensaje_procesado, tiempo_detectado)
        - mensaje_procesado: mensaje con expresiones de tiempo convertidas
        - tiempo_detectado: fecha y hora en formato "DD/MM/YYYY HH:MM" o None si no se detectó
    """
    mensaje_lower = mensaje.lower()
    ahora = datetime.now()
    tiempo_detectado = None
    mensaje_procesado = mensaje
    
    # Patrones de tiempo relativos con sus funciones de cálculo
    patrones_tiempo = {
        r'\bhoy\b': lambda: ahora,
        r'\bmañana\b': lambda: ahora + timedelta(days=1),
        r'\bpasado\s+mañana\b': lambda: ahora + timedelta(days=2),
        r'\besta\s+semana\b': lambda: ahora + timedelta(days=(5 - ahora.weekday()) % 7),  # próximo sábado
        r'\bpróxima\s+semana\b': lambda: ahora + timedelta(days=(5 - ahora.weekday()) % 7 + 7),  # sábado siguiente
        r'\bfin\s+de\s+semana\b': lambda: ahora + timedelta(days=(5 - ahora.weekday()) % 7),  # próximo sábado
        r'\blunes\b': lambda: ahora + timedelta(days=(0 - ahora.weekday()) % 7 or 7),
        r'\bmartes\b': lambda: ahora + timedelta(days=(1 - ahora.weekday()) % 7 or 7),
        r'\bmiércoles\b': lambda: ahora + timedelta(days=(2 - ahora.weekday()) % 7 or 7),
        r'\bjueves\b': lambda: ahora + timedelta(days=(3 - ahora.weekday()) % 7 or 7),
        r'\bviernes\b': lambda: ahora + timedelta(days=(4 - ahora.weekday()) % 7 or 7),
        r'\bsábado\b': lambda: ahora + timedelta(days=(5 - ahora.weekday()) % 7 or 7),
        r'\bdomingo\b': lambda: ahora + timedelta(days=(6 - ahora.weekday()) % 7 or 7),
    }
    
    # Buscar expresiones de tiempo y hora por separado
    fecha_detectada = None
    patron_fecha_encontrado = None
    
    # Primero buscar fecha relativa
    for patron_fecha, funcion_fecha in patrones_tiempo.items():
        if re.search(patron_fecha, mensaje_lower):
            fecha_detectada = funcion_fecha()
            patron_fecha_encontrado = patron_fecha
            break
    
    if fecha_detectada:
        # Buscar hora en el mensaje
        patrones_hora = [
            r'a\s+las\s+(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm|hrs?|horas?))?',  # "a las 20", "a las 8:30 pm"
            r'(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm|hrs?|horas?))',  # "20 horas", "8:30 pm"
        ]
        
        for patron_hora in patrones_hora:
            match_hora = re.search(patron_hora, mensaje_lower)
            if match_hora:
                hora = int(match_hora.group(1))
                minutos = int(match_hora.group(2)) if match_hora.group(2) else 0
                am_pm = match_hora.group(3).lower() if match_hora.group(3) else None
                
                # Convertir a formato 24 horas
                if am_pm in ['pm'] and hora != 12:
                    hora += 12
                elif am_pm in ['am'] and hora == 12:
                    hora = 0
                
                # Crear datetime con la fecha y hora detectadas
                fecha_hora = fecha_detectada.replace(hour=hora, minute=minutos, second=0, microsecond=0)
                tiempo_detectado = fecha_hora.strftime("%d/%m/%Y %H:%M")
                
                # Reemplazar la fecha relativa y la hora con la fecha/hora completa
                mensaje_procesado = re.sub(patron_fecha_encontrado, tiempo_detectado, mensaje_procesado, flags=re.IGNORECASE)
                # Remover la expresión de hora ya que está incluida en la fecha
                mensaje_procesado = re.sub(patron_hora, '', mensaje_procesado, flags=re.IGNORECASE)
                mensaje_procesado = ' '.join(mensaje_procesado.split())  # Limpiar espacios extra
                break
        
        # Si no se encontró hora, solo reemplazar la fecha
        if not tiempo_detectado:
            fecha_str = fecha_detectada.strftime("%d/%m/%Y")
            mensaje_procesado = re.sub(patron_fecha_encontrado, fecha_str, mensaje_procesado, flags=re.IGNORECASE)
    
    return mensaje_procesado, tiempo_detectado

# ============================================================
# CLASE PRINCIPAL DEL BOT RAG
# ============================================================

class CasaLagunaBot:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logging.error("OPENAI_API_KEY no está configurada en el entorno.")
            sys.exit(1)

        # Cliente OpenAI
        self.client = OpenAI(api_key=api_key)

        # Inicializar conversación con prompt de sistema
        self.conversation = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Inicializar retriever RAG
        logging.info("🔹 Inicializando retriever RAG...")
        self.retriever = RAGRetriever(
            vector_db_path=VECTOR_DB_PATH,
            collection_name=COLLECTION_NAME,
            model_path=MODEL_PATH
        )
        logging.info("✅ Retriever listo.")

    def responder(self, mensaje_usuario: str) -> str:
        """
        Responde a un mensaje del usuario usando RAG y OpenAI.
        """
        mensaje_usuario = mensaje_usuario.strip()
        if not mensaje_usuario:
            return "No entendí tu mensaje. ¿Puedes repetirlo?"

        # Comandos de salida
        if mensaje_usuario.lower() in EXIT_COMMANDS:
            return "¡Hasta luego! Gracias por contactar a Casa Laguna. 🍽️"

        # ========================
        # PROCESAR TIEMPO RELATIVO
        # ========================
        mensaje_procesado, tiempo_detectado = detectar_y_convertir_tiempo(mensaje_usuario)
        
        if tiempo_detectado:
            logging.info(f"🕐 Tiempo detectado: {tiempo_detectado} (original: '{mensaje_usuario}')")
            # Usar el mensaje procesado para el resto del procesamiento
            mensaje_para_rag = mensaje_procesado
        else:
            mensaje_para_rag = mensaje_usuario

        # ========================
        # DETECTAR SI LA PREGUNTA ES SOBRE MENÚ O UBICACIÓN
        # ========================
        filtro_source = None
        lower_msg = mensaje_para_rag.lower()
        if any(k in lower_msg for k in ["dirección", "ubicación", "mapa"]):
            filtro_source = ["location.json"]
        elif any(k in lower_msg for k in ["menú", "platillo", "comida"]):
            filtro_source = ["menu.json"]

        # ========================
        # Recuperar documentos
        # ========================
        context_docs = self.retriever.retrieve(
            mensaje_para_rag,
            top_k=5,
            source_filter=filtro_source
        )

        # Fallback: si no hay resultados, buscar sin filtro
        if not context_docs:
            context_docs = self.retriever.retrieve(
                mensaje_para_rag,
                top_k=5,
                source_filter=None
            )

        # Extraer texto de los documentos
        context_texts = []
        for doc in context_docs:
            text = doc.get("document") or doc.get("passage") or doc.get("content")
            if text:
                context_texts.append(text)

        context_text = "\n\n".join(context_texts)

        # Fallback si aún no hay documentos
        if not context_text:
            context_text = (
                "No se encontró información específica en la base de datos del restaurante."
            )

        # ========================
        # CONSTRUIR PROMPT PARA EL MODELO
        # ========================
        contexto_tiempo = ""
        if tiempo_detectado:
            contexto_tiempo = f"\n\nTIEMPO DETECTADO: El usuario mencionó una expresión de tiempo relativa que se convirtió a: {tiempo_detectado}. Usa esta fecha y hora concreta en tu respuesta."
        
        prompt_usuario = (
            f"Pregunta del usuario: {mensaje_usuario}{contexto_tiempo}\n\n"
            f"Información relevante del restaurante:\n{context_text}\n\n"
            "Usa esta información para responder la pregunta de forma clara, concisa y profesional."
        )

        self.conversation.append({"role": "user", "content": prompt_usuario})

        # Llamada a OpenAI
        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=self.conversation,
                temperature=0.3,
                max_tokens=120,
            )
            respuesta = response.choices[0].message.content.strip()
            self.conversation.append({"role": "assistant", "content": respuesta})
            return respuesta

        except OpenAIError:
            logging.exception("Error al consultar OpenAI")
            return (
                "Lo siento, tuve un inconveniente al procesar tu consulta. "
                "Por favor intenta nuevamente."
            )

# ============================================================
# LOOP PRINCIPAL
# ============================================================

def main():
    print("=" * 60)
    print(f"{BOT_NAME} — Asistente Virtual de Casa Laguna")
    print("Escribe tu consulta sobre el restaurante.")
    print("Escribe 'salir' o 'exit' para terminar.")
    print("=" * 60)
    print()
    print(WELCOME_MESSAGE)
    print()

    bot = CasaLagunaBot()

    while True:
        try:
            user_input = input("Tú: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nHasta luego. ¡Que tengas un excelente día!")
            break

        if not user_input:
            continue

        if user_input.lower() in EXIT_COMMANDS:
            print("\nGracias por conversar conmigo. ¡Hasta pronto!")
            break

        respuesta = bot.responder(user_input)
        print(f"\n{BOT_NAME}: {respuesta}\n")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()
