// Appwrite Chat - Complete Fix
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
            if (typeof Appwrite === 'undefined') {
                throw new Error('Appwrite SDK not loaded');
            }

            this.client = new Appwrite.Client();
            this.client
                .setEndpoint(this.config.endpoint)
                .setProject(this.config.projectId);

            this.account = new Appwrite.Account(this.client);
            this.database = new Appwrite.Databases(this.client);
            this.storage = new Appwrite.Storage(this.client);

            console.log("✅ Appwrite initialized");
            
            this.setupEventListeners();
            await this.checkCurrentUser();
            
        } catch (error) {
            console.error("❌ Initialization failed:", error);
            this.showMessage('App initialization failed: ' + error.message);
        }
    }

    setupEventListeners() {
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
    }

    async checkCurrentUser() {
        try {
            this.currentUser = await this.account.get();
            console.log("✅ User found:", this.currentUser.email);
            this.showChatInterface();
            this.loadMessages();
        } catch (error) {
            console.log("ℹ️ No active session");
            this.showAuthInterface();
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!name || !email || !password) {
            this.showMessage('Please fill all fields');
            return;
        }

        try {
            console.log("Creating user:", email);
            await this.account.create('unique()', email, password, name);
            await this.handleUserLogin(email, password);
        } catch (error) {
            console.error("Registration failed:", error);
            this.showMessage('Registration failed: ' + this.getErrorMessage(error));
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showMessage('Please fill all fields');
            return;
        }
        
        await this.handleUserLogin(email, password);
    }

    async handleUserLogin(email, password) {
        try {
            console.log("Logging in:", email);
            await this.account.createEmailSession(email, password);
            this.currentUser = await this.account.get();
            this.showChatInterface();
            this.loadMessages();
        } catch (error) {
            console.error("Login failed:", error);
            this.showMessage('Login failed: ' + this.getErrorMessage(error));
        }
    }

    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Cannot connect to server. Check: 1) Your domain is whitelisted in Appwrite, 2) Internet connection';
        }
        if (error.message.includes('User already exists')) {
            return 'User already exists. Try logging in instead.';
        }
        return error.message;
    }

    showAuthInterface() {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('chat-section').style.display = 'none';
    }

    showChatInterface() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('chat-section').style.display = 'flex';
        document.getElementById('current-user').textContent = this.currentUser.name;
    }

    showRegisterForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }

    showMessage(message) {
        alert(message);
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const messageText = messageInput.value.trim();
        
        if (!messageText) {
            this.showMessage('Please enter a message');
            return;
        }

        try {
            await this.database.createDocument(
                this.config.databaseId,
                this.config.collectionId,
                'unique()',
                {
                    userId: this.currentUser.$id,
                    username: this.currentUser.name,
                    message: messageText,
                    imageId: null,
                    timestamp: new Date().toISOString()
                }
            );

            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message:", error);
            this.showMessage('Failed to send message: ' + error.message);
        }
    }

    async loadMessages() {
        try {
            const response = await this.database.listDocuments(
                this.config.databaseId, 
                this.config.collectionId
            );
            
            this.clearMessages();
            
            const messages = response.documents.sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            for (const message of messages) {
                this.displayMessage(message);
            }
            
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    }

    displayMessage(messageDoc) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = this.currentUser && messageDoc.userId === this.currentUser.$id;
        
        messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        const time = new Date(messageDoc.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${this.escapeHtml(messageDoc.username)}</strong> • ${time}
            </div>
            <div class="message-text">${this.escapeHtml(messageDoc.message)}</div>
        `;
        
        document.getElementById('messages-container').appendChild(messageDiv);
        this.scrollToBottom();
    }

    clearMessages() {
        document.getElementById('messages-container').innerHTML = '';
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('messages-container');
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM loaded, starting app...");
    window.chatApp = new AppwriteChat();
});
