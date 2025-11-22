// 運営用ページ

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
        showMainMenu();
    } else {
        showAuthScreen();
    }
}

// 認証画面を表示
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('adminScreen').style.display = 'none';
}

// メインメニューを表示
function showMainMenu() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
    document.getElementById('pointsPage').style.display = 'none';
    document.getElementById('salesPage').style.display = 'none';
}

// ポイント付与ページを表示
function showPointsPage() {
    document.getElementById('pointsPage').style.display = 'block';
    document.getElementById('salesPage').style.display = 'none';
    loadPendingReceipts();
}

// 売り上げ確認ページを表示
function showSalesPage() {
    document.getElementById('pointsPage').style.display = 'none';
    document.getElementById('salesPage').style.display = 'block';
    loadAllReceipts();
    loadAllPayments();
}

// ログイン処理
function login() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminError');

    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('adminAuth', 'true');
        showMainMenu();
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

// 未処理の受け取り記録を読み込む
async function loadPendingReceipts() {
    try {
        const receipts = await fetch(`${API_BASE}/admin/pending-receipts`).then(r => r.json());
        const area = document.getElementById('pendingReceiptsArea');
        
        if (!area) return;

        if (receipts.length === 0) {
            area.innerHTML = '<p class="no-receipts">未処理の受け取り記録はありません<br>（買い手名が入力されている受け取り記録は自動的に処理されます）</p>';
            return;
        }

        // 全ユーザー一覧を取得（買い手選択用）
        const users = await fetch(`${API_BASE}/admin/users`).then(r => r.json());

        area.innerHTML = `
            <div class="pending-receipts-note">
                <p>💡 買い手名が入力されている受け取り記録は自動的に処理されます</p>
                <p>以下の記録は、買い手名が入力されていないため手動処理が必要です</p>
            </div>
            ${receipts.map(receipt => `
                <div class="receipt-item">
                    <div class="receipt-info">
                        <p class="receipt-amount">${receipt.amount.toLocaleString()}円</p>
                        <p class="receipt-seller">売り手: ${receipt.sellerName}</p>
                        <p class="receipt-buyer">買い手: ${receipt.buyerName || '未入力'}</p>
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
            `).join('')}
        `;
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

// タブ切り替え
function showTab(tabName) {
    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // すべてのタブボタンからactiveクラスを削除
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 選択されたタブを表示
    if (tabName === 'receipts') {
        document.getElementById('receiptsTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        loadAllReceipts();
    } else if (tabName === 'payments') {
        document.getElementById('paymentsTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[1].classList.add('active');
        loadAllPayments();
    }
}

// すべての受け取り記録を読み込む
async function loadAllReceipts() {
    try {
        const receipts = await fetch(`${API_BASE}/admin/all-receipts`).then(r => r.json());
        const area = document.getElementById('allReceiptsArea');
        
        if (!area) return;

        if (receipts.length === 0) {
            area.innerHTML = '<p class="no-receipts">受け取り記録がありません</p>';
            return;
        }

        area.innerHTML = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>日時</th>
                            <th>売り手</th>
                            <th>買い手</th>
                            <th>金額</th>
                            <th>メモ</th>
                            <th>ステータス</th>
                            <th>処理日時</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${receipts.map(r => `
                            <tr class="${r.status === 'PENDING' ? 'pending-row' : ''}">
                                <td>${r.date}</td>
                                <td>${r.sellerName}</td>
                                <td>${r.buyerName || '-'}</td>
                                <td class="amount-cell">${r.amount.toLocaleString()}円</td>
                                <td>${r.memo || '-'}</td>
                                <td><span class="status-badge ${r.status === 'PENDING' ? 'pending' : 'processed'}">${r.status === 'PENDING' ? '未処理' : '処理済み'}</span></td>
                                <td>${r.processedDate || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('受け取り記録の読み込みエラー:', error);
        const area = document.getElementById('allReceiptsArea');
        if (area) {
            area.innerHTML = '<p class="error-text">受け取り記録の読み込みに失敗しました</p>';
        }
    }
}

// すべての支払い記録を読み込む
async function loadAllPayments() {
    try {
        const payments = await fetch(`${API_BASE}/admin/all-payments`).then(r => r.json());
        const area = document.getElementById('allPaymentsArea');
        
        if (!area) return;

        if (payments.length === 0) {
            area.innerHTML = '<p class="no-receipts">支払い記録がありません</p>';
            return;
        }

        area.innerHTML = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>日時</th>
                            <th>買い手</th>
                            <th>売り手</th>
                            <th>金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => `
                            <tr>
                                <td>${p.date}</td>
                                <td>${p.buyerName}</td>
                                <td>${p.sellerName}</td>
                                <td class="amount-cell">${p.amount.toLocaleString()}円</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('支払い記録の読み込みエラー:', error);
        const area = document.getElementById('allPaymentsArea');
        if (area) {
            area.innerHTML = '<p class="error-text">支払い記録の読み込みに失敗しました</p>';
        }
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

    // ログアウトボタン
    const logoutButton = document.getElementById('logoutAdminButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // ポイント付与ページボタン
    const pointsPageButton = document.getElementById('pointsPageButton');
    if (pointsPageButton) {
        pointsPageButton.addEventListener('click', showPointsPage);
    }

    // 売り上げ確認ページボタン
    const salesPageButton = document.getElementById('salesPageButton');
    if (salesPageButton) {
        salesPageButton.addEventListener('click', showSalesPage);
    }

    // 戻るボタン
    const backToMainButton = document.getElementById('backToMainButton');
    if (backToMainButton) {
        backToMainButton.addEventListener('click', showMainMenu);
    }

    const backToMainButton2 = document.getElementById('backToMainButton2');
    if (backToMainButton2) {
        backToMainButton2.addEventListener('click', showMainMenu);
    }
});
