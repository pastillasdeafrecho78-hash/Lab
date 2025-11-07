import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para agregar token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para manejar errores
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  async register(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }

  async getMe(): Promise<ApiResponse> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Users endpoints
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse> {
    const response = await this.client.get(`/api/users?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/api/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/users/${id}`);
    return response.data;
  }

  // Sucursales endpoints
  async getSucursales(page = 1, limit = 10): Promise<PaginatedResponse> {
    const response = await this.client.get(`/api/sucursales?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getSucursal(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/sucursales/${id}`);
    return response.data;
  }

  async createSucursal(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/sucursales', data);
    return response.data;
  }

  async updateSucursal(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/api/sucursales/${id}`, data);
    return response.data;
  }

  async deleteSucursal(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/sucursales/${id}`);
    return response.data;
  }

  // Maquinaria endpoints
  async getMaquinaria(page = 1, limit = 10, sucursalId?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (sucursalId) params.append('sucursalId', sucursalId);
    const response = await this.client.get(`/api/maquinaria?${params}`);
    return response.data;
  }

  async getMaquinariaById(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/maquinaria/${id}`);
    return response.data;
  }

  async createMaquinaria(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/maquinaria', data);
    return response.data;
  }

  async updateMaquinaria(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/api/maquinaria/${id}`, data);
    return response.data;
  }

  async deleteMaquinaria(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/maquinaria/${id}`);
    return response.data;
  }

  // Comandas endpoints
  async getComandas(page = 1, limit = 10, estado?: string, sucursalId?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (estado) params.append('estado', estado);
    if (sucursalId) params.append('sucursalId', sucursalId);
    const response = await this.client.get(`/api/comandas?${params}`);
    return response.data;
  }

  async getComanda(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/comandas/${id}`);
    return response.data;
  }

  async createComanda(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/comandas', data);
    return response.data;
  }

  async updateComandaEstado(id: string, estado: string, tecnicoId?: string): Promise<ApiResponse> {
    const response = await this.client.put(`/api/comandas/${id}/estado`, { estado, tecnicoId });
    return response.data;
  }

  // Resultados endpoints
  async getResultados(page = 1, limit = 10, comandaId?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (comandaId) params.append('comandaId', comandaId);
    const response = await this.client.get(`/api/resultados?${params}`);
    return response.data;
  }

  async getResultado(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/resultados/${id}`);
    return response.data;
  }

  async createResultado(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/resultados', data);
    return response.data;
  }

  async createResultadosBatch(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/resultados/batch', data);
    return response.data;
  }

  // Clientes endpoints
  async getClientes(page = 1, limit = 10, search?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    const response = await this.client.get(`/api/clientes?${params}`);
    return response.data;
  }

  async getCliente(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/clientes/${id}`);
    return response.data;
  }

  async createCliente(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/clientes', data);
    return response.data;
  }

  async updateCliente(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/api/clientes/${id}`, data);
    return response.data;
  }

  async deleteCliente(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/clientes/${id}`);
    return response.data;
  }

  // Chat endpoints
  async getChatRooms(): Promise<ApiResponse> {
    const response = await this.client.get('/api/chat/rooms');
    return response.data;
  }

  async getChatMessages(roomId: string, page = 1, limit = 50): Promise<PaginatedResponse> {
    const response = await this.client.get(`/api/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createChatRoom(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/chat/rooms', data);
    return response.data;
  }

  async sendMessage(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/chat/messages', data);
    return response.data;
  }

  async updateMessage(id: string, contenido: string): Promise<ApiResponse> {
    const response = await this.client.put(`/api/chat/messages/${id}`, { contenido });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.client.get('/api/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
