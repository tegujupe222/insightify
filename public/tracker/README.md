# Insightify Tracking Scripts

Insightify Analytics Platform のトラッキングスクリプトです。

## 📁 ファイル構成

- `tracker.js` - メインのトラッキングスクリプト
- `heatmap.js` - ヒートマップ描画ライブラリ
- `README.md` - このファイル

## 🚀 使用方法

### 1. 基本的なトラッキング

HTMLの`<head>`セクションに以下のスクリプトを追加してください：

```html
<script async defer src="https://your-domain.com/tracker/tracker.js" data-project-id="your-project-id"></script>
```

### 2. カスタムイベントのトラッキング

JavaScriptでカスタムイベントを送信できます：

```javascript
// 基本的なイベント
window.insightify.track('button_click', {
  buttonId: 'signup-button',
  page: 'homepage'
});

// コンバージョンイベント
window.insightify.track('purchase', {
  amount: 99.99,
  currency: 'USD',
  productId: 'premium-plan'
});

// フォーム送信
window.insightify.track('form_submit', {
  formType: 'contact',
  fields: ['name', 'email', 'message']
});
```

### 3. ヒートマップの表示

ヒートマップデータを表示するには：

```html
<script src="https://your-domain.com/tracker/heatmap.js"></script>
<script>
// ヒートマップの初期化
const heatmap = new InsightifyHeatmap('#heatmap-container', {
  radius: 25,
  maxOpacity: 0.8,
  minOpacity: 0.1,
  blur: 0.85
});

// データの設定
fetch('/api/analytics/your-project-id/heatmap?pageUrl=' + encodeURIComponent(window.location.href))
  .then(response => response.json())
  .then(data => {
    heatmap.setData(data.heatmapData);
  });
</script>
```

## 📊 自動トラッキング機能

### ページビュー
- ページ読み込み時に自動的にトラッキング
- SPA（Single Page Application）でのページ遷移も検出

### クリックイベント
- すべてのクリックを自動トラッキング
- 要素の情報（タグ名、クラス、ID、テキスト）を収集
- ヒートマップ用の座標データも収集

### スクロールイベント
- スクロール深度をトラッキング
- デバウンス処理でパフォーマンスを最適化

### フォーム送信
- フォーム送信を自動検出
- フォームIDとアクションURLを収集

### リンククリック
- 外部リンクと内部リンクを区別
- リンクのURLとテキストを収集

### ページ可視性
- ページの表示/非表示をトラッキング
- ユーザーのエンゲージメントを測定

## 🔧 設定オプション

### トラッキングスクリプト設定

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3001/api', // APIエンドポイント
  SESSION_TIMEOUT: 30 * 60 * 1000,           // セッションタイムアウト（30分）
  BATCH_SIZE: 10,                            // バッチサイズ
  BATCH_TIMEOUT: 5000,                       // バッチ送信間隔（5秒）
  HEATMAP_ENABLED: true,                     // ヒートマップ有効
  SESSION_RECORDING_ENABLED: false           // セッション録画（将来実装）
};
```

### ヒートマップ設定

```javascript
const heatmapOptions = {
  radius: 25,           // ヒートマップの半径
  maxOpacity: 0.8,      // 最大透明度
  minOpacity: 0.1,      // 最小透明度
  blur: 0.85            // ブラー効果
};
```

## 📱 対応ブラウザ

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🔒 プライバシー対応

### データ収集の制限
- 個人を特定できる情報は収集しません
- IPアドレスは匿名化されます
- ユーザーエージェント情報は最小限に制限

### オプトアウト
ユーザーがトラッキングを無効にしたい場合：

```javascript
// トラッキングを無効化
localStorage.setItem('insightify_opt_out', 'true');

// トラッキングを再有効化
localStorage.removeItem('insightify_opt_out');
```

## 🚨 トラブルシューティング

### よくある問題

1. **スクリプトが読み込まれない**
   - `data-project-id`属性が正しく設定されているか確認
   - ネットワーク接続を確認

2. **データが送信されない**
   - ブラウザのコンソールでエラーを確認
   - APIエンドポイントが正しく設定されているか確認

3. **ヒートマップが表示されない**
   - ヒートマップライブラリが正しく読み込まれているか確認
   - コンテナ要素のサイズを確認

### デバッグモード

開発時にデバッグ情報を表示：

```javascript
// デバッグモードを有効化
localStorage.setItem('insightify_debug', 'true');
```

## 📈 パフォーマンス

- スクリプトサイズ: ~15KB（gzip圧縮後）
- メモリ使用量: 最小限
- ネットワーク負荷: バッチ処理で最適化
- ページ読み込みへの影響: 非同期読み込みで最小化

## 🔄 更新履歴

### v1.0.0
- 基本的なトラッキング機能
- ヒートマップ機能
- セッション管理
- バッチ処理

## �� ライセンス

MIT License 