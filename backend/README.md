# Insightify Backend API

Insightify Analytics Platform のバックエンドAPIサーバーです。Vercel Postgresを使用して最適化されています。

## 🚀 機能

- **認証システム**: JWTベースの認証
- **プロジェクト管理**: プロジェクトのCRUD操作
- **トラッキングコード生成**: プロジェクトごとのJavaScriptスニペット
- **データベース**: Vercel Postgresを使用した最適化されたデータ永続化
- **セキュリティ**: Helmet、CORS、Rate Limiting
- **パフォーマンス**: マテリアライズドビュー、最適化されたインデックス
- **定期タスク**: Vercel Cron Jobsによる自動メンテナンス

## 📋 必要条件

- Node.js 18+
- Vercel Postgres または PostgreSQL 12+
- npm または yarn

## 🛠️ セットアップ

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

### 2. 環境変数の設定

```bash
cp env.example .env
```

`.env`ファイルを編集して、以下の値を設定してください：

#### 開発環境
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Vercel Postgres Configuration (開発用)
POSTGRES_URL=postgresql://username:password@localhost:5432/insightify
POSTGRES_PRISMA_URL=postgresql://username:password@localhost:5432/insightify?pgbouncer=true&connect_timeout=10
POSTGRES_URL_NON_POOLING=postgresql://username:password@localhost:5432/insightify
POSTGRES_USER=username
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=insightify

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Analytics Configuration
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_BATCH_SIZE=10
ANALYTICS_BATCH_TIMEOUT=5000
```

#### 本番環境 (Vercel)
Vercelダッシュボードで以下の環境変数を設定：

```env
POSTGRES_URL=your-vercel-postgres-url
POSTGRES_PRISMA_URL=your-vercel-postgres-prisma-url
POSTGRES_URL_NON_POOLING=your-vercel-postgres-non-pooling-url
POSTGRES_USER=your-postgres-user
POSTGRES_HOST=your-postgres-host
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DATABASE=your-postgres-database
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
```

### 3. Vercel Postgresのセットアップ

#### Vercelダッシュボードでの設定
1. Vercelプロジェクトに移動
2. Storage タブを選択
3. "Create Database" をクリック
4. Postgres を選択
5. データベース名を入力（例: `insightify`）
6. リージョンを選択
7. "Create" をクリック

#### ローカル開発用PostgreSQL
```bash
# PostgreSQLをインストール（macOS）
brew install postgresql@14

# PostgreSQLを起動
brew services start postgresql@14

# データベースを作成
createdb insightify
```

### 4. サーバーの起動

```bash
# 開発モード
npm run dev

# 本番ビルド
npm run build
npm start
```

## 📚 API エンドポイント

### 認証

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報（認証必要）

### プロジェクト

- `POST /api/projects` - プロジェクト作成（認証必要）
- `GET /api/projects` - プロジェクト一覧（認証必要）
- `GET /api/projects/:id` - プロジェクト詳細（認証必要）
- `PUT /api/projects/:id` - プロジェクト更新（認証必要）
- `DELETE /api/projects/:id` - プロジェクト削除（認証必要）
- `PATCH /api/projects/:id/toggle` - プロジェクトの有効/無効切り替え（認証必要）
- `POST /api/projects/:id/regenerate-tracking-code` - トラッキングコード再生成（認証必要）

### アナリティクス

- `POST /api/analytics/batch` - トラッキングデータ受信（公開）
- `GET /api/analytics/:projectId` - アナリティクスデータ取得（認証必要）
- `GET /api/analytics/:projectId/heatmap` - ヒートマップデータ取得（認証必要）
- `GET /api/analytics/:projectId/live-visitors` - リアルタイム訪問者数（認証必要）

### 定期タスク

- `GET /api/cron?cron=refresh-analytics` - アナリティクスビュー更新（Vercel Cron）
- `GET /api/cron?cron=clean-old-data` - 古いデータ削除（Vercel Cron）

### ヘルスチェック

- `GET /health` - サーバー状態確認

## 🔐 認証

APIはJWT（JSON Web Token）を使用した認証を実装しています。

### リクエストヘッダー

```
Authorization: Bearer <your-jwt-token>
```

### デフォルト管理者アカウント

サーバー起動時に自動的に作成されます：

- **Email**: admin@insightify.com
- **Password**: admin123
- **Role**: admin

## 🗄️ データベーススキーマ

### Users
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR, Hashed)
- `role` (VARCHAR, 'admin' or 'user')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Projects
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `url` (VARCHAR)
- `user_id` (UUID, Foreign Key to Users)
- `tracking_code` (TEXT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Page Views
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to Projects)
- `session_id` (VARCHAR)
- `page_url` (TEXT)
- `referrer` (TEXT)
- `user_agent` (TEXT)
- `ip_address` (INET)
- `timestamp` (TIMESTAMP)
- `device_type` (VARCHAR)
- `browser` (VARCHAR)
- `os` (VARCHAR)
- `country` (VARCHAR)
- `city` (VARCHAR)

### Events
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to Projects)
- `session_id` (VARCHAR)
- `event_type` (VARCHAR)
- `event_data` (JSONB)
- `page_url` (TEXT)
- `timestamp` (TIMESTAMP)

### Sessions
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to Projects)
- `visitor_id` (VARCHAR)
- `start_time` (TIMESTAMP)
- `end_time` (TIMESTAMP)
- `page_views` (INTEGER)
- `events` (INTEGER)
- `device_type` (VARCHAR)
- `browser` (VARCHAR)
- `os` (VARCHAR)
- `country` (VARCHAR)
- `city` (VARCHAR)

### Heatmap Data
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to Projects)
- `page_url` (TEXT)
- `x` (INTEGER)
- `y` (INTEGER)
- `count` (INTEGER)
- `timestamp` (TIMESTAMP)

### Materialized Views
- `daily_analytics` - 日次アナリティクス集計

## 🔧 パフォーマンス最適化

### インデックス
- ページビュー: `project_id`, `timestamp`, `session_id`, `device_type`
- イベント: `project_id`, `timestamp`, `session_id`, `event_type`
- セッション: `project_id`, `visitor_id`, `start_time`
- ヒートマップ: `project_id`, `page_url`, `timestamp`

### マテリアライズドビュー
- `daily_analytics`: 日次集計データの事前計算

### 接続プール
- 開発環境: 最大20接続
- 本番環境: 最大1接続（Vercel Serverless最適化）

## ⏰ 定期タスク

### Vercel Cron Jobs
- **アナリティクスビュー更新**: 6時間ごと
- **古いデータ削除**: 毎週日曜日 2:00

### 手動実行
```bash
# アナリティクスビュー更新
npm run refresh-analytics

# 古いデータ削除
npm run clean-data
```

## 🧪 開発

### スクリプト

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# TypeScriptコンパイル
npm run build

# 本番サーバー起動
npm start

# テスト実行
npm test

# データベース初期化
npm run db:init

# アナリティクスビュー更新
npm run db:refresh

# 古いデータ削除
npm run db:clean
```

### ディレクトリ構造

```
src/
├── config/          # 設定ファイル
├── controllers/     # コントローラー
├── middleware/      # ミドルウェア
├── models/          # データモデル
├── routes/          # ルート定義
├── services/        # ビジネスロジック
├── types/           # TypeScript型定義
├── utils/           # ユーティリティ関数
└── index.ts         # エントリーポイント
```

## 🔧 設定

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーポート | `3001` |
| `NODE_ENV` | 実行環境 | `development` |
| `POSTGRES_URL` | Vercel Postgres接続URL | - |
| `POSTGRES_PRISMA_URL` | Vercel Postgres Prisma URL | - |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres非プール接続URL | - |
| `JWT_SECRET` | JWT署名キー | - |
| `JWT_EXPIRES_IN` | JWT有効期限 | `7d` |
| `CORS_ORIGIN` | CORS許可オリジン | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | レート制限ウィンドウ | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | レート制限最大リクエスト数 | `100` |
| `ANALYTICS_RETENTION_DAYS` | データ保持期間 | `90` |
| `ANALYTICS_BATCH_SIZE` | バッチサイズ | `10` |
| `ANALYTICS_BATCH_TIMEOUT` | バッチタイムアウト | `5000` |

## 🚀 Vercelデプロイ

### 1. GitHubリポジトリにプッシュ

```bash
git add .
git commit -m "Add Vercel Postgres support"
git push origin main
```

### 2. Vercelでプロジェクトを作成

1. Vercelダッシュボードにアクセス
2. "New Project" をクリック
3. GitHubリポジトリを選択
4. フレームワークプリセット: "Other"
5. "Deploy" をクリック

### 3. 環境変数を設定

Vercelダッシュボードの "Settings" → "Environment Variables" で設定

### 4. Vercel Postgresを追加

1. "Storage" タブを選択
2. "Create Database" をクリック
3. Postgres を選択
4. 設定を完了

## �� ライセンス

MIT License 