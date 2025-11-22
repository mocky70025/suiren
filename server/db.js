const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'suiren.db');

let db = null;

// データベース初期化
function init() {
    return new Promise((resolve, reject) => {
        // データディレクトリがなければ作成
        const fs = require('fs');
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('データベース接続エラー:', err);
                reject(err);
            } else {
                console.log('データベースに接続しました');
                createTables().then(resolve).catch(reject);
            }
        });
    });
}

// テーブル作成
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // ユーザーテーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    paypay_id TEXT,
                    line_user_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('ユーザーテーブル作成エラー:', err);
                    reject(err);
                } else {
                    // 既存のテーブルにpaypay_idカラムを追加（マイグレーション）
                    db.run(`
                        ALTER TABLE users 
                        ADD COLUMN paypay_id TEXT
                    `, (alterErr) => {
                        // エラーは無視（既にカラムが存在する場合）
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.log('paypay_idカラムの追加:', alterErr.message);
                        }
                    });
                    
                    // 既存のテーブルにline_user_idカラムを追加（マイグレーション）
                    db.run(`
                        ALTER TABLE users 
                        ADD COLUMN line_user_id TEXT
                    `, (alterErr) => {
                        // エラーは無視（既にカラムが存在する場合）
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.log('line_user_idカラムの追加:', alterErr.message);
                        }
                    });
                }
            });

            // 支払いテーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    seller_id INTEGER,
                    amount INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (seller_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) {
                    console.error('支払いテーブル作成エラー:', err);
                    reject(err);
                } else {
                    // 既存のテーブルにseller_idカラムを追加（マイグレーション）
                    db.run(`
                        ALTER TABLE payments 
                        ADD COLUMN seller_id INTEGER
                    `, (alterErr) => {
                        // エラーは無視（既にカラムが存在する場合）
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.log('seller_idカラムの追加:', alterErr.message);
                        }
                    });
                }
            });

            // 売り手受け取り記録テーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS seller_receipts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    seller_id INTEGER NOT NULL,
                    buyer_id INTEGER,
                    amount INTEGER NOT NULL,
                    status TEXT DEFAULT 'PENDING',
                    memo TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (seller_id) REFERENCES users(id),
                    FOREIGN KEY (buyer_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) {
                    console.error('受け取り記録テーブル作成エラー:', err);
                }
                resolve();
            });
        });
    });
}

// ユーザー作成
function createUser(username, password) {
    return new Promise((resolve, reject) => {
        const passwordHash = bcrypt.hashSync(password, 10);
        
        db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username, passwordHash],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        reject(new Error('このユーザー名は既に使用されています'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

// ユーザー認証
function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            (err, user) => {
                if (err) {
                    reject(err);
                } else if (!user) {
                    resolve(null);
                } else {
                    const isValid = bcrypt.compareSync(password, user.password_hash);
                    if (isValid) {
                        resolve({ id: user.id, username: user.username });
                    } else {
                        resolve(null);
                    }
                }
            }
        );
    });
}

// ユーザーのポイントデータ取得
function getUserPoints(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COALESCE(SUM(amount), 0) as totalPoints,
                COUNT(*) as paymentCount
             FROM payments 
             WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        totalPoints: row.totalPoints || 0,
                        paymentCount: row.paymentCount || 0
                    });
                }
            }
        );
    });
}

// 支払いを追加
function addPayment(userId, amount, sellerId = null) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO payments (user_id, amount, seller_id) VALUES (?, ?, ?)',
            [userId, amount, sellerId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        userId,
                        amount,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        );
    });
}

// ユーザー情報取得
function getUser(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id, username, paypay_id FROM users WHERE id = ?',
            [userId],
            (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

// ユーザーのPayPay IDを更新
function updatePayPayId(userId, paypayId) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET paypay_id = ? WHERE id = ?',
            [paypayId, userId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            }
        );
    });
}

// 支払い履歴取得
function getPayments(userId, limit = 50) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, amount, created_at 
             FROM payments 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const payments = rows.map(row => ({
                        id: row.id,
                        amount: row.amount,
                        date: new Date(row.created_at).toLocaleString('ja-JP')
                    }));
                    resolve(payments);
                }
            }
        );
    });
}

// 全ユーザー一覧取得
function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT id, username, created_at FROM users ORDER BY username',
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        username: row.username,
                        createdAt: row.created_at
                    })));
                }
            }
        );
    });
}

// 売り手の受け取り金額取得
function getSellerEarnings(sellerId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COALESCE(SUM(amount), 0) as totalEarnings,
                COUNT(*) as transactionCount
             FROM payments 
             WHERE seller_id = ?`,
            [sellerId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        totalEarnings: row.totalEarnings || 0,
                        transactionCount: row.transactionCount || 0
                    });
                }
            }
        );
    });
}

// 売り手の受け取り履歴取得
function getSellerTransactions(sellerId, limit = 50) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                p.id,
                p.amount,
                p.created_at,
                u.username as buyer_name
             FROM payments p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.seller_id = ?
             ORDER BY p.created_at DESC
             LIMIT ?`,
            [sellerId, limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        amount: row.amount,
                        buyerName: row.buyer_name || '不明',
                        date: new Date(row.created_at).toLocaleString('ja-JP')
                    })));
                }
            }
        );
    });
}

// 売り手受け取り記録を追加
function addSellerReceipt(sellerId, amount, buyerId = null, memo = '') {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO seller_receipts (seller_id, buyer_id, amount, memo) VALUES (?, ?, ?, ?)',
            [sellerId, buyerId, amount, memo],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        sellerId,
                        buyerId,
                        amount,
                        memo,
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                    });
                }
            }
        );
    });
}

// 未処理の受け取り記録を取得
function getPendingReceipts() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                r.id,
                r.amount,
                r.memo,
                r.created_at,
                r.status,
                s.username as seller_name,
                b.username as buyer_name
             FROM seller_receipts r
             LEFT JOIN users s ON r.seller_id = s.id
             LEFT JOIN users b ON r.buyer_id = b.id
             WHERE r.status = 'PENDING'
             ORDER BY r.created_at DESC`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        amount: row.amount,
                        memo: row.memo || '',
                        sellerName: row.seller_name,
                        buyerName: row.buyer_name || '不明',
                        date: new Date(row.created_at).toLocaleString('ja-JP'),
                        status: row.status
                    })));
                }
            }
        );
    });
}

// すべての受け取り記録を取得（処理済みも含む）
function getAllReceipts(limit = 100) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                r.id,
                r.amount,
                r.memo,
                r.created_at,
                r.processed_at,
                r.status,
                s.username as seller_name,
                b.username as buyer_name
             FROM seller_receipts r
             LEFT JOIN users s ON r.seller_id = s.id
             LEFT JOIN users b ON r.buyer_id = b.id
             ORDER BY r.created_at DESC
             LIMIT ?`,
            [limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        amount: row.amount,
                        memo: row.memo || '',
                        sellerName: row.seller_name,
                        buyerName: row.buyer_name || '不明',
                        date: new Date(row.created_at).toLocaleString('ja-JP'),
                        processedDate: row.processed_at ? new Date(row.processed_at).toLocaleString('ja-JP') : null,
                        status: row.status
                    })));
                }
            }
        );
    });
}

// すべての支払い記録を取得
function getAllPayments(limit = 100) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                p.id,
                p.amount,
                p.created_at,
                u.username as buyer_name,
                s.username as seller_name
             FROM payments p
             LEFT JOIN users u ON p.user_id = u.id
             LEFT JOIN users s ON p.seller_id = s.id
             ORDER BY p.created_at DESC
             LIMIT ?`,
            [limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        amount: row.amount,
                        buyerName: row.buyer_name,
                        sellerName: row.seller_name || 'なし',
                        date: new Date(row.created_at).toLocaleString('ja-JP')
                    })));
                }
            }
        );
    });
}

// 受け取り記録を処理（買い手のポイントカードに反映）
function processReceipt(receiptId, buyerId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 受け取り記録を取得
            db.get(
                'SELECT * FROM seller_receipts WHERE id = ?',
                [receiptId],
                (err, receipt) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!receipt) {
                        reject(new Error('受け取り記録が見つかりません'));
                        return;
                    }

                    if (receipt.status !== 'PENDING') {
                        reject(new Error('既に処理済みです'));
                        return;
                    }

                    // 買い手のポイントカードに追加
                    db.run(
                        'INSERT INTO payments (user_id, seller_id, amount) VALUES (?, ?, ?)',
                        [buyerId, receipt.seller_id, receipt.amount],
                        function(paymentErr) {
                            if (paymentErr) {
                                reject(paymentErr);
                                return;
                            }

                            // 受け取り記録のステータスを更新
                            db.run(
                                'UPDATE seller_receipts SET status = ?, buyer_id = ?, processed_at = ? WHERE id = ?',
                                ['PROCESSED', buyerId, new Date().toISOString(), receiptId],
                                (updateErr) => {
                                    if (updateErr) {
                                        reject(updateErr);
                                    } else {
                                        resolve({ success: true });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

// LINEユーザーIDでユーザーを作成または取得
function createOrGetUserByLineId(lineUserId, displayName = null) {
    return new Promise((resolve, reject) => {
        // 既存のユーザーを検索
        db.get(
            'SELECT * FROM users WHERE line_user_id = ?',
            [lineUserId],
            (err, user) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (user) {
                    // 既存ユーザーを返す
                    resolve({ id: user.id, username: user.username, lineUserId: user.line_user_id });
                    return;
                }
                
                // 新規ユーザーを作成
                const username = displayName || `LINE_${lineUserId.substring(0, 8)}`;
                const passwordHash = ''; // LINEログインの場合はパスワード不要
                
                db.run(
                    'INSERT INTO users (username, password_hash, line_user_id) VALUES (?, ?, ?)',
                    [username, passwordHash, lineUserId],
                    function(insertErr) {
                        if (insertErr) {
                            reject(insertErr);
                        } else {
                            resolve({ id: this.lastID, username: username, lineUserId: lineUserId });
                        }
                    }
                );
            }
        );
    });
}

// LINEユーザーIDでユーザーを取得
function getUserByLineId(lineUserId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE line_user_id = ?',
            [lineUserId],
            (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

module.exports = {
    init,
    createUser,
    authenticateUser,
    getUser,
    updatePayPayId,
    getUserPoints,
    addPayment,
    getPayments,
    getAllUsers,
    getSellerEarnings,
    getSellerTransactions,
    addSellerReceipt,
    getPendingReceipts,
    getAllReceipts,
    getAllPayments,
    processReceipt,
    createOrGetUserByLineId,
    getUserByLineId
};

