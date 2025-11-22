# LINE統合 ステップ3: パッケージのインストール

## 🎯 このステップの目標

LINE Messaging APIを使うために必要なパッケージをインストールします。

## 📋 手順

### 1. サーバーディレクトリに移動

ターミナルで以下を実行：

```bash
cd "/Users/mocky700/Desktop/個人利用/すいれん/server"
```

### 2. パッケージをインストール

```bash
npm install
```

これで、`package.json`に追加した`@line/bot-sdk`パッケージがインストールされます。

### 3. インストールを確認

以下のコマンドで、パッケージが正しくインストールされたか確認：

```bash
npm list @line/bot-sdk
```

`@line/bot-sdk@9.3.0`のような表示が出れば成功です。

### 4. 変更をGitにコミット（推奨）

```bash
cd "/Users/mocky700/Desktop/個人利用/すいれん"
git add server/package.json server/package-lock.json
git commit -m "LINE Messaging APIパッケージを追加"
git push origin main
```

これで、Renderでも自動的にパッケージがインストールされます。

## ✅ 完了チェックリスト

- [ ] `npm install`を実行した
- [ ] エラーなくインストールが完了した
- [ ] 変更をGitにコミットした（推奨）

## ⚠️ 注意事項

- エラーが出た場合は、Node.jsのバージョンを確認してください（v14以上が必要）
- `package-lock.json`も一緒にコミットすることを推奨します

## ➡️ 次のステップ

ステップ3が完了したら、**ステップ4: Webhook URLの設定**に進みます。

