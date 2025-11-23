const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const paypay = require('./paypay');
const line = require('./line');
const lineLogin = require('./lineLogin');
const lineMiddleware = require('@line/bot-sdk').middleware;

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(bodyParser.json());

// LINE Webhook用のミドルウェア（LINEからのリクエストのみ、環境変数が設定されている場合のみ）
if (process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_SECRET !== '') {
    app.use('/api/line/webhook', lineMiddleware({
        channelSecret: process.env.LINE_CHANNEL_SECRET
    }));
}

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

// 売り手のPayPay IDを取得（PayPayリンク生成用）
app.get('/api/seller/paypay-id', async (req, res) => {
    try {
        // PayPay IDが設定されている最初のユーザーを売り手として取得
        const users = await db.getAllUsers();
        const seller = users.find(u => u.paypay_id && u.paypay_id.trim() !== '');
        
        if (!seller) {
            return res.status(404).json({ error: '売り手のPayPay IDが設定されていません' });
        }
        
        res.json({ 
            success: true, 
            paypayId: seller.paypay_id,
            sellerName: seller.username 
        });
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

        // 買い手名が入力されている場合は自動的に処理
        if (buyerId) {
            try {
                await db.processReceipt(receipt.id, parseInt(buyerId));
                return res.json({ 
                    success: true, 
                    receipt: { ...receipt, status: 'PROCESSED', autoProcessed: true },
                    message: '受け取り記録を登録し、自動的にポイントカードに反映しました'
                });
            } catch (processError) {
                // 自動処理に失敗した場合は、手動処理が必要
                console.error('自動処理エラー:', processError);
                return res.json({ 
                    success: true, 
                    receipt: { ...receipt, status: 'PENDING' },
                    message: '受け取り記録を登録しました。運営が確認後にポイントカードに反映されます。'
                });
            }
        }

        res.json({ 
            success: true, 
            receipt: { ...receipt, status: 'PENDING' },
            message: '受け取り記録を登録しました。運営が確認後にポイントカードに反映されます。'
        });
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

// ==================== LINE統合 ====================

// LINEログイン開始
app.get('/api/line/login', (req, res) => {
    const state = Math.random().toString(36).substring(7); // セキュリティ用のランダム文字列
    const loginUrl = lineLogin.getLineLoginUrl(state);
    res.redirect(loginUrl);
});

// LINEログインコールバック
app.get('/api/line/login/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            return res.redirect('/?error=line_login_failed');
        }
        
        // アクセストークンを取得
        const tokenData = await lineLogin.getAccessToken(code);
        
        // IDトークンからユーザー情報を取得
        const userInfo = await lineLogin.verifyIdToken(tokenData.id_token);
        
        // LINEユーザーIDでユーザーを作成または取得
        const user = await db.createOrGetUserByLineId(userInfo.sub, userInfo.name);
        
        // フロントエンドにリダイレクト（ユーザー情報をセッションに保存する場合は別途実装）
        res.redirect(`/?line_login_success=true&userId=${user.id}&username=${encodeURIComponent(user.username)}`);
    } catch (error) {
        console.error('LINEログインエラー:', error);
        res.redirect('/?error=line_login_failed');
    }
});

// LINE自動ログイン（LINEユーザーIDでログイン）
app.post('/api/line/auto-login', async (req, res) => {
    try {
        const { lineUserId } = req.body;
        
        if (!lineUserId) {
            return res.status(400).json({ error: 'LINEユーザーIDが必要です' });
        }
        
        // LINEユーザーIDでユーザーを作成または取得
        const user = await db.createOrGetUserByLineId(lineUserId);
        
        if (!user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        
        res.json({ 
            success: true, 
            userId: user.id, 
            username: user.username 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LINE Webhookエンドポイント
app.post('/api/line/webhook', async (req, res) => {
    try {
        const events = req.body.events;
        
        for (const event of events) {
            await line.handleWebhookEvent(event);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('LINE Webhookエラー:', error);
        res.status(500).json({ error: error.message });
    }
});

// LINEユーザーIDを保存
app.post('/api/users/:userId/line-id', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { lineUserId } = req.body;
        
        if (!lineUserId) {
            return res.status(400).json({ error: 'LINEユーザーIDが必要です' });
        }
        
        await line.saveLineUserId(userId, lineUserId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LINEメッセージ送信（運営用）
app.post('/api/line/send-message', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({ error: 'ユーザーIDとメッセージが必要です' });
        }
        
        // ユーザーIDからLINEユーザーIDを取得
        const user = await db.getUser(parseInt(userId));
        if (!user || !user.line_user_id) {
            return res.status(400).json({ error: 'LINEユーザーIDが登録されていません' });
        }
        
        await line.sendTextMessage(user.line_user_id, message);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LINE支払いリンク送信
app.post('/api/line/send-payment-link', async (req, res) => {
    try {
        const { userId, amount, paymentUrl } = req.body;
        
        if (!userId || !amount || !paymentUrl) {
            return res.status(400).json({ error: 'ユーザーID、金額、支払いURLが必要です' });
        }
        
        // ユーザーIDからLINEユーザーIDを取得
        const user = await db.getUser(parseInt(userId));
        if (!user || !user.line_user_id) {
            return res.status(400).json({ error: 'LINEユーザーIDが登録されていません' });
        }
        
        await line.sendPaymentLink(user.line_user_id, amount, paymentUrl);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LINEポイントカード送信
app.post('/api/line/send-points-card', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'ユーザーIDが必要です' });
        }
        
        // ユーザーIDからLINEユーザーIDを取得
        const user = await db.getUser(parseInt(userId));
        if (!user || !user.line_user_id) {
            return res.status(400).json({ error: 'LINEユーザーIDが登録されていません' });
        }
        
        await line.sendPointsCard(user.line_user_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== リッチメニュー管理 ====================

const richMenu = require('./richMenu');

// リッチメニューを作成
app.post('/api/line/richmenu/create', async (req, res) => {
    try {
        const richMenuId = await richMenu.createRichMenu();
        res.json({ success: true, richMenuId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// リッチメニューをデフォルトに設定
app.post('/api/line/richmenu/set-default/:richMenuId', async (req, res) => {
    try {
        const { richMenuId } = req.params;
        await richMenu.setDefaultRichMenu(richMenuId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// リッチメニュー一覧を取得
app.get('/api/line/richmenu/list', async (req, res) => {
    try {
        const list = await richMenu.getRichMenuList();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// リッチメニューを削除
app.delete('/api/line/richmenu/:richMenuId', async (req, res) => {
    try {
        const { richMenuId } = req.params;
        await richMenu.deleteRichMenu(richMenuId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ルート（フロントエンドを配信）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// サーバー起動
app.listen(PORT, async () => {
    console.log(`すいれんサーバーが起動しました: http://localhost:${PORT}`);
    
    // リッチメニューを自動的に作成・設定
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        try {
            console.log('リッチメニューを設定中...');
            await setupRichMenu();
            console.log('リッチメニューの設定が完了しました');
        } catch (error) {
            console.error('リッチメニューの設定エラー:', error);
            console.log('リッチメニューは手動で設定してください');
        }
    } else {
        console.log('LINE_CHANNEL_ACCESS_TOKENが設定されていないため、リッチメニューはスキップされました');
    }
});

// リッチメニューを自動設定
async function setupRichMenu() {
    const richMenu = require('./richMenu');
    const path = require('path');
    const fs = require('fs');
    
    try {
        // 既存のリッチメニューを削除
        const existingList = await richMenu.getRichMenuList();
        if (existingList.richmenus && existingList.richmenus.length > 0) {
            for (const menu of existingList.richmenus) {
                try {
                    await richMenu.deleteRichMenu(menu.richMenuId);
                } catch (error) {
                    console.error('既存メニュー削除エラー:', error);
                }
            }
        }
        
        // 新しいリッチメニューを作成
        const richMenuId = await richMenu.createRichMenu();
        
        // 画像があればアップロード（オプション）
        const imagePath = path.join(__dirname, '..', 'assets', 'richmenu_image.png');
        if (fs.existsSync(imagePath)) {
            try {
                await richMenu.uploadRichMenuImage(richMenuId, imagePath);
                console.log('リッチメニュー画像をアップロードしました');
            } catch (error) {
                console.warn('リッチメニュー画像のアップロードに失敗しました（画像なしで続行）:', error.message);
            }
        } else {
            console.log('リッチメニュー画像が見つかりません（画像なしで続行）');
        }
        
        // デフォルトに設定
        await richMenu.setDefaultRichMenu(richMenuId);
        
        return { success: true, richMenuId };
    } catch (error) {
        console.error('リッチメニュー設定エラー:', error);
        throw error;
    }
}
