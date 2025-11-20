import { io, Socket } from 'socket.io-client';
import { SocketMessage, NotificationData } from '@/types';

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: token || localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Conectado al servidor de chat');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor de chat');
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
      this.emit('error', error);
    });

    // Chat events
    this.socket.on('new-message', (message: SocketMessage) => {
      this.emit('new-message', message);
    });

    this.socket.on('message-updated', (message: SocketMessage) => {
      this.emit('message-updated', message);
    });

    this.socket.on('user-joined', (data: { userId: string, roomId: string }) => {
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data: { userId: string, roomId: string }) => {
      this.emit('user-left', data);
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationData) => {
      this.emit('notification', notification);
    });

    // Comanda events
    this.socket.on('comanda-updated', (comanda: any) => {
      this.emit('comanda-updated', comanda);
    });

    this.socket.on('comanda-created', (comanda: any) => {
      this.emit('comanda-created', comanda);
    });

    // Resultado events
    this.socket.on('resultado-created', (resultado: any) => {
      this.emit('resultado-created', resultado);
    });
  }

  // Chat methods
  joinSucursal(sucursalId: string) {
    if (this.socket) {
      this.socket.emit('join-sucursal', sucursalId);
    }
  }

  joinGeneral() {
    if (this.socket) {
      this.socket.emit('join-general');
    }
  }

  sendMessage(salaId: string, contenido: string, tipo = 'TEXTO', archivoUrl?: string) {
    if (this.socket) {
      this.socket.emit('send-message', {
        salaId,
        contenido,
        tipo,
        archivoUrl
      });
    }
  }

  sendPrivateMessage(recipientId: string, contenido: string) {
    if (this.socket) {
      this.socket.emit('private-message', {
        recipientId,
        contenido
      });
    }
  }

  // Event listener methods
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketClient = new SocketClient();
export default socketClient;
