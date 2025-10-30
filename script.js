// Simple Appwrite Chat - Debug Version
console.log("🚀 Script loaded!");

// Configuration
const CONFIG = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6902fd1900276a875b41',
    databaseId: '690300cc002b6ab61b0e',
    collectionId: 'messages',
    bucketId: '6903015700098d0fcd72'
};

let appwrite = null;
let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM loaded!");
    initializeApp();
});

function initializeApp() {
    console.log("🔄 Initializing Appwrite...");
    
    try {
        // Initialize Appwrite
        const client = new Appwrite.Client();
        client
            .setEndpoint(CONFIG.endpoint)
            .setProject(CONFIG.projectId);

        appwrite = {
            client: client,
            account: new Appwrite.Account(client),
            database: new Appwrite.Databases(client),
            storage: new Appwrite.Storage(client)
        };

        console.log("✅ Appwrite initialized successfully!");
        
        // Setup event listeners
        setupEventListeners();
        
        // Check if user is logged in
        checkCurrentUser();
        
    } catch (error) {
        console.error("❌ Appwrite initialization failed:", error);
        alert("App initialization failed: " + error.message);
    }
}

function setupEventListeners() {
    console.log("🔗 Setting up event listeners...");
    
    // Auth buttons
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Form navigation
    document.getElementById('show-register').addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('show-login').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });
    
    // Chat functionality
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Image upload
    document.getElementById('image-upload').addEventListener('change', function(e) {
        handleImageUpload(e.target.files[0]);
    });
    
    document.getElementById('cancel-upload').addEventListener('click', cancelImageUpload);
    
    console.log("✅ Event listeners setup complete!");
}

async function checkCurrentUser() {
    try {
        console.log("🔍 Checking current user...");
        currentUser = await appwrite.account.get();
        console.log("✅ User found:", currentUser.name);
        showChatInterface();
        loadMessages();
    } catch (error) {
        console.log("ℹ️ No user logged in");
        showAuthInterface();
    }
}

async function handleRegister() {
    console.log("📝 Register button clicked!");
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        console.log("Creating user:", email);
        await appwrite.account.create('unique()', email, password, name);
        console.log("✅ User created successfully!");
        
        // Login after registration
        await handleUserLogin(email, password);
        
    } catch (error) {
        console.error("❌ Registration failed:", error);
        alert('Registration failed: ' + error.message);
    }
}

async function handleLogin() {
    console.log("🔐 Login button clicked!");
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    await handleUserLogin(email, password);
}

async function handleUserLogin(email, password) {
    try {
        console.log("Logging in:", email);
        await appwrite.account.createEmailSession(email, password);
        currentUser = await appwrite.account.get();
        console.log("✅ Login successful:", currentUser.name);
        
        showChatInterface();
        loadMessages();
        
    } catch (error) {
        console.error("❌ Login failed:", error);
        alert('Login failed: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await appwrite.account.deleteSession('current');
        currentUser = null;
        showAuthInterface();
        clearMessages();
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

function showAuthInterface() {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('chat-section').style.display = 'none';
    // Clear forms
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showChatInterface() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'flex';
    document.getElementById('current-user').textContent = currentUser.name;
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    
    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    try {
        console.log("💬 Sending message:", messageText);
        
        await appwrite.database.createDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            'unique()',
            {
                userId: currentUser.$id,
                username: currentUser.name,
                message: messageText,
                imageId: null,
                timestamp: new Date().toISOString()
            }
        );

        messageInput.value = '';
        console.log("✅ Message sent successfully!");
        
    } catch (error) {
        console.error("❌ Error sending message:", error);
        alert('Failed to send message: ' + error.message);
    }
}

function handleImageUpload(file) {
    console.log("🖼️ Image upload triggered");
    // Image upload functionality will be added later
    alert('Image upload will be implemented after basic chat works');
}

function cancelImageUpload() {
    console.log("❌ Image upload cancelled");
}

async function loadMessages() {
    try {
        console.log("📨 Loading messages...");
        const response = await appwrite.database.listDocuments(
            CONFIG.databaseId, 
            CONFIG.collectionId
        );
        
        clearMessages();
        
        const messages = response.documents.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        for (const message of messages) {
            displayMessage(message);
        }
        
        console.log(`✅ Loaded ${messages.length} messages`);
        
    } catch (error) {
        console.error("❌ Error loading messages:", error);
    }
}

function displayMessage(messageDoc) {
    const messageDiv = document.createElement('div');
    const isOwnMessage = currentUser && messageDoc.userId === currentUser.$id;
    
    messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    
    const time = new Date(messageDoc.timestamp).toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${escapeHtml(messageDoc.username)}</strong> • ${time}
        </div>
        <div class="message-text">${escapeHtml(messageDoc.message)}</div>
    `;
    
    document.getElementById('messages-container').appendChild(messageDiv);
    scrollToBottom();
}

function clearMessages() {
    document.getElementById('messages-container').innerHTML = '';
}

function scrollToBottom() {
    setTimeout(() => {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make sure functions are available globally
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.sendMessage = sendMessage;
