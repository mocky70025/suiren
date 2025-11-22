# Render デプロイ手順

## Renderとは
Renderは無料プランがあるクラウドホスティングサービスです。Node.jsアプリを簡単にデプロイできます。

## デプロイ手順

### 1. GitHubにリポジトリを作成
1. GitHubで新しいリポジトリを作成
2. このプロジェクトをプッシュ

```bash
cd /Users/mocky700/Desktop/個人利用/すいれん
git init
git add .
git commit -m "Initial commit"
git remote add origin [あなたのGitHubリポジトリURL]
git push -u origin main
```

### 2. Renderでアカウント作成
1. https://render.com にアクセス
2. 「Get Started for Free」でアカウント作成
3. GitHubアカウントで連携（推奨）

### 3. 新しいWebサービスを作成
1. Renderのダッシュボードで「New +」→「Web Service」を選択
2. GitHubリポジトリを選択
3. 以下の設定を入力：

**基本設定:**
- **Name**: `suiren`（任意の名前）
- **Region**: `Singapore`（日本に近い）
- **Branch**: `main`（または `master`）
- **Root Directory**: （空欄のまま）

**ビルド設定:**
- **Environment**: `Node`
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node index.js`

**環境変数:**
- `NODE_ENV` = `production`
- `PORT` = `10000`（Renderが自動で設定するので、空欄でもOK）

### 4. デプロイ
1. 「Create Web Service」をクリック
2. 自動的にビルドとデプロイが開始されます
3. 数分待つと、`https://suiren.onrender.com` のようなURLが発行されます

### 5. フロントエンドのAPI URLを更新
デプロイ後、`script.js`のAPIベースURLを更新する必要があります：

```javascript
// 本番環境用
const API_BASE = window.location.origin + '/api';
```

または、環境に応じて自動切り替え：

```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
    ? window.location.origin + '/api'
    : 'http://localhost:3000/api';
```

## 無料プランの制限
- **スリープ**: 15分間アクセスがないとスリープします（次回アクセス時に自動起動、約30秒かかります）
- **月間時間**: 750時間/月（約31日間）
- **帯域幅**: 100GB/月

## 注意事項
- 初回アクセス時は起動に時間がかかることがあります
- データベース（SQLite）はRenderの一時ストレージに保存されます
- より永続的なデータ保存が必要な場合は、RenderのPostgreSQL（有料）を検討してください

## トラブルシューティング

### ビルドエラー
- `package.json`の依存関係を確認
- ログを確認してエラー内容を確認

### データベースエラー
- `server/data/` ディレクトリが作成されているか確認
- ファイル権限を確認

### CORSエラー
- `cors`パッケージがインストールされているか確認
- サーバーのCORS設定を確認

