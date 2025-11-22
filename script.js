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
        const qrCode = document.getElementById('qrCode');

        // PayPayアプリのURLスキーム
        const paypayUrl = `paypay://payment?amount=${amount}`;
        
        if (paypayLink) {
            paypayLink.href = paypayUrl;
        }

        // QRコードのプレースホルダー
        if (qrCode) {
            qrCode.innerHTML = `
                <div style="text-align: center;">
                    <p style="margin-bottom: 10px;">QRコード</p>
                    <p style="font-size: 0.9em; color: #999;">
                        金額: ${amount.toLocaleString()}円<br>
                        PayPayアプリでスキャンしてください
                    </p>
                </div>
            `;
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


// 支払いページ管理（QRコードスキャン後の処理）
class PaymentPageManager {
    constructor(pointsCard) {
        this.pointsCard = pointsCard;
        this.sellerId = null;
        this.init();
    }

    init() {
        // URLパラメータをチェック
        const urlParams = new URLSearchParams(window.location.search);
        const sellerId = urlParams.get('sellerId');

        if (sellerId) {
            this.sellerId = parseInt(sellerId);
            this.showPaymentPage();
        }

        // 支払いボタン
        const payButton = document.getElementById('payToSellerButton');
        if (payButton) {
            payButton.addEventListener('click', () => this.processPayment());
        }

        // Enterキーで支払い
        const amountInput = document.getElementById('paymentToSellerAmount');
        if (amountInput) {
            amountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.processPayment();
                }
            });
        }
    }

    async showPaymentPage() {
        // メイン画面を非表示
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'none';
        
        // 支払いページを表示
        const paymentPage = document.getElementById('paymentPage');
        if (paymentPage) {
            paymentPage.style.display = 'block';
        }

        // 売り手情報を取得
        try {
            const sellerInfo = await apiCall(`/users/${this.sellerId}`);
            const sellerNameEl = document.getElementById('paymentSellerName');
            if (sellerNameEl) {
                sellerNameEl.textContent = sellerInfo.username;
            }
        } catch (error) {
            alert('売り手情報の取得に失敗しました');
            console.error(error);
        }
    }

    async processPayment() {
        if (!currentUser) {
            alert('ログインが必要です。先にログインしてください。');
            // ログイン画面にリダイレクト
            window.location.href = window.location.origin;
            return;
        }

        const amountInput = document.getElementById('paymentToSellerAmount');
        const amount = parseInt(amountInput.value);

        if (!amount || amount <= 0) {
            alert('正しい金額を入力してください');
            return;
        }

        // 支払いを記録（買い手のポイントカードに追加、売り手IDも記録）
        try {
            await this.pointsCard.addPayment(amount, this.sellerId);
            alert(`支払いが完了しました！\n${amount.toLocaleString()}円がポイントカードに追加されました。`);
            
            // メイン画面に戻る
            window.location.href = window.location.origin;
        } catch (error) {
            alert('支払いの記録に失敗しました');
            console.error(error);
        }
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

    // 支払いページ管理の初期化
    const paymentPageManager = new PaymentPageManager(window.pointsCard);

    // Enterキーで支払いモーダルを開く
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) {
        amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('payButton').click();
            }
        });
    }
});
