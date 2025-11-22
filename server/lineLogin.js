const fetch = require('node-fetch');

// LINE Login設定
const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || process.env.LINE_CHANNEL_ID || '2008552055';
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET || '1017478a22eb4c810faaeebebf10e0ee';
const LINE_LOGIN_CALLBACK_URL = process.env.LINE_LOGIN_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/line/login/callback`;

// LINE Login認証URLを生成
function getLineLoginUrl(state) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: LINE_LOGIN_CHANNEL_ID,
        redirect_uri: LINE_LOGIN_CALLBACK_URL,
        state: state,
        scope: 'profile openid',
        bot_prompt: 'normal'
    });
    
    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

// アクセストークンを取得
async function getAccessToken(code) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: LINE_LOGIN_CALLBACK_URL,
            client_id: LINE_LOGIN_CHANNEL_ID,
            client_secret: LINE_LOGIN_CHANNEL_SECRET
        })
    });
    
    if (!response.ok) {
        throw new Error('アクセストークンの取得に失敗しました');
    }
    
    return await response.json();
}

// ユーザープロフィールを取得
async function getUserProfile(accessToken) {
    const response = await fetch('https://api.line.me/v2/profile', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error('ユーザープロフィールの取得に失敗しました');
    }
    
    return await response.json();
}

// IDトークンからユーザー情報を取得
async function verifyIdToken(idToken) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            id_token: idToken,
            client_id: LINE_LOGIN_CHANNEL_ID
        })
    });
    
    if (!response.ok) {
        throw new Error('IDトークンの検証に失敗しました');
    }
    
    return await response.json();
}

module.exports = {
    getLineLoginUrl,
    getAccessToken,
    getUserProfile,
    verifyIdToken,
    LINE_LOGIN_CALLBACK_URL
};

