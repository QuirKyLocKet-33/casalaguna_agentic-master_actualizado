

# Guía avanzada de trabajo para el módulo Panel

## Objetivo
Habilitar todas las funciones del panel que actualmente son solo visuales, excluyendo cualquier integración o funcionalidad relacionada con WhatsApp, Instagram y Messenger.

## Alcance y restricciones
- Implementar la lógica real para cada función visual del panel (dashboard, actividad, métricas, navegación, etc.).
- No modificar ni agregar nada relacionado con WhatsApp, Instagram o Messenger (ni en la interfaz ni en la lógica).
- Cualquier propuesta de nueva funcionalidad o cambio estructural debe presentarse en la Daily para su evaluación.

## Detalle de funciones a activar
1. **Dashboard y métricas**
	- Conectar las tarjetas de métricas (chats activos, reservas, clientes, conversión) a los endpoints reales utilizando `crmService.getMetrics()` y `crmService.getConversations()`.
	- Garantizar la actualización en tiempo real de los datos mediante eventEmitter y polling.

2. **Actividad reciente**
	- Sustituir los datos estáticos por eventos reales (nuevas reservas, mensajes, etc.) provenientes de la API o sockets/eventEmitter.
	- Mostrar información relevante: usuario, hora y tipo de evento.

3. **Rendimiento del bot**
	- Obtener métricas reales de disponibilidad, satisfacción y resolución desde la API si existen endpoints; en caso contrario, dejarlo documentado como pendiente para propuesta.

4. **Modo Noche**
	- Asegurar que los botones de navegación y bloques de información cambien correctamente de modo, manteniendo una estética adecuada.
	- Corregir problemas de visibilidad de texto entre modo día y modo noche (colores, contraste, etc.).

5. **Notificaciones y urgencias**
	- Conectar el contador de notificaciones y urgencias a eventos reales (por ejemplo, nuevos mensajes o alertas de soporte urgente).

6. **Respuestas rápidas y navegación**
	- Al hacer clic en una notificación de mensaje, redirigir al usuario directamente a ese mensaje dentro del panel de chats.

7. **Exclusión de canales externos**
	- Omitir toda lógica, interfaz y métricas relacionadas con WhatsApp, Instagram y Messenger. Si existen referencias, comentarlas y dejar un TODO para revisión futura.

## Buenas prácticas y recomendaciones
- Mantener la independencia del módulo, evitando dependencias directas con otros módulos.
- Utilizar únicamente servicios y componentes compartidos de la carpeta `shared` cuando sea necesario.
- Seguir buenas prácticas de React: uso de hooks, manejo de estado y efectos, y separación clara entre lógica y presentación.
- Documentar en el código cada integración o cambio relevante.
- Si alguna función requiere cambios en la API, dejar constancia en este documento y notificar al equipo de backend.

---

## ✅ CAMBIOS IMPLEMENTADOS (Febrero 2026)

### Archivos modificados

| Archivo | Ubicación | Qué se cambió |
|---------|-----------|----------------|
| `PanelModule.jsx` | `modules/panel/PanelModule.jsx` | Importa `reservationsService` y `clientsService`. Hace fetch de reservas y clientes reales al iniciar. Pasa los datos como props al Dashboard. |
| `pages/Dashboard.jsx` | `modules/panel/pages/Dashboard.jsx` | Conecta TODAS las tarjetas, actividad y métricas a datos reales. Elimina datos hardcodeados. Agrega navegación funcional. |
| `Panel.css` | `modules/panel/Panel.css` | Estilos para cards clickeables, hint de navegación, subtítulos, estado vacío, badge offline y live indicator. |

### Detalle de cada sección

#### 1. Tarjetas de estadísticas (statCards)
- **Chats Activos** → Cuenta conversaciones con `is_active: true` de `crmService.getConversations()`
- **Reservas** → Cuenta total de `reservationsService.getReservations()` (endpoint `/crm/reservations`)
- **Clientes** → Cuenta total de `clientsService.getClients()` (endpoint `/crm/clients`)
- **Conversión** → Usa `conversion_rate` de `crmService.getMetrics()` (endpoint `/crm/metrics`)
- **Cada tarjeta es clickeable** y navega a su módulo: `/chats`, `/reservations`, `/clients`

#### 2. Actividad Reciente (recentActivity)
- **YA NO TIENE DATOS FAKE.** Genera actividad real desde:
  - Últimos mensajes de cada conversación
  - Reservas recientes del endpoint metrics (`recent_reservations`)
  - Últimos clientes registrados
- Cada item es clickeable y navega al módulo correspondiente
- Se ordena por timestamp más reciente, máximo 8 items

#### 3. Métricas del Sistema (performanceMetrics)
- **Bot disponible** → `metrics.status === 'online'` → 100% o 0%
- **Tasa de conversión** → `metrics.conversion_rate` (del backend)
- **Chats activos / total** → Calculado: `activeConversations / totalConversations`
- **Conversaciones con reserva** → Calculado: `conversationsWithReservation / totalConversations`
- **Tiempo respuesta** → `metrics.avg_response_time` (del backend, en ms)

#### 4. Canales
- **SIN CAMBIOS.** WhatsApp, Instagram, Messenger NO fueron modificados.

### Endpoints utilizados
```
GET /crm/metrics          → crmService.getMetrics()
GET /crm/conversations    → crmService.getConversations()
GET /crm/reservations     → reservationsService.getReservations()
GET /crm/clients          → clientsService.getClients()
```

### Dónde editar a futuro

| Si quieres cambiar... | Edita aquí |
|----------------------|------------|
| Qué tarjetas aparecen / sus valores | `pages/Dashboard.jsx` → array `statCards` (línea ~230) |
| A dónde navega cada tarjeta | `pages/Dashboard.jsx` → propiedad `navigateTo` en cada card |
| Qué aparece en Actividad Reciente | `pages/Dashboard.jsx` → `useMemo` de `recentActivity` (línea ~110) |
| Las barras de métricas | `pages/Dashboard.jsx` → `useMemo` de `performanceMetrics` (línea ~185) |
| Qué datos se traen del backend | `PanelModule.jsx` → `initializePanel()` dentro del `useEffect` |
| Los estilos de cards clickeables | `Panel.css` → sección `/* NUEVO */` al final |
