import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaComments, 
  FaCalendarAlt, 
  FaPercent,
  FaUsers,
  FaRobot,
  FaClock,
  FaWhatsapp,
  FaGlobe,
  FaArrowUp,
  FaArrowDown,
  FaInstagram,
  FaFacebookMessenger,
  FaExternalLinkAlt,
  FaEnvelope,
  FaUserPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserShield,
  FaPowerOff,
  FaBell
} from 'react-icons/fa';
import '../Panel.css';
import DonutChart from '../components/DonutChart'; // [MOD] Componente de gráfica de anillo (donut)

// ════════════════════════════════════════════════════════════
// Dashboard — Panel principal conectado a endpoints reales
// 
// PROPS recibidas desde PanelModule.jsx:
//   • metrics        → crmService.getMetrics()
//   • conversations   → crmService.getConversations()
//   • reservations    → reservationsService.getReservations()
//   • clients         → clientsService.getClients()
//
// MODIFICABLE: Cada sección está claramente comentada para
//              que puedas editarla de forma independiente.
// ════════════════════════════════════════════════════════════

function Dashboard({ metrics, conversations, reservations, clients, liveEvents }) {
  const navigate = useNavigate();

  // ── Estado del filtro de período para Actividad Reciente ──
  // Opciones: 'dia' | 'semana' | 'mes' | 'ano'
  const [activityFilter, setActivityFilter] = useState('dia');

  // ──────────────────────────────────────────────────
  // SECCIÓN 1: Cálculo de estadísticas reales
  // Fuente: conversations (agrupadas por fecha) + metrics del backend
  // EDITAR AQUÍ para cambiar cómo se calculan los totales
  // ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let activeConversations = 0;
    let conversationsWithReservation = 0;
    let totalConversations = 0;
    let webClients = 0;
    let whatsappClients = 0;

    if (conversations && typeof conversations === 'object') {
      Object.keys(conversations).forEach(date => {
        if (Array.isArray(conversations[date])) {
          conversations[date].forEach(conv => {
            totalConversations++;
            if (conv.is_active) activeConversations++;
            if (conv.has_reservation) conversationsWithReservation++;
            if (conv.canal === 'whatsapp') whatsappClients++;
            else webClients++;
          });
        }
      });
    }

    // Datos reales del endpoint /crm/metrics
    const totalMessages = metrics?.total_messages || 0;
    const totalReservations = metrics?.total_reservations || 0;
    const uniqueClients = metrics?.unique_clients || 0;
    const conversionRate = metrics?.conversion_rate || 0;
    const avgResponseTime = metrics?.avg_response_time || 0;

    // Datos reales de clientes y reservas (endpoints separados)
    const clientCount = Array.isArray(clients) ? clients.length : uniqueClients;
    const reservationCount = Array.isArray(reservations)
      ? Object.values(reservations).flat().length
      : totalReservations;

    return {
      activeConversations,
      conversationsWithReservation,
      totalConversations,
      totalMessages,
      totalReservations: reservationCount,
      uniqueClients: clientCount,
      conversionRate,
      avgResponseTime,
      webClients,
      whatsappClients,
    };
  }, [metrics, conversations, reservations, clients]);

  // ──────────────────────────────────────────────────
  // SECCIÓN 2: Actividad reciente — EVENTOS REALES
  //
  // Combina 2 fuentes:
  //   A) liveEvents → Eventos en tiempo real del eventEmitter
  //      (mensaje_nuevo, conversation_update, handoff, etc.)
  //   B) conversations → Últimos mensajes de cada conversación
  //      + reservas recientes de metrics
  //
  // Cada item muestra: TIPO DE EVENTO · USUARIO · HORA
  //
  // ⚠️ LIMITADO A ACTIVIDAD DEL DÍA ACTUAL ÚNICAMENTE (00:00 - 23:59)
  //
  // EDITAR AQUÍ para cambiar qué eventos se muestran
  // ──────────────────────────────────────────────────

  // ════════════════════════════════════════════════════
  // HELPERS: Rangos de tiempo para los filtros
  // Día (00:00-23:59), Semana, Mes, Año
  // ════════════════════════════════════════════════════

  // Calcular límites según el filtro seleccionado
  const timeBounds = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Últimos 7 días (no solo desde el lunes, para siempre mostrar datos recientes)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

    // Inicio del mes
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Inicio del año
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    return {
      dia:    { start: startOfDay,   end: endOfDay },
      semana: { start: startOfWeek,  end: endOfDay },
      mes:    { start: startOfMonth, end: endOfDay },
      ano:    { start: startOfYear,  end: endOfDay },
      todayStr: startOfDay.toISOString().split('T')[0],
    };
  }, []);

  // Función genérica: ¿está el timestamp dentro del rango del filtro actual?
  // Ahora soporta formatos DD/MM/YYYY, ISO, etc.
  const isInRange = useCallback((timestamp) => {
    if (!timestamp) return false;
    // Intentar ISO nativo primero
    let d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      // DD/MM/YYYY o DD/MM/YYYY HH:MM
      const ddmm = timestamp.match?.(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (ddmm) {
        const [, day, month, year, h, m] = ddmm;
        d = new Date(+year, +month - 1, +day, +(h || 0), +(m || 0));
      }
      if (isNaN(d.getTime())) return false;
    }
    const bounds = timeBounds[activityFilter] || timeBounds.dia;
    return d >= bounds.start && d <= bounds.end;
  }, [timeBounds, activityFilter]);

  // Helper rápido: solo hoy (para conversaciones por clave de fecha)
  const isToday = useCallback((timestamp) => {
    if (!timestamp) return false;
    let d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      const ddmm = timestamp.match?.(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (ddmm) {
        const [, day, month, year, h, m] = ddmm;
        d = new Date(+year, +month - 1, +day, +(h || 0), +(m || 0));
      }
      if (isNaN(d.getTime())) return false;
    }
    return d >= timeBounds.dia.start && d <= timeBounds.dia.end;
  }, [timeBounds]);

  // Fecha de hoy en formato YYYY-MM-DD
  const todayDateStr = timeBounds.todayStr;

  // ════════════════════════════════════════════════════
  // Helper: parsear cualquier formato de fecha a Date
  // Soporta ISO, DD/MM/YYYY, DD/MM/YYYY HH:MM, YYYY-MM-DD
  // ════════════════════════════════════════════════════
  const parseAnyDate = useCallback((str) => {
    if (!str) return null;
    // Intentar ISO nativo primero
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    // DD/MM/YYYY o DD/MM/YYYY HH:MM
    const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (ddmm) {
      const [, day, month, year, h, m] = ddmm;
      return new Date(+year, +month - 1, +day, +(h || 0), +(m || 0));
    }
    return null;
  }, []);

  // ════════════════════════════════════════════════════
  // Helper: ¿la clave de fecha (YYYY-MM-DD) está dentro del rango?
  // Esto es un fallback robusto cuando los timestamps no parsean bien
  // ════════════════════════════════════════════════════
  const isDateKeyInRange = useCallback((dateKey, boundsObj) => {
    if (!dateKey) return false;
    try {
      // dateKey formato: "YYYY-MM-DD"
      const parts = dateKey.split('-');
      if (parts.length !== 3) return false;
      const d = new Date(+parts[0], +parts[1] - 1, +parts[2], 12, 0, 0); // mediodía para evitar edge de zona horaria
      return d >= boundsObj.start && d <= boundsObj.end;
    } catch {
      return false;
    }
  }, []);

  // ════════════════════════════════════════════════════
  // Obtener conversaciones filtradas según el período seleccionado
  // Usa DOBLE verificación: por timestamp Y por clave de fecha
  // ════════════════════════════════════════════════════
  const filteredConversations = useMemo(() => {
    if (!conversations || typeof conversations !== 'object') return [];

    const allKeys = Object.keys(conversations);
    const bounds = timeBounds[activityFilter] || timeBounds.dia;
    let convs = [];
    const seenIds = new Set();

    allKeys.forEach(dateKey => {
      const dateConvs = conversations[dateKey];
      if (!Array.isArray(dateConvs)) return;

      // Verificar si la CLAVE de fecha (YYYY-MM-DD) está dentro del rango
      const dateKeyInRange = isDateKeyInRange(dateKey, bounds);

      dateConvs.forEach(conv => {
        if (seenIds.has(conv.id)) return;

        let included = false;

        // 1) Verificar por timestamp (preciso)
        const ts = conv.last_timestamp || conv.created_at;
        if (ts) {
          const d = parseAnyDate(ts);
          if (d && d >= bounds.start && d <= bounds.end) {
            included = true;
          }
        }

        // 2) Fallback: si la clave de fecha está en el rango, incluir
        if (!included && dateKeyInRange) {
          included = true;
        }

        // 3) Activas siempre se incluyen en "dia"
        if (!included && activityFilter === 'dia' && conv.is_active) {
          included = true;
        }

        if (included && !seenIds.has(conv.id)) {
          convs.push(conv);
          seenIds.add(conv.id);
        }
      });
    });

    return convs;
  }, [conversations, timeBounds, activityFilter, isDateKeyInRange, parseAnyDate]);
  // ════════════════════════════════════════════════════

  // Mapa de tipo de evento → icono, clase CSS, título legible y ruta
  const eventTypeConfig = {
    mensaje_nuevo:         { icon: FaEnvelope,              iconClass: 'primary',  title: 'Nuevo mensaje',             link: '/chats' },
    conversation_update:   { icon: FaComments,              iconClass: 'info',     title: 'Conversación actualizada',  link: '/chats' },
    conversacion_inactiva: { icon: FaPowerOff,              iconClass: 'warning',  title: 'Conversación inactiva',     link: '/chats' },
    handoff:               { icon: FaUserShield,            iconClass: 'admin',    title: 'Handoff admin/bot',         link: '/chats' },
    soporte_urgente:       { icon: FaExclamationTriangle,   iconClass: 'danger',   title: 'Soporte urgente',           link: '/chats' },
    auto_closed:           { icon: FaPowerOff,              iconClass: 'warning',  title: 'Cierre automático',         link: '/chats' },
    chat_activo:           { icon: FaComments,              iconClass: 'primary',  title: 'Chat activo',               link: '/chats' },
    reserva_reciente:      { icon: FaCheckCircle,           iconClass: 'success',  title: 'Reserva confirmada',        link: '/reservations' },
    reserva_conversacion:  { icon: FaCalendarAlt,           iconClass: 'success',  title: 'Reserva en conversación',   link: '/reservations' },
    nuevo_cliente:         { icon: FaUserPlus,              iconClass: 'primary',  title: 'Cliente registrado',        link: '/clients' },
    default:               { icon: FaBell,                  iconClass: 'info',     title: 'Evento',                    link: '/panel' },
  };

  const recentActivity = useMemo(() => {
    const activities = [];

    // ── FUENTE A: Eventos en tiempo real del eventEmitter ──
    // Filtrados según período seleccionado
    if (Array.isArray(liveEvents)) {
      liveEvents
        .filter(evt => isInRange(evt.timestamp))
        .forEach(evt => {
          const config = eventTypeConfig[evt.tipo] || eventTypeConfig.default;
          activities.push({
            id: evt.id,
            type: evt.tipo,
            title: config.title,
            usuario: evt.usuario || 'Sistema',
            canal: evt.canal || '',
            detalle: evt.detalle || '',
            timestamp: evt.timestamp,
            icon: config.icon,
            iconClass: config.iconClass,
            link: config.link
          });
        });
    }

    // ── FUENTE B: Conversaciones del período seleccionado ──
    if (Array.isArray(filteredConversations) && filteredConversations.length > 0) {
      filteredConversations.forEach(conv => {
        const lastMsg = conv.messages && conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1]
          : null;
        
        // Usar timestamp del último mensaje o de la conversación
        const convTimestamp = lastMsg?.timestamp || conv.last_timestamp || conv.created_at;
        const userName = conv.usuario_nombre || conv.user_id || 'Usuario';
        const canal = conv.canal || conv.channel || 'web';
        
        // Determinar si es de hoy o de otro día
        const convIsToday = isToday(convTimestamp);
        
        // Evitar duplicados con liveEvents
        const evtId = `conv-${conv.id}`;
        if (!activities.find(a => a.id === evtId)) {
          // Determinar el detalle del mensaje
          let detalle = 'Sin mensajes';
          if (lastMsg) {
            if (lastMsg.role === 'user') {
              detalle = lastMsg.content?.substring(0, 50) || 'Mensaje del usuario';
            } else {
              detalle = `Respuesta ${lastMsg.role === 'bot' ? 'del bot' : 'de admin'}`;
            }
          } else if (conv.messages && conv.messages.length > 0) {
            detalle = `${conv.messages.length} mensaje${conv.messages.length > 1 ? 's' : ''}`;
          }
          
          // Título según estado y si es de hoy
          let title = 'Conversación';
          if (conv.is_active) {
            title = 'Chat activo';
          } else if (convIsToday) {
            title = 'Conversación de hoy';
          } else {
            // Para días anteriores, mostrar la fecha
            const dateStr = conv.date || '';
            title = `Conversación del ${dateStr}`;
          }
          
          activities.push({
            id: evtId,
            type: conv.is_active ? 'chat_activo' : 'conversation_update',
            title: title,
            usuario: userName,
            canal: canal,
            detalle: detalle,
            timestamp: convTimestamp,
            icon: conv.is_active ? FaComments : FaEnvelope,
            iconClass: conv.is_active ? 'primary' : 'info',
            link: '/chats'
          });
        }

        // Conversaciones con reserva
        if (conv.has_reservation) {
          const resId = `res-${conv.id}`;
          if (!activities.find(a => a.id === resId)) {
            activities.push({
              id: resId,
              type: 'reserva_conversacion',
              title: 'Reserva en conversación',
              usuario: userName,
              canal: canal,
              detalle: '',
              timestamp: conv.last_timestamp || conv.created_at,
              icon: FaCalendarAlt,
              iconClass: 'success',
              link: '/reservations'
            });
          }
        }
      });
    }

    // ── FUENTE B2: Reservas recientes (filtradas por período) ──
    if (metrics?.recent_reservations) {
      metrics.recent_reservations
        .filter(res => isInRange(res.timestamp || res.fecha_hora || res.created_at))
        .forEach((res, idx) => {
          const resId = `res-recent-${res.id || idx}`;
          if (!activities.find(a => a.id === resId)) {
            activities.push({
              id: resId,
              type: 'reserva_reciente',
              title: 'Reserva confirmada',
              usuario: res.nombre || res.telefono || 'Cliente',
              canal: '',
              detalle: `${res.personas || '?'} personas`,
              timestamp: res.timestamp || res.fecha_hora || res.created_at,
              icon: FaCheckCircle,
              iconClass: 'success',
              link: '/reservations'
            });
          }
        });
    }

    // ── FUENTE B3: Reservaciones completas (para semana/mes/año) ──
    if (Array.isArray(reservations) || (reservations && typeof reservations === 'object')) {
      const allRes = Array.isArray(reservations) ? reservations : Object.values(reservations).flat();
      allRes
        .filter(res => isInRange(res.timestamp || res.fecha_hora || res.created_at))
        .forEach((res, idx) => {
          const resId = `res-full-${res.id || idx}`;
          if (!activities.find(a => a.id === resId || a.usuario === (res.nombre || res.telefono))) {
            activities.push({
              id: resId,
              type: 'reserva_reciente',
              title: 'Reserva confirmada',
              usuario: res.nombre || res.telefono || 'Cliente',
              canal: '',
              detalle: `${res.personas || '?'} personas — ${res.status || 'confirmada'}`,
              timestamp: res.timestamp || res.fecha_hora || res.created_at,
              icon: FaCheckCircle,
              iconClass: 'success',
              link: '/reservations'
            });
          }
        });
    }

    // Ordenar por timestamp más reciente (soporta formatos variados)
    activities.sort((a, b) => {
      const parse = (ts) => {
        if (!ts) return 0;
        let d = new Date(ts);
        if (!isNaN(d.getTime())) return d.getTime();
        const ddmm = ts.match?.(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
        if (ddmm) {
          const [, day, month, year, h, m] = ddmm;
          return new Date(+year, +month - 1, +day, +(h || 0), +(m || 0)).getTime();
        }
        return 0;
      };
      return parse(b.timestamp) - parse(a.timestamp);
    });

    // [COPILOT-EDIT] INICIO: Filtro global de 1 hora para Actividades Recientes
    const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hora en milisegundos
    const parse = (ts) => {
      if (!ts) return 0;
      let d = new Date(ts);
      if (!isNaN(d.getTime())) return d.getTime();
      const ddmm = ts.match?.(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (ddmm) {
        const [, day, month, year, h, m] = ddmm;
        return new Date(+year, +month - 1, +day, +(h || 0), +(m || 0)).getTime();
      }
      return 0;
    };
    const filteredByTime = activities.filter(act => parse(act.timestamp) >= oneHourAgo);
    // [COPILOT-EDIT] FIN

    return filteredByTime.slice(0, 20); // Máximo 20 items
  }, [filteredConversations, metrics, reservations, liveEvents, isInRange, isToday, parseAnyDate]);

  // ──────────────────────────────────────────────────
  // SECCIÓN 3: Métricas de rendimiento REALES
  // Fuente: metrics del backend + cálculos de conversations
  // EDITAR AQUÍ para cambiar qué métricas se muestran
  // ──────────────────────────────────────────────────
  const performanceMetrics = useMemo(() => {
    const totalConv = stats.totalConversations || 1;
    const activeRate = Math.round((stats.activeConversations / totalConv) * 100);
    const reservationRate = Math.round((stats.conversationsWithReservation / totalConv) * 100);
    
    return {
      availability: metrics?.status === 'online' ? 100 : 0,
      activeRate: Math.min(activeRate, 100),
      conversionRate: stats.conversionRate,
      reservationRate: Math.min(reservationRate, 100),
      avgResponseTime: stats.avgResponseTime,
    };
  }, [metrics, stats]);

  // ──────────────────────────────────────────────────
  // [MOD] SECCIÓN 3b: Métricas filtradas por período
  // Recalcula TODAS las métricas según el rango seleccionado
  // en las pastillas (día/semana/mes/año)
  // ──────────────────────────────────────────────────
  const filteredStats = useMemo(() => {
    const convs = filteredConversations || [];
    const totalConv = convs.length;
    let activeConv = 0;
    let withReservation = 0;
    let totalMsgs = 0;
    let webCount = 0;
    let whatsappCount = 0;

    convs.forEach(conv => {
      if (conv.is_active) activeConv++;
      if (conv.has_reservation) withReservation++;
      if (conv.messages) totalMsgs += conv.messages.length;
      if (conv.canal === 'whatsapp') whatsappCount++;
      else webCount++;
    });

    // Reservas del período
    let filteredReservations = 0;
    if (Array.isArray(reservations) || (reservations && typeof reservations === 'object')) {
      const allRes = Array.isArray(reservations) ? reservations : Object.values(reservations).flat();
      const bounds = timeBounds[activityFilter] || timeBounds.dia;
      allRes.forEach(res => {
        const ts = res.timestamp || res.fecha_hora || res.created_at;
        if (ts) {
          const d = parseAnyDate(ts);
          if (d && d >= bounds.start && d <= bounds.end) filteredReservations++;
        }
      });
    }

    // Si no hay reservas filtradas, usar withReservation como fallback
    const resCount = filteredReservations || withReservation;
    const conversionRate = totalMsgs > 0 ? Math.round((resCount / totalMsgs) * 100) : 0;
    const reservationRate = totalConv > 0 ? Math.round((withReservation / totalConv) * 100) : 0;

    return {
      activeConversations: activeConv,
      totalConversations: totalConv,
      conversationsWithReservation: withReservation,
      totalMessages: totalMsgs,
      totalReservations: resCount,
      uniqueClients: totalConv, // cada conversación ≈ 1 cliente en el período
      conversionRate: Math.min(conversionRate, 100),
      reservationRate: Math.min(reservationRate, 100),
      avgResponseTime: stats.avgResponseTime,
      webClients: webCount,
      whatsappClients: whatsappCount,
    };
  }, [filteredConversations, reservations, timeBounds, activityFilter, parseAnyDate, stats.avgResponseTime]);

  // ──────────────────────────────────────────────────
  // Helper: formato de tiempo relativo
  // ──────────────────────────────────────────────────
  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;
    if (diffHrs < 24) return `${diffHrs}h`;
    return `${diffDays}d`;
  }, []);

  // ──────────────────────────────────────────────────
  // SECCIÓN 4: Tarjetas de estadísticas con navegación
  // EDITAR AQUÍ para cambiar qué tarjetas aparecen,
  // sus valores o a dónde navegan al hacer click
  // ──────────────────────────────────────────────────
  if (!stats) {
    return (
      <div className="dashboard">
        <div className="loading">
          <p>Inicializando panel...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: 1,
      title: 'Chats Activos',
      value: filteredStats.activeConversations,
      icon: FaComments,
      color: 'var(--primary)',
      bgColor: 'var(--primary-light)',
      navigateTo: '/chats',
      subtitle: `${filteredStats.totalMessages} mensajes`
    },
    {
      id: 2,
      title: 'Reservas',
      value: filteredStats.totalReservations,
      icon: FaCalendarAlt,
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      navigateTo: '/reservations',
      subtitle: `${filteredStats.conversationsWithReservation} en conversaciones`
    },
    {
      id: 3,
      title: 'Clientes',
      value: filteredStats.uniqueClients,
      icon: FaUsers,
      color: 'var(--success)',
      bgColor: 'rgba(52, 211, 153, 0.1)',
      navigateTo: '/clients',
      subtitle: `${filteredStats.totalConversations} conversaciones`
    },
    {
      id: 4,
      title: 'Conversión',
      value: `${filteredStats.conversionRate}%`,
      icon: FaPercent,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      navigateTo: '/panel',
      subtitle: `Reservas / Mensajes`
    }
  ];


  return (
    <div className="dashboard">
      {/* HEADER DEL DASHBOARD */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Panel de Control</h1>
          <p className="header-subtitle">Datos en tiempo real desde los endpoints del sistema</p>
        </div>
        <div className="header-actions">
          {metrics?.status === 'online' && (
            <div className="live-indicator">
              <span className="live-dot"></span>
              En línea
            </div>
          )}
        </div>
      </div>

      {/* NUEVA UBICACIÓN: Pastillas de período justo encima de las métricas */}
      <div className="period-pills-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div className="header-period-pills">
          {[
            { key: 'dia',    label: 'Día' },
            { key: 'semana', label: 'Semana' },
            { key: 'mes',    label: 'Mes' },
            { key: 'ano',    label: 'Año' },
          ].map(f => (
            <button
              key={f.key}
              className={`activity-filter-pill${activityFilter === f.key ? ' active' : ''}`}
              onClick={() => setActivityFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS (clickeables) */}
      <div className="stats-grid">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="stat-card stat-card--clickable"
              onClick={() => navigate(card.navigateTo)}
              title={`Ir a ${card.title}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <div className="stat-icon" style={{ background: card.bgColor }}>
                  <Icon style={{ color: card.color }} />
                </div>
                <span className="stat-nav-hint">
                  <FaExternalLinkAlt />
                </span>
              </div>
              <div className="stat-body">
                <h3 className="stat-value">{card.value}</h3>
                <p className="stat-label">{card.title}</p>
                <p className="stat-subtitle">{card.subtitle}</p>
              </div>
              <div className="stat-glow" style={{ background: card.color }}></div>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* SECCIONES PRINCIPALES                           */}
      {/* ════════════════════════════════════════════════ */}
      <div className="dashboard-grid">

        {/* ──────────────────────────────────────────── */}
        {/* ACTIVIDAD RECIENTE — eventos reales           */}
        {/* Fuente: liveEvents (eventEmitter) +           */}
        {/*         conversations + reservations + clients */}
        {/* Muestra: tipo de evento · usuario · hora      */}
        {/* EDITAR: recentActivity useMemo arriba          */}
        {/* ──────────────────────────────────────────── */}
        {/* [MOD-COMPACT-ACTIVITY] Tarjeta con altura fija y scroll interno */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <h3>Actividad Reciente</h3>
            <button className="card-action" onClick={() => navigate('/chats')}>Ver todo</button>
          </div>
          {/* [MOD-COMPACT-ACTIVITY] Contenedor scrollable para la lista */}
          <div className="activity-list-wrapper">
            <div className="activity-list">
              {recentActivity.length === 0 ? (
                <div className="activity-empty">
                  <p>Sin actividad reciente</p>
                </div>
              ) : (
                recentActivity.map(activity => {
                const ActivityIcon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="activity-item activity-item--clickable"
                    onClick={() => navigate(activity.link)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`activity-icon ${activity.iconClass}`}>
                      <ActivityIcon />
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <span className="activity-meta">
                        <strong>{activity.usuario}</strong>
                        {activity.canal ? ` · ${activity.canal}` : ''}
                        {activity.detalle ? ` — ${activity.detalle}` : ''}
                      </span>
                    </div>
                    <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                );
              })
            )}
            </div>
          </div>
          {/* [MOD-COMPACT-ACTIVITY] Fin de contenedor scrollable */}
        </div>

        {/* [MOD-GRID-METRICS] MÉTRICAS PRINCIPALES — Grid 2x2 in-place, sin tarjetas individuales */}
        {/* Max-height: activity-card (420px) + gap (16px) + response-pill (60px) = 496px */}
        <div className="dashboard-card metrics-unified-card">
          <div className="metrics-charts-wrapper">

            {/* [MOD-GRID-METRICS] Gráfica 1: Conversión — naranja / rojo */}
            <div className="metrics-chart-item">
              <h4 className="metrics-chart-title">Conversión</h4>
              <DonutChart
                title="Conversión"
                value={filteredStats.conversionRate}
                segments={[
                  {
                    label: 'Convertidas',
                    value: filteredStats.conversionRate,
                    color: 'var(--donut-conversion, #F39C12)',
                  },
                  {
                    label: 'Sin conversión',
                    value: Math.max(100 - filteredStats.conversionRate, 0),
                    color: 'var(--donut-conversion-bg, #E74C3C)',
                  },
                ]}
              />
            </div>

            {/* [MOD-GRID-METRICS] Gráfica 2: Satisfacción — ámbar / canela */}
            <div className="metrics-chart-item">
              <h4 className="metrics-chart-title">Satisfacción</h4>
              <DonutChart
                title="Satisfacción"
                value={85}
                segments={[
                  {
                    label: 'Satisfechos',
                    value: 85,
                    color: 'var(--donut-satisfaction, #f6a700)',
                  },
                  {
                    label: 'Insatisfechos',
                    value: 15,
                    color: 'var(--donut-satisfaction-bg, #d4a373)',
                  },
                ]}
              />
            </div>

            {/* [MOD-GRID-METRICS] Gráfica 3: Cancelación — cabernet / borgoña */}
            <div className="metrics-chart-item">
              <h4 className="metrics-chart-title">Cancelación</h4>
              <DonutChart
                title="Cancelación"
                value={filteredStats.totalConversations > 0
                  ? Math.round(((filteredStats.totalConversations - filteredStats.activeConversations - filteredStats.conversationsWithReservation) / filteredStats.totalConversations) * 100)
                  : 0
                }
                segments={[
                  {
                    label: 'Canceladas',
                    value: Math.max((filteredStats.totalConversations || 0) - (filteredStats.activeConversations || 0) - (filteredStats.conversationsWithReservation || 0), 0),
                    color: 'var(--donut-cancellation, #a4161a)',
                  },
                  {
                    label: 'Activas/Exitosas',
                    value: (filteredStats.activeConversations || 0) + (filteredStats.conversationsWithReservation || 0),
                    color: 'var(--donut-cancellation-bg, #56070c)',
                  },
                ]}
              />
            </div>

            {/* [COPILOT-EDIT] INICIO: Integrado como una gráfica más dentro del bloque principal */}
            <div
              className="metrics-chart-item response-time-pill"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <span className="response-time-value">{filteredStats.avgResponseTime}ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                <h4 className="metrics-chart-title response-time-label">
                  <FaClock style={{ marginRight: '6px', color: 'var(--primary)' }} />
                  Tiempo respuesta promedio
                </h4>
              </div>
            </div>
            {/* [COPILOT-EDIT] FIN */}

          </div>
        </div>

        {/* ──────────────────────────────────────────── */}
        {/* CANALES — NO MODIFICADO                      */}
        {/* (WhatsApp, Instagram, Messenger sin cambios) */}
        {/* ──────────────────────────────────────────── */}
        <div className="dashboard-card channels-card">
          <div className="card-header">
            <h3>Canales</h3>
          </div>
          <div className="channels-list">
            <div className="channel-item">
              <div className="channel-icon whatsapp">
                <FaWhatsapp />
              </div>
              <div className="channel-info">
                <span className="channel-name">WhatsApp</span>
                <span className="channel-status connected">Conectado</span>
              </div>
              <span className="channel-count">{stats.whatsappClients || 0}</span>
            </div>
            <div className="channel-item">
              <div className="channel-icon web">
                <FaGlobe />
              </div>
              <div className="channel-info">
                <span className="channel-name">Widget Web</span>
                <span className="channel-status connected">Conectado</span>
              </div>
              <span className="channel-count">{stats.webClients || 0}</span>
            </div>
            <div className="channel-item">
              <div className="channel-icon instagram">
                <FaInstagram />
              </div>
              <div className="channel-info">
                <span className="channel-name">Instagram</span>
                <span className="channel-status connected">Conectado</span>
              </div>
              <span className="channel-count">{stats.instagramClients || 0}</span>
            </div>
            <div className="channel-item">
              <div className="channel-icon messenger">
                <FaFacebookMessenger />
              </div>
              <div className="channel-info">
                <span className="channel-name">Messenger</span>
                <span className="channel-status connected">Conectado</span>
              </div>
              <span className="channel-count">{stats.messengerClients || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
