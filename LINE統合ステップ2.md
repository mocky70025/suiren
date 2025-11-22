# LINE統合 ステップ2: 環境変数の設定

## 🎯 このステップの目標

LINE Developersで取得した情報を環境変数として設定し、サーバーからLINE APIを使えるようにします。

## 📋 手順

### 1. 必要な情報を確認

ステップ1で保存した以下の情報を準備：
- チャネルアクセストークン
- チャネルシークレット
- アプリのURL（例：`https://suiren.onrender.com`）

### 2. Renderで環境変数を設定（デプロイ済みの場合）

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. あなたのサービス（すいれん）を選択
3. 左メニューから「Environment」をクリック
4. 「Add Environment Variable」をクリック
5. 以下の3つの環境変数を追加：

#### 環境変数1: LINE_CHANNEL_ACCESS_TOKEN
- **Key**: `LINE_CHANNEL_ACCESS_TOKEN`
- **Value**: ステップ1で取得したチャネルアクセストークン
- 「Save」をクリック

#### 環境変数2: LINE_CHANNEL_SECRET
- **Key**: `LINE_CHANNEL_SECRET`
- **Value**: ステップ1で取得したチャネルシークレット
- 「Save」をクリック

#### 環境変数3: APP_URL
- **Key**: `APP_URL`
- **Value**: あなたのアプリのURL（例：`https://suiren.onrender.com`）
- 「Save」をクリック

### 3. ローカル開発環境で設定（開発用）

ローカルで開発する場合は、`.env`ファイルを作成：

1. `server`ディレクトリに`.env`ファイルを作成
2. 以下の内容を記述：

```env
LINE_CHANNEL_ACCESS_TOKEN=あなたのチャネルアクセストークン
LINE_CHANNEL_SECRET=あなたのチャネルシークレット
APP_URL=http://localhost:3000
```

3. `.gitignore`に`.env`が含まれていることを確認（秘密情報なのでGitにコミットしない）

### 4. サーバーを再デプロイ（Renderの場合）

1. Render Dashboardで「Manual Deploy」→「Deploy latest commit」をクリック
2. または、GitHubにpushすると自動デプロイされます

## ✅ 完了チェックリスト

- [ ] Renderで環境変数を3つ設定した
- [ ] 環境変数の値が正しいことを確認した
- [ ] サーバーを再デプロイした（Renderの場合）
- [ ] ローカル開発用の`.env`ファイルを作成した（開発する場合）

## ⚠️ 注意事項

- 環境変数は大文字小文字を区別します。正確に入力してください
- チャネルアクセストークンとチャネルシークレットは秘密情報です
- `.env`ファイルは絶対にGitにコミットしないでください

## ➡️ 次のステップ

ステップ2が完了したら、**ステップ3: パッケージのインストール**に進みます。

