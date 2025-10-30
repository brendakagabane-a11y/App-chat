// Simple Appwrite Chat App
class AppwriteChat {
    constructor() {
        this.APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
        this.APPWRITE_PROJECT_ID = '6902fd1900276a875b41';
        this.DATABASE_ID = '690300cc002b6ab61b0e';
        this.MESSAGES_COLLECTION_ID = 'messages';
        this.STORAGE_BUCKET_ID = '6903015700098d0fcd72';
        
        this.currentUser = null;
        this.selectedImage = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Appwrite Chat...');
        
        try {
            // Initialize Appwrite client
            this.client = new Appwrite.Client();
            this.client
                .setEndpoint(this.APPWRITE_ENDPOINT)
                .setProject(this.APPWRITE_PROJECT_ID);

            // Initialize services
            this.account = new Appwrite.Account(this.client);
            this.database = new Appwrite.Databases(this.client);
            this.storage = new Appwrite.Storage(this.client);

            console.log('✅ Appwrite initialized successfully');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check if user is already logged in
            await this.checkAuthStatus();
            
        } catch (error) {
            console.error('❌ Appwrite initialization failed:', error);
            this.showAuth();
        }
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Navigation
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });
        
        // Chat functionality
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Image upload
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });
        document.getElementById('cancel-upload').addEventListener('click', () => {
            this.cancelImageUpload();
        });
    }

    async checkAuthStatus() {
        try {
            this.currentUser = await this.account.get();
            console.log('✅ User already logged in:', this.currentUser.name);
            this.showChat();
            this.loadMessages();
            this.setupRealtime();
        } catch (error) {
            console.log('ℹ️ No active session');
            this.showAuth();
        }
    }

    async register() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!name || !email || !password) {
            alert('Please fill all fields');
            return;
        }

        try {
            console.log('📝 Registering user:', email);
            await this.account.create('unique()', email, password, name);
            console.log('✅ User registered successfully');
            
            // Login after registration
            await this.loginUser(email, password);
        } catch (error) {
            console.error('❌ Registration failed:', error);
            alert('Registration failed: ' + error.message);
        }
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            alert('Please fill all fields');
            return;
        }
        
        await this.loginUser(email, password);
    }

    async loginUser(email, password) {
        try {
            console.log('🔐 Logging in user:', email);
            await this.account.createEmailSession(email, password);
            this.currentUser = await this.account.get();
            console.log('✅ Login successful:', this.currentUser.name);
            
            this.showChat();
            this.loadMessages();
            this.setupRealtime();
        } catch (error) {
            console.error('❌ Login failed:', error);
            alert('Login failed: ' + error.message);
        }
    }

    async logout() {
        try {
            await this.account.deleteSession('current');
            this.currentUser = null;
            this.showAuth();
            this.clearMessages();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    showAuth() {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('chat-section').style.display = 'none';
    }

    showChat() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('chat-section').style.display = 'flex';
        document.getElementById('current-user').textContent = this.currentUser.name;
    }

    showRegister() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }

    showLogin() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const messageText = messageInput.value.trim();
        
        if (!messageText && !this.selectedImage) {
            alert('Please enter a message or select an image');
            return;
        }

        try {
            let imageId = null;
            
            if (this.selectedImage) {
                console.log('🖼️ Uploading image...');
                imageId = await this.uploadImage(this.selectedImage);
            }

            console.log('💬 Sending message...');
            await this.database.createDocument(
                this.DATABASE_ID,
                this.MESSAGES_COLLECTION_ID,
                'unique()',
                {
                    userId: this.currentUser.$id,
                    username: this.currentUser.name,
                    message: messageText,
                    imageId: imageId,
                    timestamp: new Date().toISOString()
                }
            );

            messageInput.value = '';
            this.cancelImageUpload();
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        }
    }

    async uploadImage(file) {
        const result = await this.storage.createFile(
            this.STORAGE_BUCKET_ID,
            'unique()',
            file
        );
        return result.$id;
    }

    async getImageUrl(fileId) {
        return this.storage.getFilePreview(this.STORAGE_BUCKET_ID, fileId);
    }

    handleImageUpload(file) {
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            this.selectedImage = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('preview-img').src = e.target.result;
                document.getElementById('image-preview').style.display = 'flex';
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file');
        }
    }

    cancelImageUpload() {
        this.selectedImage = null;
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('image-upload').value = '';
    }

    async loadMessages() {
        try {
            const response = await this.database.listDocuments(this.DATABASE_ID, this.MESSAGES_COLLECTION_ID);
            this.clearMessages();
            
            const sortedMessages = response.documents.sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            for (const message of sortedMessages) {
                await this.displayMessage(message);
            }
            this.scrollToBottom();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    async displayMessage(messageDoc) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = this.currentUser && messageDoc.userId === this.currentUser.$id;
        
        messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        let imageHtml = '';
        if (messageDoc.imageId) {
            try {
                const imageUrl = await this.getImageUrl(messageDoc.imageId);
                if (imageUrl) {
                    imageHtml = `<img src="${imageUrl}" alt="Shared image" class="message-image" onclick="window.open('${imageUrl}', '_blank')">`;
                }
            } catch (error) {
                console.error('Error loading image:', error);
            }
        }
        
        const time = new Date(messageDoc.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${this.escapeHtml(messageDoc.username)}</strong> • ${time}
            </div>
            ${messageDoc.message ? `<div class="message-text">${this.escapeHtml(messageDoc.message)}</div>` : ''}
            ${imageHtml}
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

    setupRealtime() {
        try {
            this.client.subscribe(
                `databases.${this.DATABASE_ID}.collections.${this.MESSAGES_COLLECTION_ID}.documents`,
                (response) => {
                    if (response.event === 'database.documents.create') {
                        this.displayMessage(response.payload);
                    }
                }
            );
            console.log('✅ Realtime updates enabled');
        } catch (error) {
            console.error('❌ Realtime setup failed:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting app...');
    window.chatApp = new AppwriteChat();
});
