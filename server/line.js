const line = require('@line/bot-sdk');
const db = require('./db');

// LINE Messaging API設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// LINEクライアント（環境変数が設定されている場合のみ作成）
let client = null;
if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== '') {
    try {
        client = new line.Client(config);
    } catch (error) {
        console.warn('LINEクライアントの作成に失敗しました:', error.message);
    }
}

// LINEユーザーIDでユーザーを取得
async function getUserByLineId(lineUserId) {
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

// LINEユーザーIDを保存
async function saveLineUserId(userId, lineUserId) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET line_user_id = ? WHERE id = ?',
            [lineUserId, userId],
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

// テキストメッセージを送信（lineUserIdを直接受け取る）
async function sendTextMessage(lineUserId, text) {
    try {
        if (!client) {
            throw new Error('LINE Messaging APIが設定されていません');
        }
        if (!lineUserId) {
            throw new Error('LINEユーザーIDが必要です');
        }

        await client.pushMessage(lineUserId, {
            type: 'text',
            text: text
        });

        return { success: true };
    } catch (error) {
        console.error('LINEメッセージ送信エラー:', error);
        throw error;
    }
}

// 支払いリンクを送信（lineUserIdを直接受け取る）
async function sendPaymentLink(lineUserId, amount, paymentUrl) {
    try {
        if (!client) {
            throw new Error('LINE Messaging APIが設定されていません');
        }
        if (!lineUserId) {
            throw new Error('LINEユーザーIDが必要です');
        }

        const message = {
            type: 'text',
            text: `支払いリンク\n金額: ${amount.toLocaleString()}円\n\n${paymentUrl}`
        };

        await client.pushMessage(lineUserId, message);

        return { success: true };
    } catch (error) {
        console.error('LINE支払いリンク送信エラー:', error);
        throw error;
    }
}

// ポイントカードをFlex Messageで送信
async function sendPointsCard(lineUserId) {
    try {
        if (!client) {
            throw new Error('LINE Messaging APIが設定されていません');
        }
        // LINEユーザーIDで自動的にユーザーを作成または取得
        const db = require('./db');
        const user = await db.createOrGetUserByLineId(lineUserId);
        
        if (!user) {
            throw new Error('ユーザーの作成に失敗しました');
        }

        // ユーザーのポイント情報を取得
        const payments = await db.getPayments(user.id);
        const totalPoints = payments.reduce((sum, p) => sum + p.amount, 0);

        const flexMessage = {
            type: 'flex',
            altText: 'ポイントカード',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'あなたのポイントカード',
                            weight: 'bold',
                            size: 'xl',
                            color: '#ffffff'
                        }
                    ],
                    backgroundColor: '#667eea',
                    paddingAll: '20px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '累計支払い金額',
                            size: 'sm',
                            color: '#666666',
                            margin: 'md'
                        },
                        {
                            type: 'text',
                            text: `${totalPoints.toLocaleString()}円`,
                            size: 'xxl',
                            weight: 'bold',
                            color: '#333333',
                            margin: 'sm'
                        },
                        {
                            type: 'separator',
                            margin: 'xl'
                        },
                        {
                            type: 'text',
                            text: `支払い回数: ${payments.length}回`,
                            size: 'sm',
                            color: '#666666',
                            margin: 'xl'
                        }
                    ],
                    paddingAll: '20px'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            style: 'primary',
                            action: {
                                type: 'uri',
                                label: '支払いページを開く',
                                uri: `${process.env.APP_URL || 'http://localhost:3000'}/?line_user_id=${lineUserId}&action=payment`
                            },
                            color: '#667eea'
                        }
                    ],
                    paddingAll: '20px'
                }
            }
        };

        await client.pushMessage(user.line_user_id, flexMessage);

        return { success: true };
    } catch (error) {
        console.error('LINEポイントカード送信エラー:', error);
        throw error;
    }
}

// Webhookイベントを処理
async function handleWebhookEvent(event) {
    const lineUserId = event.source.userId;

    // LINEユーザーIDで自動的にユーザーを作成または取得
    try {
        const db = require('./db');
        await db.createOrGetUserByLineId(lineUserId);
    } catch (error) {
        console.error('ユーザー作成エラー:', error);
    }

    // Postbackイベント（リッチメニューのボタンクリック）
    if (event.type === 'postback') {
        const data = event.postback.data;
        
        if (data === 'action=points_card') {
            return sendPointsCard(lineUserId);
        }
        
        return Promise.resolve(null);
    }

    // メッセージイベント
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text;

        // コマンド処理
        if (text === 'ポイント確認' || text === 'ポイント' || text === '残高' || text === 'スタンプカード') {
            return sendPointsCard(lineUserId);
        }

        if (text === '支払い' || text === '払う') {
            return sendTextMessage(lineUserId, 
                '支払いページを開きます。\n\n' +
                '下の「支払い」ボタンからもアクセスできます。'
            );
        }

        if (text === 'ヘルプ' || text === 'help' || text === '？' || text === '?') {
            return sendTextMessage(lineUserId, 
                '📋 利用可能なコマンド\n\n' +
                '• ポイント確認 - ポイントカードを表示\n' +
                '• 支払い - 支払いページを開く\n' +
                '• ヘルプ - このメッセージを表示\n\n' +
                '💡 下部のメニューからもアクセスできます！'
            );
        }

        // その他のメッセージにはデフォルトメッセージを返す
        return sendTextMessage(lineUserId, 
            'こんにちは！\n\n' +
            '📋 利用可能なコマンド\n' +
            '• 「ポイント確認」- ポイントカードを表示\n' +
            '• 「支払い」- 支払いページを開く\n' +
            '• 「ヘルプ」- コマンド一覧を表示\n\n' +
            '💡 下部のメニューからもアクセスできます！'
        );
    }

    return Promise.resolve(null);
}

module.exports = {
    client,
    sendTextMessage,
    sendPaymentLink,
    sendPointsCard,
    handleWebhookEvent,
    getUserByLineId,
    saveLineUserId
};

