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
git clone https://github.com/your-username/insightify.git
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
# バックエンドディレクトリで
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
- **セッション管理**: 安全なセッション処理

### 推奨セキュリティ設定
- 本番環境ではHTTPSを使用
- 強力なJWT_SECRETを設定
- 定期的なパスワード変更を推奨
- ログの監視と分析

## 📧 メール機能

### 送信されるメール
- **アップグレード推奨**: PV制限に近づいた際
- **制限警告**: PV制限に達した際
- **サブスクリプション要求**: アップグレード申し込み時
- **支払い確認**: 支払い完了時
- **期限切れ通知**: サブスクリプション期限切れ時
- **月次レポート**: プレミアムユーザー向け

### メール設定
SendGridを使用してメールを送信します。以下の設定が必要です：
- SendGrid API キー
- 送信者メールアドレス
- 送信者名

## 💳 支払い機能

### 対応決済方法
- **クレジットカード**: Stripe経由
- **銀行振込**: 手動確認方式

### 料金プラン
- **無料プラン**: 月3,000PVまで
- **プレミアム月額**: ¥5,500/月
- **プレミアム年額**: ¥55,000/年（10%割引）

### 支払いフロー
1. ユーザーがアップグレードを要求
2. 請求書が生成され、メール送信
3. ユーザーが支払いを実行
4. 管理者が支払いを確認
5. プレミアム機能が有効化

## 🤖 定期タスク

### 自動実行されるタスク
- **日次タスク** (毎日9:00)
  - 期限切れサブスクリプションの処理
  - アップグレード推奨メール送信
  - 制限警告メール送信

- **月次タスク** (毎月1日9:00)
  - 月次PVリセット
  - 月次レポート生成・送信
  - 古い通知の削除

- **週次タスク** (毎週月曜10:00)
  - アップグレード推奨メール送信

- **日次警告** (毎日14:00)
  - 制限警告メール送信

- **週次クリーンアップ** (毎週日曜2:00)
  - 古い通知の削除

## 🚀 デプロイメント

### Vercelへのデプロイ

1. **Vercel CLIのインストール**
```bash
npm i -g vercel
```

2. **プロジェクトのリンク**
```bash
vercel link
```

3. **環境変数の設定**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add SENDGRID_API_KEY
vercel env add STRIPE_SECRET_KEY
# その他の必要な環境変数
```

4. **デプロイ**
```bash
vercel --prod
```

### 環境変数設定

本番環境では以下の環境変数を設定してください：

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
SENDGRID_API_KEY=your-sendgrid-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
ADMIN_EMAILS=g-igasaki@shinko.ed.jp,igafactory2023@gmail.com
```

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

質問や問題がある場合は、以下の方法でお問い合わせください：
- GitHub Issues
- メール: igafactory2023@gmail.com

## 🔄 更新履歴

### v1.0.0 (2024-12-19)
- 初期リリース
- 基本的なアナリティクス機能
- リアルタイムダッシュボード
- サブスクリプション管理
- 支払い機能
- メール通知
- セキュリティ機能
- 定期タスク
