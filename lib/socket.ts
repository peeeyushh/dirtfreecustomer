import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://dirtfree-backend.onrender.com';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string) {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Customer Socket connected:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.log('⚠️ Customer Socket Error:', error.message);
    });
  }

  joinTracking(partnerId: string) {
    if (this.socket) {
      this.socket.emit('joinTracking', partnerId);
    }
  }

  getSocket() {
    return this.socket;
  }
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const socketService = new SocketService();
