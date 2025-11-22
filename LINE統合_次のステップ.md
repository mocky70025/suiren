# LINE統合 次のステップ（チャネルアクセストークン取得済み）

## ✅ 完了済み

- [x] チャネルID取得: `2008552055`
- [x] チャネルシークレット取得: `1017478a22eb4c810faaeebebf10e0ee`
- [x] チャネルアクセストークン取得: `pQ3Re0WpVP7NQmHskaCO1lhBZjJj0vmt2Tl2A79WCCLII5mYARbXeZ0AqHstQSUaUzN1Xm+xgXEmD5I+Fj0D82Ui2my+6hiY0lfingbBJoBElkxDbA2TKlh3drlVcRQif/IbIKMEz9+FULrjebA4eY9PbdgDzCFqoOLOYbqAITQ=`

## 📋 次のステップ

### ステップ1: 環境変数を設定（Render）

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. あなたのサービス（すいれん）を選択
3. 左メニューから「Environment」をクリック
4. 以下の3つの環境変数を追加：

#### 環境変数1: LINE_CHANNEL_ACCESS_TOKEN
- **Key**: `LINE_CHANNEL_ACCESS_TOKEN`
- **Value**: `pQ3Re0WpVP7NQmHskaCO1lhBZjJj0vmt2Tl2A79WCCLII5mYARbXeZ0AqHstQSUaUzN1Xm+xgXEmD5I+Fj0D82Ui2my+6hiY0lfingbBJoBElkxDbA2TKlh3drlVcRQif/IbIKMEz9+FULrjebA4eY9PbdgDzCFqoOLOYbqAITQ=`

#### 環境変数2: LINE_CHANNEL_SECRET
- **Key**: `LINE_CHANNEL_SECRET`
- **Value**: `1017478a22eb4c810faaeebebf10e0ee`

#### 環境変数3: APP_URL
- **Key**: `APP_URL`
- **Value**: あなたのアプリのURL（例：`https://suiren.onrender.com`）

5. 各環境変数を保存後、サーバーを再デプロイ

### ステップ2: パッケージのインストール

ターミナルで実行：

```bash
cd "/Users/mocky700/Desktop/個人利用/すいれん/server"
npm install
```

### ステップ3: Webhook URLを設定

1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. チャネルID `2008552055` のチャネルを選択
3. 左メニューから「Messaging API」をクリック
4. 「Webhook URL」セクションで以下を入力：
   ```
   https://あなたのサーバーURL/api/line/webhook
   ```
5. 「検証」をクリック
6. 「Webhookの利用」を「利用する」に設定
7. 「応答メッセージ」を「利用しない」に設定

### ステップ4: 動作確認

1. LINE公式アカウントを友だち追加（QRコードはLINE Developersで取得）
2. 「ポイント確認」と送信
3. ポイントカードが表示されれば成功

## ⚠️ 注意事項

- チャネルアクセストークンは30日間有効です
- 期限が近づいたら再発行が必要です
- 環境変数は大文字小文字を区別します
- Webhook URLはHTTPSである必要があります

