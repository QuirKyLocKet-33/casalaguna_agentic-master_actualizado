import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../../shared/components/Navbar';
import Sidebar from '../../shared/components/Sidebar';
import Dashboard from './pages/Dashboard';
import eventEmitter from '../../shared/services/eventEmitter';
import { crmService, reservationsService, clientsService } from '../../shared/services/api';
import './Panel.css';

// ════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE POLLING (ACTUALIZACIÓN EN TIEMPO REAL)
// ════════════════════════════════════════════════════════════════════
const POLLING_INTERVAL_MS = 5000; // Refrescar datos cada 5 segundos
const METRICS_REFRESH_INTERVAL_MS = 10000; // Métricas cada 10 segundos

function PanelModule({ user, darkMode, setDarkMode, setUser }) {
  const [conversations, setConversations] = useState({});
  const [metrics, setMetrics] = useState({
    total_messages: 0,
    total_reservations: 0,
    unique_clients: 0,
    conversion_rate: 0,
    status: 'loading'
  });
  // ── Estado para reservas y clientes reales ──
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  // ── Estado para eventos en tiempo real (Actividad Reciente) ──
  // Acumula eventos del eventEmitter para mostrar actividad real
  const [liveEvents, setLiveEvents] = useState([]);
  const MAX_LIVE_EVENTS = 30; // Máximo de eventos acumulados
  const [notificationCount, setNotificationCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  
  // ─── Referencias para polling intervals ───
  const pollingRef = useRef(null);
  const metricsPollingRef = useRef(null);
  
  // ════════════════════════════════════════════════════════════════
  // FUNCIÓN DE POLLING: Refrescar datos de conversaciones y clientes
  // ════════════════════════════════════════════════════════════════
  const refreshConversationsAndClients = useCallback(async () => {
    try {
      console.log('🔄 [PanelModule] Polling: Refrescando conversaciones y clientes...');
      const [convData, reservationsData, clientsData] = await Promise.all([
        crmService.getConversations(),
        reservationsService.getReservations().catch(() => []),
        clientsService.getClients().catch(() => [])
      ]);
      setConversations(convData);
      setReservations(reservationsData);
      setClients(clientsData);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error en polling de datos:', error);
      setConnectionStatus('error');
    }
  }, []);
  
  // ════════════════════════════════════════════════════════════════
  // FUNCIÓN DE POLLING: Refrescar métricas
  // ════════════════════════════════════════════════════════════════
  const refreshMetrics = useCallback(async () => {
    try {
      console.log('📊 [PanelModule] Polling: Refrescando métricas...');
      const metricsData = await crmService.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }, []);

  useEffect(() => {
    const initializePanel = async () => {
      try {
        // Cargar datos iniciales (ahora incluye reservas y clientes)
        const [convData, metricsData, reservationsData, clientsData] = await Promise.all([
          crmService.getConversations(),
          crmService.getMetrics(),
          reservationsService.getReservations().catch(() => []),
          clientsService.getClients().catch(() => [])
        ]);

        setConversations(convData);
        setMetrics(metricsData);
        // ── NUEVO: guardar reservas y clientes reales ──
        setReservations(reservationsData);
        setClients(clientsData);
        // ── FIN NUEVO ──

        // ════════════════════════════════════════════════════════
        // LISTENERS DE EVENTOS EN TIEMPO REAL (eventEmitter)
        // Cada listener reacciona a eventos del backend vía polling
        // EDITAR AQUÍ para agregar/quitar actualizaciones en tiempo real
        // ════════════════════════════════════════════════════════

        // Helper: registrar evento en liveEvents para Actividad Reciente
        const pushLiveEvent = (event) => {
          setLiveEvents(prev => {
            const next = [event, ...prev];
            return next.slice(0, MAX_LIVE_EVENTS);
          });
        };

        // [EVENTO 1] crm_update — El backend envía métricas, conversaciones y clientes
        eventEmitter.on('crm_update', (data) => {
          console.log('📊 [PanelModule] crm_update recibido:', Object.keys(data));
          if (data.conversations) setConversations(data.conversations);
          if (data.metrics) setMetrics(data.metrics);
          if (data.clients) setClients(data.clients);
        });

        // [EVENTO 2] conversation_update — Una conversación individual cambió
        eventEmitter.on('conversation_update', async (data) => {
          console.log('💬 [PanelModule] conversation_update → recargando datos...');
          // Registrar como evento de actividad
          const conv = data?.conversation;
          pushLiveEvent({
            id: `evt-conv-${Date.now()}`,
            tipo: 'conversation_update',
            usuario: conv?.usuario_nombre || conv?.user_id || 'Usuario',
            canal: conv?.channel || conv?.canal || 'web',
            detalle: conv?.handoff_state === 'human_active' ? 'Admin intervino' : 'Conversación actualizada',
            timestamp: new Date().toISOString()
          });
          try {
            const [updConv, updMetrics, updRes, updCli] = await Promise.all([
              crmService.getConversations(),
              crmService.getMetrics(),
              reservationsService.getReservations().catch(() => []),
              clientsService.getClients().catch(() => [])
            ]);
            setConversations(updConv);
            setMetrics(updMetrics);
            setReservations(updRes);
            setClients(updCli);
          } catch (error) {
            console.error('Error en conversation_update:', error);
          }
        });

        // [EVENTO 3] conversacion_inactiva — Un usuario cerró/recargó el widget
        eventEmitter.on('conversacion_inactiva', async (data) => {
          console.log('🔴 [PanelModule] Conversación marcada como inactiva:', data);
          pushLiveEvent({
            id: `evt-inact-${Date.now()}`,
            tipo: 'conversacion_inactiva',
            usuario: data?.usuario_id || 'Usuario',
            canal: '',
            detalle: 'Conversación marcada como inactiva',
            timestamp: data?.timestamp || new Date().toISOString()
          });
          try {
            const [updConv, updMetrics] = await Promise.all([
              crmService.getConversations(),
              crmService.getMetrics()
            ]);
            setConversations(updConv);
            setMetrics(updMetrics);
          } catch (error) {
            console.error('Error actualizando tras inactividad:', error);
          }
        });

        // [EVENTO 4] mensaje_nuevo — Nuevo mensaje desde widget/whatsapp
        eventEmitter.on('mensaje_nuevo', async (data) => {
          console.log('📩 [PanelModule] mensaje_nuevo → recargando...');
          pushLiveEvent({
            id: `evt-msg-${Date.now()}`,
            tipo: 'mensaje_nuevo',
            usuario: data?.usuario_nombre || data?.usuario_id || 'Usuario',
            canal: data?.canal || data?.fuente || 'web',
            detalle: data?.mensaje ? data.mensaje.substring(0, 60) : 'Nuevo mensaje recibido',
            timestamp: data?.timestamp || new Date().toISOString()
          });
          try {
            const [updConv, updMetrics] = await Promise.all([
              crmService.getConversations(),
              crmService.getMetrics()
            ]);
            setConversations(updConv);
            setMetrics(updMetrics);
          } catch (error) {
            console.error('Error en mensaje_nuevo:', error);
          }
        });

        // [EVENTO 5] handoff_state_change — Admin tomó/devolvió control
        eventEmitter.on('handoff_state_change', async (data) => {
          console.log('🔄 [PanelModule] handoff_state_change → recargando...');
          const isHuman = data?.new_state === 'human_active';
          pushLiveEvent({
            id: `evt-handoff-${Date.now()}`,
            tipo: 'handoff',
            usuario: data?.admin || 'Admin',
            canal: '',
            detalle: isHuman
              ? `Admin tomó el control (${data?.user_id || ''})`
              : `Conversación devuelta al bot (${data?.user_id || ''})`,
            timestamp: new Date().toISOString()
          });
          try {
            const updConv = await crmService.getConversations();
            setConversations(updConv);
          } catch (error) {
            console.error('Error en handoff_state_change:', error);
          }
        });

        // [EVENTO 6] soporte_urgente — Alerta de soporte urgente
        eventEmitter.on('soporte_urgente', (data) => {
          console.log('🚨 [PanelModule] Soporte urgente recibido:', data);
          pushLiveEvent({
            id: `evt-urgent-${Date.now()}`,
            tipo: 'soporte_urgente',
            usuario: data?.usuario_id || data?.usuario_nombre || 'Usuario',
            canal: data?.canal || '',
            detalle: 'Solicitud de soporte urgente',
            timestamp: data?.timestamp || new Date().toISOString()
          });
          setUrgentCount(prev => prev + 1);
          setNotificationCount(prev => prev + 1);
        });

        // [EVENTO 7] conversation_auto_closed — Conversación cerrada automáticamente
        eventEmitter.on('conversation_auto_closed', async (data) => {
          console.log('🔒 [PanelModule] conversation_auto_closed → recargando...');
          pushLiveEvent({
            id: `evt-closed-${Date.now()}`,
            tipo: 'auto_closed',
            usuario: data?.user_id || 'Usuario',
            canal: '',
            detalle: 'Conversación cerrada por inactividad',
            timestamp: data?.timestamp || new Date().toISOString()
          });
          try {
            const [updConv, updMetrics] = await Promise.all([
              crmService.getConversations(),
              crmService.getMetrics()
            ]);
            setConversations(updConv);
            setMetrics(updMetrics);
          } catch (error) {
            console.error('Error en conversation_auto_closed:', error);
          }
        });

        // [EVENTO 8] webhook_evento — Cualquier evento del webhook (captura genérica)
        // Solo registra eventos no manejados por los anteriores
        eventEmitter.on('webhook_evento', (evento) => {
          const tiposManejados = ['crm_update', 'conversation_update', 'conversacion_inactiva',
            'mensaje_nuevo', 'handoff_state_change', 'soporte_urgente', 'conversation_auto_closed'];
          if (!tiposManejados.includes(evento.tipo)) {
            pushLiveEvent({
              id: `evt-wh-${Date.now()}`,
              tipo: evento.tipo,
              usuario: evento.datos?.usuario_id || evento.datos?.user_id || 'Sistema',
              canal: evento.fuente || '',
              detalle: evento.tipo.replace(/_/g, ' '),
              timestamp: evento.timestamp || new Date().toISOString()
            });
          }
        });

        // Iniciar monitoreo de webhooks (cada 3 segundos)
        eventEmitter.startPolling();
        setConnectionStatus('connected');
        
        // ════════════════════════════════════════════════════════════
        // INICIO POLLING AUTOMÁTICO - ACTUALIZACIÓN EN TIEMPO REAL
        // ════════════════════════════════════════════════════════════
        console.log('🚀 [PanelModule] Iniciando polling automático de datos...');
        
        // Polling de conversaciones, reservas y clientes cada 5 segundos
        pollingRef.current = setInterval(refreshConversationsAndClients, POLLING_INTERVAL_MS);
        
        // Polling de métricas cada 10 segundos
        metricsPollingRef.current = setInterval(refreshMetrics, METRICS_REFRESH_INTERVAL_MS);
        
      } catch (error) {
        console.error('Error inicializando panel:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePanel();

    // ── CLEANUP: Dejar de escuchar eventos y detener polling al desmontar ──
    return () => {
      // Limpiar listeners del eventEmitter
      eventEmitter.off('crm_update');
      eventEmitter.off('conversation_update');
      eventEmitter.off('conversacion_inactiva');
      eventEmitter.off('mensaje_nuevo');
      eventEmitter.off('handoff_state_change');
      eventEmitter.off('soporte_urgente');
      eventEmitter.off('conversation_auto_closed');
      eventEmitter.off('webhook_evento');
      
      // ════════════════════════════════════════════════════════════
      // DETENER POLLING AUTOMÁTICO AL DESMONTAR
      // ════════════════════════════════════════════════════════════
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        console.log('⏹️ [PanelModule] Detenido polling de conversaciones');
      }
      if (metricsPollingRef.current) {
        clearInterval(metricsPollingRef.current);
        metricsPollingRef.current = null;
        console.log('⏹️ [PanelModule] Detenido polling de métricas');
      }
    };
  }, [refreshConversationsAndClients, refreshMetrics]);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        notificationCount={notificationCount}
        connectionStatus={connectionStatus}
        urgentCount={urgentCount}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="app-container">
        <Sidebar 
          user={user} 
          notificationCount={notificationCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onUserUpdate={setUser}
        />
        <div className="main-content">
          {loading ? (
            <div className="loading">Cargando panel...</div>
          ) : (
            <Dashboard 
              metrics={metrics} 
              conversations={conversations}
              reservations={reservations}
              clients={clients}
              liveEvents={liveEvents}
              onConversationsUpdate={async () => {
                const [updatedConv, updatedRes, updatedCli] = await Promise.all([
                  crmService.getConversations(),
                  reservationsService.getReservations().catch(() => []),
                  clientsService.getClients().catch(() => [])
                ]);
                setConversations(updatedConv);
                setReservations(updatedRes);
                setClients(updatedCli);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PanelModule;
