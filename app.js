// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCDxuqukT6Zg008fjAmxwITy-dWAnyQaIo",
    authDomain: "mishatracker-2e4c8.firebaseapp.com",
    projectId: "mishatracker-2e4c8",
    storageBucket: "mishatracker-2e4c8.firebasestorage.app",
    messagingSenderId: "852587848079",
    appId: "1:852587848079:web:f7a7fe308ccdb01e352bfa",
    measurementId: "G-B8ZM2GR8BS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    loadStreakCount();
});

// Authentication functions
function signup() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }
    
    // Simple auth simulation - create user document
    createUser(username, password);
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }
    
    // Simple auth simulation - check if user exists
    authenticateUser(username, password);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthSection();
    clearForm();
}

// Database functions
async function createUser(username, password) {
    try {
        // Check if username already exists
        const userDoc = await db.collection('users').doc(username).get();
        if (userDoc.exists) {
            alert('Користувач з таким іменем вже існує');
            return;
        }
        
        // Create new user
        await db.collection('users').doc(username).set({
            username: username,
            password: password, // In real app, this should be hashed
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            mentionCount: 0
        });
        
        currentUser = username;
        localStorage.setItem('currentUser', username);
        showMainSection();
        
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Помилка при створенні користувача');
    }
}

async function authenticateUser(username, password) {
    try {
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            alert('Користувача не знайдено');
            return;
        }
        
        const userData = userDoc.data();
        if (userData.password !== password) {
            alert('Невірний пароль');
            return;
        }
        
        currentUser = username;
        localStorage.setItem('currentUser', username);
        showMainSection();
        
    } catch (error) {
        console.error('Error authenticating user:', error);
        alert('Помилка при вході');
    }
}

// Main app functions
async function recordMention() {
    if (!currentUser) {
        alert('Будь ласка, увійдіть в систему');
        return;
    }
    
    try {
        const today = new Date().toDateString();
        
        // Check if already mentioned today
        const todayDoc = await db.collection('mentions').doc(today).get();
        if (todayDoc.exists) {
            alert('Михайла вже згадували сьогодні! 🎉');
            return;
        }
        
        // Record today's mention
        await db.collection('mentions').doc(today).set({
            date: today,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            mentionedBy: currentUser
        });
        
        // Update user's mention count
        await db.collection('users').doc(currentUser).update({
            mentionCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Show fireworks
        showFireworks();
        
        // Update streak count
        loadStreakCount();
        
        // Show success message
        setTimeout(() => {
            alert('Михайла згадано! 🔥');
        }, 1000);
        
    } catch (error) {
        console.error('Error recording mention:', error);
        alert('Помилка при записі згадування');
    }
}

async function loadStreakCount() {
    try {
        let streak = 0;
        const today = new Date();
        let currentDate = new Date(today);
        
        // Check consecutive days backwards
        while (true) {
            const dateString = currentDate.toDateString();
            const mentionDoc = await db.collection('mentions').doc(dateString).get();
            
            if (mentionDoc.exists) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        document.getElementById('streakCount').textContent = streak;
        
    } catch (error) {
        console.error('Error loading streak:', error);
    }
}

async function loadUserStats() {
    try {
        const usersSnapshot = await db.collection('users')
            .orderBy('mentionCount', 'desc')
            .limit(10)
            .get();
        
        const statsContainer = document.getElementById('userStats');
        statsContainer.innerHTML = '';
        
        if (usersSnapshot.empty) {
            statsContainer.innerHTML = '<p>Поки що немає статистики</p>';
            return;
        }
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.mentionCount > 0) {
                const statItem = document.createElement('div');
                statItem.className = 'user-stat-item';
                statItem.innerHTML = `
                    <span class="username">${userData.username}</span>
                    <span class="count">${userData.mentionCount}</span>
                `;
                statsContainer.appendChild(statItem);
            }
        });
        
    } catch (error) {
        console.error('Error loading user stats:', error);
        document.getElementById('userStats').innerHTML = '<p>Помилка завантаження статистики</p>';
    }
}

// Fireworks animation
function showFireworks() {
    const fireworksContainer = document.getElementById('fireworks');
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    
    // Create multiple fireworks
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createFirework(fireworksContainer, colors);
        }, i * 100);
    }
}

function createFirework(container, colors) {
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    // Random position
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    
    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    firework.style.left = x + 'px';
    firework.style.top = y + 'px';
    firework.style.backgroundColor = color;
    firework.style.boxShadow = `0 0 10px ${color}`;
    
    container.appendChild(firework);
    
    // Remove after animation
    setTimeout(() => {
        if (firework.parentNode) {
            firework.parentNode.removeChild(firework);
        }
    }, 1000);
}

// UI functions
function showTab(tabName) {
    // Hide all tab contents
    document.getElementById('trackingTab').style.display = 'none';
    document.getElementById('statsTab').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'tracking') {
        document.getElementById('trackingTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[0].classList.add('active');
    } else if (tabName === 'stats') {
        document.getElementById('statsTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[1].classList.add('active');
        loadUserStats();
    }
}

function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('mainSection').style.display = 'none';
}

function showMainSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    document.getElementById('currentUser').textContent = currentUser;
}

function clearForm() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showMainSection();
    } else {
        showAuthSection();
    }
}