// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6902fd1900276a875b41';

// Initialize Appwrite SDK first
console.log('Initializing Appwrite...');

// Import Appwrite (make sure you're using the correct CDN)
// Use this in your HTML: <script src="https://cdn.jsdelivr.net/npm/appwrite@10.0.0/dist/iife/sdk.min.js"></script>

const client = new Appwrite.Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialize services AFTER client is configured
const account = new Appwrite.Account(client);
const database = new Appwrite.Databases(client, '690300cc002b6ab61b0e');
const storage = new Appwrite.Storage(client);

// Global variables
let currentUser = null;
let selectedImage = null;
const DATABASE_ID = '690300cc002b6ab61b0e';
const MESSAGES_COLLECTION_ID = 'messages';
const STORAGE_BUCKET_ID = '6903015700098d0fcd72';

// DOM Elements
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const currentUserSpan = document.getElementById('current-user');

// Check if user is already logged in
async function init() {
    console.log('Initializing app...');
    try {
        currentUser = await account.get();
        console.log('User already logged in:', currentUser.name);
        showChat();
        loadMessages();
        setupRealtime();
    } catch (error) {
        console.log('No active session, showing login form');
        showAuth();
    }
}

// Authentication Functions
async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        console.log('Registering user:', email);
        const user = await account.create('unique()', email, password, name);
        console.log('User created:', user);
        
        // Now login after successful registration
        await loginUser(email, password);
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    }
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    await loginUser(email, password);
}

async function loginUser(email, password) {
    try {
        console.log('Logging in user:', email);
        const session = await account.createEmailSession(email, password);
        console.log('Session created:', session);
        
        currentUser = await account.get();
        console.log('Current user:', currentUser);
        
        showChat();
        loadMessages();
        setupRealtime();
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function logout() {
    try {
        await account.deleteSession('current');
        currentUser = null;
        showAuth();
        clearMessages();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// UI Management
function showAuth() {
    if (authSection) authSection.style.display = 'flex';
    if (chatSection) chatSection.style.display = 'none';
    // Clear form fields
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showChat() {
    if (authSection) authSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'flex';
    if (currentUserSpan && currentUser) {
        currentUserSpan.textContent = currentUser.name;
    }
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Message Functions
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText && !selectedImage) {
        alert('Please enter a message or select an image');
        return;
    }

    try {
        let imageId = null;
        
        // Upload image if selected
        if (selectedImage) {
            console.log('Uploading image...');
            imageId = await uploadImage(selectedImage);
            console.log('Image uploaded with ID:', imageId);
        }

        // Create message document
        console.log('Creating message document...');
        const messageData = {
            userId: currentUser.$id,
            username: currentUser.name,
            message: messageText,
            imageId: imageId,
            timestamp: new Date().toISOString()
        };
        
        console.log('Message data:', messageData);
        
        await database.createDocument(
            DATABASE_ID,
            MESSAGES_COLLECTION_ID,
            'unique()',
            messageData
        );

        console.log('Message sent successfully');
        // Clear inputs
        messageInput.value = '';
        cancelImageUpload();
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message: ' + error.message);
    }
}

async function uploadImage(file) {
    try {
        const result = await storage.createFile(
            STORAGE_BUCKET_ID,
            'unique()',
            file
        );
        return result.$id;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

async function getImageUrl(fileId) {
    try {
        return storage.getFilePreview(STORAGE_BUCKET_ID, fileId);
    } catch (error) {
        console.error('Error getting image URL:', error);
        return null;
    }
}

// Image Handling
function handleImageUpload(file) {
    if (file && file.type.startsWith('image/')) {
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }
        
        selectedImage = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('image-preview').style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file');
    }
}

function cancelImageUpload() {
    selectedImage = null;
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload').value = '';
}

// Message Display
async function loadMessages() {
    try {
        console.log('Loading messages...');
        const response = await database.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID);
        console.log('Messages loaded:', response.documents.length);
        
        clearMessages();
        
        // Sort messages by timestamp (oldest first)
        const sortedMessages = response.documents.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        for (const message of sortedMessages) {
            await displayMessage(message);
        }
        scrollToBottom();
    } catch (error) {
        console.error('Error loading messages:', error);
        if (error.message.includes('Collection not found')) {
            console.log('Messages collection might not exist yet');
        }
    }
}

async function displayMessage(messageDoc) {
    const messageDiv = document.createElement('div');
    const isOwnMessage = currentUser && messageDoc.userId === currentUser.$id;
    
    messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    
    let imageHtml = '';
    if (messageDoc.imageId) {
        try {
            const imageUrl = await getImageUrl(messageDoc.imageId);
            if (imageUrl) {
                imageHtml = `<img src="${imageUrl}" alt="Shared image" class="message-image" onclick="viewImage('${imageUrl}')">`;
            }
        } catch (error) {
            console.error('Error loading image:', error);
        }
    }
    
    const time = new Date(messageDoc.timestamp).toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${escapeHtml(messageDoc.username)}</strong> • ${time}
        </div>
        ${messageDoc.message ? `<div class="message-text">${escapeHtml(messageDoc.message)}</div>` : ''}
        ${imageHtml}
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function clearMessages() {
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
}

function scrollToBottom() {
    if (messagesContainer) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

// Real-time Updates
function setupRealtime() {
    try {
        console.log('Setting up real-time updates...');
        client.subscribe(
            `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
            response => {
                console.log('Realtime update:', response);
                if (response.event === 'database.documents.create') {
                    displayMessage(response.payload);
                }
            }
        );
        console.log('Realtime updates enabled');
    } catch (error) {
        console.error('Error setting up realtime:', error);
    }
}

// Utility Functions
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewImage(imageUrl) {
    window.open(imageUrl, '_blank');
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    init();
});

// Make functions globally available for HTML onclick attributes
window.login = login;
window.register = register;
window.logout = logout;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.handleImageUpload = handleImageUpload;
window.cancelImageUpload = cancelImageUpload;
window.viewImage = viewImage;
window.showRegister = showRegister;
window.showLogin = showLogin;
