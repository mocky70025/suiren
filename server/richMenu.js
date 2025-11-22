const line = require('@line/bot-sdk');
const fetch = require('node-fetch');

// LINE Messaging API設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// リッチメニューを作成
async function createRichMenu() {
    const richMenu = {
        size: {
            width: 2500,
            height: 1686
        },
        selected: true,
        name: 'すいれんメニュー',
        chatBarText: 'メニュー',
        areas: [
            {
                bounds: {
                    x: 0,
                    y: 0,
                    width: 1250,
                    height: 1686
                },
                action: {
                    type: 'postback',
                    label: 'スタンプカード',
                    data: 'action=points_card',
                    displayText: 'スタンプカードを表示'
                }
            },
            {
                bounds: {
                    x: 1250,
                    y: 0,
                    width: 1250,
                    height: 1686
                },
                action: {
                    type: 'uri',
                    label: '支払い',
                    uri: `${APP_URL}/?action=payment`
                }
            }
        ]
    };

    try {
        // リッチメニューを作成
        const response = await fetch('https://api.line.me/v2/bot/richmenu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.channelAccessToken}`
            },
            body: JSON.stringify(richMenu)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`リッチメニュー作成エラー: ${error}`);
        }

        const richMenuId = await response.json();
        return richMenuId.richMenuId;
    } catch (error) {
        console.error('リッチメニュー作成エラー:', error);
        throw error;
    }
}

// リッチメニューに画像をアップロード
async function uploadRichMenuImage(richMenuId, imagePath) {
    try {
        const fs = require('fs');
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'image/png',
                'Authorization': `Bearer ${config.channelAccessToken}`
            },
            body: imageBuffer
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`画像アップロードエラー: ${error}`);
        }

        return { success: true };
    } catch (error) {
        console.error('画像アップロードエラー:', error);
        throw error;
    }
}

// リッチメニューをデフォルトに設定
async function setDefaultRichMenu(richMenuId) {
    try {
        const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.channelAccessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`デフォルト設定エラー: ${error}`);
        }

        return { success: true };
    } catch (error) {
        console.error('デフォルト設定エラー:', error);
        throw error;
    }
}

// リッチメニューを削除
async function deleteRichMenu(richMenuId) {
    try {
        const response = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${config.channelAccessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`削除エラー: ${error}`);
        }

        return { success: true };
    } catch (error) {
        console.error('削除エラー:', error);
        throw error;
    }
}

// 既存のリッチメニューを取得
async function getRichMenuList() {
    try {
        const response = await fetch('https://api.line.me/v2/bot/richmenu/list', {
            headers: {
                'Authorization': `Bearer ${config.channelAccessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`取得エラー: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('取得エラー:', error);
        throw error;
    }
}

module.exports = {
    createRichMenu,
    uploadRichMenuImage,
    setDefaultRichMenu,
    deleteRichMenu,
    getRichMenuList
};

