# LINE公式アカウント設定手順

## 📋 必要な準備

1. LINE Developersアカウント
2. LINE公式アカウント（Messaging API）
3. サーバーのURL（Webhook用）

## 🔧 設定手順

### ステップ1: LINE Developersでアプリを作成

1. [LINE Developers](https://developers.line.biz/)にアクセス
2. ログイン（LINEアカウントでログイン）
3. 「新規プロバイダーを作成」をクリック
4. プロバイダー名を入力（例：すいれん）
5. 「Messaging API」を選択してチャネルを作成

### ステップ2: チャネル基本設定

1. チャネル設定ページで以下を設定：
   - **チャネル名**：すいれん
   - **チャネル説明**：学校内転売 支払いシステム
   - **大業種**：個人
   - **小業種**：その他

### ステップ3: Messaging API設定

1. 「Messaging API」タブを開く
2. **チャネルアクセストークン**を発行
   - 長期トークンを発行（推奨）
   - このトークンをコピーして保存

3. **Webhook URL**を設定
   - URL: `https://あなたのドメイン/api/line/webhook`
   - 例: `https://suiren.onrender.com/api/line/webhook`
   - 「検証」をクリックして接続を確認

4. **Webhookの利用**を有効化

### ステップ4: 環境変数の設定

Renderやサーバーで以下の環境変数を設定：

```
LINE_CHANNEL_ACCESS_TOKEN=あなたのチャネルアクセストークン
LINE_CHANNEL_SECRET=あなたのチャネルシークレット
APP_URL=https://あなたのドメイン
```

### ステップ5: パッケージのインストール

サーバーで以下を実行：

```bash
cd server
npm install
```

### ステップ6: サーバーを再起動

環境変数を設定した後、サーバーを再起動します。

## ✅ 動作確認

1. LINE公式アカウントを友だち追加
2. 「ポイント確認」と送信
3. ポイントカードが表示されれば成功

## 📝 注意事項

- チャネルアクセストークンは秘密情報です。絶対に公開しないでください
- Webhook URLはHTTPSである必要があります
- 無料プランでは、メッセージ送信数に制限があります

