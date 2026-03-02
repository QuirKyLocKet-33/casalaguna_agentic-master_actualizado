// Configuración de variables de entorno para desarrollo
// Este archivo se importa en main.jsx antes de que se inicie la app

const ENV_CONFIG = {
  // API URL - cambiar según el entorno
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Configuración de autenticación
  AUTH: {
    LOGIN_ENDPOINT: '/crm/auth/login',
    VERIFY_ENDPOINT: '/crm/auth/verify',
    TOKEN_STORAGE_KEY: 'token',
    TOKEN_EXPIRY_HOURS: 24,
    REFRESH_TOKEN_BEFORE_HOURS: 1 // Refrescar token 1 hora antes de expirar
  },
  
  // Configuración de aplicación
  APP: {
    NAME: 'Casa Laguna CRM',
    VERSION: '1.0.0',
    DEBUG: import.meta.env.VITE_DEBUG || false
  }
};

export default ENV_CONFIG;
