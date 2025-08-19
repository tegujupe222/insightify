const logger = require('../utils/logger');
const { sql } = require('../database/connection');
const { setRealTimeData, getRealTimeData, publishEvent } = require('../database/redis');

let io = null;

function initSocketIO(socketIO) {
  io = socketIO;
  
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);
    
    // Handle website subscription
    socket.on('subscribe_website', async (data) => {
      try {
        const { websiteId, token } = data;
        
        if (!websiteId) {
          socket.emit('error', { message: 'Website ID required' });
          return;
        }
        
        // Join website room
        socket.join(`website:${websiteId}`);
        socket.websiteId = websiteId;
        
        logger.info(`Client ${socket.id} subscribed to website: ${websiteId}`);
        
        // Send current real-time data
        const realtimeData = await getRealTimeData(websiteId);
        if (realtimeData) {
          socket.emit('realtime_data', realtimeData);
        }
        
        socket.emit('subscribed', { websiteId });
      } catch (error) {
        logger.error('Socket subscription error:', error);
        socket.emit('error', { message: 'Subscription failed' });
      }
    });
    
    // Handle website unsubscription
    socket.on('unsubscribe_website', (data) => {
      const { websiteId } = data;
      
      if (websiteId) {
        socket.leave(`website:${websiteId}`);
        socket.websiteId = null;
        logger.info(`Client ${socket.id} unsubscribed from website: ${websiteId}`);
      }
      
      socket.emit('unsubscribed', { websiteId });
    });
    
    // Handle real-time dashboard subscription
    socket.on('subscribe_dashboard', async (data) => {
      try {
        const { userId, token } = data;
        
        if (!userId) {
          socket.emit('error', { message: 'User ID required' });
          return;
        }
        
        // Join user dashboard room
        socket.join(`dashboard:${userId}`);
        socket.userId = userId;
        
        logger.info(`Client ${socket.id} subscribed to dashboard: ${userId}`);
        
        // Send user's websites real-time data
        const websites = await getUserWebsites(userId);
        const dashboardData = {};
        
        for (const website of websites) {
          const realtimeData = await getRealTimeData(website.id);
          if (realtimeData) {
            dashboardData[website.id] = {
              ...realtimeData,
              website: {
                id: website.id,
                name: website.name,
                url: website.url
              }
            };
          }
        }
        
        socket.emit('dashboard_data', dashboardData);
        socket.emit('subscribed_dashboard', { userId });
      } catch (error) {
        logger.error('Dashboard subscription error:', error);
        socket.emit('error', { message: 'Dashboard subscription failed' });
      }
    });
    
    // Handle admin dashboard subscription
    socket.on('subscribe_admin', async (data) => {
      try {
        const { token } = data;
        
        // Verify admin token (simplified for demo)
        // In production, you should verify the JWT token
        
        socket.join('admin_dashboard');
        socket.isAdmin = true;
        
        logger.info(`Admin client ${socket.id} connected`);
        
        // Send global real-time data
        const globalData = await getGlobalRealTimeData();
        socket.emit('admin_data', globalData);
        socket.emit('subscribed_admin');
      } catch (error) {
        logger.error('Admin subscription error:', error);
        socket.emit('error', { message: 'Admin subscription failed' });
      }
    });
    
    // Handle custom events
    socket.on('custom_event', async (data) => {
      try {
        const { websiteId, eventType, eventData } = data;
        
        if (!websiteId || !eventType) {
          socket.emit('error', { message: 'Website ID and event type required' });
          return;
        }
        
        // Broadcast custom event to website subscribers
        io.to(`website:${websiteId}`).emit('custom_event', {
          eventType,
          eventData,
          timestamp: new Date()
        });
        
        // Update real-time data
        await updateRealTimeData(websiteId, eventType, eventData);
        
        logger.info(`Custom event broadcasted: ${eventType} for website: ${websiteId}`);
      } catch (error) {
        logger.error('Custom event error:', error);
        socket.emit('error', { message: 'Custom event failed' });
      }
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
      
      // Clean up subscriptions
      if (socket.websiteId) {
        socket.leave(`website:${socket.websiteId}`);
      }
      
      if (socket.userId) {
        socket.leave(`dashboard:${socket.userId}`);
      }
      
      if (socket.isAdmin) {
        socket.leave('admin_dashboard');
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });
  
  logger.info('WebSocket service initialized');
}

// Emit analytics event to website subscribers
function emitAnalyticsEvent(websiteId, eventData) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }
  
  try {
    io.to(`website:${websiteId}`).emit('analytics_event', {
      ...eventData,
      timestamp: new Date()
    });
    
    logger.info(`Analytics event emitted to website: ${websiteId}`);
  } catch (error) {
    logger.error('Error emitting analytics event:', error);
  }
}

// Emit real-time data update
function emitRealTimeDataUpdate(websiteId, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }
  
  try {
    io.to(`website:${websiteId}`).emit('realtime_update', {
      ...data,
      timestamp: new Date()
    });
    
    logger.info(`Real-time data update emitted to website: ${websiteId}`);
  } catch (error) {
    logger.error('Error emitting real-time update:', error);
  }
}

// Emit dashboard update to user
function emitDashboardUpdate(userId, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }
  
  try {
    io.to(`dashboard:${userId}`).emit('dashboard_update', {
      ...data,
      timestamp: new Date()
    });
    
    logger.info(`Dashboard update emitted to user: ${userId}`);
  } catch (error) {
    logger.error('Error emitting dashboard update:', error);
  }
}

// Emit admin update
function emitAdminUpdate(data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }
  
  try {
    io.to('admin_dashboard').emit('admin_update', {
      ...data,
      timestamp: new Date()
    });
    
    logger.info('Admin update emitted');
  } catch (error) {
    logger.error('Error emitting admin update:', error);
  }
}

// Broadcast system notification
function broadcastNotification(message, type = 'info', target = 'all') {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }
  
  try {
    const notification = {
      message,
      type,
      timestamp: new Date()
    };
    
    switch (target) {
      case 'admin':
        io.to('admin_dashboard').emit('notification', notification);
        break;
      case 'all':
        io.emit('notification', notification);
        break;
      default:
        // Target specific room
        io.to(target).emit('notification', notification);
    }
    
    logger.info(`Notification broadcasted: ${message}`);
  } catch (error) {
    logger.error('Error broadcasting notification:', error);
  }
}

// Get user's websites
async function getUserWebsites(userId) {
  try {
    const result = await sql`
      SELECT id, name, url, is_active
      FROM websites 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
    `;
    
    return result.rows;
  } catch (error) {
    logger.error('Error getting user websites:', error);
    return [];
  }
}

// Get global real-time data for admin
async function getGlobalRealTimeData() {
  try {
    // Get total active sessions across all websites
    const activeSessionsResult = await sql`
      SELECT COUNT(*) as count
      FROM sessions 
      WHERE is_active = true 
      AND last_activity > NOW() - INTERVAL '30 minutes'
    `;
    
    // Get total page views in last hour
    const pageViewsResult = await sql`
      SELECT COUNT(*) as count
      FROM page_views 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    `;
    
    // Get total conversions in last hour
    const conversionsResult = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM conversion_events 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    `;
    
    // Get top websites by activity
    const topWebsitesResult = await sql`
      SELECT 
        w.id, w.name, w.url,
        COUNT(pv.id) as page_views,
        COUNT(DISTINCT pv.session_id) as unique_sessions
      FROM websites w
      LEFT JOIN page_views pv ON w.id = pv.website_id 
        AND pv.timestamp > NOW() - INTERVAL '1 hour'
      WHERE w.is_active = true
      GROUP BY w.id, w.name, w.url
      ORDER BY page_views DESC
      LIMIT 10
    `;
    
    return {
      activeSessions: parseInt(activeSessionsResult.rows[0].count),
      pageViewsLastHour: parseInt(pageViewsResult.rows[0].count),
      conversionsLastHour: parseInt(conversionsResult.rows[0].count),
      totalValueLastHour: parseFloat(conversionsResult.rows[0].total_value),
      topWebsites: topWebsitesResult.rows
    };
  } catch (error) {
    logger.error('Error getting global real-time data:', error);
    return {
      activeSessions: 0,
      pageViewsLastHour: 0,
      conversionsLastHour: 0,
      totalValueLastHour: 0,
      topWebsites: []
    };
  }
}

// Update real-time data and emit updates
async function updateRealTimeData(websiteId, eventType, eventData = {}) {
  try {
    const realtimeData = await getRealTimeData(websiteId) || {
      activeSessions: 0,
      pageViewsLastHour: 0,
      clicksLastHour: 0,
      conversionsLastHour: 0,
      recentEvents: []
    };
    
    // Update counters based on event type
    switch (eventType) {
      case 'pageview':
        realtimeData.pageViewsLastHour++;
        break;
      case 'click':
        realtimeData.clicksLastHour++;
        break;
      case 'conversion':
        realtimeData.conversionsLastHour++;
        break;
    }
    
    // Add recent event
    realtimeData.recentEvents.unshift({
      type: eventType,
      data: eventData,
      timestamp: new Date()
    });
    
    // Keep only last 50 events
    realtimeData.recentEvents = realtimeData.recentEvents.slice(0, 50);
    
    // Update active sessions count
    const activeSessionsResult = await sql`
      SELECT COUNT(*) as count
      FROM sessions 
      WHERE website_id = ${websiteId} 
      AND is_active = true 
      AND last_activity > NOW() - INTERVAL '30 minutes'
    `;
    realtimeData.activeSessions = parseInt(activeSessionsResult.rows[0].count);
    
    // Save to Redis
    await setRealTimeData(websiteId, realtimeData);
    
    // Emit update to subscribers
    emitRealTimeDataUpdate(websiteId, realtimeData);
    
    // Publish to Redis for other instances
    await publishEvent('analytics_update', {
      websiteId,
      eventType,
      realtimeData
    });
    
  } catch (error) {
    logger.error('Error updating real-time data:', error);
  }
}

// Get connected clients count
function getConnectedClientsCount() {
  if (!io) return 0;
  
  return io.engine.clientsCount;
}

// Get room clients count
function getRoomClientsCount(room) {
  if (!io) return 0;
  
  const roomSockets = io.sockets.adapter.rooms.get(room);
  return roomSockets ? roomSockets.size : 0;
}

module.exports = {
  initSocketIO,
  emitAnalyticsEvent,
  emitRealTimeDataUpdate,
  emitDashboardUpdate,
  emitAdminUpdate,
  broadcastNotification,
  updateRealTimeData,
  getConnectedClientsCount,
  getRoomClientsCount
};
