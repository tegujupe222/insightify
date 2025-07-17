import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  method?: string;
  url?: string;
  status?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logDir: string;
  private maxFileSize: number;
  private maxFiles: number;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 5;
    
    // ログディレクトリを作成
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const logFile = this.getLogFileName(entry.level);
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      await fs.promises.appendFile(logFile, logLine);
      
      // ファイルサイズチェック
      const stats = await fs.promises.stat(logFile);
      if (stats.size > this.maxFileSize) {
        await this.rotateLogFile(logFile);
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private async rotateLogFile(logFile: string): Promise<void> {
    try {
      const dir = path.dirname(logFile);
      const ext = path.extname(logFile);
      const base = path.basename(logFile, ext);
      
      // 古いログファイルを削除
      for (let i = this.maxFiles - 1; i >= 0; i--) {
        const oldFile = path.join(dir, `${base}.${i}${ext}`);
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            await fs.promises.unlink(oldFile);
          } else {
            await fs.promises.rename(oldFile, path.join(dir, `${base}.${i + 1}${ext}`));
          }
        }
      }
      
      // 現在のファイルを.1にリネーム
      await fs.promises.rename(logFile, path.join(dir, `${base}.1${ext}`));
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private createLogEntry(
    level: LogLevel, 
    message: string, 
    context?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...context
    };
  }

  async error(message: string, context?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    await this.writeLog(entry);
    
    // エラーログはコンソールにも出力
    console.error(`❌ ${message}`, context);
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    await this.writeLog(entry);
    console.warn(`⚠️ ${message}`, context);
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    await this.writeLog(entry);
    console.info(`ℹ️ ${message}`, context);
  }

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      await this.writeLog(entry);
      console.debug(`🔍 ${message}`, context);
    }
  }

  // リクエストログ用
  async request(req: any, res: any, duration: number): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: 'HTTP Request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.session?.userId || 'anonymous',
      requestId: req.headers['x-request-id']
    };

    await this.writeLog(entry);
  }

  // セキュリティログ用
  async security(event: string, details: Record<string, any>): Promise<void> {
    await this.warn(`Security Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // パフォーマンスログ用
  async performance(operation: string, duration: number, context?: Record<string, any>): Promise<void> {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      await this.warn(message, { duration, ...context });
    } else {
      await this.info(message, { duration, ...context });
    }
  }

  // データベースログ用
  async database(operation: string, query: string, duration: number, context?: Record<string, any>): Promise<void> {
    await this.debug(`Database: ${operation}`, {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration,
      ...context
    });
  }

  // エラーログ用（詳細）
  async errorWithStack(error: Error, context?: Record<string, any>): Promise<void> {
    await this.error(error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  // ログファイルの取得
  async getLogs(level?: LogLevel, limit: number = 100): Promise<LogEntry[]> {
    try {
      const logs: LogEntry[] = [];
      const files = await fs.promises.readdir(this.logDir);
      
      for (const file of files) {
        if (level && !file.startsWith(level)) continue;
        if (!file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        
        const lines = content.trim().split('\n').reverse(); // 最新のログから
        for (const line of lines) {
          if (logs.length >= limit) break;
          try {
            const entry = JSON.parse(line);
            logs.push(entry);
          } catch (e) {
            // 無効なJSON行をスキップ
          }
        }
      }
      
      return logs.slice(0, limit);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  // ログのクリーンアップ
  async cleanup(daysToKeep: number = 30): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }
}

export const logger = new Logger(); 
