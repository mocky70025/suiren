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
        loadPendingReceipts();
        // 定期的に更新（5分ごと）
        setInterval(loadPendingReceipts, 5 * 60 * 1000);
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
        loadPendingReceipts();
        // 定期的に更新（5分ごと）
        setInterval(loadPendingReceipts, 5 * 60 * 1000);
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
    const sellerPayPayIdInput = document.getElementById('sellerPayPayId');
    const sellerName = sellerNameInput.value.trim();
    const paypayId = sellerPayPayIdInput.value.trim();

    if (!sellerName) {
        alert('売り手のユーザー名を入力してください');
        return;
    }

    if (!paypayId) {
        alert('売り手のPayPay ID（電話番号またはPayPay ID）を入力してください');
        return;
    }

    // ユーザー名からユーザーIDを取得
    let sellerId, sellerInfo;
    try {
        const users = await fetch(`${API_BASE}/admin/users`).then(r => r.json());
        const seller = users.find(u => u.username === sellerName);
        
        if (!seller) {
            alert('該当するユーザーが見つかりません');
            return;
        }
        
        sellerId = seller.id;
        
        // PayPay IDを保存
        await fetch(`${API_BASE}/users/${sellerId}/paypay-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paypayId: paypayId })
        });
        
        // ユーザー情報を取得
        sellerInfo = await fetch(`${API_BASE}/users/${sellerId}`).then(r => r.json());
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

    // PayPay個人送金用のURLを生成
    // 電話番号の場合: paypay://send?phone=09012345678
    // PayPay IDの場合: paypay://send?id=paypay-id
    let paypayUrl;
    if (paypayId.match(/^0\d{9,10}$/)) {
        // 電話番号形式
        paypayUrl = `paypay://send?phone=${paypayId}`;
    } else {
        // PayPay ID形式
        paypayUrl = `paypay://send?id=${paypayId}`;
    }
    
    // QRコードに含めるURL（売り手のユーザーIDを含む）
    // 買い手がこのURLにアクセスして、金額を入力してPayPayで送金
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

// 未処理の受け取り記録を読み込む
async function loadPendingReceipts() {
    try {
        const receipts = await fetch(`${API_BASE}/admin/pending-receipts`).then(r => r.json());
        const area = document.getElementById('pendingReceiptsArea');
        
        if (!area) return;

        if (receipts.length === 0) {
            area.innerHTML = '<p class="no-receipts">未処理の受け取り記録はありません</p>';
            return;
        }

        // 全ユーザー一覧を取得（買い手選択用）
        const users = await fetch(`${API_BASE}/admin/users`).then(r => r.json());

        area.innerHTML = receipts.map(receipt => `
            <div class="receipt-item">
                <div class="receipt-info">
                    <p class="receipt-amount">${receipt.amount.toLocaleString()}円</p>
                    <p class="receipt-seller">売り手: ${receipt.sellerName}</p>
                    <p class="receipt-date">${receipt.date}</p>
                    ${receipt.memo ? `<p class="receipt-memo">メモ: ${receipt.memo}</p>` : ''}
                </div>
                <div class="receipt-actions">
                    <select class="buyer-select" id="buyerSelect_${receipt.id}">
                        <option value="">買い手を選択</option>
                        ${users.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
                    </select>
                    <button class="process-button" onclick="processReceipt(${receipt.id})">
                        反映
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('受け取り記録の読み込みエラー:', error);
        const area = document.getElementById('pendingReceiptsArea');
        if (area) {
            area.innerHTML = '<p class="error-text">受け取り記録の読み込みに失敗しました</p>';
        }
    }
}

// 受け取り記録を処理
async function processReceipt(receiptId) {
    const buyerSelect = document.getElementById(`buyerSelect_${receiptId}`);
    const buyerId = buyerSelect.value;

    if (!buyerId) {
        alert('買い手を選択してください');
        return;
    }

    if (!confirm('この受け取り記録を買い手のポイントカードに反映しますか？')) {
        return;
    }

    try {
        await fetch(`${API_BASE}/admin/receipts/${receiptId}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buyerId: parseInt(buyerId) })
        });

        alert('ポイントカードに反映しました！');
        loadPendingReceipts();
    } catch (error) {
        alert('処理に失敗しました: ' + error.message);
        console.error(error);
    }
}

