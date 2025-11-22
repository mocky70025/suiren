// PayPay API統合
const crypto = require('crypto');
const fetch = require('node-fetch');

class PayPayAPI {
    constructor() {
        // 環境変数から設定を取得
        this.apiKey = process.env.PAYPAY_API_KEY;
        this.apiSecret = process.env.PAYPAY_API_SECRET;
        this.merchantId = process.env.PAYPAY_MERCHANT_ID;
        this.baseUrl = process.env.PAYPAY_BASE_URL || 'https://stg-api.sandbox.paypay.ne.jp';
        this.isProduction = process.env.NODE_ENV === 'production' && process.env.PAYPAY_BASE_URL;
    }

    // 認証ヘッダーを生成
    generateAuthHeader(method, path, body = '') {
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');
        const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
        
        const signature = this.generateSignature(method, path, timestamp, nonce, bodyHash);
        
        return {
            'Authorization': `hmac OPA-Auth:${this.apiKey}:${signature}:${nonce}:${timestamp}`,
            'Content-Type': 'application/json',
            'X-ASSUME-MERCHANT': this.merchantId
        };
    }

    // 署名を生成
    generateSignature(method, path, timestamp, nonce, bodyHash) {
        const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
        const signature = crypto.createHmac('sha256', this.apiSecret)
            .update(message)
            .digest('base64');
        return signature;
    }

    // 支払いリンクを作成
    async createPaymentLink(amount, orderId, description = '') {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('PayPay API設定が完了していません');
        }

        const path = '/v2/qrcode';
        const body = JSON.stringify({
            merchantPaymentId: orderId,
            amount: {
                amount: amount,
                currency: 'JPY'
            },
            codeType: 'ORDER_QR',
            redirectUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/payment/callback`,
            redirectType: 'WEB_LINK',
            userAgent: 'Mozilla/5.0',
            orderDescription: description || `支払い: ${amount}円`
        });

        const headers = this.generateAuthHeader('POST', path, body);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers,
                body
            });

            const data = await response.json();
            
            if (response.ok && data.resultInfo.code === 'SUCCESS') {
                return {
                    success: true,
                    paymentLink: data.data.url,
                    qrCodeUrl: data.data.qrCodeUrl,
                    merchantPaymentId: data.data.merchantPaymentId
                };
            } else {
                throw new Error(data.resultInfo.message || '支払いリンクの作成に失敗しました');
            }
        } catch (error) {
            console.error('PayPay API エラー:', error);
            throw error;
        }
    }

    // 決済状況を確認
    async checkPaymentStatus(merchantPaymentId) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('PayPay API設定が完了していません');
        }

        const path = `/v2/codes/payments/${merchantPaymentId}`;
        const headers = this.generateAuthHeader('GET', path);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'GET',
                headers
            });

            const data = await response.json();
            
            if (response.ok && data.resultInfo.code === 'SUCCESS') {
                return {
                    status: data.data.status,
                    amount: data.data.amount?.amount || 0,
                    merchantPaymentId: data.data.merchantPaymentId
                };
            } else {
                throw new Error(data.resultInfo.message || '決済状況の確認に失敗しました');
            }
        } catch (error) {
            console.error('PayPay API エラー:', error);
            throw error;
        }
    }

    // 決済をキャンセル
    async cancelPayment(merchantPaymentId) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('PayPay API設定が完了していません');
        }

        const path = `/v2/payments/${merchantPaymentId}`;
        const headers = this.generateAuthHeader('DELETE', path);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'DELETE',
                headers
            });

            const data = await response.json();
            
            if (response.ok && data.resultInfo.code === 'SUCCESS') {
                return { success: true };
            } else {
                throw new Error(data.resultInfo.message || '決済のキャンセルに失敗しました');
            }
        } catch (error) {
            console.error('PayPay API エラー:', error);
            throw error;
        }
    }
}

module.exports = new PayPayAPI();

