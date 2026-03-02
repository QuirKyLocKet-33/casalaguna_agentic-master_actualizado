from fastapi import APIRouter

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("")
async def get_chats():
    """Obtener lista de chats"""
    # TODO: Implementar lógica para obtener chats
    return []

@router.get("/{chat_id}")
async def get_chat(chat_id: str):
    """Obtener detalles de un chat específico"""
    # TODO: Implementar lógica para obtener chat específico
    return {}

@router.post("/{chat_id}/message")
async def send_message(chat_id: str, message: str):
    """Enviar mensaje en un chat"""
    # TODO: Implementar lógica para enviar mensaje
    return {"status": "sent"}
