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
    loadTodayStatus();
    loadDailyLegend();
});

// Authentication functions
function signup() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showNotification('Будь ласка, заповніть всі поля', 'error');
        return;
    }
    
    // Simple auth simulation - create user document
    createUser(username, password);
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showNotification('Будь ласка, заповніть всі поля', 'error');
        return;
    }
    
    // Simple auth simulation - check if user exists
    authenticateUser(username, password);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('До побачення! 👋', 'success');
    showAuthSection();
    clearForm();
}

// Database functions
async function createUser(username, password) {
    try {
        // Check if username already exists
        const userDoc = await db.collection('users').doc(username).get();
        if (userDoc.exists) {
            showNotification('Користувач з таким іменем вже існує', 'error');
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
        showNotification('Ласкаво просимо! 🎉', 'success');
        showMainSection();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Помилка при створенні користувача', 'error');
    }
}

async function authenticateUser(username, password) {
    try {
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            showNotification('Користувача не знайдено', 'error');
            return;
        }
        
        const userData = userDoc.data();
        if (userData.password !== password) {
            showNotification('Невірний пароль', 'error');
            return;
        }
        
        currentUser = username;
        localStorage.setItem('currentUser', username);
        showNotification('Успішний вхід! 🎉', 'success');
        showMainSection();
        
    } catch (error) {
        console.error('Error authenticating user:', error);
        showNotification('Помилка при вході', 'error');
    }
}

// Main app functions
async function recordMention() {
    if (!currentUser) {
        showNotification('Будь ласка, увійдіть в систему', 'error');
        return;
    }
    
    try {
        const today = new Date().toDateString();
        const timestamp = new Date();
        
        // Create unique ID for this mention
        const mentionId = `${today}_${currentUser}_${timestamp.getTime()}`;
        
        // Record this user's mention for today
        await db.collection('userMentions').doc(mentionId).set({
            date: today,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            mentionedBy: currentUser
        });
        
        // Update user's total mention count
        await db.collection('users').doc(currentUser).update({
            mentionCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Check if this is the first mention today (for streak tracking)
        const todayMentionsQuery = await db.collection('userMentions')
            .where('date', '==', today)
            .limit(1)
            .get();
        
        const isFirstMentionToday = todayMentionsQuery.size === 1; // Only our mention exists
        
        if (isFirstMentionToday) {
            // Create/update the day record for streak tracking
            await db.collection('mentions').doc(today).set({
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                firstMentionBy: currentUser
            });
        }
        
        // Show amazing animations
        showFireworks();
        showFireEmojis();
        showBigSuccessMessage('Михайла згадано! 🔥🎉');
        
        // Update streak count and today status
        setTimeout(() => {
            loadStreakCount();
            loadTodayStatus();
            loadDailyLegend();
            checkAchievements();
        }, 500);
        
    } catch (error) {
        console.error('Error recording mention:', error);
        showNotification('Помилка при записі згадування', 'error');
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

async function loadTodayStatus() {
    try {
        const today = new Date().toDateString();
        const todayDoc = await db.collection('mentions').doc(today).get();
        
        const statusElement = document.getElementById('todayStatus');
        if (todayDoc.exists) {
            statusElement.textContent = '😊'; // Happy - someone mentioned today
        } else {
            statusElement.textContent = '😴'; // Sad - no mentions today
        }
        
    } catch (error) {
        console.error('Error loading today status:', error);
        document.getElementById('todayStatus').textContent = '😴';
    }
}

async function loadDailyLegend() {
    try {
        const today = new Date().toDateString();
        
        // Get all mentions for today, ordered by timestamp (earliest first)
        const todayMentionsQuery = await db.collection('userMentions')
            .where('date', '==', today)
            .orderBy('timestamp', 'asc')
            .limit(1)
            .get();
        
        const legendElement = document.getElementById('dailyLegend');
        
        if (!todayMentionsQuery.empty) {
            // Get the first (earliest) mention
            const firstMention = todayMentionsQuery.docs[0].data();
            const firstMentioner = firstMention.mentionedBy;
            legendElement.textContent = `Легенда дня: ${firstMentioner} 👑`;
        } else {
            legendElement.textContent = 'Будь першою хто згадав сьогодні!';
        }
        
    } catch (error) {
        console.error('Error loading daily legend:', error);
        document.getElementById('dailyLegend').textContent = 'Будь першою хто згадав сьогодні!';
    }
}

// Achievements system
const ACHIEVEMENTS = [
    {
        id: 'sinabon',
        icon: '🧁',
        title: 'Сінабон',
        description: 'Досягніть 1 день стрейку',
        requirement: { type: 'streak', value: 1 }
    },
    {
        id: 'small_cocoa',
        icon: '☕',
        title: 'Маленьке какао',
        description: 'Досягніть 5 днів стрейку',
        requirement: { type: 'streak', value: 5 }
    },
    {
        id: 'currant_tea',
        icon: '🫖',
        title: 'Горнятко чаю зі смородиною',
        description: 'Досягніть 10 днів стрейку',
        requirement: { type: 'streak', value: 10 }
    },
    {
        id: 'bergamot_tea',
        icon: '🍵',
        title: 'Чай чорний з бергамотом',
        description: 'Досягніть 20 днів стрейку',
        requirement: { type: 'streak', value: 20 }
    },
    {
        id: 'big_cocoa',
        icon: '🍫',
        title: 'Велике какао',
        description: 'Досягніть 30 днів стрейку',
        requirement: { type: 'streak', value: 30 }
    },
    {
        id: 'everyone_loves',
        icon: '❤️',
        title: 'Всі люблять Михайла',
        description: '5 різних людей натиснули протягом дня кнопку',
        requirement: { type: 'daily_users', value: 5 }
    }
];

async function checkAchievements() {
    try {
        // Get current streak
        const currentStreak = parseInt(document.getElementById('streakCount').textContent) || 0;
        
        // Get today's unique users
        const today = new Date().toDateString();
        const todayMentions = await db.collection('userMentions')
            .where('date', '==', today)
            .get();
        
        const uniqueUsersToday = new Set();
        todayMentions.forEach(doc => {
            uniqueUsersToday.add(doc.data().mentionedBy);
        });
        
        // Check each achievement
        for (const achievement of ACHIEVEMENTS) {
            const achievementDoc = await db.collection('achievements').doc(achievement.id).get();
            
            let isUnlocked = false;
            
            if (achievement.requirement.type === 'streak') {
                isUnlocked = currentStreak >= achievement.requirement.value;
            } else if (achievement.requirement.type === 'daily_users') {
                isUnlocked = uniqueUsersToday.size >= achievement.requirement.value;
            }
            
            // If achievement is unlocked and not yet recorded
            if (isUnlocked && !achievementDoc.exists) {
                await db.collection('achievements').doc(achievement.id).set({
                    achievementId: achievement.id,
                    unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    unlockedDate: new Date().toLocaleDateString('uk-UA')
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking achievements:', error);
    }
}

async function loadAchievements() {
    try {
        const achievementsContainer = document.getElementById('achievementsList');
        achievementsContainer.innerHTML = '';
        
        // Get unlocked achievements
        const unlockedAchievements = await db.collection('achievements').get();
        const unlockedIds = new Set();
        const unlockedData = {};
        
        unlockedAchievements.forEach(doc => {
            const data = doc.data();
            unlockedIds.add(doc.id);
            unlockedData[doc.id] = data;
        });
        
        // Create achievement items
        for (const achievement of ACHIEVEMENTS) {
            const isUnlocked = unlockedIds.has(achievement.id);
            
            const achievementEl = document.createElement('div');
            achievementEl.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            const statusText = isUnlocked 
                ? `Відкрито: ${unlockedData[achievement.id].unlockedDate}`
                : 'Заблоковано';
            
            achievementEl.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-status ${isUnlocked ? 'unlocked' : 'locked'}">${statusText}</div>
            `;
            
            achievementsContainer.appendChild(achievementEl);
        }
        
    } catch (error) {
        console.error('Error loading achievements:', error);
        document.getElementById('achievementsList').innerHTML = '<p>Помилка завантаження досягнень</p>';
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

// Notification and animation functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = type === 'error' ? 'auth-error' : 'success-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

function showBigSuccessMessage(message) {
    const messageEl = document.getElementById('successMessage');
    messageEl.textContent = message;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

function showFireEmojis() {
    const button = document.querySelector('.yes-button');
    const buttonRect = button.getBoundingClientRect();
    const emojis = ['🔥', '🎉', '✨', '🎊', '💥'];
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.className = 'fire-emoji';
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            
            // Start from button position
            emoji.style.left = (buttonRect.left + buttonRect.width / 2 + (Math.random() - 0.5) * 100) + 'px';
            emoji.style.top = (buttonRect.top + buttonRect.height / 2) + 'px';
            
            document.body.appendChild(emoji);
            
            // Remove after animation
            setTimeout(() => {
                if (emoji.parentNode) {
                    emoji.parentNode.removeChild(emoji);
                }
            }, 2000);
        }, i * 100);
    }
}

// UI functions
function showTab(tabName) {
    // Hide all tab contents
    document.getElementById('trackingTab').style.display = 'none';
    document.getElementById('statsTab').style.display = 'none';
    document.getElementById('achievementsTab').style.display = 'none';
    
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
    } else if (tabName === 'achievements') {
        document.getElementById('achievementsTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[2].classList.add('active');
        loadAchievements();
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
