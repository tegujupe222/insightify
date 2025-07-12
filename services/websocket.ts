import { io, Socket } from 'socket.io-client';

export interface LiveVisitor {
  id: string;
  projectId: string;
  sessionId: string;
  page: string;
  userAgent: string;
  ip: string;
  lastActivity: Date;
  isActive: boolean;
}

export interface RealTimeEvent {
  type: 'pageview' | 'click' | 'scroll' | 'custom';
  projectId: string;
  sessionId: string;
  page: string;
  data: any;
  timestamp: Date;
}

export interface PageView {
  id: string;
  sessionId: string;
  pageUrl: string;
  referrer: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  timestamp: string;
}

export interface Event {
  id: string;
  sessionId: string;
  eventType: string;
  eventData: any;
  pageUrl: string;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string, projectId?: string) {
    this.projectId = projectId || null;

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Join project room if projectId is set
      if (this.projectId) {
        this.joinProject(this.projectId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
    });

    // Listen for real-time events
    this.socket.on('pageview', (data: PageView) => {
      this.emit('pageview', data);
    });

    this.socket.on('event', (data: RealTimeEvent) => {
      this.emit('event', data);
    });

    this.socket.on('heatmap', (data: any) => {
      this.emit('heatmap', data);
    });
  }

  joinProject(projectId: string) {
    if (this.socket) {
      this.socket.emit('join-project', projectId);
      this.projectId = projectId;
    }
  }

  leaveProject(projectId: string) {
    if (this.socket) {
      this.socket.emit('leave-project', projectId);
      if (this.projectId === projectId) {
        this.projectId = null;
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
    this.listeners.clear();
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getProjectId(): string | null {
    return this.projectId;
  }
}

export const websocketService = new WebSocketService(); 