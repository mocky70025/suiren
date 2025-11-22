# PayPay API導入後の手順

## 1. GitHubにプッシュ

```bash
cd /Users/mocky700/Desktop/個人利用/すいれん
git add .
git commit -m "PayPay API統合を追加"
git push origin main
```

## 2. Renderで自動デプロイを確認

1. Renderのダッシュボードにアクセス
2. あなたのサービス（suiren）を開く
3. 「Events」タブでデプロイ状況を確認
4. デプロイが完了するまで待つ（数分かかります）

## 3. PayPay for Developersに登録

### 3-1. アカウント作成
1. https://developer.paypay.ne.jp/ にアクセス
2. 「新規登録」をクリック
3. 必要情報を入力してアカウントを作成

### 3-2. マーチャント登録
1. ダッシュボードにログイン
2. 「マーチャント登録」を完了
3. 審査が完了するまで待つ（数日かかる場合があります）

## 4. APIキーを取得

1. PayPayダッシュボードにログイン
2. 「API Keys」セクションを開く
3. 以下をコピー：
   - **API Key**
   - **API Secret**
   - **Merchant ID**

## 5. Renderで環境変数を設定

1. Renderのダッシュボードで、あなたのサービス（suiren）を開く
2. 左メニューから「Environment」を選択
3. 「Add Environment Variable」をクリック
4. 以下の環境変数を追加：

### 必須の環境変数

```
PAYPAY_API_KEY=あなたのAPIキー
PAYPAY_API_SECRET=あなたのAPIシークレット
PAYPAY_MERCHANT_ID=あなたのマーチャントID
BASE_URL=https://suiren.onrender.com
```

### テスト環境用（開発中）

```
PAYPAY_BASE_URL=https://stg-api.sandbox.paypay.ne.jp
```

### 本番環境用（実際の決済）

```
PAYPAY_BASE_URL=https://api.paypay.ne.jp
```

**注意**: 最初はテスト環境（Sandbox）で動作確認してください。

## 6. サーバーを再起動

1. Renderのダッシュボードで、あなたのサービスを開く
2. 「Manual Deploy」→「Deploy latest commit」をクリック
3. または、環境変数を追加した後、自動的に再デプロイされます

## 7. 動作確認

### 7-1. テスト環境で確認
1. サイトにアクセス: `https://suiren.onrender.com`
2. ログイン
3. 支払い金額を入力
4. 「PayPayで支払う」をクリック
5. PayPayの支払いリンクが表示されることを確認
6. QRコードが表示されることを確認

### 7-2. 実際の決済テスト（Sandbox環境）
1. PayPay Sandboxアカウントでログイン
2. 支払いリンクをクリック
3. 決済を完了
4. ポイントカードに金額が追加されることを確認

## 8. Webhookの設定（オプション）

Webhookを使うと、決済完了をより確実に検知できます。

1. PayPayダッシュボードで「Webhooks」を開く
2. Webhook URLを設定：
   ```
   https://suiren.onrender.com/api/paypay/webhook
   ```
3. イベントタイプを選択：
   - `PAYMENT_COMPLETED`
   - `PAYMENT_APPROVED`

**注意**: Webhookを使わない場合、フロントエンドでポーリング（定期的な確認）を行います。

## 9. 本番環境への切り替え

テスト環境で問題なく動作することを確認したら：

1. Renderの環境変数で `PAYPAY_BASE_URL` を変更：
   ```
   PAYPAY_BASE_URL=https://api.paypay.ne.jp
   ```
2. サーバーを再起動
3. 実際の決済で動作確認

## トラブルシューティング

### エラー: "PayPay API設定が完了していません"
- 環境変数が正しく設定されているか確認
- サーバーを再起動

### エラー: "支払いリンクの作成に失敗しました"
- APIキーが正しいか確認
- テスト環境のURLが正しいか確認
- PayPayダッシュボードでAPIキーの状態を確認

### 決済完了が検知されない
- ポーリングが正常に動作しているか確認
- Webhookを設定している場合は、Webhook URLが正しいか確認
- ブラウザのコンソールでエラーを確認

## 注意事項

- **テスト環境**: 実際の決済は行われません。Sandboxアカウントでテストできます。
- **本番環境**: 実際の決済が行われます。十分にテストしてから切り替えてください。
- **APIキー**: 絶対に公開しないでください。GitHubにコミットしないでください。
- **セキュリティ**: HTTPSを使用してください（Renderは自動でHTTPSを提供します）。

