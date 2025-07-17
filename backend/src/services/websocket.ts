import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import db from '../config/database';

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

class WebSocketService {
  private io: SocketIOServer | null = null;
  private liveVisitors: Map<string, LiveVisitor> = new Map();
  private projectRooms: Map<string, Set<string>> = new Map();

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  private setupMiddleware() {
    if (!this.io) return;

    this.io.use(async(socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.userId = decoded.userId;
        socket.data.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.data.userId}`);

      // Join project rooms based on user's projects
      this.joinUserProjects(socket);

      socket.on('join-project', (projectId: string) => {
        this.joinProject(socket, projectId);
      });

      socket.on('leave-project', (projectId: string) => {
        this.leaveProject(socket, projectId);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.data.userId}`);
        this.removeUserFromAllRooms(socket);
      });
    });
  }

  private async joinUserProjects(socket: any) {
    try {
      const query = `
        SELECT p.id FROM projects p
        WHERE p.user_id = $1 OR p.id IN (
          SELECT project_id FROM project_members WHERE user_id = $1
        )
      `;
      const result = await db.query(query, [socket.data.userId]);
      
      result.rows.forEach((project: any) => {
        this.joinProject(socket, project.id);
      });
    } catch (error) {
      console.error('Error joining user projects:', error);
    }
  }

  private joinProject(socket: any, projectId: string) {
    const roomName = `project:${projectId}`;
    socket.join(roomName);
    
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)!.add(socket.id);
    
    console.log(`User ${socket.data.userId} joined project ${projectId}`);
  }

  private leaveProject(socket: any, projectId: string) {
    const roomName = `project:${projectId}`;
    socket.leave(roomName);
    
    const room = this.projectRooms.get(projectId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
    
    console.log(`User ${socket.data.userId} left project ${projectId}`);
  }

  private removeUserFromAllRooms(socket: any) {
    this.projectRooms.forEach((room, projectId) => {
      room.delete(socket.id);
      if (room.size === 0) {
        this.projectRooms.delete(projectId);
      }
    });
  }

  // Public methods for broadcasting events
  public broadcastPageView(projectId: string, pageView: any) {
    if (!this.io) return;

    const roomName = `project:${projectId}`;
    this.io.to(roomName).emit('pageview', {
      ...pageView,
      timestamp: new Date()
    });

    this.updateLiveVisitor(projectId, pageView);
  }

  public broadcastEvent(projectId: string, event: RealTimeEvent) {
    if (!this.io) return;

    const roomName = `project:${projectId}`;
    this.io.to(roomName).emit('event', event);
  }

  public broadcastHeatmapData(projectId: string, heatmapData: any) {
    if (!this.io) return;

    const roomName = `project:${projectId}`;
    this.io.to(roomName).emit('heatmap', {
      ...heatmapData,
      timestamp: new Date()
    });
  }

  private updateLiveVisitor(projectId: string, pageView: any) {
    const visitorKey = `${projectId}:${pageView.sessionId}`;
    const now = new Date();

    const visitor: LiveVisitor = {
      id: visitorKey,
      projectId,
      sessionId: pageView.sessionId,
      page: pageView.page,
      userAgent: pageView.userAgent,
      ip: pageView.ip,
      lastActivity: now,
      isActive: true
    };

    this.liveVisitors.set(visitorKey, visitor);
  }

  public getLiveVisitors(projectId: string): LiveVisitor[] {
    const now = new Date();
    const activeVisitors: LiveVisitor[] = [];

    this.liveVisitors.forEach((visitor) => {
      if (visitor.projectId === projectId) {
        // Consider visitor active if last activity was within 5 minutes
        const timeDiff = now.getTime() - visitor.lastActivity.getTime();
        visitor.isActive = timeDiff < 5 * 60 * 1000;
        
        if (visitor.isActive) {
          activeVisitors.push(visitor);
        }
      }
    });

    return activeVisitors;
  }

  public getLiveVisitorCount(projectId: string): number {
    return this.getLiveVisitors(projectId).length;
  }

  private startCleanupInterval() {
    // Clean up inactive visitors every 5 minutes
    setInterval(() => {
      const now = new Date();
      const inactiveKeys: string[] = [];

      this.liveVisitors.forEach((visitor, key) => {
        const timeDiff = now.getTime() - visitor.lastActivity.getTime();
        if (timeDiff > 10 * 60 * 1000) { // 10 minutes
          inactiveKeys.push(key);
        }
      });

      inactiveKeys.forEach(key => {
        this.liveVisitors.delete(key);
      });

      if (inactiveKeys.length > 0) {
        console.log(`Cleaned up ${inactiveKeys.length} inactive visitors`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const websocketService = new WebSocketService(); 
