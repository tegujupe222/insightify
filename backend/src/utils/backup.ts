import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import pool from '../config/database';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron形式
  retention: number; // 保持日数
  compression: boolean;
  includeLogs: boolean;
  backupDir: string;
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  type: 'full' | 'incremental';
  status: 'success' | 'failed';
  duration: number;
  error?: string;
}

class BackupManager {
  private config: BackupConfig;
  private backupDir: string;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      enabled: true,
      schedule: '0 2 * * *', // 毎日午前2時
      retention: 30,
      compression: true,
      includeLogs: true,
      backupDir: path.join(process.cwd(), 'backups'),
      ...config
    };
    
    this.backupDir = this.config.backupDir;
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private getBackupFileName(type: 'full' | 'incremental' = 'full'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.config.compression ? 'sql.gz' : 'sql';
    return `backup-${type}-${timestamp}.${extension}`;
  }

  private async executeBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupInfo> {
    const startTime = Date.now();
    const backupId = `backup-${Date.now()}`;
    const fileName = this.getBackupFileName(type);
    const filePath = path.join(this.backupDir, fileName);

    try {
      await logger.info('Starting database backup', {
        backupId,
        type,
        fileName
      });

      // PostgreSQLのpg_dumpコマンドを実行
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'insightify',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

      let command: string;
      
      if (this.config.compression) {
        command = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --no-password | gzip > "${filePath}"`;
      } else {
        command = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --no-password > "${filePath}"`;
      }

      await execAsync(command);
      
      const stats = fs.statSync(filePath);
      const duration = Date.now() - startTime;

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp: new Date(),
        size: stats.size,
        type,
        status: 'success',
        duration
      };

      await logger.info('Database backup completed', {
        backupId,
        duration,
        size: stats.size,
        filePath
      });

      return backupInfo;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logger.error('Database backup failed', {
        backupId,
        error: (error as Error).message,
        duration
      });

             return {
         id: backupId,
         timestamp: new Date(),
         size: 0,
         type,
         status: 'failed',
         duration,
         error: (error as Error).message
       };
    }
  }

  async createFullBackup(): Promise<BackupInfo> {
    return this.executeBackup('full');
  }

  async createIncrementalBackup(): Promise<BackupInfo> {
    return this.executeBackup('incremental');
  }

  async restoreBackup(backupFile: string): Promise<boolean> {
    try {
      const filePath = path.join(this.backupDir, backupFile);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      await logger.info('Starting database restore', { backupFile });

      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'insightify',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

      let command: string;
      
      if (backupFile.endsWith('.gz')) {
        command = `gunzip -c "${filePath}" | PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --no-password`;
      } else {
        command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --no-password < "${filePath}"`;
      }

      await execAsync(command);

      await logger.info('Database restore completed', { backupFile });
      return true;

    } catch (error) {
      await logger.error('Database restore failed', {
        backupFile,
        error: (error as Error).message
      });
      return false;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.sql.gz'))) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          // ファイル名から情報を抽出
          const match = file.match(/backup-(full|incremental)-(.+)\.sql(\.gz)?/);
          if (match) {
            backups.push({
              id: file,
              timestamp: new Date(match[2].replace(/-/g, ':')),
              size: stats.size,
              type: match[1] as 'full' | 'incremental',
              status: 'success', // ファイルが存在するので成功とみなす
              duration: 0
            });
          }
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      await logger.error('Failed to list backups', { error: (error as Error).message });
      return [];
    }
  }

  async cleanupOldBackups(): Promise<number> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

      let deletedCount = 0;

      for (const backup of backups) {
        if (backup.timestamp < cutoffDate) {
          const filePath = path.join(this.backupDir, backup.id);
          fs.unlinkSync(filePath);
          deletedCount++;
          
          await logger.info('Deleted old backup', {
            backupId: backup.id,
            timestamp: backup.timestamp
          });
        }
      }

      return deletedCount;

    } catch (error) {
      await logger.error('Failed to cleanup old backups', { error: (error as Error).message });
      return 0;
    }
  }

  async backupLogs(): Promise<void> {
    if (!this.config.includeLogs) return;

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logsBackupPath = path.join(this.backupDir, `logs-${timestamp}.tar.gz`);

      const command = `tar -czf "${logsBackupPath}" -C "${process.cwd()}" logs`;
      await execAsync(command);

      await logger.info('Logs backup completed', { logsBackupPath });

    } catch (error) {
      await logger.error('Logs backup failed', { error: (error as Error).message });
    }
  }

  async getBackupStatus(): Promise<{
    lastBackup?: BackupInfo;
    totalBackups: number;
    totalSize: number;
    nextScheduled: Date;
  }> {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

    // 次回スケジュールを計算（簡略化）
    const now = new Date();
    const nextScheduled = new Date(now);
    nextScheduled.setDate(nextScheduled.getDate() + 1);
    nextScheduled.setHours(2, 0, 0, 0);

    return {
      lastBackup: backups[0],
      totalBackups: backups.length,
      totalSize,
      nextScheduled
    };
  }

  async validateBackup(backupFile: string): Promise<boolean> {
    try {
      const filePath = path.join(this.backupDir, backupFile);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // ファイルサイズチェック
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return false;
      }

      // ファイル形式チェック
      if (backupFile.endsWith('.gz')) {
        const { stdout } = await execAsync(`gunzip -t "${filePath}"`);
        return !stdout; // gunzip -tは成功時に何も出力しない
      } else {
        // SQLファイルの基本的な検証
        const content = fs.readFileSync(filePath, 'utf-8').substring(0, 1000);
        return content.includes('-- PostgreSQL database dump');
      }

    } catch (error) {
      await logger.error('Backup validation failed', {
        backupFile,
        error: (error as Error).message
      });
      return false;
    }
  }
}

export const backupManager = new BackupManager(); 