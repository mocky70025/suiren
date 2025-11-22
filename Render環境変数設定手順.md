# Render環境変数設定手順

## 🎯 このステップの目標

RenderでLINE統合に必要な環境変数を設定します。

## 📋 手順

### 1. Render Dashboardにアクセス

1. ブラウザで [Render Dashboard](https://dashboard.render.com/) を開く
2. ログイン

### 2. サービスを選択

1. あなたのサービス（すいれん）をクリック
   - サービス一覧から選択

### 3. Environmentタブを開く

1. 左側のメニューから **「Environment」** をクリック
   - または、上部のタブから「Environment」を選択

### 4. 環境変数を追加

以下の3つの環境変数を**1つずつ**追加します。

#### 環境変数1: LINE_CHANNEL_ACCESS_TOKEN

1. 「Add Environment Variable」ボタンをクリック
2. 以下を入力：
   - **Key**: `LINE_CHANNEL_ACCESS_TOKEN`
   - **Value**: `pQ3Re0WpVP7NQmHskaCO1lhBZjJj0vmt2Tl2A79WCCLII5mYARbXeZ0AqHstQSUaUzN1Xm+xgXEmD5I+Fj0D82Ui2my+6hiY0lfingbBJoBElkxDbA2TKlh3drlVcRQif/IbIKMEz9+FULrjebA4eY9PbdgDzCFqoOLOYbqAITQ=`
3. 「Save Changes」をクリック

#### 環境変数2: LINE_CHANNEL_SECRET

1. 「Add Environment Variable」ボタンをクリック
2. 以下を入力：
   - **Key**: `LINE_CHANNEL_SECRET`
   - **Value**: `1017478a22eb4c810faaeebebf10e0ee`
3. 「Save Changes」をクリック

#### 環境変数3: APP_URL

1. 「Add Environment Variable」ボタンをクリック
2. 以下を入力：
   - **Key**: `APP_URL`
   - **Value**: あなたのRenderサービスのURL
     - 例：`https://suiren.onrender.com`
     - Render Dashboardの上部に表示されているURLを使用
3. 「Save Changes」をクリック

### 5. 設定を確認

追加した環境変数が3つ表示されていることを確認：

- ✅ `LINE_CHANNEL_ACCESS_TOKEN`
- ✅ `LINE_CHANNEL_SECRET`
- ✅ `APP_URL`

### 6. サーバーを再デプロイ

環境変数を追加した後、サーバーを再デプロイする必要があります。

#### 方法1: 手動で再デプロイ

1. 上部の「Manual Deploy」をクリック
2. 「Deploy latest commit」を選択
3. デプロイが完了するまで待つ（数分かかります）

#### 方法2: Git pushで自動デプロイ

変更をGitにpushすると、自動的にデプロイされます：

```bash
cd "/Users/mocky700/Desktop/個人利用/すいれん"
git add .
git commit -m "LINE統合の環境変数を設定"
git push origin main
```

## ✅ 完了チェックリスト

- [ ] Render Dashboardにログインした
- [ ] サービスを選択した
- [ ] Environmentタブを開いた
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`を追加した
- [ ] `LINE_CHANNEL_SECRET`を追加した
- [ ] `APP_URL`を追加した
- [ ] 3つの環境変数が表示されていることを確認した
- [ ] サーバーを再デプロイした

## ⚠️ 注意事項

- 環境変数の**Key**は大文字小文字を区別します。正確に入力してください
- **Value**も正確にコピー＆ペーストしてください（余分なスペースなどがないか確認）
- 環境変数を追加・変更した後は、必ずサーバーを再デプロイしてください
- 再デプロイには数分かかります

## 🔍 トラブルシューティング

### 環境変数が反映されない

- サーバーを再デプロイしたか確認
- 環境変数のKeyが正確か確認（大文字小文字）
- Render Dashboardの「Logs」タブでエラーがないか確認

### デプロイが失敗する

- 「Logs」タブでエラーメッセージを確認
- 環境変数のValueに不正な文字が含まれていないか確認

## ➡️ 次のステップ

環境変数の設定が完了したら、**Webhook URLの設定**に進みます。

