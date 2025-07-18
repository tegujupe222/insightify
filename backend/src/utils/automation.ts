import { logger } from './logger';
import { backupManager } from './backup';
import { cacheManager } from './cache';
import { UserModel } from '../models/User';
import pool from '../config/database';

export interface AutomationTask {
  id: string;
  name: string;
  schedule: string; // cron形式
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface AutomationConfig {
  enabled: boolean;
  tasks: AutomationTask[];
}

class AutomationManager {
  private config: AutomationConfig;
  private intervals: Map<string, NodeJS.Timeout>;
  private runningTasks: Set<string>;

  constructor() {
    this.config = {
      enabled: true,
      tasks: [
        {
          id: 'daily-backup',
          name: 'Daily Database Backup',
          schedule: '0 2 * * *', // 毎日午前2時
          enabled: true,
          status: 'idle'
        },
        {
          id: 'cleanup-logs',
          name: 'Cleanup Old Logs',
          schedule: '0 3 * * *', // 毎日午前3時
          enabled: true,
          status: 'idle'
        },
        {
          id: 'reset-page-views',
          name: 'Reset Monthly Page Views',
          schedule: '0 0 1 * *', // 毎月1日午前0時
          enabled: false, // 開発中は無効化
          status: 'idle'
        },
        {
          id: 'cleanup-cache',
          name: 'Cleanup Cache',
          schedule: '0 */6 * * *', // 6時間ごと
          enabled: true,
          status: 'idle'
        },
        {
          id: 'health-check',
          name: 'System Health Check',
          schedule: '*/5 * * * *', // 5分ごと
          enabled: true,
          status: 'idle'
        }
      ]
    };
    
    this.intervals = new Map();
    this.runningTasks = new Set();
    
    if (this.config.enabled) {
      this.start();
    }
  }

  private start(): void {
    this.config.tasks.forEach(task => {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    });
    
    logger.info('Automation manager started', { 
      taskCount: this.config.tasks.filter(t => t.enabled).length 
    });
  }

  private scheduleTask(task: AutomationTask): void {
    const interval = this.parseCron(task.schedule);
    
    if (interval) {
      const timeout = setInterval(() => {
        this.runTask(task);
      }, interval);
      
      this.intervals.set(task.id, timeout);
      
      // 次回実行時刻を計算
      task.nextRun = new Date(Date.now() + interval);
      
      logger.info(`Scheduled task: ${task.name}`, {
        taskId: task.id,
        nextRun: task.nextRun
      });
    }
  }

  private parseCron(cron: string): number | null {
    // 簡略化されたcronパーサー
    const parts = cron.split(' ');
    
    if (parts.length !== 5) {
      return null;
    }
    
    const [minute, hour, day, _month, _weekday] = parts;
    
    // 基本的なパターンのみ対応
    if (minute === '*/5') return 5 * 60 * 1000; // 5分
    if (minute === '0' && hour === '*/6') return 6 * 60 * 60 * 1000; // 6時間
    if (minute === '0' && hour === '2') return 24 * 60 * 60 * 1000; // 毎日午前2時
    if (minute === '0' && hour === '3') return 24 * 60 * 60 * 1000; // 毎日午前3時
    if (minute === '0' && hour === '0' && day === '1') {
      // 月次タスクは開発中は無効化、本番では手動実行
      return null; // 月次タスクは無効化
    }
    
    // デフォルト: 1時間ごと
    return 60 * 60 * 1000;
  }

  private async runTask(task: AutomationTask): Promise<void> {
    if (this.runningTasks.has(task.id)) {
      logger.warn(`Task ${task.name} is already running`);
      return;
    }

    this.runningTasks.add(task.id);
    task.status = 'running';
    task.lastRun = new Date();

    try {
      logger.info(`Starting automated task: ${task.name}`, { taskId: task.id });

      switch (task.id) {
      case 'daily-backup':
        await this.runDailyBackup();
        break;
      case 'cleanup-logs':
        await this.runCleanupLogs();
        break;
      case 'reset-page-views':
        await this.runResetPageViews();
        break;
      case 'cleanup-cache':
        await this.runCleanupCache();
        break;
      case 'health-check':
        await this.runHealthCheck();
        break;
      default:
        throw new Error(`Unknown task: ${task.id}`);
      }

      task.status = 'completed';
      task.error = undefined;
      
      logger.info(`Completed automated task: ${task.name}`, { taskId: task.id });

    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      
      logger.error(`Failed automated task: ${task.name}`, {
        taskId: task.id,
        error: (error as Error).message
      });
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  private async runDailyBackup(): Promise<void> {
    const startTime = Date.now();
    
    // データベースバックアップ
    const backupResult = await backupManager.createFullBackup();
    
    if (backupResult.status === 'failed') {
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    // ログバックアップ
    await backupManager.backupLogs();
    
    // 古いバックアップのクリーンアップ
    const deletedCount = await backupManager.cleanupOldBackups();
    
    const duration = Date.now() - startTime;
    
    logger.info('Daily backup completed', {
      backupSize: backupResult.size,
      deletedBackups: deletedCount,
      duration
    });
  }

  private async runCleanupLogs(): Promise<void> {
    const startTime = Date.now();
    
    // 30日以上古いログを削除
    await logger.cleanup(30);
    
    const duration = Date.now() - startTime;
    
    logger.info('Log cleanup completed', { duration });
  }

  private async runResetPageViews(): Promise<void> {
    const startTime = Date.now();
    
    // 月次ページビューのリセット
    await UserModel.resetMonthlyPageViews();
    
    const duration = Date.now() - startTime;
    
    logger.info('Monthly page views reset completed', { duration });
  }

  private async runCleanupCache(): Promise<void> {
    const startTime = Date.now();
    
    // キャッシュのクリーンアップ
    cacheManager.clear();
    
    const duration = Date.now() - startTime;
    
    logger.info('Cache cleanup completed', { duration });
  }

  private async runHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // データベース接続チェック
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      // メモリ使用量チェック
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      
      if (memoryUsageMB > 500) { // 500MB以上で警告
        logger.warn('High memory usage detected', {
          memoryUsageMB: Math.round(memoryUsageMB),
          threshold: 500
        });
      }
      
      // アクティブなタスク数チェック
      if (this.runningTasks.size > 3) {
        logger.warn('Too many running tasks', {
          runningTasks: this.runningTasks.size,
          threshold: 3
        });
      }
      
      const duration = Date.now() - startTime;
      
      logger.debug('Health check completed', { duration });
      
    } catch (error) {
      throw new Error(`Health check failed: ${(error as Error).message}`);
    }
  }

  // 手動でタスクを実行
  async runTaskManually(taskId: string): Promise<boolean> {
    const task = this.config.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    if (!task.enabled) {
      throw new Error(`Task is disabled: ${taskId}`);
    }
    
    await this.runTask(task);
    return task.status === 'completed';
  }

  // タスクの有効化/無効化
  enableTask(taskId: string): void {
    const task = this.config.tasks.find(t => t.id === taskId);
    if (task) {
      task.enabled = true;
      this.scheduleTask(task);
      logger.info(`Enabled task: ${task.name}`, { taskId });
    }
  }

  disableTask(taskId: string): void {
    const task = this.config.tasks.find(t => t.id === taskId);
    if (task) {
      task.enabled = false;
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
      logger.info(`Disabled task: ${task.name}`, { taskId });
    }
  }

  // タスクの状態取得
  getTaskStatus(taskId: string): AutomationTask | null {
    return this.config.tasks.find(t => t.id === taskId) || null;
  }

  getAllTasks(): AutomationTask[] {
    return this.config.tasks;
  }

  // システム全体の状態
  getSystemStatus(): {
    enabled: boolean;
    totalTasks: number;
    enabledTasks: number;
    runningTasks: number;
    lastHealthCheck?: Date;
    } {
    const healthCheckTask = this.config.tasks.find(t => t.id === 'health-check');
    
    return {
      enabled: this.config.enabled,
      totalTasks: this.config.tasks.length,
      enabledTasks: this.config.tasks.filter(t => t.enabled).length,
      runningTasks: this.runningTasks.size,
      lastHealthCheck: healthCheckTask?.lastRun
    };
  }

  // 自動化マネージャーの停止
  stop(): void {
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.runningTasks.clear();
    
    logger.info('Automation manager stopped');
  }
}

export const automationManager = new AutomationManager(); 
