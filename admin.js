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

// 売り手情報を読み込む（ユーザー名から）
async function loadSellerInfoByName(username) {
    if (!username) {
        hideSellerInfo();
        return;
    }

    try {
        // 全ユーザーから該当するユーザーを検索
        const users = await fetch(`${API_BASE}/admin/users`).then(r => r.json());
        const seller = users.find(u => u.username === username);
        
        if (!seller) {
            alert('該当するユーザーが見つかりません');
            hideSellerInfo();
            return;
        }

        await loadSellerInfo(seller.id);
    } catch (error) {
        console.error('売り手情報の取得に失敗しました:', error);
        alert('売り手情報の取得に失敗しました');
    }
}

// 売り手情報を読み込む
async function loadSellerInfo(sellerId) {
    try {
        // 累計入金金額を取得
        const earnings = await fetch(`${API_BASE}/admin/sellers/${sellerId}/earnings`).then(r => r.json());
        
        // 取引履歴を取得
        const transactions = await fetch(`${API_BASE}/admin/sellers/${sellerId}/transactions`).then(r => r.json());

        // 表示を更新
        document.getElementById('totalEarnings').textContent = earnings.totalEarnings.toLocaleString() + '円';
        document.getElementById('transactionCount').textContent = earnings.transactionCount + '回';

        // 取引履歴を表示
        const transactionList = document.getElementById('transactionList');
        if (transactions.length === 0) {
            transactionList.innerHTML = '<li class="no-history">まだ取引履歴がありません</li>';
        } else {
            transactionList.innerHTML = transactions.map(t => `
                <li>
                    <span class="transaction-date">${t.date}</span>
                    <span class="transaction-buyer">${t.buyerName}</span>
                    <span class="transaction-amount">+${t.amount.toLocaleString()}円</span>
                </li>
            `).join('');
        }

        // 情報エリアを表示
        document.getElementById('sellerInfoArea').style.display = 'block';
        document.getElementById('noSellerSelected').style.display = 'none';
    } catch (error) {
        console.error('売り手情報の取得に失敗しました:', error);
        alert('売り手情報の取得に失敗しました');
    }
}

// 売り手情報を非表示
function hideSellerInfo() {
    document.getElementById('sellerInfoArea').style.display = 'none';
    document.getElementById('noSellerSelected').style.display = 'block';
}

// QRコードを生成
async function generateQR() {
    const sellerNameInput = document.getElementById('sellerNameInput');
    const sellerName = sellerNameInput.value.trim();

    if (!sellerName) {
        alert('売り手のユーザー名を入力してください');
        return;
    }

    // ユーザー名からユーザーIDを取得
    let sellerId;
    try {
        const users = await fetch(`${API_BASE}/admin/users`).then(r => r.json());
        const seller = users.find(u => u.username === sellerName);
        
        if (!seller) {
            alert('該当するユーザーが見つかりません');
            return;
        }
        
        sellerId = seller.id;
    } catch (error) {
        alert('ユーザー情報の取得に失敗しました');
        return;
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
        
        // 売り手情報も表示
        await loadSellerInfo(sellerId);

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
    
    // 売り手名入力時のイベント（EnterキーでQRコード生成）
    const sellerNameInput = document.getElementById('sellerNameInput');
    if (sellerNameInput) {
        sellerNameInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await generateQR();
            }
        });
        
        // 入力時に売り手情報を更新
        sellerNameInput.addEventListener('input', async () => {
            const username = sellerNameInput.value.trim();
            if (username) {
                await loadSellerInfoByName(username);
            } else {
                hideSellerInfo();
            }
        });
    }

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

