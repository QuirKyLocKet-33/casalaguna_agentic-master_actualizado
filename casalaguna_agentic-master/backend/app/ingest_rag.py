import json
from pathlib import Path
from typing import List, Dict

from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# =========================
# CONFIGURACIÓN DE PATHS
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
MODEL_PATH = "intfloat/multilingual-e5-large"

DATA_DOCS_DIR = BASE_DIR / "data" / "docs"
JSON_FILES = [
    str(DATA_DOCS_DIR / "contact" / "contact.json"),
    str(DATA_DOCS_DIR / "frequent_requests" / "faqs.json"),
    str(DATA_DOCS_DIR / "locations" / "location.json"),
    str(DATA_DOCS_DIR / "menu" / "menu.json"),
    str(DATA_DOCS_DIR / "politics" / "politics.json"),
    str(DATA_DOCS_DIR / "general.json"),
]

VECTOR_DB_PATH = str(BASE_DIR / "data" / "embeddings" / "vector_db" / "v5")

COLLECTION_NAME = "casalaguna_rag"

# =========================
# UTILIDADES
# =========================

def load_json_file(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else [data]

def build_embedding_text(chunk: Dict) -> str:
    """
    Versión CORREGIDA que maneja correctamente la estructura del menú JSON
    """
    parts = []
    
    # 1. MENÚ DETALLADO (estructura que tienes en menu.json)
    if chunk.get("type") == "restaurant_menu" and "chunks" in chunk:
        restaurant_name = chunk.get("restaurant", "Casa Laguna")
        parts.append(f"Menú completo del restaurante {restaurant_name}")
        
        # Procesar TODAS las categorías del menú
        for category_data in chunk["chunks"]:
            category_name = category_data.get("category", "")
            items = category_data.get("items", [])
            
            if category_name and items:
                # Listar TODOS los platillos de esta categoría con sus detalles
                category_items = []
                for item in items:
                    name = item.get("name", "").strip()
                    desc = item.get("desc", "").strip()
                    price = item.get("price", "").strip()
                    picor = item.get("picor", "")
                    
                    if name:
                        item_text = name
                        if price and price != "-":
                            item_text += f" (${price})"
                        if desc:
                            # Acortar descripción si es muy larga
                            short_desc = desc[:80] + "..." if len(desc) > 80 else desc
                            item_text += f": {short_desc}"
                        
                        category_items.append(item_text)
                
                if category_items:
                    # Unir todos los platillos de esta categoría
                    parts.append(f"## {category_name}: {', '.join(category_items[:10])}")
                    if len(category_items) > 10:
                        parts.append(f"... y {len(category_items) - 10} platillos más en {category_name}")
    
    # 1.5. ITEMS INDIVIDUALES DEL MENÚ
    elif chunk.get("type") == "menu_item":
        name = chunk.get("name", "")
        desc = chunk.get("desc", "")
        price = chunk.get("price", "")
        picor = chunk.get("picor", "")
        category = chunk.get("category", "")
        
        parts.append(f"Platillo: {name}")
        if desc:
            parts.append(f"Descripción: {desc}")
        if price and price != "-":
            parts.append(f"Precio: ${price}")
        if picor is not None:
            parts.append(f"Nivel de picor: {picor}")
        if category:
            parts.append(f"Categoría: {category}")
    
    # 2. FAQS sobre menú (estructura actual)
    elif chunk.get("type") == "faq" and "content" in chunk:
        content = chunk["content"]
        if "Pregunta:" in content and "Respuesta:" in content:
            # Extraer limpiamente
            q_start = content.find("Pregunta:") + 9
            r_start = content.find("Respuesta:")
            pregunta = content[q_start:r_start].strip()
            respuesta = content[r_start+9:].split("|")[0].strip()
            
            parts.append(f"Pregunta frecuente: {pregunta}")
            parts.append(f"Respuesta: {respuesta}")
        else:
            parts.append(f"FAQ: {content}")
    
    # 3. Contacto
    elif chunk.get("type") == "contact" and "content" in chunk:
        parts.append(f"Información de contacto: {chunk['content']}")
    
    # 4. Ubicación
    elif chunk.get("type") == "location" and "content" in chunk:
        parts.append(f"Ubicación: {chunk['content']}")
    
    # 5. Si no es ninguno de los anteriores, usar lógica general
    else:
        # Extraer información básica
        if "name" in chunk and chunk["name"]:
            parts.append(f"Nombre: {chunk['name']}")
        if "description" in chunk and chunk["description"]:
            parts.append(f"Descripción: {chunk['description']}")
        if "content" in chunk and chunk["content"]:
            parts.append(f"Contenido: {chunk['content']}")
    
    # Si no hay partes, crear texto mínimo
    if not parts:
        for key, value in chunk.items():
            if isinstance(value, str) and value and key not in ["id", "_id"]:
                parts.append(f"{key}: {value}")
    
    # Crear texto final
    text = " | ".join(parts)
    
    # Limpiar metadata redundante
    redundant = [
        "Restaurant Id: casa_laguna_tampico",
        "Updated At: 2025-01-01",
        "Content: ",
        "Pregunta: Pregunta:",
        "Respuesta: Respuesta:"
    ]
    
    for pattern in redundant:
        text = text.replace(pattern, "").replace("  ", " ")
    
    # Asegurar que no esté vacío
    if not text.strip():
        text = str(chunk)
    
    return "passage: " + text.strip()

def build_metadata(chunk: Dict) -> Dict:
    metadata = {}
    if "category" in chunk:
        metadata["category"] = chunk.get("category", "general")
    if "type" in chunk:
        metadata["type"] = chunk.get("type", "unknown")
    if "source" in chunk:
        metadata["source"] = chunk.get("source", "internal")
    if "city" in chunk:
        metadata["city"] = chunk.get("city", "Tampico")
    if not metadata:
        # Crear metadatos básicos si no hay ninguno
        metadata = {
            "category": "general",
            "type": "unknown",
            "source": "internal",
            "city": "Tampico"
        }
    return metadata

def expand_chunks(chunks: List[Dict]) -> List[Dict]:
    """Expande chunks que contienen 'chunks' con 'items' en chunks individuales por item"""
    expanded = []
    for chunk in chunks:
        if chunk.get("chunks"):
            # Es un chunk con subcategorías, expandir cada item
            for sub_chunk in chunk["chunks"]:
                category = sub_chunk.get("category", "")
                items = sub_chunk.get("items", [])
                for item in items:
                    new_chunk = {
                        "id": f"{chunk.get('id', 'menu')}_{category.lower().replace(' ', '_')}_{item.get('name', '').lower().replace(' ', '_').replace('(', '').replace(')', '')}",
                        "type": "menu_item",
                        "category": category,
                        "restaurant": chunk.get("restaurant", ""),
                        "source": chunk.get("source", ""),
                        "name": item.get("name", ""),
                        "desc": item.get("desc", ""),
                        "price": item.get("price", ""),
                        "picor": item.get("picor", ""),
                        "content": f"{item.get('name', '')}: {item.get('desc', '')}. Precio: {item.get('price', '')}. Nivel de picor: {item.get('picor', '')}."
                    }
                    expanded.append(new_chunk)
        else:
            expanded.append(chunk)
    return expanded

def generate_unique_ids(chunks: List[Dict]) -> List[str]:
    """Genera IDs únicos para cada chunk basados en su contenido"""
    ids = []
    seen = set()
    for i, chunk in enumerate(chunks):
        # Crear un identificador único basado en contenido
        base_id = f"{chunk.get('category', 'gen')}_{chunk.get('type', 'unk')}_{i}"
        
        # Si hay un campo único como 'id', 'name' o 'title', usarlo
        if 'id' in chunk and chunk['id']:
            base_id = chunk['id']
        elif 'name' in chunk:
            base_id = f"{chunk.get('category', 'gen')}_{chunk['name']}"
        elif 'title' in chunk:
            base_id = f"{chunk.get('category', 'gen')}_{chunk['title']}"
        
        # Asegurar unicidad
        unique_id = base_id
        counter = 1
        while unique_id in seen:
            unique_id = f"{base_id}_{counter}"
            counter += 1
        
        ids.append(unique_id)
        seen.add(unique_id)
    return ids

# =========================
# INGESTIÓN PRINCIPAL
# =========================

def main():
    print("🔹 Cargando modelo de embeddings...")
    model = SentenceTransformer(MODEL_PATH)

    print("🔹 Cargando JSONs...")
    all_chunks: List[Dict] = []
    for json_path in JSON_FILES:
        try:
            chunks = load_json_file(json_path)
            all_chunks.extend(chunks)
            print(f"   → {Path(json_path).name}: {len(chunks)} chunks")
        except Exception as e:
            print(f"   ❌ Error cargando {json_path}: {e}")
    print(f"   → Total de chunks cargados: {len(all_chunks)}")

    print("🔹 Construyendo textos semánticos...")
    documents = [build_embedding_text(chunk) for chunk in all_chunks]

    print("🔹 Generando embeddings...")
    embeddings = model.encode(
        documents,
        normalize_embeddings=True,
        batch_size=16,
        show_progress_bar=True
    )

    print("🔹 Inicializando ChromaDB persistente...")
    
    # Crear directorio si no existe
    Path(VECTOR_DB_PATH).mkdir(parents=True, exist_ok=True)
    
    # Usar PersistentClient para persistencia automática
    chroma_client = chromadb.PersistentClient(
        path=VECTOR_DB_PATH,
        settings=Settings(anonymized_telemetry=False)
    )

    # Verificar si ya existe la colección y eliminarla si es necesario
    try:
        chroma_client.delete_collection(COLLECTION_NAME)
        print(f"   → Colección existente '{COLLECTION_NAME}' eliminada")
    except:
        print(f"   → No existe colección previa '{COLLECTION_NAME}'")

    # Crear nueva colección
    collection = chroma_client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    print("🔹 Generando IDs únicos...")
    ids = generate_unique_ids(all_chunks)

    print("🔹 Construyendo metadatos...")
    metadatas = [build_metadata(chunk) for chunk in all_chunks]

    print("🔹 Insertando documentos en la base vectorial...")
    
    # Dividir en lotes si hay muchos documentos
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        end_idx = min(i + batch_size, len(documents))
        batch_num = (i // batch_size) + 1
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        print(f"   → Procesando lote {batch_num}/{total_batches} (documentos {i+1}-{end_idx})")
        
        collection.add(
            documents=documents[i:end_idx],
            embeddings=embeddings[i:end_idx].tolist(),
            metadatas=metadatas[i:end_idx],
            ids=ids[i:end_idx],
        )

    print(f"✅ Ingestión completada correctamente.")
    print(f"📦 Vector DB persistida en: {VECTOR_DB_PATH}")
    
    # Verificar que la colección se creó
    collections = chroma_client.list_collections()
    print(f"📚 Colecciones disponibles: {[col.name for col in collections]}")
    
    # Verificar algunos datos insertados
    try:
        count = collection.count()
        print(f"📊 Documentos en colección '{COLLECTION_NAME}': {count}")
        
        if count > 0:
            # Mostrar un ejemplo
            sample = collection.peek()
            print(f"📝 Ejemplo de documento insertado:")
            print(f"   ID: {sample['ids'][0]}")
            print(f"   Documento (primeros 200 chars): {sample['documents'][0][:200]}...")
            print(f"   Metadatos: {sample['metadatas'][0]}")
    except Exception as e:
        print(f"⚠️  Error al verificar datos: {e}")


if __name__ == "__main__":
    main()