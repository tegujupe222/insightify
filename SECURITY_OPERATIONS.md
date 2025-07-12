# Insightify セキュリティ・運用強化ガイド

## 概要

Insightifyのセキュリティ・運用強化システムは、以下の機能を提供します：

- **セキュリティ強化**: レート制限、セキュリティヘッダー、CORS設定、入力値検証
- **ログ・監視**: 構造化ログ、エラーログ、アクセスログ、監視ダッシュボード
- **バックアップ・復旧**: データベースバックアップ、設定ファイルバックアップ、復旧手順
- **パフォーマンス最適化**: キャッシュ戦略、データベースクエリ最適化
- **運用自動化**: ヘルスチェック、自動スケーリング、デプロイメント自動化

## セキュリティ機能

### 1. レート制限 (Rate Limiting)

```typescript
// APIエンドポイント: 15分間に100リクエスト
app.use('/api', apiLimiter);

// 認証エンドポイント: 15分間に5リクエスト
app.use('/api/auth', authLimiter);

// トラッキングエンドポイント: 1分間に1000リクエスト
app.use('/api/analytics/track', trackingLimiter);
```

### 2. セキュリティヘッダー

- **Content Security Policy (CSP)**: XSS攻撃防止
- **Strict-Transport-Security (HSTS)**: HTTPS強制
- **X-Frame-Options**: クリックジャッキング防止
- **X-Content-Type-Options**: MIME型スニッフィング防止

### 3. CORS設定

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://insightify.vercel.app',
  'https://insightify.com'
];
```

### 4. 入力値検証

```typescript
// 一般的な検証ルール
export const commonValidations = {
  email: body('email').isEmail().normalizeEmail(),
  password: body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  projectId: body('projectId').isUUID(),
  url: body('url').isURL()
};
```

## ログ・監視システム

### 1. 構造化ログ

```typescript
// ログレベル
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// ログ出力例
await logger.info('User login successful', {
  userId: user.id,
  email: user.email,
  ip: req.ip
});
```

### 2. ログローテーション

- ファイルサイズ制限: 10MB
- 保持ファイル数: 5個
- 自動クリーンアップ: 30日以上古いログを削除

### 3. 監視ダッシュボード

```bash
# システムヘルスチェック
GET /api/monitoring/health

# システム統計
GET /api/monitoring/stats

# パフォーマンスメトリクス
GET /api/monitoring/performance

# セキュリティイベント
GET /api/monitoring/security
```

## バックアップ・復旧システム

### 1. データベースバックアップ

```typescript
// 手動バックアップ作成
const backupResult = await backupManager.createFullBackup();

// バックアップ復元
const success = await backupManager.restoreBackup('backup-file.sql.gz');

// バックアップ一覧
const backups = await backupManager.listBackups();
```

### 2. 自動バックアップスケジュール

- **フルバックアップ**: 毎日午前2時
- **ログバックアップ**: 毎日午前2時
- **古いバックアップ削除**: 30日以上古いファイルを自動削除

### 3. バックアップ検証

```typescript
// バックアップファイルの整合性チェック
const isValid = await backupManager.validateBackup('backup-file.sql.gz');
```

## パフォーマンス最適化

### 1. キャッシュシステム

```typescript
// キャッシュの使用
cache.set('user:123', userData, 300); // 5分間キャッシュ
const userData = cache.get('user:123');

// キャッシュ統計
const stats = cache.stats();
```

### 2. キャッシュ戦略

- **TTL (Time To Live)**: デフォルト5分
- **最大サイズ**: 1000エントリ
- **LRU (Least Recently Used)**: 古いエントリから削除
- **自動クリーンアップ**: 1分ごとに期限切れエントリを削除

### 3. データベース最適化

```sql
-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_analytics_project_created ON analytics(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_heatmap_project_page ON heatmap_data(project_id, page_url, heatmap_type);
```

## 運用自動化

### 1. 自動化タスク

```typescript
// 自動化タスク一覧
const tasks = [
  {
    id: 'daily-backup',
    name: 'Daily Database Backup',
    schedule: '0 2 * * *', // 毎日午前2時
    enabled: true
  },
  {
    id: 'cleanup-logs',
    name: 'Cleanup Old Logs',
    schedule: '0 3 * * *', // 毎日午前3時
    enabled: true
  },
  {
    id: 'reset-page-views',
    name: 'Reset Monthly Page Views',
    schedule: '0 0 1 * *', // 毎月1日午前0時
    enabled: true
  },
  {
    id: 'cleanup-cache',
    name: 'Cleanup Cache',
    schedule: '0 */6 * * *', // 6時間ごと
    enabled: true
  },
  {
    id: 'health-check',
    name: 'System Health Check',
    schedule: '*/5 * * * *', // 5分ごと
    enabled: true
  }
];
```

### 2. ヘルスチェック

```typescript
// ヘルスチェック項目
- データベース接続
- メモリ使用量
- アクティブタスク数
- レスポンス時間
```

### 3. 手動タスク実行

```typescript
// 手動でタスクを実行
const success = await automationManager.runTaskManually('daily-backup');

// タスクの有効化/無効化
automationManager.enableTask('daily-backup');
automationManager.disableTask('daily-backup');
```

## 設定ファイル

### 1. セキュリティ設定

```typescript
// backend/src/config/security.ts
export const securityConfig: SecurityConfig = {
  rateLimit: {
    api: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 15 * 60 * 1000, max: 5 },
    tracking: { windowMs: 60 * 1000, max: 1000 }
  },
  cors: {
    allowedOrigins: ['http://localhost:3000', 'https://insightify.vercel.app'],
    credentials: true
  },
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
};
```

### 2. 環境変数

```bash
# セキュリティ
SESSION_SECRET=your-session-secret
NODE_ENV=production

# データベース
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insightify
DB_USER=postgres
DB_PASSWORD=your-password

# 監視
LOG_LEVEL=info
BACKUP_RETENTION=30
```

## 運用手順

### 1. デプロイメント

```bash
# 本番環境デプロイ
npm run build
npm start

# 環境変数設定
export NODE_ENV=production
export SESSION_SECRET=your-secure-secret
```

### 2. 監視・アラート

```bash
# ログ監視
tail -f logs/error-$(date +%Y-%m-%d).log

# システム状態確認
curl http://localhost:3001/health

# バックアップ状態確認
curl http://localhost:3001/api/monitoring/stats
```

### 3. トラブルシューティング

```bash
# ログ確認
grep "ERROR" logs/error-*.log

# データベース接続確認
psql -h localhost -U postgres -d insightify -c "SELECT NOW();"

# キャッシュ状態確認
curl http://localhost:3001/api/monitoring/performance
```

### 4. 復旧手順

```bash
# データベース復元
npm run backup:restore backup-file.sql.gz

# ログ復元
tar -xzf logs-backup.tar.gz

# 設定復元
cp config/security.ts.backup config/security.ts
```

## セキュリティチェックリスト

### 定期チェック項目

- [ ] セキュリティログの確認
- [ ] レート制限違反の確認
- [ ] バックアップの整合性確認
- [ ] システムパフォーマンスの確認
- [ ] 依存関係の脆弱性チェック

### 月次チェック項目

- [ ] セキュリティ設定の見直し
- [ ] アクセスログの分析
- [ ] バックアップのテスト復元
- [ ] パフォーマンスメトリクスの分析
- [ ] 自動化タスクの動作確認

### 四半期チェック項目

- [ ] セキュリティ監査の実施
- [ ] 災害復旧計画の見直し
- [ ] 運用手順の更新
- [ ] チーム研修の実施

## トラブルシューティング

### よくある問題と解決方法

1. **レート制限エラー**
   - 原因: 短時間に多数のリクエスト
   - 解決: リクエスト頻度の調整、キャッシュの活用

2. **メモリ使用量過多**
   - 原因: メモリリーク、大量データ処理
   - 解決: キャッシュクリーンアップ、クエリ最適化

3. **バックアップ失敗**
   - 原因: ディスク容量不足、権限エラー
   - 解決: ディスク容量確認、権限設定確認

4. **データベース接続エラー**
   - 原因: 接続プール枯渇、ネットワーク問題
   - 解決: 接続プール設定調整、ネットワーク確認

## パフォーマンスチューニング

### 推奨設定

```typescript
// キャッシュ設定
const cacheConfig = {
  ttl: 300, // 5分
  maxSize: 1000,
  checkPeriod: 60 // 1分
};

// データベース設定
const dbConfig = {
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};
```

### 監視メトリクス

- **レスポンス時間**: 平均 < 200ms
- **メモリ使用量**: < 500MB
- **CPU使用率**: < 80%
- **データベース接続数**: < 最大接続数の80%

## まとめ

このセキュリティ・運用強化システムにより、Insightifyは以下の恩恵を受けられます：

1. **セキュリティの向上**: 多層防御による攻撃対策
2. **運用効率の向上**: 自動化による人的ミスの削減
3. **可用性の向上**: 監視・アラートによる早期問題発見
4. **パフォーマンスの向上**: キャッシュ・最適化による高速化
5. **復旧性の向上**: バックアップ・復旧手順によるデータ保護

これらの機能を適切に設定・運用することで、安全で安定したサービスを提供できます。 