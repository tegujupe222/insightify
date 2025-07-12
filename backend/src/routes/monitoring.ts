import { Router } from 'express';
import { logger, LogLevel } from '../utils/logger';
import { UserModel } from '../models/User';
import pool from '../config/database';

const router = Router();

// システムヘルスチェック
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // データベース接続チェック
    const dbClient = await pool.connect();
    await dbClient.query('SELECT NOW()');
    dbClient.release();
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
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          responseTime: `${dbResponseTime}ms`
        },
        system: systemInfo
      }
    });
  } catch (error) {
    await logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// システム統計
router.get('/stats', async (req, res) => {
  try {
    // ユーザー統計
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'premium' THEN 1 END) as premium_users,
        COUNT(CASE WHEN subscription_status = 'free' THEN 1 END) as free_users,
        COUNT(CASE WHEN monthly_page_views >= page_views_limit THEN 1 END) as users_at_limit
      FROM users
    `);
    
    // プロジェクト統計
    const projectStats = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_projects
      FROM projects
    `);
    
    // ページビュー統計
    const pageViewStats = await pool.query(`
      SELECT 
        COUNT(*) as total_page_views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // エラー統計
    const errorStats = await pool.query(`
      SELECT COUNT(*) as total_errors
      FROM email_notifications
      WHERE status = 'failed'
      AND created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    res.json({
      success: true,
      data: {
        users: userStats.rows[0],
        projects: projectStats.rows[0],
        analytics: pageViewStats.rows[0],
        errors: errorStats.rows[0],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    await logger.error('Failed to get system stats', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
});

// ログ取得
router.get('/logs', async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;
    const logs = await logger.getLogs(level as LogLevel, parseInt(limit as string));
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    await logger.error('Failed to get logs', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

// パフォーマンスメトリクス
router.get('/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string);
    
    // データベースクエリパフォーマンス
    const dbPerformance = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_queries,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_response_time
      FROM analytics
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // ページビューパフォーマンス
    const pageViewPerformance = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as page_views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      success: true,
      data: {
        database: dbPerformance.rows,
        pageViews: pageViewPerformance.rows,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      }
    });
  } catch (error) {
    await logger.error('Failed to get performance metrics', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// セキュリティイベント
router.get('/security', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string);
    
    // 認証失敗
    const authFailures = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as failed_attempts
      FROM email_notifications
      WHERE type = 'limit_warning'
      AND created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // レート制限違反（ログから取得）
    const logs = await logger.getLogs(LogLevel.WARN, 1000);
    const rateLimitViolations = logs
      .filter(log => log.message.includes('Rate limit exceeded'))
      .reduce((acc, log) => {
        const date = log.timestamp.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    res.json({
      success: true,
      data: {
        authFailures: authFailures.rows,
        rateLimitViolations,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    await logger.error('Failed to get security events', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to get security events'
    });
  }
});

// アラート設定
router.post('/alerts', async (req, res) => {
  try {
    const { type, threshold, enabled } = req.body;
    
    // アラート設定を保存（実装は簡略化）
    await logger.info('Alert configuration updated', {
      type,
      threshold,
      enabled,
      updatedBy: (req.session as any)?.userId
    });
    
    res.json({
      success: true,
      message: 'Alert configuration updated'
    });
  } catch (error) {
    await logger.error('Failed to update alert configuration', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to update alert configuration'
    });
  }
});

// システムメンテナンス
router.post('/maintenance', async (req, res) => {
  try {
    const { action } = req.body;
    
    switch (action) {
      case 'cleanup_logs':
        await logger.cleanup(30);
        break;
      case 'reset_page_views':
        await UserModel.resetMonthlyPageViews();
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid maintenance action'
        });
        return;
    }
    
    await logger.info('Maintenance action completed', {
      action,
      performedBy: (req.session as any)?.userId
    });
    
    res.json({
      success: true,
      message: `Maintenance action '${action}' completed`
    });
  } catch (error) {
    await logger.error('Maintenance action failed', { 
      action: req.body.action,
      error: (error as Error).message
    });
    res.status(500).json({
      success: false,
      error: 'Maintenance action failed'
    });
  }
});

export default router; 