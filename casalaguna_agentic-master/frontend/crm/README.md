# 🏡 Casa Laguna CRM - Bot Admin Dashboard

Un dashboard administrativo en tiempo real para monitorear el desempeño del bot de Casa Laguna. Permite ver métricas, conversaciones, clientes y reservaciones en vivo.

## 🎯 Características

- **Dashboard en tiempo real** con métricas actualizadas cada 5 segundos
- **Historial de conversaciones** - Ver todas las interacciones del bot
- **Gestión de clientes** - Lista de clientes con sus reservaciones
- **Métricas de desempeño** - Mensajes, reservaciones, tasa de conversión
- **Interfaz moderna y responsiva** - Funciona en desktop y mobile
- **Actualización automática** - Los datos se actualizan en vivo

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite (bundler)
- CSS3 (responsive design)
- Axios (HTTP client)

**Backend:**
- FastAPI (Python)
- CRM API endpoints

## 📦 Instalación

### 1. Frontend (React)

```bash
cd frontend/crm

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Build para producción
npm run build
```

El frontend correrá en http://localhost:3000

### 2. Backend (Python)

El backend (FastAPI) debe estar corriendo en http://localhost:8000 con los endpoints del CRM:

```bash
cd backend/app

# Los endpoints de CRM ya están integrados en main.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📊 Endpoints del CRM

El backend expone los siguientes endpoints:

- **GET `/api/crm/metrics`** - Retorna métricas generales
- **GET `/api/crm/conversations`** - Retorna historial de conversaciones
- **GET `/api/crm/clients`** - Retorna lista de clientes

## 📈 Dashboard

### Vista Principal (Dashboard)

Muestra en tiempo real:
- **Métricas de desempeño:**
  - Total de mensajes recibidos
  - Total de reservaciones
  - Clientes únicos
  - Tasa de conversión

- **Actividad del día:**
  - Mensajes recibidos
  - Reservaciones realizadas

- **Últimas reservaciones:**
  - Nombre del cliente
  - Fecha y hora
  - Cantidad de personas

- **Estado del bot:**
  - Estado actual (en línea/offline)
  - Última actualización
  - Tiempo de respuesta promedio

### Conversaciones

Lista todas las conversaciones en tiempo real:
- Usuario y canal (Web, WhatsApp, etc)
- Mensaje del usuario
- Respuesta del bot
- Indicador si resultó en reservación
- Timestamp

### Clientes

Tabla de clientes registrados con:
- Nombre
- Teléfono
- Fecha de nacimiento
- Total de reservaciones
- Última interacción
- Estado (Activo/Inactivo)

## 🔄 Flujo de Datos

```
Bot recibe mensaje
    ↓
MessageService procesa
    ↓
register_conversation() registra en CRM
    ↓
Frontend consulta /api/crm/conversations
    ↓
Dashboard actualiza en tiempo real
```

## 🚀 Uso

1. **Inicia el backend:**
   ```bash
   cd backend/app
   uvicorn main:app --reload
   ```

2. **Inicia el CRM:**
   ```bash
   cd frontend/crm
   npm run dev
   ```

3. **Abre en tu navegador:**
   - CRM: http://localhost:3000
   - Widget: http://localhost:8080
   - Backend: http://localhost:8000

4. **Usa el widget web** para crear conversaciones y ver cómo se actualizan en el CRM.

## 📱 Componentes React

### Dashboard.jsx
Componente principal que muestra métricas y actividad en tiempo real.

### ConversationHistory.jsx
Historial de todas las conversaciones registradas.

### ClientsList.jsx
Tabla de clientes con sus datos y reservaciones.

### Navbar.jsx
Barra superior con info del estado del bot.

### MetricCard.jsx
Card reutilizable para mostrar métricas.

## 🔧 Configuración

### URL del Backend

Por defecto, el frontend busca el backend en http://localhost:8000. Si necesitas cambiar esto, edita `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://tu-dominio:puerto',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### Intervalo de Actualización

En `App.jsx`, cambia el intervalo (en ms):

```javascript
const interval = setInterval(fetchMetrics, 5000) // 5 segundos
```

## 📋 Estructura

```
frontend/crm/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css
    └── components/
        ├── Dashboard.jsx
        ├── Dashboard.css
        ├── ConversationHistory.jsx
        ├── ConversationHistory.css
        ├── ClientsList.jsx
        ├── ClientsList.css
        ├── Navbar.jsx
        ├── Navbar.css
        ├── MetricCard.jsx
        └── MetricCard.css

backend/app/
├── crm_api.py (nuevo - endpoints del CRM)
├── main.py (actualizado - incluye CRM routes)
└── ... (resto de archivos)
```

## 🎨 Diseño

- **Color scheme:** Purpura/azul degradado
- **Responsive:** Funciona en todos los tamaños de pantalla
- **Animaciones suaves:** Transiciones y fade-ins
- **Iconos:** Emojis para mejor UX

## 🔒 Seguridad

Para producción, considera:

1. **Autenticación:** Agregar login al CRM
2. **Autorización:** Verificar permisos del admin
3. **HTTPS:** Usar certificados SSL
4. **Rate limiting:** Limitar requests a la API
5. **CORS:** Configurar orígenes permitidos correctamente

## 📦 Deploy

### Frontend (Vercel, Netlify, etc)

```bash
npm run build
# Subir el contenido de dist/
```

### Backend (Heroku, Railway, AWS, etc)

```bash
# Asegurar que crm_api está importado en main.py
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 🐛 Troubleshooting

**El CRM no ve datos:**
- Verificar que el backend está corriendo en http://localhost:8000
- Revisar la consola del navegador para errores
- Verificar que el widget web está mandando mensajes

**Los datos no se actualizan:**
- Verificar que el intervalo de actualización está correctamente configurado
- Revisar que los endpoints del CRM retornan datos

**CORS error:**
- Verificar que el backend tiene CORS habilitado para localhost:3000

## 📞 Soporte

Para dudas o reportar bugs, revisa:
- [RESUMEN_REORGANIZACION.md](../../RESUMEN_REORGANIZACION.md)
- [ARQUITECTURA_CONECTORES.md](../../ARQUITECTURA_CONECTORES.md)

---

**Última actualización:** 29 de Enero de 2026
**Versión:** 1.0.0
**Estado:** ✅ Producción
