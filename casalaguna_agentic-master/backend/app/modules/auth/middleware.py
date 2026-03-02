from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from jwt import decode, DecodeError
import logging
from sqlalchemy.orm import Session
from database import SessionLocal, obtener_admin_user_por_username

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Importar desde la misma carpeta (relativo)
from .routes import SECRET_KEY, ALGORITHM

def get_db():
    """Proporciona una sesión de base de datos para las dependencias"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def verify_token(credentials: HTTPAuthCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Verifica el JWT token desde el header Authorization
    Retorna los datos del usuario si es válido
    """
    token = credentials.credentials
    
    try:
        payload = decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Validar que el usuario existe en la BD
        user = obtener_admin_user_por_username(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {"user_id": user_id, "role": role, "user": user}
        
    except DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no válido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Error verificando token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token_data: dict = Depends(verify_token)):
    """
    Dependencia para obtener el usuario actual desde el token
    Útil para rutas protegidas
    """
    return token_data["user"]

async def get_current_role(token_data: dict = Depends(verify_token)):
    """
    Dependencia para obtener el rol del usuario actual
    """
    return token_data["role"]
