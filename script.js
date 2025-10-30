// Appwrite Chat with CORS handling
console.log("🚀 Script loaded!");

class AppwriteChat {
    constructor() {
        this.config = {
            endpoint: 'https://fra.cloud.appwrite.io/v1',
            projectId: '6902fd1900276a875b41',
            databaseId: '690300cc002b6ab61b0e',
            collectionId: 'messages',
            bucketId: '6903015700098d0fcd72'
        };
        
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log("🔄 Initializing Appwrite Chat...");
        
        try {
            // Check if Appwrite SDK is available
            if (typeof Appwrite === 'undefined') {
                throw new Error('Appwrite SDK not loaded. Check the CDN.');
            }

            // Initialize Appwrite
            this.client = new Appwrite.Client();
            this.client
                .setEndpoint(this.config.endpoint)
                .setProject(this.config.projectId);

            // Initialize services
            this.account = new Appwrite.Account(this.client);
            this.database = new Appwrite.Databases(this.client);
            this.storage = new Appwrite.Storage(this.client);

            console.log("✅ Appwrite initialized successfully");
            
            this.setupEventListeners();
            await this.checkCurrentUser();
            
        } catch (error) {
            console.error("❌ Initialization failed:", error);
            this.showError('App initialization failed: ' + error.message);
        }
    }

    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");
        
        // Auth buttons
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('register-btn').addEventListener('click', () => this.handleRegister());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        
        // Navigation
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
        
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
        
        // Chat
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        console.log("✅ Event listeners setup complete!");
    }

    async checkCurrentUser() {
        try {
            console.log("🔍 Checking current user session...");
            this.currentUser = await this.account.get();
            console.log("✅ User session found:", this.currentUser.email);
            this.showChatInterface();
            this.loadMessages();
        } catch (error) {
            console.log("ℹ️ No active session:", error.message);
            this.showAuthInterface();
        }
    }

    async handleRegister() {
        console.log("📝 Registration started...");
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!this.validateForm(name, email, password)) {
            return;
        }

        try {
            this.showLoading('Registering...');
            console.log("Creating user account...");
            
            const user = await this.account.create('unique()', email, password, name);
            console.log("✅ User created:", user);
            
            await this.handleUserLogin(email, password);
            
        } catch (error) {
            console.error("❌ Registration failed:", error);
            this.showError('Registration failed: ' + this.getErrorMessage(error));
        } finally {
            this.hideLoading();
        }
    }

    async handleLogin() {
        console.log("🔐 Login started...");
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!this.validateForm(null, email, password)) {
            return;
        }
        
        await this.handleUserLogin(email, password);
    }

    async handleUserLogin(email, password) {
        try {
            this.showLoading('Logging in...');
            console.log("Creating session...");
            
            const session = await this.account.createEmailSession(email, password);
            console.log("✅ Session created:", session);
            
            this.currentUser = await this.account.get();
            console.log("✅ User data loaded:", this.currentUser);
            
            this.showChatInterface();
            this.loadMessages();
            
        } catch (error) {
            console.error("❌ Login failed:", error);
            this.showError('Login failed: ' + this.getErrorMessage(error));
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await this.account.deleteSession('current');
            this.currentUser = null;
            this.showAuthInterface();
            this.clearMessages();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    validateForm(name, email, password) {
        if (name && !name.trim()) {
            this.showError('Please enter a username');
            return false;
        }
        
        if (!email || !email.includes('@')) {
            this.showError('Please enter a valid email');
            return false;
        }
        
        if (!password || password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return false;
        }
        
        return true;
    }

    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Network error. Check your internet connection and CORS settings.';
        }
        if (error.message.includes('CORS')) {
            return 'CORS error. Make sure your domain is whitelisted in Appwrite.';
        }
        if (error.message.includes('User already exists')) {
            return 'User with this email already exists.';
        }
        if (error.message.includes('Invalid credentials')) {
            return 'Invalid email or password.';
        }
        return error.message;
    }

    showAuthInterface() {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('chat-section').style.display = 'none';
        this
