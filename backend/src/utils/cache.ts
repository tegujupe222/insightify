import { logger } from './logger';

export interface CacheOptions {
  ttl: number; // 秒単位
  maxSize: number;
  checkPeriod: number; // 秒単位
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry>;
  private options: CacheOptions;
  private checkInterval: NodeJS.Timeout | null;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: 300, // 5分
      maxSize: 1000,
      checkPeriod: 60, // 1分
      ...options
    };
    
    this.cache = new Map();
    this.checkInterval = null;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.checkInterval = setInterval(() => {
      this.cleanup();
    }, this.options.checkPeriod * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }

    // サイズ制限チェック
    if (this.cache.size > this.options.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits); // ヒット数が少ない順
      
      const toRemove = entries.slice(0, this.cache.size - this.options.maxSize);
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
      });

      logger.debug(`Removed ${toRemove.length} cache entries due to size limit`);
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T>;
    
    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // ヒット数増加
    entry.hits++;
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalRequests: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // 初回アクセスも含む
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
      totalRequests
    };
  }

  // 特定のパターンにマッチするキーを削除
  deletePattern(pattern: RegExp): number {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // キャッシュの永続化（簡略版）
  async persist(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.cache.entries()),
        timestamp: Date.now()
      };
      
      // 実際の実装ではファイルやRedisに保存
      logger.debug('Cache persisted', { size: this.cache.size });
    } catch (error) {
      logger.error('Failed to persist cache', { error: (error as Error).message });
    }
  }

  // キャッシュの復元（簡略版）
  async restore(): Promise<void> {
    try {
      // 実際の実装ではファイルやRedisから復元
      logger.debug('Cache restored');
    } catch (error) {
      logger.error('Failed to restore cache', { error: (error as Error).message });
    }
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.cache.clear();
  }
}

// グローバルキャッシュインスタンス
export const cacheManager = new CacheManager();

// 便利な関数
export const cache = {
  get: <T>(key: string): T | null => cacheManager.get<T>(key),
  set: <T>(key: string, value: T, ttl?: number): void => cacheManager.set(key, value, ttl),
  has: (key: string): boolean => cacheManager.has(key),
  delete: (key: string): boolean => cacheManager.delete(key),
  clear: (): void => cacheManager.clear(),
  stats: () => cacheManager.getStats()
};

// デコレータ風のキャッシュ関数
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : `${fn.name}-${JSON.stringify(args)}`;
    
    const cached = cache.get<ReturnType<T>>(key);
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    
    // Promiseの場合は特別処理
    if (result instanceof Promise) {
      return result.then(value => {
        cache.set(key, value, ttl);
        return value;
      }) as ReturnType<T>;
    } else {
      cache.set(key, result, ttl);
      return result;
    }
  }) as T;
} 