# LINE統合 簡易手順（チャネルID・シークレット取得済み）

## ✅ 完了済み
- [x] チャネルID取得: `2008552055`
- [x] チャネルシークレット取得: `1017478a22eb4c810faaeebebf10e0ee`

## 📋 残りの手順

### ステップ1-2: チャネルアクセストークンを取得

1. [LINE Developers](https://developers.line.biz/) にログイン
2. あなたのプロバイダーを選択
3. Messaging APIチャネルを選択
4. 左メニューから「Messaging API」をクリック
5. 「チャネルアクセストークン（長期）」セクションで「発行」をクリック
6. 表示されたトークンをコピーして保存
   - ⚠️ **重要**：このトークンは一度しか表示されません

### ステップ2: 環境変数を設定（Render）

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. あなたのサービス（すいれん）を選択
3. 左メニューから「Environment」をクリック
4. 以下の3つの環境変数を追加：

#### 環境変数1: LINE_CHANNEL_ACCESS_TOKEN
- **Key**: `LINE_CHANNEL_ACCESS_TOKEN`
- **Value**: ステップ1-2で取得したチャネルアクセストークン

#### 環境変数2: LINE_CHANNEL_SECRET
- **Key**: `LINE_CHANNEL_SECRET`
- **Value**: `1017478a22eb4c810faaeebebf10e0ee`

#### 環境変数3: APP_URL
- **Key**: `APP_URL`
- **Value**: あなたのアプリのURL（例：`https://suiren.onrender.com`）

### ステップ3: パッケージのインストール

ターミナルで実行：

```bash
cd "/Users/mocky700/Desktop/個人利用/すいれん/server"
npm install
```

### ステップ4: Webhook URLを設定

1. LINE Developersで「Messaging API」→「Webhook URL」を開く
2. 以下を入力：
   ```
   https://あなたのサーバーURL/api/line/webhook
   ```
3. 「検証」をクリック
4. 「Webhookの利用」を「利用する」に設定
5. 「応答メッセージ」を「利用しない」に設定

### ステップ5: 動作確認

1. LINE公式アカウントを友だち追加（QRコードはLINE Developersで取得）
2. 「ポイント確認」と送信
3. ポイントカードが表示されれば成功

## ⚠️ 注意事項

- チャネルアクセストークンは一度しか表示されません。必ず保存してください
- 環境変数は大文字小文字を区別します
- Webhook URLはHTTPSである必要があります

