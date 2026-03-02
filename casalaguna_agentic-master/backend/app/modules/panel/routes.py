from fastapi import APIRouter

router = APIRouter(prefix="/panel", tags=["panel"])

@router.get("/metrics")
async def get_metrics():
    """Obtener métricas del panel"""
    # TODO: Implementar lógica para obtener métricas
    return {
        "total_messages": 0,
        "total_reservations": 0,
        "unique_clients": 0,
        "conversion_rate": 0
    }

@router.get("/conversations")
async def get_conversations():
    """Obtener conversaciones activas"""
    # TODO: Implementar lógica para obtener conversaciones
    return {}
