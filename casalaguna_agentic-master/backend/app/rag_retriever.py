import os
from pathlib import Path
from typing import List, Dict, Optional

from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings


# =========================
# CONFIGURACIÓN
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
MODEL_PATH = "intfloat/multilingual-e5-large"
VECTOR_DB_PATH = str(BASE_DIR / "data" / "embeddings" / "vector_db" / "v2")
COLLECTION_NAME = "casalaguna_rag"
TOP_K = 5  # Número por defecto de documentos a recuperar


# =========================
# RETRIEVER
# =========================

class RAGRetriever:
    def __init__(self, vector_db_path: str, collection_name: str, model_path: str):
        print("🔹 Inicializando modelo de embeddings para queries...")
        self.model = SentenceTransformer(model_path)

        print("🔹 Conectando a ChromaDB persistente...")
        Path(vector_db_path).mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=vector_db_path,
            settings=Settings(anonymized_telemetry=False)
        )

        # Verificar o crear colección
        if collection_name not in [c.name for c in self.client.list_collections()]:
            raise ValueError(f"❌ La colección '{collection_name}' no existe en {vector_db_path}")

        self.collection = self.client.get_collection(collection_name)
        print(f"✅ Conectado a la colección: {collection_name}")

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K,
        source_filter: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Recupera los top_k documentos más relevantes para la query.
        Permite filtrar por source en los metadatos.
        """
        query_embedding = self.model.encode(query, normalize_embeddings=True)

        # Recuperar más resultados de los necesarios para permitir filtrado
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k * 3  # multiplicador para asegurar que el filtrado tenga suficientes docs
        )

        retrieved = []
        for doc, meta, doc_id in zip(results["documents"][0], results["metadatas"][0], results["ids"][0]):
            if source_filter:
                if meta.get("source") not in source_filter:
                    continue
            retrieved.append({
                "id": doc_id,
                "document": doc,
                "metadata": meta
            })
            if len(retrieved) >= top_k:
                break  # solo top_k después del filtrado

        return retrieved


# =========================
# EJEMPLO DE USO
# =========================

if __name__ == "__main__":
    retriever = RAGRetriever(
        vector_db_path=VECTOR_DB_PATH,
        collection_name=COLLECTION_NAME,
        model_path=MODEL_PATH
    )

    query = "Dime dos platillos del menú de Casa Laguna"
    results = retriever.retrieve(query, source_filter=["menu.json"])

    print(f"\n📄 Resultados para query: '{query}' (filtrados por menu.json)")
    for r in results:
        print("-" * 40)
        print(f"ID: {r['id']}")
        print(f"Documento: {r['document'][:300]}...")  # primeros 300 chars
        print(f"Metadatos: {r['metadata']}")
