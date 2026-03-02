#!/usr/bin/env python3
"""
Script para inicializar la BD y crear el usuario admin Alan.
Ejecutar desde: cd backend/app && python setup_admin_user.py
"""

import sys
import os
from pathlib import Path

# Agregar el directorio actual al path
sys.path.insert(0, str(Path(__file__).parent))

from database import (
    Base, engine, inicializar_bd, crear_admin_user, 
    obtener_todos_admin_users
)

def main():
    print("\n" + "="*60)
    print("🔧 CONFIGURACIÓN DE BASE DE DATOS Y USUARIO ADMIN")
    print("="*60 + "\n")
    
    # Paso 1: Crear tablas
    print("📦 Creando tablas en PostgreSQL...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas correctamente\n")
    except Exception as e:
        print(f"❌ Error creando tablas: {e}\n")
        return False
    
    # Paso 2: Crear usuario Alan
    print("👤 Creando usuario admin 'Alan'...")
    try:
        resultado = crear_admin_user(
            username="Alan",
            password="admin",
            email="alan@casalaguna.com",
            role="admin"
        )
        
        if resultado:
            print(f"✅ Usuario creado exitosamente:")
            print(f"   📝 Usuario: {resultado['username']}")
            print(f"   📧 Email: {resultado['email']}")
            print(f"   👑 Rol: {resultado['role']}\n")
        else:
            print("⚠️  El usuario 'Alan' ya existe en la BD\n")
    
    except Exception as e:
        print(f"❌ Error creando usuario: {e}\n")
        return False
    
    # Paso 3: Listar usuarios
    print("📋 Usuarios admin en la BD:")
    try:
        usuarios = obtener_todos_admin_users()
        if usuarios:
            for usuario in usuarios:
                print(f"   • {usuario['username']} ({usuario['role']}) - {usuario['email']}")
        else:
            print("   (No hay usuarios)")
        print()
    except Exception as e:
        print(f"❌ Error listando usuarios: {e}\n")
    
    print("="*60)
    print("✅ CONFIGURACIÓN COMPLETADA")
    print("="*60)
    print("\n🔐 Credenciales para login:")
    print("   Usuario: Alan")
    print("   Contraseña: admin")
    print("\n⚠️  Nota: Cambiar la contraseña en producción")
    print("="*60 + "\n")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error fatal: {e}\n")
        sys.exit(1)
