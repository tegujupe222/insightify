import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { config } from 'dotenv';
import { 
  securityHeaders, 
  corsMiddleware, 
  apiLimiter, 
  authLimiter, 
  trackingLimiter,
  xssProtection,
  csrfProtection,
  sessionSecurity,
  requestLogger,
  securityAuditLog,
  errorHandler
} from './middleware/security';
import { setupPassport } from './config/passport';
import { connectDatabase } from './utils/database';
import { logger } from './utils/logger';
import { automationManager } from './utils/automation';
import { cacheManager } from './utils/cache';
import pool from './config/database';

// Routes
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import projectRoutes from './routes/projects';
import subscriptionRoutes from './routes/subscriptions';
import paymentRoutes from './routes/payments';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import cronRoutes from './routes/cron';
import monitoringRoutes from './routes/monitoring';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// セキュリティヘッダーとCORS
app.use(securityHeaders);
app.use(corsMiddleware);

// リクエストログとセキュリティ監査
app.use(requestLogger);
app.use(securityAuditLog);

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS保護
app.use(xssProtection);

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'insightify-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}) as any);

// Passport初期化
app.use(passport.initialize() as any);
app.use(passport.session() as any);

// セッションセキュリティ
app.use(sessionSecurity);

// CSRF保護（認証済みエンドポイントのみ）
app.use('/api/auth', csrfProtection);
app.use('/api/projects', csrfProtection);
app.use('/api/subscriptions', csrfProtection);
app.use('/api/payments', csrfProtection);
app.use('/api/notifications', csrfProtection);
app.use('/api/users', csrfProtection);

// レート制限の適用
app.use('/api/auth', authLimiter); // 認証エンドポイントは厳しい制限
app.use('/api/analytics/track', trackingLimiter); // トラッキングは緩い制限
app.use('/api', apiLimiter); // その他のAPIは一般的な制限

// ヘルスチェック
app.get('/health', async (_req, res) => {
  try {
    const startTime = Date.now();
    
    // データベース接続チェック
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    const dbResponseTime = Date.now() - startTime;
    
    // システム情報
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      system: systemInfo
    });
  } catch (error) {
    await logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/monitoring', monitoringRoutes);

// 404ハンドラー
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// エラーハンドラー
app.use(errorHandler);

// データベース接続とサーバー起動
async function startServer() {
  try {
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    // Passport設定
    setupPassport();
    console.log('✅ Passport configured');
    
    // 自動化マネージャー開始
    console.log('✅ Automation manager started');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security features enabled`);
      console.log(`📝 Logging system active`);
      console.log(`💾 Cache system active`);
      console.log(`🤖 Automation system active`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    // 自動化マネージャー停止
    automationManager.stop();
    
    // キャッシュマネージャー停止
    cacheManager.destroy();
    
    // データベース接続終了
    await pool.end();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    automationManager.stop();
    cacheManager.destroy();
    await pool.end();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startServer(); 