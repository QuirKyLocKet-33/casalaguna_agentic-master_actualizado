import axios from 'axios';
import ENV_CONFIG from '../../config/env';

const API_URL = ENV_CONFIG.API_URL;
const TOKEN_KEY = ENV_CONFIG.AUTH.TOKEN_STORAGE_KEY;

// Instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Agregar token a todas las peticiones si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Servicio de autenticación
export const authService = {
  login: async (username, password) => {
    const response = await apiClient.post(ENV_CONFIG.AUTH.LOGIN_ENDPOINT, { 
      username, 
      password 
    });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
  },

  verify: async () => {
    const response = await apiClient.get(ENV_CONFIG.AUTH.VERIFY_ENDPOINT);
    return response.data;
  },

  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/crm/auth/profile', data);
    return response.data;
  }
};

// Servicio de CRM (métricas, conversaciones)
export const crmService = {
  getMetrics: async () => {
    const response = await apiClient.get('/crm/metrics');
    return response.data;
  },

  getConversations: async () => {
    const response = await apiClient.get('/crm/conversations');
    return response.data;
  },

  getConversationDetail: async (conversationId) => {
    const response = await apiClient.get(`/crm/conversations/${conversationId}`);
    return response.data;
  },

  // ---- Handoff: Admin ↔ Bot ----
  sendAdminMessage: async (conversationId, message) => {
    const response = await apiClient.post(`/crm/conversations/${conversationId}/admin_message`, { message });
    return response.data;
  },

  takeover: async (conversationId) => {
    const response = await apiClient.post(`/crm/conversations/${conversationId}/takeover`);
    return response.data;
  },

  release: async (conversationId) => {
    const response = await apiClient.post(`/crm/conversations/${conversationId}/release`);
    return response.data;
  },

  closeConversation: async (conversationId) => {
    const response = await apiClient.post(`/crm/conversations/${conversationId}/close`);
    return response.data;
  },
};

// Servicio de chats
export const chatsService = {
  getChats: async () => {
    const response = await apiClient.get('/crm/chats');
    return response.data;
  },

  sendMessage: async (conversationId, message) => {
    const response = await apiClient.post(`/crm/chats/${conversationId}/message`, { message });
    return response.data;
  }
};

// Servicio de reservas
export const reservationsService = {
  getReservations: async () => {
    const response = await apiClient.get('/crm/reservations');
    return response.data;
  },

  createReservation: async (data) => {
    const response = await apiClient.post('/crm/reservations', data);
    return response.data;
  },

  updateReservationStatus: async (id, status) => {
    const response = await apiClient.put(`/crm/reservations/${id}/status`, { status });
    return response.data;
  },

  updateReservation: async (id, data) => {
    const response = await apiClient.put(`/crm/reservations/${id}`, data);
    return response.data;
  },

  deleteReservation: async (id) => {
    const response = await apiClient.delete(`/crm/reservations/${id}`);
    return response.data;
  }
};

// Servicio de clientes
export const clientsService = {
  getClients: async () => {
    const response = await apiClient.get('/crm/clients');
    return response.data;
  },

  getClientDetail: async (id) => {
    const response = await apiClient.get(`/crm/clients/${id}`);
    return response.data;
  },

  updateClient: async (id, data) => {
    const response = await apiClient.put(`/crm/clients/${id}`, data);
    return response.data;
  }
};

// Servicio de admin
export const adminService = {
  getSystemStats: async () => {
    const response = await apiClient.get('/crm/admin/stats');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/crm/admin/users');
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await apiClient.put(`/crm/admin/users/${id}`, data);
    return response.data;
  }
};

export default apiClient;
