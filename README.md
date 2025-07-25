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

# 管理者設定
ADMIN_EMAILS=g-igasaki@shinko.ed.jp,igafactory2023@gmail.com

# 銀行振込情報
BANK_NAME=神戸信用金庫
BANK_BRANCH=本店
BANK_ACCOUNT_TYPE=普通
BANK_ACCOUNT_NUMBER=0726786
BANK_ACCOUNT_HOLDER=ｲｶﾞｻｷ ｺﾞｳﾀ
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
cd ..
npm run dev
```

## 🚀 デプロイ

### Vercelでのデプロイ

1. **Vercelプロジェクトの作成**
```bash
vercel
```

2. **環境変数の設定**
Vercelダッシュボードで以下の環境変数を設定：
- `DATABASE_URL`
- `JWT_SECRET`
- `SENDGRID_API_KEY`
- `ADMIN_EMAILS`
- `BANK_NAME`
- `BANK_BRANCH`
- `BANK_ACCOUNT_TYPE`
- `BANK_ACCOUNT_NUMBER`
- `BANK_ACCOUNT_HOLDER`

3. **デプロイ**
```bash
vercel --prod
```

## 📚 API ドキュメント

### 認証
- `POST /api/auth/google` - Google OAuth認証
- `GET /api/auth/me` - 現在のユーザー情報

### プロジェクト
- `GET /api/projects` - プロジェクト一覧
- `POST /api/projects` - プロジェクト作成
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除

### アナリティクス
- `POST /api/analytics/pageview` - ページビュー記録
- `GET /api/analytics/:projectId` - アナリティクスデータ取得
- `GET /api/realtime/:projectId` - リアルタイムデータ取得
- `GET /api/heatmap/projects/:projectId/pages` - ヒートマップページ一覧

### テスト
```bash
# アナリティクステストデータの挿入
npm run test:analytics insert <project-id>

# アナリティクステストデータの削除
npm run test:analytics cleanup <project-id>
```
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

### 支払い（銀行振込）
- `POST /api/payments/bank-transfer` - 銀行振込作成
- `POST /api/payments/subscription` - サブスクリプション作成
- `POST /api/payments/invoice` - 請求書作成
- `GET /api/payments/bank-info` - 銀行振込先情報取得

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

### 推奨セキュリティ対策
- 強力なJWT_SECRETの使用
- 定期的なパスワード変更
- ログの監視
- バックアップの定期実行

## 📊 トラッキングスクリプト

### 基本的な実装
```html
<!-- Insightify Tracking Snippet -->
<script>
  (function(i,s,o,g,r,a,m){i['InsightifyObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://your-domain.com/tracking.js','insightify');

  insightify('init', 'YOUR_PROJECT_ID');
</script>
```

### イベントトラッキング
```javascript
// カスタムイベントの送信
insightify('event', 'button_click', {
  button_id: 'signup_button',
  page: 'homepage'
});
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 📞 サポート

- **メール**: igafactory2023@gmail.com
- **GitHub Issues**: [Issues](https://github.com/tegujupe222/insightify/issues)

## 🔄 更新履歴

### v1.0.0
- 初期リリース
- 基本的なアナリティクス機能
- リアルタイムダッシュボード
- ヒートマップ機能
- サブスクリプション管理（銀行振込）
- 管理者機能
