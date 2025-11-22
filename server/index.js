const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

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

// 支払いを追加
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
