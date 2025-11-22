# LINEログイン設定手順

## 🎯 このステップの目標

LINE Loginを有効化して、LINEユーザーIDでアカウントを管理できるようにします。

## 📋 手順

### ステップ1: LINE Developers ConsoleでLINE Loginを有効化

1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. あなたのプロバイダーを選択
3. チャネルID `2008552055` のチャネルを選択

### ステップ2: LINE Login設定

1. 左メニューから「LINE Login」をクリック
   - もしくは、チャネル設定ページで「LINE Login」タブを選択

2. **LINE Loginを有効化**
   - 「LINE Login」を「利用する」に設定

3. **コールバックURLを設定**
   - コールバックURLに以下を入力：
     ```
     https://あなたのサーバーURL/api/line/login/callback
     ```
   - 例：`https://suiren.onrender.com/api/line/login/callback`

4. **スコープを設定**
   - `profile` と `openid` を選択
   - これにより、ユーザーのプロフィール情報を取得できます

5. **設定を保存**

### ステップ3: 環境変数の確認

既に設定済みの環境変数を確認：

- `LINE_CHANNEL_ACCESS_TOKEN` ✅
- `LINE_CHANNEL_SECRET` ✅
- `APP_URL` ✅

LINE Loginでは、Messaging APIと同じチャネルIDとチャネルシークレットを使用します。

### ステップ4: 動作確認

1. ウェブアプリにアクセス
2. ログイン画面で「LINEでログイン」ボタンをクリック
3. LINE認証画面に遷移
4. 認証完了後、自動的にログインされる

## ✅ 完了チェックリスト

- [ ] LINE Developers ConsoleでLINE Loginを有効化した
- [ ] コールバックURLを設定した
- [ ] スコープ（profile, openid）を設定した
- [ ] 設定を保存した
- [ ] ウェブアプリで「LINEでログイン」ボタンが表示されることを確認した

## 💡 動作の流れ

1. **ユーザーが「LINEでログイン」をクリック**
   - `/api/line/login` にアクセス

2. **LINE認証画面にリダイレクト**
   - LINEアカウントでログイン
   - 認証を許可

3. **コールバックURLにリダイレクト**
   - `/api/line/login/callback` にアクセス
   - 認証コードを受け取る

4. **サーバーが処理**
   - アクセストークンを取得
   - ユーザープロフィールを取得
   - LINEユーザーIDでユーザーを作成または取得

5. **フロントエンドにリダイレクト**
   - ログイン成功
   - メイン画面が表示される

## ⚠️ 注意事項

- コールバックURLはHTTPSである必要があります
- スコープは `profile` と `openid` を選択してください
- LINE LoginとMessaging APIは同じチャネルを使用できます

## 🔍 トラブルシューティング

### LINE Loginが表示されない

- LINE Developers ConsoleでLINE Loginが有効化されているか確認
- チャネル設定ページで「LINE Login」タブを確認

### コールバックエラー

- コールバックURLが正しいか確認
- サーバーが起動しているか確認
- 環境変数が正しく設定されているか確認

