// 運営用QRコード生成ページ

// APIベースURL
const API_BASE = window.location.origin + '/api';

// 運営パスワード（本番環境では環境変数などで管理することを推奨）
const ADMIN_PASSWORD = 'admin123'; // 変更してください

// 認証状態
let isAuthenticated = false;

// 認証チェック
function checkAuth() {
    const saved = sessionStorage.getItem('adminAuth');
    if (saved === 'true') {
        isAuthenticated = true;
        showAdminScreen();
        loadSellers();
    } else {
        showAuthScreen();
    }
}

// 認証画面を表示
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('adminScreen').style.display = 'none';
}

// 管理画面を表示
function showAdminScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
}

// ログイン処理
function login() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminError');

    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('adminAuth', 'true');
        showAdminScreen();
        loadSellers();
        errorDiv.style.display = 'none';
    } else {
        errorDiv.textContent = 'パスワードが正しくありません';
        errorDiv.style.display = 'block';
    }
}

// ログアウト処理
function logout() {
    if (confirm('ログアウトしますか？')) {
        isAuthenticated = false;
        sessionStorage.removeItem('adminAuth');
        showAuthScreen();
        document.getElementById('adminPassword').value = '';
    }
}

// 売り手一覧を取得（簡易版：実際には全ユーザーを取得するAPIが必要）
async function loadSellers() {
    // 注意: 実際の実装では、全ユーザーを取得するAPIが必要です
    // ここでは、手動でユーザーIDを入力する方法も提供します
    
    const sellerSelect = document.getElementById('sellerSelect');
    
    // 既存のオプションをクリア（最初の「選択してください」以外）
    while (sellerSelect.children.length > 1) {
        sellerSelect.removeChild(sellerSelect.lastChild);
    }

    // 簡易版：ユーザーIDを直接入力できるオプションを追加
    const manualOption = document.createElement('option');
    manualOption.value = 'manual';
    manualOption.textContent = 'ユーザーIDを直接入力';
    sellerSelect.appendChild(manualOption);
}

// QRコードを生成
async function generateQR() {
    const sellerSelect = document.getElementById('sellerSelect');
    const selectedValue = sellerSelect.value;

    if (!selectedValue) {
        alert('売り手を選択してください');
        return;
    }

    let sellerId, sellerName;

    if (selectedValue === 'manual') {
        // 手動入力
        const userId = prompt('売り手のユーザーIDを入力してください:');
        if (!userId) {
            return;
        }
        sellerId = parseInt(userId);
        
        // ユーザー情報を取得
        try {
            const userInfo = await fetch(`${API_BASE}/users/${sellerId}`).then(r => r.json());
            sellerName = userInfo.username;
        } catch (error) {
            alert('ユーザー情報の取得に失敗しました');
            return;
        }
    } else {
        sellerId = parseInt(selectedValue);
        // ユーザー情報を取得
        try {
            const userInfo = await fetch(`${API_BASE}/users/${sellerId}`).then(r => r.json());
            sellerName = userInfo.username;
        } catch (error) {
            alert('ユーザー情報の取得に失敗しました');
            return;
        }
    }

    const qrDisplayArea = document.getElementById('qrDisplayArea');
    const qrCanvas = document.getElementById('qrCanvas');
    const qrSellerName = document.getElementById('qrSellerName');

    if (!qrDisplayArea || !qrCanvas || !qrSellerName) {
        return;
    }

    // QRコードに含めるURL（売り手のユーザーIDを含む）
    const paymentUrl = `${window.location.origin}/pay?sellerId=${sellerId}`;
    const qrData = paymentUrl;

    try {
        // QRコードを生成
        await QRCode.toCanvas(qrCanvas, qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // 売り手名を表示
        qrSellerName.textContent = sellerName;

        // 表示エリアを表示
        qrDisplayArea.style.display = 'block';

        // スクロールして表示
        qrDisplayArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('QRコード生成エラー:', error);
        alert('QRコードの生成に失敗しました');
    }
}

// QRコードを印刷
function printQR() {
    window.print();
}

// QRコードを画像としてダウンロード
function downloadQR() {
    const qrCanvas = document.getElementById('qrCanvas');
    if (!qrCanvas) {
        return;
    }

    const sellerName = document.getElementById('qrSellerName').textContent;

    // Canvasを画像に変換
    qrCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `suiren-qr-${sellerName}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// QRコード表示を閉じる
function closeQR() {
    const qrDisplayArea = document.getElementById('qrDisplayArea');
    if (qrDisplayArea) {
        qrDisplayArea.style.display = 'none';
    }
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
    // 認証チェック
    checkAuth();

    // ログインボタン
    const loginButton = document.getElementById('adminLoginButton');
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }

    // パスワード入力でEnterキー
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }

    // QRコード生成ボタン
    const generateButton = document.getElementById('generateSellerQRButton');
    if (generateButton) {
        generateButton.addEventListener('click', generateQR);
    }

    // 印刷ボタン
    const printButton = document.getElementById('printQRButton');
    if (printButton) {
        printButton.addEventListener('click', printQR);
    }

    // ダウンロードボタン
    const downloadButton = document.getElementById('downloadQRButton');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadQR);
    }

    // 閉じるボタン
    const closeButton = document.getElementById('closeQRButton');
    if (closeButton) {
        closeButton.addEventListener('click', closeQR);
    }

    // ログアウトボタン
    const logoutButton = document.getElementById('logoutAdminButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

