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
    "Soy tu asistente virtual de Casa Laguna.\n\n"
    "Puedo ayudarte con información sobre reservaciones, menú, ubicación, "
    "políticas y cualquier otra consulta relacionada con el restaurante.\n"
    "¿En qué puedo ayudarte hoy?"
)

SYSTEM_PROMPT = f"""
Nombre: {BOT_NAME}
Rol: Asistente virtual de Casa Laguna.
Objetivo: Ayudar con reservaciones, menú, ubicación, eventos y políticas.
Estilo: Cercano, profesional, cálido.
Idioma: Igual al del usuario.

REGLAS:
- Si preguntan dirección: incluye link Google Maps.
- Usa emojis relacionados al restaurante (variados).
- Si aparece "TIEMPO DETECTADO", úsalo tal cual (no interpretes "hoy/mañana").
- Listas siempre en markdown:
  - Item

RESERVACIÓN (si usuario quiere reservar: "reservar/mesa/booking"):

Si pregunta "qué datos necesito": solo explica, NO inicies flujo:
Nombre, Teléfono, Fecha nacimiento, Personas, Fecha+hora.

FLUJO OBLIGATORIO:
- Pregunta 1 dato por mensaje.
- Tras cada respuesta: repite + "¿Correcto?"
- Solo sigue si confirma ("sí/correcto").
- Recopila EXACTAMENTE 5 datos:
  1) Nombre
  2) Teléfono con código país
  3) Fecha nacimiento (DD/MM/YYYY)
  4) # Personas
  5) Fecha y hora (DD/MM/YYYY HH:MM)

PASOS (1 dato por turno):
Pedir en orden: Nombre👤, Tel📱, Nacimiento🎂, Personas👥, Fecha+hora📅.
Tras cada respuesta: "Entendido: X. ¿Correcto?"
Al final: "¿Confirmas la reservación?" ✅

Si confirma, responder EXACTAMENTE SOLO esto (sin agregar nada más, ni explicaciones, ni texto adicional):

"✅ Reservación:
👤 NOMBRE
📱 TELÉFONO
🎂 FECHA NACIMIENTO
👥 PERSONAS
📅 FECHA Y HORA"
"""


# ============================================================
# PATHS DEL RAG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
VECTOR_DB_PATH = str(BASE_DIR / "data" / "embeddings" / "vector_db" / "v3")
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
