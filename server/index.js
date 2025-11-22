const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const paypay = require('./paypay');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(bodyParser.json());

// フロントエンドを配信（本番環境用）
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..')));
} else {
    app.use(express.static(path.join(__dirname, '..')));
}

// データベース初期化
db.init();

// ==================== ユーザー管理 ====================

// ユーザー登録
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
        }

        const userId = await db.createUser(username, password);
        res.json({ success: true, userId, username });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ログイン
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
        }

        const user = await db.authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
        }

        res.json({ success: true, userId: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ユーザー情報 ====================

// ユーザー情報取得（売り手情報取得用）
app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await db.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        res.json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ポイント管理 ====================

// ポイントデータ取得
app.get('/api/users/:userId/points', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const data = await db.getUserPoints(userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PayPay設定 ====================

// PayPay IDを更新
app.post('/api/users/:userId/paypay-id', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { paypayId } = req.body;

        if (!paypayId) {
            return res.status(400).json({ error: 'PayPay IDが必要です' });
        }

        await db.updatePayPayId(userId, paypayId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PayPay決済（API使用 - オプション） ====================

// PayPay支払いリンクを作成（PayPay API使用時のみ）
app.post('/api/paypay/create-link', async (req, res) => {
    try {
        const { userId, amount, sellerId, description } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'ユーザーIDと金額が必要です' });
        }

        // 注文IDを生成（ユニークなID）
        const orderId = `ORDER_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // PayPay支払いリンクを作成
        const paymentLink = await paypay.createPaymentLink(
            amount,
            orderId,
            description || `支払い: ${amount}円`
        );

        // 決済情報を一時保存（決済完了まで待機）
        // 実際の実装では、データベースに保存することを推奨
        // ここでは簡易的にメモリに保存（本番環境ではDBを使用）
        if (!global.pendingPayments) {
            global.pendingPayments = new Map();
        }
        global.pendingPayments.set(orderId, {
            userId: parseInt(userId),
            sellerId: sellerId ? parseInt(sellerId) : null,
            amount: amount,
            status: 'PENDING',
            createdAt: new Date()
        });

        res.json({
            success: true,
            paymentLink: paymentLink.paymentLink,
            qrCodeUrl: paymentLink.qrCodeUrl,
            orderId: orderId
        });
    } catch (error) {
        console.error('PayPayリンク作成エラー:', error);
        res.status(500).json({ error: error.message || '支払いリンクの作成に失敗しました' });
    }
});

// 決済状況を確認
app.get('/api/paypay/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const status = await paypay.checkPaymentStatus(orderId);
        res.json(status);
    } catch (error) {
        console.error('決済状況確認エラー:', error);
        res.status(500).json({ error: error.message || '決済状況の確認に失敗しました' });
    }
});

// PayPay Webhook（決済完了通知）
app.post('/api/paypay/webhook', async (req, res) => {
    try {
        const { merchantPaymentId, status } = req.body;

        if (!merchantPaymentId) {
            return res.status(400).json({ error: 'merchantPaymentIdが必要です' });
        }

        // 決済が完了した場合
        if (status === 'COMPLETED' || status === 'APPROVED') {
            // 一時保存された決済情報を取得
            const pendingPayment = global.pendingPayments?.get(merchantPaymentId);
            
            if (pendingPayment) {
                // 決済情報を取得
                const paymentInfo = await paypay.checkPaymentStatus(merchantPaymentId);
                
                // データベースに記録
                await db.addPayment(
                    pendingPayment.userId,
                    paymentInfo.amount,
                    pendingPayment.sellerId
                );

                // 一時保存から削除
                global.pendingPayments.delete(merchantPaymentId);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook処理エラー:', error);
        res.status(500).json({ error: error.message });
    }
});

// 支払いを追加（従来の方法 - PayPay未使用の場合）
app.post('/api/users/:userId/payments', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { amount, sellerId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: '正しい金額を入力してください' });
        }

        const sellerIdInt = sellerId ? parseInt(sellerId) : null;
        const payment = await db.addPayment(userId, amount, sellerIdInt);
        res.json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 支払い履歴取得
app.get('/api/users/:userId/payments', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const payments = await db.getPayments(userId);
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== 運営用API ====================

// 全ユーザー一覧取得
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 売り手の受け取り金額取得
app.get('/api/admin/sellers/:sellerId/earnings', async (req, res) => {
    try {
        const sellerId = parseInt(req.params.sellerId);
        const earnings = await db.getSellerEarnings(sellerId);
        res.json(earnings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 売り手の受け取り履歴取得
app.get('/api/admin/sellers/:sellerId/transactions', async (req, res) => {
    try {
        const sellerId = parseInt(req.params.sellerId);
        const transactions = await db.getSellerTransactions(sellerId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== 売り手受け取り記録 ====================

// 売り手が受け取った金額を記録
app.post('/api/seller/receipts', async (req, res) => {
    try {
        const { sellerId, amount, buyerId, memo } = req.body;

        if (!sellerId || !amount || amount <= 0) {
            return res.status(400).json({ error: '売り手IDと金額が必要です' });
        }

        const receipt = await db.addSellerReceipt(
            parseInt(sellerId),
            amount,
            buyerId ? parseInt(buyerId) : null,
            memo || ''
        );

        res.json({ success: true, receipt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 未処理の受け取り記録を取得（運営用）
app.get('/api/admin/pending-receipts', async (req, res) => {
    try {
        const receipts = await db.getPendingReceipts();
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 受け取り記録を処理（買い手のポイントカードに反映）
app.post('/api/admin/receipts/:receiptId/process', async (req, res) => {
    try {
        const receiptId = parseInt(req.params.receiptId);
        const { buyerId } = req.body;

        if (!buyerId) {
            return res.status(400).json({ error: '買い手IDが必要です' });
        }

        await db.processReceipt(receiptId, parseInt(buyerId));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// すべての受け取り記録を取得（運営用）
app.get('/api/admin/all-receipts', async (req, res) => {
    try {
        const receipts = await db.getAllReceipts();
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// すべての支払い記録を取得（運営用）
app.get('/api/admin/all-payments', async (req, res) => {
    try {
        const payments = await db.getAllPayments();
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 運営用ページ
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// ルート（フロントエンドを配信）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`すいれんサーバーが起動しました: http://localhost:${PORT}`);
});
