# Webhook URL設定手順

## 🎯 このステップの目標

LINE DevelopersでWebhook URLを設定し、LINE公式アカウントからのメッセージをサーバーで受信できるようにします。

## 📋 前提条件

- ✅ 環境変数を設定済み
- ✅ サーバーを再デプロイ済み
- ✅ サーバーが起動している

## 📋 手順

### 1. LINE Developers Consoleにアクセス

1. ブラウザで [LINE Developers Console](https://developers.line.biz/console/) を開く
2. LINEアカウントでログイン

### 2. チャネルを選択

1. あなたのプロバイダーを選択
2. チャネルID `2008552055` のチャネルをクリック

### 3. Messaging APIページを開く

1. 左側のメニューから **「Messaging API」** をクリック
   - 「チャネル基本設定」の下にあります

### 4. Webhook URLを設定

1. ページを下にスクロール
2. **「Webhook URL」** セクションを探す
3. 以下を入力：

```
https://あなたのRenderサービスのURL/api/line/webhook
```

**例**：
- サーバーURLが `https://suiren.onrender.com` の場合
- Webhook URL: `https://suiren.onrender.com/api/line/webhook`

4. 「更新」または「保存」ボタンをクリック

### 5. Webhook URLを検証

1. 「検証」ボタンをクリック
2. 成功すると、以下のように表示されます：
   - ✅ 「Webhookイベントの受信」が「利用する」になる
   - ✅ 成功メッセージが表示される

### 6. Webhookの利用を有効化

1. **「Webhookの利用」** を **「利用する」** に設定
   - トグルスイッチをONにする

2. **「応答メッセージ」** を **「利用しない」** に設定
   - ⚠️ **重要**：Webhookで処理するため、「利用しない」にします
   - これにより、あなたのサーバーがメッセージを処理できます

## ✅ 完了チェックリスト

- [ ] LINE Developers Consoleにログインした
- [ ] チャネルを選択した
- [ ] Messaging APIページを開いた
- [ ] Webhook URLを入力した
- [ ] 「検証」ボタンをクリックして成功した
- [ ] 「Webhookの利用」を「利用する」に設定した
- [ ] 「応答メッセージ」を「利用しない」に設定した

## ⚠️ トラブルシューティング

### 検証が失敗する場合

#### 1. サーバーが起動しているか確認

- Render Dashboardで「Logs」タブを確認
- サーバーが正常に起動しているか確認
- エラーがないか確認

#### 2. URLが正しいか確認

- `https://` で始まっているか（HTTPではなくHTTPS）
- `/api/line/webhook` で終わっているか
- 余分なスペースや文字がないか

#### 3. 環境変数が設定されているか確認

- Render Dashboardで環境変数を確認
- `LINE_CHANNEL_SECRET` が正しく設定されているか

#### 4. サーバーのログを確認

- Render Dashboardの「Logs」タブを開く
- Webhook検証時にエラーが出ていないか確認

### 検証が成功しない場合の対処法

1. **サーバーを再デプロイ**
   - Render Dashboardで「Manual Deploy」→「Deploy latest commit」

2. **数分待つ**
   - デプロイ直後は反映に時間がかかる場合があります

3. **URLを再確認**
   - コピー＆ペーストで正確に入力

## 🔍 動作確認

### 1. LINE公式アカウントを友だち追加

1. LINE Developers Consoleで「チャネル基本設定」を開く
2. 「QRコード」セクションでQRコードを表示
3. LINEアプリでQRコードをスキャン
4. 友だち追加を完了

### 2. メッセージを送信してテスト

1. LINE公式アカウントに何かメッセージを送信（例：「テスト」）
2. Render Dashboardの「Logs」タブを確認
   - Webhookイベントが受信されていれば成功
   - エラーが出ていないか確認

### 3. ポイントカード機能をテスト

1. LINE公式アカウントに「ポイント確認」と送信
2. ポイントカードが表示されれば成功
   - ⚠️ ただし、LINEユーザーIDをシステムユーザーと紐づける必要があります

## 📝 次のステップ

Webhook URLの設定が完了したら、**動作確認とテスト**に進みます。

