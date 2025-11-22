// APIベースURL（環境に応じて自動切り替え）
const API_BASE = window.location.origin + '/api';

// 現在のユーザー情報
let currentUser = null;

// API呼び出しヘルパー
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'エラーが発生しました');
        }
        return data;
    } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
    }
}

// 認証管理
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // LINEログインコールバック処理
        const urlParams = new URLSearchParams(window.location.search);
        const lineLoginSuccess = urlParams.get('line_login_success');
        const userId = urlParams.get('userId');
        const username = urlParams.get('username');
        const lineUserId = urlParams.get('line_user_id');
        
        if (lineLoginSuccess === 'true' && userId && username) {
            // LINEログイン成功
            currentUser = {
                userId: parseInt(userId),
                username: decodeURIComponent(username)
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            // URLパラメータを削除
            window.history.replaceState({}, document.title, window.location.pathname);
            this.showMainScreen();
            return;
        }
        
        // LINEユーザーIDで自動ログイン（LINE公式アカウントからアクセスした場合）
        if (lineUserId) {
            this.loginWithLineUserId(lineUserId);
            return;
        }
        
        // ログイン状態を確認
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            this.showMainScreen();
        } else {
            this.showLoginScreen();
        }

        // イベントリスナー設定
        this.setupEventListeners();
    }
    
    // LINEユーザーIDで自動ログイン
    async loginWithLineUserId(lineUserId) {
        try {
            const response = await apiCall('/line/auto-login', {
                method: 'POST',
                body: JSON.stringify({ lineUserId })
            });
            
            if (response.success) {
                currentUser = {
                    userId: response.userId,
                    username: response.username
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // URLパラメータを削除
                window.history.replaceState({}, document.title, window.location.pathname);
                this.showMainScreen();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('LINE自動ログインエラー:', error);
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // ログインボタン
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.login());
        }

        // 登録ボタン
        const registerButton = document.getElementById('registerButton');
        if (registerButton) {
            registerButton.addEventListener('click', () => this.register());
        }

        // 画面切り替え
        const showRegisterButton = document.getElementById('showRegisterButton');
        if (showRegisterButton) {
            showRegisterButton.addEventListener('click', () => this.showRegisterForm());
        }

        const showLoginButton = document.getElementById('showLoginButton');
        if (showLoginButton) {
            showLoginButton.addEventListener('click', () => this.showLoginForm());
        }

        // ログアウトボタン
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.logout());
        }

        // Enterキーでログイン/登録
        const loginUsername = document.getElementById('loginUsername');
        const loginPassword = document.getElementById('loginPassword');
        if (loginUsername && loginPassword) {
            [loginUsername, loginPassword].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.login();
                    }
                });
            });
        }

        const registerUsername = document.getElementById('registerUsername');
        const registerPassword = document.getElementById('registerPassword');
        const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
        if (registerUsername && registerPassword && registerPasswordConfirm) {
            [registerUsername, registerPassword, registerPasswordConfirm].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.register();
                    }
                });
            });
        }
    }

    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            this.showError(errorDiv, 'ユーザー名とパスワードを入力してください');
            return;
        }

        try {
            const data = await apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            currentUser = { userId: data.userId, username: data.username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            this.showMainScreen();
            this.clearError(errorDiv);
            
            // ポイントデータを読み込む
            if (window.pointsCard) {
                await window.pointsCard.loadFromServer();
            }
        } catch (error) {
            this.showError(errorDiv, error.message);
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const errorDiv = document.getElementById('registerError');

        if (!username || !password || !passwordConfirm) {
            this.showError(errorDiv, 'すべての項目を入力してください');
            return;
        }

        if (password !== passwordConfirm) {
            this.showError(errorDiv, 'パスワードが一致しません');
            return;
        }

        if (password.length < 4) {
            this.showError(errorDiv, 'パスワードは4文字以上にしてください');
            return;
        }

        try {
            const data = await apiCall('/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            // 登録成功後、自動ログイン
            currentUser = { userId: data.userId, username: data.username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            this.showMainScreen();
            this.clearError(errorDiv);
            
            alert('登録が完了しました！');
            
            // ポイントデータを読み込む
            if (window.pointsCard) {
                await window.pointsCard.loadFromServer();
            }
        } catch (error) {
            this.showError(errorDiv, error.message);
        }
    }

    logout() {
        if (confirm('ログアウトしますか？')) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainScreen').style.display = 'none';
        this.showLoginForm();
    }

    showMainScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        
        // ユーザー名を表示
        const usernameSpan = document.getElementById('currentUsername');
        if (usernameSpan && currentUser) {
            usernameSpan.textContent = `ようこそ、${currentUser.username}さん`;
        }

        // 売り手かどうかを確認（運営画面でPayPay IDが設定されているか）
        this.checkSellerStatus();
    }

    async checkSellerStatus() {
        if (!currentUser) return;

        try {
            const userInfo = await apiCall(`/users/${currentUser.userId}`);
            // PayPay IDが設定されている場合は売り手として扱う
            if (userInfo.paypay_id) {
                const sellerSection = document.getElementById('sellerReceiptSection');
                if (sellerSection) {
                    sellerSection.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('ユーザー情報の取得エラー:', error);
        }
    }

    showLoginForm() {
        document.querySelector('.login-section').style.display = 'block';
        document.querySelector('.register-section').style.display = 'none';
        this.clearError(document.getElementById('loginError'));
    }

    showRegisterForm() {
        document.querySelector('.login-section').style.display = 'none';
        document.querySelector('.register-section').style.display = 'block';
        this.clearError(document.getElementById('registerError'));
    }

    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    clearError(element) {
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    }
}

// ポイントカードデータの管理（サーバー連携版）
class PointsCard {
    constructor() {
        this.data = {
            totalPoints: 0,
            payments: []
        };
    }

    // サーバーからデータを読み込む
    async loadFromServer() {
        if (!currentUser) {
            return;
        }

        try {
            const pointsData = await apiCall(`/users/${currentUser.userId}/points`);
            const payments = await apiCall(`/users/${currentUser.userId}/payments`);
            
            this.data = {
                totalPoints: pointsData.totalPoints || 0,
                payments: payments || []
            };
            this.updateDisplay();
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            alert('データの読み込みに失敗しました');
        }
    }

    // 支払いを追加
    async addPayment(amount, sellerId = null) {
        if (!currentUser) {
            alert('ログインが必要です');
            return;
        }

        try {
            await apiCall(`/users/${currentUser.userId}/payments`, {
                method: 'POST',
                body: JSON.stringify({ amount, sellerId })
            });
            
            // データを再読み込み
            await this.loadFromServer();
        } catch (error) {
            console.error('支払い追加エラー:', error);
            alert('支払いの記録に失敗しました: ' + error.message);
            throw error;
        }
    }

    // 表示を更新
    updateDisplay() {
        // 合計ポイントを更新
        const totalPointsEl = document.getElementById('totalPoints');
        if (totalPointsEl) {
            totalPointsEl.textContent = this.data.totalPoints.toLocaleString();
        }

        // 履歴を更新
        const historyEl = document.getElementById('paymentHistory');
        if (historyEl) {
            if (this.data.payments.length === 0) {
                historyEl.innerHTML = '<li class="no-history">まだ支払い履歴がありません</li>';
            } else {
                historyEl.innerHTML = this.data.payments
                    .map(payment => `
                        <li>
                            <span class="history-date">${payment.date}</span>
                            <span class="history-amount">+${payment.amount.toLocaleString()}円</span>
                        </li>
                    `)
                    .join('');
            }
        }
    }
}

// PayPay決済の処理
class PayPayPayment {
    constructor(pointsCard) {
        this.pointsCard = pointsCard;
        this.currentAmount = 0;
        this.init();
    }

    init() {
        // PayPay決済ボタン
        const payButton = document.getElementById('payButton');
        if (payButton) {
            payButton.addEventListener('click', () => this.openPaymentModal());
        }

        // モーダルの閉じるボタン
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // 支払い完了ボタン
        const confirmBtn = document.getElementById('confirmPayment');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.completePayment());
        }

        // キャンセルボタン
        const cancelBtn = document.getElementById('cancelPayment');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // モーダル外をクリックで閉じる
        const modal = document.getElementById('paypayModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    // 支払いモーダルを開く
    openPaymentModal() {
        if (!currentUser) {
            alert('ログインが必要です');
            return;
        }

        const amountInput = document.getElementById('paymentAmount');
        const amount = parseInt(amountInput.value);

        if (!amount || amount <= 0) {
            alert('正しい金額を入力してください');
            return;
        }

        this.currentAmount = amount;
        const modal = document.getElementById('paypayModal');
        const modalAmount = document.getElementById('modalAmount');

        if (modal && modalAmount) {
            modalAmount.textContent = amount.toLocaleString();
            modal.style.display = 'block';

            // PayPayリンクを生成
            this.generatePayPayLink(amount);
        }
    }

    // PayPayリンクを生成
    generatePayPayLink(amount) {
        const paypayLink = document.getElementById('paypayLink');

        // PayPayアプリを開くリンク（金額は含めない - アプリで入力する）
        if (paypayLink) {
            paypayLink.href = `paypay://payment`;
            paypayLink.textContent = 'PayPayアプリを開く';
            paypayLink.style.display = 'inline-block';
        }
    }

    // 支払いを完了
    async completePayment() {
        if (this.currentAmount > 0) {
            try {
                // 通常の支払い（売り手なし）
                await this.pointsCard.addPayment(this.currentAmount, null);
                this.closeModal();
                
                // 入力欄をクリア
                const amountInput = document.getElementById('paymentAmount');
                if (amountInput) {
                    amountInput.value = '';
                }

                // 成功メッセージ
                alert(`支払いが完了しました！\n${this.currentAmount.toLocaleString()}円がポイントカードに追加されました。`);
                
                this.currentAmount = 0;
            } catch (error) {
                alert('支払いの記録に失敗しました');
            }
        }
    }

    // モーダルを閉じる
    closeModal() {
        const modal = document.getElementById('paypayModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentAmount = 0;
    }
}



// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', async () => {
    // 認証管理の初期化
    const authManager = new AuthManager();

    // ポイントカードの初期化
    window.pointsCard = new PointsCard();
    
    // ログイン済みの場合はデータを読み込む
    if (currentUser) {
        await window.pointsCard.loadFromServer();
    }

    // PayPay決済の初期化
    const paypayPayment = new PayPayPayment(window.pointsCard);

    // Enterキーで支払いモーダルを開く
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) {
        amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('payButton').click();
            }
        });
    }

    // 売り手用: 受け取り記録ボタン
    const submitReceiptButton = document.getElementById('submitReceiptButton');
    if (submitReceiptButton) {
        submitReceiptButton.addEventListener('click', async () => {
            const amountInput = document.getElementById('receiptAmount');
            const buyerNameInput = document.getElementById('receiptBuyerName');
            const memoInput = document.getElementById('receiptMemo');
            const amount = parseInt(amountInput.value);
            const buyerName = buyerNameInput.value.trim();
            const memo = memoInput.value.trim();

            if (!amount || amount <= 0) {
                alert('正しい金額を入力してください');
                return;
            }

            if (!buyerName) {
                alert('買い手のユーザー名を入力してください');
                return;
            }

            try {
                // 買い手のユーザーIDを取得
                const users = await apiCall('/admin/users');
                const buyer = users.find(u => u.username === buyerName);
                
                if (!buyer) {
                    alert('該当する買い手が見つかりません。ユーザー名を確認してください。');
                    return;
                }

                const response = await apiCall('/seller/receipts', {
                    method: 'POST',
                    body: JSON.stringify({
                        sellerId: currentUser.userId,
                        buyerId: buyer.id,
                        amount: amount,
                        memo: memo
                    })
                });

                // 自動処理されたかどうかを確認
                if (response.receipt && response.receipt.status === 'PROCESSED') {
                    alert('受け取り記録を登録し、自動的にポイントカードに反映しました！');
                } else {
                    alert('受け取り記録を登録しました！\n運営が確認後に買い手のポイントカードに反映されます。');
                }
                
                // 入力欄をクリア
                amountInput.value = '';
                buyerNameInput.value = '';
                memoInput.value = '';
            } catch (error) {
                alert('記録の登録に失敗しました: ' + error.message);
                console.error(error);
            }
        });
    }
});
