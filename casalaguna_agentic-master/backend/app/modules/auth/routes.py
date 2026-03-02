from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta
from database import verificar_admin_password, obtener_admin_user_por_username, actualizar_admin_profile

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "casa-laguna-jwt-secret-2026-muy-seguro-cambiar-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Endpoint de login con validación contra base de datos.
    Verifica credenciales y genera JWT token.
    """
    # Verificar contraseña contra la BD
    if not verificar_admin_password(request.username, request.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Obtener datos del usuario
    usuario = obtener_admin_user_por_username(request.username)
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    # Generar JWT token
    token_data = {
        "sub": usuario.username,
        "user_id": usuario.id,
        "role": usuario.role,
        "exp": datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    }
    
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return LoginResponse(
        token=token,
        user={
            "id": usuario.id,
            "username": usuario.username,
            "email": usuario.email,
            "role": usuario.role,
            "display_name": usuario.display_name,
            "avatar_icon": usuario.avatar_icon
        }
    )

@router.get("/verify")
async def verify(authorization: str = Header(None)):
    """
    Verifica si un token JWT es válido.
    Espera header: Authorization: Bearer <token>
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Token no proporcionado")
        
        # Extraer token del header "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Formato de token inválido")
        
        token = authorization.replace("Bearer ", "")
        
        # Decodificar y validar token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if not username:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Verificar que el usuario siga existiendo en BD
        usuario = obtener_admin_user_por_username(username)
        if not usuario:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        
        return {
            "authenticated": True,
            "user": {
                "id": usuario.id,
                "username": usuario.username,
                "email": usuario.email,
                "role": usuario.role,
                "display_name": usuario.display_name,
                "avatar_icon": usuario.avatar_icon
            }
        }
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_icon: Optional[str] = None


@router.put("/profile")
async def update_profile(request: ProfileUpdateRequest, authorization: str = Header(None)):
    """
    Actualiza el nombre y/o ícono de perfil del usuario autenticado.
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token no proporcionado")
        
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if not username:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        result = actualizar_admin_profile(
            username=username,
            display_name=request.display_name,
            avatar_icon=request.avatar_icon
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return {
            "success": True,
            "user": {
                "id": result["id"],
                "username": result["username"],
                "email": result["email"],
                "role": result["role"],
                "display_name": result["display_name"],
                "avatar_icon": result["avatar_icon"]
            }
        }
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
