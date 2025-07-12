# Insightify - Web Analytics Dashboard

Insightifyは、リアルタイムWebアナリティクスプラットフォームです。ページビュー、イベント、ヒートマップデータを追跡し、美しいダッシュボードで分析結果を表示します。

## 🚀 機能

### コア機能
- **リアルタイム分析**: ライブビジター数、ページビュー、イベント追跡
- **ダッシュボード**: 美しいUIでデータを可視化
- **プロジェクト管理**: 複数サイトの分析管理
- **デバイス分析**: デバイス別の利用状況
- **ソース分析**: トラフィックソースの詳細分析
- **強化されたヒートマップ**: 
  - 複数ページにわたるヒートマップ分析
  - クリック、スクロール、マウス移動の3種類のヒートマップ
  - ページ別の統計情報と要素分析
  - 期間指定による詳細分析
  - データエクスポート機能
  - 要素セレクターとテキスト情報の記録

### サブスクリプション管理
- **無料プラン**: 月3,000PVまで
- **プレミアムプラン**: 無制限PV、全機能利用
- **料金**: 月額¥5,500、年額¥55,000（10%割引）
- **銀行振込**: 請求書発行と手動確認
- **自動通知**: アップグレード推奨、制限警告

### 管理者機能
- **ユーザー管理**: 全ユーザーの管理
- **サブスクリプション管理**: 支払い確認、ステータス管理
- **通知管理**: 一括メール送信
- **管理者限定**: 特定のGoogleアカウントのみ

### セキュリティ機能
- **JWT認証**: セキュアなトークンベース認証
- **パスワード暗号化**: bcryptによる安全なハッシュ化
- **レート制限**: API攻撃防止
- **入力検証**: XSS、CSRF攻撃防止
- **セキュリティヘッダー**: 各種セキュリティヘッダー設定

## 🛠 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Vite** - 高速ビルドツール
- **Tailwind CSS** - スタイリング
- **Recharts** - データ可視化
- **Socket.io Client** - リアルタイム通信

### バックエンド
- **Node.js** - サーバーランタイム
- **Express.js** - Webフレームワーク
- **TypeScript** - 型安全な開発
- **PostgreSQL** - データベース
- **Socket.io** - リアルタイム通信
- **JWT** - 認証

### 外部サービス
- **SendGrid** - メール送信
- **Stripe** - 支払い処理
- **Vercel** - デプロイメント・ホスティング
- **Vercel Postgres** - マネージドデータベース

## 📦 インストール

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- npm または yarn

### セットアップ

1. **リポジトリのクローン**
```bash
git clone https://github.com/tegujupe222/insightify.git
cd insightify
```

2. **依存関係のインストール**
```bash
# フロントエンド
npm install

# バックエンド
cd backend
npm install
```

3. **環境変数の設定**
```bash
# フロントエンド
cp frontend.env.example .env.local

# バックエンド
cd backend
cp env.example .env
```

`.env`ファイルを編集して必要な設定を行ってください：

```env
# データベース設定
DATABASE_URL=postgresql://username:password@localhost:5432/insightify

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-here

# メール設定（SendGrid）
SENDGRID_API_KEY=your-sendgrid-api-key-here
FROM_EMAIL=noreply@insightify.com

# 支払い設定（Stripe）
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here

# 管理者設定
ADMIN_EMAILS=g-igasaki@shinko.ed.jp,igafactory2023@gmail.com
```

4. **データベースのセットアップ**
```bash
cd backend
npm run db:init
```

5. **開発サーバーの起動**
```bash
# バックエンド（ポート3001）
cd backend
npm run dev

# フロントエンド（ポート5173）
npm run dev
```

## 🚀 本番環境デプロイ

### Vercelでのデプロイ

1. **Vercelアカウント作成**
   - [Vercel](https://vercel.com)でアカウントを作成
   - GitHubアカウントと連携

2. **プロジェクトのインポート**
   - Vercelダッシュボードで「New Project」をクリック
   - GitHubリポジトリ `tegujupe222/insightify` を選択

3. **環境変数の設定**
   - Vercelプロジェクト設定で環境変数を設定
   - 本番用のデータベースURL、APIキーなどを設定

4. **デプロイ**
   - 自動的にデプロイが開始されます
   - フロントエンドとバックエンドが別々にデプロイされます

### 本番環境用の設定

#### フロントエンド環境変数
```env
VITE_API_URL=https://your-backend-domain.vercel.app
VITE_WS_URL=wss://your-backend-domain.vercel.app
```

#### バックエンド環境変数
```env
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
SENDGRID_API_KEY=your-sendgrid-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### データベース設定

1. **Vercel Postgres**を使用する場合
   - VercelダッシュボードでPostgresデータベースを作成
   - 接続URLを環境変数に設定

2. **外部PostgreSQL**を使用する場合
   - 本番用PostgreSQLサーバーを準備
   - 接続URLを環境変数に設定

## 🔧 開発

### スクリプト

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check

# リント
npm run lint
```

### データベース操作

```bash
# データベース初期化
npm run db:init

# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed
```

## 📊 API エンドポイント

### 認証
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報

### プロジェクト
- `GET /api/projects` - プロジェクト一覧
- `POST /api/projects` - プロジェクト作成
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除

### アナリティクス
- `POST /api/analytics/pageview` - ページビュー記録
- `POST /api/analytics/event` - イベント記録
- `GET /api/analytics/summary` - サマリー取得
- `GET /api/analytics/visitors` - ビジター分析

### ヒートマップ
- `GET /api/heatmap/projects/:projectId/pages` - ヒートマップページ一覧
- `GET /api/heatmap/projects/:projectId/pages/:pageUrl` - ページ別ヒートマップデータ
- `GET /api/heatmap/projects/:projectId/stats` - ヒートマップ統計
- `GET /api/heatmap/projects/:projectId/pages/:pageUrl/elements` - 要素分析
- `GET /api/heatmap/projects/:projectId/export` - データエクスポート

### サブスクリプション
- `GET /api/subscriptions/pricing` - 料金プラン取得
- `POST /api/subscriptions/upgrade` - アップグレード要求
- `POST /api/subscriptions/confirm-payment` - 支払い確認
- `GET /api/subscriptions/status` - サブスクリプション状況

### 支払い
- `POST /api/payments/create-payment-intent` - 支払い意図作成
- `POST /api/payments/confirm-payment` - 支払い確認
- `POST /api/payments/bank-transfer` - 銀行振込作成
- `POST /api/payments/webhook` - Stripe Webhook

### 定期タスク
- `POST /api/cron/daily` - 日次タスク実行
- `POST /api/cron/monthly` - 月次タスク実行
- `POST /api/cron/send-upgrade-recommendations` - アップグレード推奨送信
- `POST /api/cron/send-limit-warnings` - 制限警告送信

## 🔒 セキュリティ

### 実装済みセキュリティ機能
- **パスワード暗号化**: bcryptによる安全なハッシュ化
- **JWT認証**: セキュアなトークンベース認証
- **レート制限**: API攻撃防止
- **入力検証**: XSS、CSRF攻撃防止
- **セキュリティヘッダー**: 各種セキュリティヘッダー設定
- **CORS設定**: 適切なオリジン制限

## 📞 サポート・お問い合わせ

### 連絡先
- **メール**: insightify@igafactory.com
- **GitHub**: [https://github.com/tegujupe222/insightify](https://github.com/tegujupe222/insightify)

### 銀行振込情報
- **銀行名**: 神戸信用金庫 本店
- **口座番号**: 0726786
- **口座名義**: イガサキ ゴウタ

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

**Insightify** - より良いWebサイトを、データで作る。
