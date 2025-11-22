# PayPay API設定手順

## 1. PayPay for Developersに登録

1. [PayPay for Developers](https://developer.paypay.ne.jp/)にアクセス
2. 開発者アカウントを作成
3. マーチャント登録を完了

## 2. APIキーの取得

1. ダッシュボードにログイン
2. 「API Keys」セクションから以下を取得：
   - API Key
   - API Secret
   - Merchant ID

## 3. 環境変数の設定

Renderのダッシュボードで以下の環境変数を設定：

```
PAYPAY_API_KEY=あなたのAPIキー
PAYPAY_API_SECRET=あなたのAPIシークレット
PAYPAY_MERCHANT_ID=あなたのマーチャントID
PAYPAY_BASE_URL=https://stg-api.sandbox.paypay.ne.jp  # テスト環境
# 本番環境: https://api.paypay.ne.jp
BASE_URL=https://suiren.onrender.com  # あなたのサイトURL
```

## 4. テスト環境と本番環境

### テスト環境（Sandbox）
- URL: `https://stg-api.sandbox.paypay.ne.jp`
- テスト用のアカウントで動作確認

### 本番環境
- URL: `https://api.paypay.ne.jp`
- 実際の決済が行われます

## 5. Webhookの設定（オプション）

PayPayダッシュボードでWebhook URLを設定：
```
https://suiren.onrender.com/api/paypay/webhook
```

Webhookを使わない場合、フロントエンドでポーリング（定期的な確認）を行います。

## 6. 動作確認

1. 環境変数を設定
2. サーバーを再起動
3. 支払いリンクを生成してテスト

## 注意事項

- テスト環境では実際の決済は行われません
- 本番環境に切り替える前に、必ずテスト環境で動作確認してください
- APIキーは絶対に公開しないでください
- Webhookを使用する場合は、HTTPSが必要です

