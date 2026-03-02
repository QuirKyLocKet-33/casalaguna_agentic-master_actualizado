/**
 * Event Emitter para CRM - Webhooks Reales
 * 
 * Sistema basado en eventos reales del widget/chatbot.
 * Sin polling constante - solo consulta cada 3 segundos.
 */

import { authService } from './api';

class CRMEventEmitter {
  constructor(apiUrl = 'http://localhost:8000') {
    this.apiUrl = apiUrl;
    this.listeners = {};
    this.lastEventId = 0;
    this.pollingInterval = 3000; // ms - Intervalo entre consultas (3 segundos)
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
   * Si se pasa callback, elimina solo ese listener.
   * Si NO se pasa callback, elimina TODOS los listeners de ese evento.
   */
  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    if (callback) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    } else {
      // Eliminar todos los listeners del evento
      delete this.listeners[eventName];
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

    console.log('[CRM EventEmitter] ⚡ Iniciando monitoreo de webhooks...');
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
    console.log('[CRM EventEmitter] ⏸️ Monitoreo de webhooks detenido');
  }

  /**
   * Función de polling - Consulta eventos periódicamente
   */
  async poll() {
    try {
      const token = authService.getToken();
      if (!token) {
        console.warn('[CRM EventEmitter] Sin token - deteniendo polling');
        this.stopPolling();
        return;
      }

      const response = await fetch(
        `${this.apiUrl}/crm/events?since=${this.lastEventId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.eventos && data.eventos.length > 0) {
        console.log(`[CRM EventEmitter] 📨 ${data.eventos.length} evento(s) recibido(s)`);
        
        // Procesar cada evento
        data.eventos.forEach(evento => {
          this.processEvent(evento);
        });
        
        // Actualizar lastEventId
        if (data.ultimo_event_id) {
          this.lastEventId = parseInt(data.ultimo_event_id.split('_')[1]) || 0;
        }
      }
      
      // Reset retry counter on success
      this.retryCount = 0;
      
    } catch (error) {
      this.retryCount++;
      console.warn(`[CRM EventEmitter] Error consultando webhooks (intento ${this.retryCount}/${this.maxRetries}):`, error.message);
      
      if (this.retryCount >= this.maxRetries) {
        console.error('[CRM EventEmitter] ❌ Demasiados intentos fallidos - deteniendo');
        this.stopPolling();
        return;
      }
    } finally {
      // Programar siguiente consulta
      if (this.isPolling) {
        this.pollingTimer = setTimeout(() => this.poll(), this.pollingInterval);
      }
    }
  }

  /**
   * Procesar evento recibido
   */
  processEvent(evento) {
    console.log(`[CRM EventEmitter] 🔔 Evento: ${evento.tipo}`, evento.datos);
    
    // Emitir evento específico
    this.emit(evento.tipo, evento.datos);
    
    // Emitir evento genérico
    this.emit('webhook_evento', evento);
  }
}

// Crear instancia global
const eventEmitter = new CRMEventEmitter(import.meta.env.VITE_API_URL || 'http://localhost:8000');

export default eventEmitter;
