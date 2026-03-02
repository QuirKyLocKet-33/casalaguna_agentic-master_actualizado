/**
 * Event Emitter para CRM
 * 
 * Sistema de notificaciones basado en Webhooks/Polling
 * Reemplaza WebSocket con actualizaciones en tiempo real mediante polling inteligente
 */

class CRMEventEmitter {
  constructor(apiUrl = 'http://localhost:8000') {
    this.apiUrl = apiUrl;
    this.listeners = {};
    this.lastEventId = 0;
    this.pollingInterval = 500; // ms - Intervalo de polling
    this.pollingTimer = null;
    this.isPolling = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  /**
   * Suscribirse a eventos
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    
    console.log(`[CRM EventEmitter] Listener registrado para: ${eventName}`);
  }

  /**
   * Desuscribirse de eventos
   */
  off(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }
  }

  /**
   * Emitir evento localmente (para testing)
   */
  emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error ejecutando listener para ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Iniciar polling de eventos
   */
  startPolling() {
    if (this.isPolling) {
      console.log('[CRM EventEmitter] Polling ya está activo');
      return;
    }

    console.log('[CRM EventEmitter] Iniciando polling de eventos...');
    this.isPolling = true;
    this.retryCount = 0;
    this.poll();
  }

  /**
   * Detener polling de eventos
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
    console.log('[CRM EventEmitter] Polling detenido');
  }

  /**
   * Función de polling - Consulta eventos periódicamente
   */
  async poll() {
    try {
      const response = await fetch(
        `${this.apiUrl}/webhook/events?since=${this.lastEventId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Procesar eventos nuevos
      if (data.events && data.events.length > 0) {
        console.log(`[CRM EventEmitter] Recibidos ${data.events.length} eventos nuevos`);
        
        data.events.forEach(event => {
          console.log(`[CRM EventEmitter] Evento: ${event.tipo}, Datos:`, event.datos);
          // Emitir con el tipo correcto (tipo, no type)
          this.emit(event.tipo, event.datos);
        });

        // Actualizar ID del último evento
        if (data.events && data.events.length > 0) {
          // Usar el ID del último evento para el siguiente polling
          this.lastEventId = parseInt(data.events[data.events.length - 1].id.split('_')[1]) || this.lastEventId;
        }
      }

      // Reiniciar contador de reintentos
      this.retryCount = 0;

      // Programar siguiente polling
      this.scheduleNextPoll();

    } catch (error) {
      console.error('[CRM EventEmitter] Error en polling:', error);
      
      // Reintentar con backoff exponencial
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
        console.log(`[CRM EventEmitter] Reintentando en ${backoffTime}ms (intento ${this.retryCount}/${this.maxRetries})`);
        
        // Emitir evento de reconexión
        this.emit('reconnecting', { attempt: this.retryCount });
        
        this.pollingTimer = setTimeout(() => {
          if (this.isPolling) {
            this.poll();
          }
        }, backoffTime);
      } else {
        console.error('[CRM EventEmitter] Máximo de reintentos alcanzado');
        this.isPolling = false;
        this.emit('connection_failed', { message: 'No se pudo conectar al servidor' });
      }
    }
  }

  /**
   * Programar siguiente polling
   */
  scheduleNextPoll() {
    this.pollingTimer = setTimeout(() => {
      if (this.isPolling) {
        this.poll();
      }
    }, this.pollingInterval);
  }

  /**
   * Verificar estado de conexión
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/webhook/status`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        return { status: 'offline', error: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Reconectar desde cero
   */
  async reconnect() {
    console.log('[CRM EventEmitter] Reconectando...');
    this.stopPolling();
    this.lastEventId = 0;
    this.retryCount = 0;
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.startPolling();
  }
}

// Exportar instancia singleton
const eventEmitter = new CRMEventEmitter();

export default eventEmitter;
