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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('ユーザーテーブル作成エラー:', err);
                    reject(err);
                }
            });

            // 支払いテーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) {
                    console.error('支払いテーブル作成エラー:', err);
                    reject(err);
                } else {
                    resolve();
                }
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
function addPayment(userId, amount) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO payments (user_id, amount) VALUES (?, ?)',
            [userId, amount],
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
            'SELECT id, username FROM users WHERE id = ?',
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

module.exports = {
    init,
    createUser,
    authenticateUser,
    getUser,
    getUserPoints,
    addPayment,
    getPayments
};

