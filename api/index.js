const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
require('dotenv').config();

// Import middleware and routes
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import route handlers
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const websiteRoutes = require('./routes/websites');
const reportRoutes = require('./routes/reports');
const abTestRoutes = require('./routes/abTests');
const funnelRoutes = require('./routes/funnels');
const heatmapRoutes = require('./routes/heatmaps');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

// Import database connection
const { initDatabase } = require('./database/connection');
const { initRedis } = require('./database/redis');

// Import real-time services
const { initSocketIO } = require('./services/socketService');
const { initAnalyticsProcessor } = require('./services/analyticsProcessor');
const { initScheduler } = require('./services/scheduler');

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "https://insightify-eight.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "https://insightify-eight.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ab-tests', abTestRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/heatmaps', heatmapRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', authMiddleware.requireAdmin, adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// Real-time analytics endpoint
app.post('/api/track', async (req, res) => {
  try {
    const { eventType, websiteId, sessionId, data } = req.body;
    
    // Validate required fields
    if (!eventType || !websiteId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, websiteId, sessionId'
      });
    }

    // Process analytics event
    const analyticsProcessor = require('./services/analyticsProcessor');
    await analyticsProcessor.processEvent({
      eventType,
      websiteId,
      sessionId,
      data,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      referrer: req.headers.referer
    });

    // Emit real-time event to connected clients
    io.to(`website:${websiteId}`).emit('analytics_event', {
      eventType,
      sessionId,
      timestamp: new Date(),
      data
    });

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// WebSocket connection handling
initSocketIO(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized successfully');

    // Initialize Redis
    await initRedis();
    logger.info('Redis initialized successfully');

    // Initialize analytics processor
    await initAnalyticsProcessor();
    logger.info('Analytics processor initialized successfully');

    // Initialize scheduler
    await initScheduler();
    logger.info('Scheduler initialized successfully');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'production') {
  // Development server
  server.listen(PORT, () => {
    logger.info(`🚀 Insightify API Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });
} else {
  // Production server (Vercel)
  initializeServices().then(() => {
    logger.info('✅ Insightify API Server ready for production');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Export for Vercel
module.exports = app;
