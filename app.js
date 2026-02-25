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
    checkButtonCooldown();
    
    // Load saved achievement view
    const savedView = localStorage.getItem('achievementView') || 'global';
    currentAchievementView = savedView;
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
        const normalizedUsername = username.toLowerCase();
        
        // Check if username already exists (case-insensitive)
        const userDoc = await db.collection('users').doc(normalizedUsername).get();
        if (userDoc.exists) {
            showNotification('Користувач з таким іменем вже існує', 'error');
            return;
        }
        
        // Create new user with normalized username as document ID
        await db.collection('users').doc(normalizedUsername).set({
            username: username, // Store original username for display
            normalizedUsername: normalizedUsername, // Store normalized for lookups
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
        const normalizedUsername = username.toLowerCase();
        
        // Try to find user with normalized username first (new format)
        let userDoc = await db.collection('users').doc(normalizedUsername).get();
        let userData = null;
        
        if (userDoc.exists) {
            userData = userDoc.data();
        } else {
            // Try to find user with original username (old format)
            userDoc = await db.collection('users').doc(username).get();
            if (userDoc.exists) {
                userData = userDoc.data();
                
                // Migrate old user to new format
                await db.collection('users').doc(normalizedUsername).set({
                    username: username,
                    normalizedUsername: normalizedUsername,
                    password: userData.password,
                    createdAt: userData.createdAt,
                    mentionCount: userData.mentionCount || 0
                });
                
                // Delete old document
                await db.collection('users').doc(username).delete();
            }
        }
        
        if (!userData) {
            showNotification('Користувача не знайдено', 'error');
            return;
        }
        
        if (userData.password !== password) {
            showNotification('Невірний пароль', 'error');
            return;
        }
        
        // Use the original username from database for display
        currentUser = userData.username || username;
        localStorage.setItem('currentUser', currentUser);
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
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        
        // Check if user has clicked within the last 5 minutes (no timestamp filter to avoid index)
        const userMentionsQuery = await db.collection('userMentions')
            .where('mentionedBy', '==', currentUser)
            .get();
        
        // Find most recent mention by this user
        let recentMention = null;
        let recentTimestamp = null;
        
        userMentionsQuery.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp;
            
            if (timestamp) {
                const clickTime = timestamp.toDate();
                // Find the most recent mention regardless of time
                if (!recentTimestamp || clickTime > recentTimestamp) {
                    recentTimestamp = clickTime;
                    recentMention = data;
                }
            }
        });
        
        if (recentMention && recentTimestamp) {
            const timeDiff = now - recentTimestamp;
            
            // Only block if the last click was within 5 minutes
            if (timeDiff < 5 * 60 * 1000) {
                const timeLeft = 5 * 60 * 1000 - timeDiff;
                const secondsLeft = Math.ceil(timeLeft / 1000);
                const minutesLeft = Math.floor(secondsLeft / 60);
                const remainingSeconds = secondsLeft % 60;
                
                if (minutesLeft > 0) {
                    showNotification(`Зачекайте ще ${minutesLeft}:${remainingSeconds.toString().padStart(2, '0')} перед наступним кліком! ⏰`, 'error');
                } else {
                    showNotification(`Зачекайте ще ${remainingSeconds} секунд перед наступним кліком! ⏰`, 'error');
                }
                return;
            }
        }
        
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
        
        // Update user's total mention count (use normalized username for document ID)
        const normalizedCurrentUser = currentUser.toLowerCase();
        await db.collection('users').doc(normalizedCurrentUser).update({
            mentionCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Check if this is the first mention today (for streak tracking)
        const todayMentionDoc = await db.collection('mentions').doc(today).get();
        const isFirstMentionToday = !todayMentionDoc.exists;
        
        if (isFirstMentionToday) {
            // Create the day record for streak tracking (only if it doesn't exist)
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
        
        // Check personal achievements immediately after recording mention
        await checkPersonalAchievements(isFirstMentionToday);
        
        // Update streak count and today status
        setTimeout(() => {
            loadStreakCount();
            loadTodayStatus();
            loadDailyLegend();
            checkAchievements();
            checkButtonCooldown();
            checkDayGapAchievement();
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
    // Generate unique request ID to handle race conditions
    const requestId = ++currentStatsRequestId;
    
    try {
        const statsContainer = document.getElementById('userStats');
        const loadingIndicator = document.getElementById('statsLoading');
        
        // Show loading indicator
        statsContainer.innerHTML = '';
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        let usersList = [];
        
        if (currentStatsMode === 'today') {
            // Get today's mentions grouped by user
            const today = new Date().toDateString();
            const todayMentionsQuery = await db.collection('userMentions')
                .where('date', '==', today)
                .get();
            
            const todayUserCounts = {};
            todayMentionsQuery.forEach(doc => {
                const data = doc.data();
                const username = data.mentionedBy;
                
                if (!todayUserCounts[username]) {
                    todayUserCounts[username] = 0;
                }
                todayUserCounts[username]++;
            });
            
            // Convert to array and sort by today's count
            usersList = Object.entries(todayUserCounts)
                .map(([username, count]) => ({ username, mentionCount: count }))
                .sort((a, b) => b.mentionCount - a.mentionCount)
                .slice(0, 10);
                
        } else {
            // Get all-time stats
            const usersSnapshot = await db.collection('users')
                .orderBy('mentionCount', 'desc')
                .limit(10)
                .get();
                
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.mentionCount > 0) {
                    usersList.push(userData);
                }
            });
        }
        
        // Check if this request is still the most recent one
        if (requestId !== currentStatsRequestId) {
            // A newer request has been made, abandon this one
            return;
        }
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        if (usersList.length === 0) {
            statsContainer.innerHTML = '<p>Поки що немає статистики</p>';
            return;
        }
        
        // Get all personal achievements for badge display
        const personalAchievements = await db.collection('personalAchievements').get();
        const userBadges = {};
        
        personalAchievements.forEach(doc => {
            const data = doc.data();
            const username = data.username;
            const achievementId = data.achievementId;
            
            // Find the achievement to get its icon
            const achievement = PERSONAL_ACHIEVEMENTS.find(a => a.id === achievementId);
            if (achievement) {
                if (!userBadges[username]) {
                    userBadges[username] = [];
                }
                userBadges[username].push(achievement.icon);
            }
        });
        
        // Process users and get their personal streaks
        const userPromises = [];
        
        usersList.forEach(userData => {
            userPromises.push(getUserPersonalStreak(userData.username));
        });
        
        // Wait for all streak calculations to complete
        const userStreaks = await Promise.all(userPromises);
        
        // Check again if this request is still the most recent one
        if (requestId !== currentStatsRequestId) {
            // A newer request has been made, abandon this one
            return;
        }
        
        // Display users with their badges and streaks
        usersList.forEach((userData, index) => {
            const username = userData.username;
            const personalStreak = userStreaks[index];
            const badges = userBadges[username] || [];
            const badgesHtml = badges.length > 0 
                ? `<span class="user-badges">${badges.join('')}</span>` 
                : '';
            
            const streakHtml = personalStreak > 0 
                ? `<span class="personal-streak">🔥${personalStreak}</span>`
                : '';
            
            const statItem = document.createElement('div');
            statItem.className = 'user-stat-item';
            statItem.innerHTML = `
                <div class="username-with-badges">
                    <span class="username">${username}</span>
                    ${badgesHtml}
                    ${streakHtml}
                </div>
                <span class="count">${userData.mentionCount}</span>
            `;
            statsContainer.appendChild(statItem);
        });
        
        // Load charts after user stats
        await loadCharts();
        
    } catch (error) {
        console.error('Error loading user stats:', error);
        
        // Only show error if this is still the current request
        if (requestId === currentStatsRequestId) {
            const loadingIndicator = document.getElementById('statsLoading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            const statsContainer = document.getElementById('userStats');
            if (statsContainer) {
                statsContainer.innerHTML = '<p>Помилка завантаження статистики</p>';
            }
        }
    }
}

async function loadCharts() {
    try {
        await Promise.all([
            loadDailyChart(),
            loadHourlyChart()
        ]);
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

async function loadDailyChart() {
    try {
        // Get all userMentions grouped by date
        const allUserMentions = await db.collection('userMentions').get();
        const dailyCounts = {};
        
        // Count mentions per day
        allUserMentions.forEach(doc => {
            const data = doc.data();
            const date = data.date;
            
            if (!dailyCounts[date]) {
                dailyCounts[date] = 0;
            }
            dailyCounts[date]++;
        });
        
        // Sort dates and get last 14 days of data
        const sortedDates = Object.keys(dailyCounts).sort((a, b) => new Date(a) - new Date(b));
        const last14Days = sortedDates.slice(-14);
        
        const canvas = document.getElementById('dailyChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Chart dimensions
        const padding = 60;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);
        
        // Find max count for scaling
        const maxCount = Math.max(...last14Days.map(date => dailyCounts[date] || 0));
        const yScale = chartHeight / (maxCount || 1);
        const xStep = chartWidth / (last14Days.length - 1 || 1);
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i * chartHeight / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }
        
        // Draw chart line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        last14Days.forEach((date, index) => {
            const count = dailyCounts[date] || 0;
            const x = padding + (index * xStep);
            const y = padding + chartHeight - (count * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#667eea';
        last14Days.forEach((date, index) => {
            const count = dailyCounts[date] || 0;
            const x = padding + (index * xStep);
            const y = padding + chartHeight - (count * yScale);
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // X-axis labels (dates)
        last14Days.forEach((date, index) => {
            const x = padding + (index * xStep);
            const shortDate = new Date(date).toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });
            ctx.fillText(shortDate, x, canvas.height - 20);
        });
        
        // Y-axis labels (counts)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = Math.round((maxCount * i) / 5);
            const y = padding + chartHeight - (i * chartHeight / 5) + 4;
            ctx.fillText(value.toString(), padding - 10, y);
        }
        
    } catch (error) {
        console.error('Error loading daily chart:', error);
    }
}

async function loadHourlyChart() {
    try {
        // Get all userMentions and extract hours
        const allUserMentions = await db.collection('userMentions').get();
        const hourlyCounts = new Array(24).fill(0);
        
        // Count mentions per hour
        allUserMentions.forEach(doc => {
            const data = doc.data();
            if (data.timestamp) {
                const hour = data.timestamp.toDate().getHours();
                hourlyCounts[hour]++;
            }
        });
        
        const canvas = document.getElementById('hourlyChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Chart dimensions
        const padding = 60;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);
        
        const maxCount = Math.max(...hourlyCounts);
        const barWidth = chartWidth / 24;
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i * chartHeight / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }
        
        // Draw bars
        hourlyCounts.forEach((count, hour) => {
            const barHeight = (count / (maxCount || 1)) * chartHeight;
            const x = padding + (hour * barWidth);
            const y = padding + chartHeight - barHeight;
            
            // Gradient for bars
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#a8e6cf');
            gradient.addColorStop(1, '#56ab2f');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
        });
        
        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        
        // X-axis labels (hours)
        for (let hour = 0; hour < 24; hour += 2) {
            const x = padding + (hour * barWidth) + (barWidth / 2);
            ctx.fillText(`${hour}:00`, x, canvas.height - 20);
        }
        
        // Y-axis labels (counts)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = Math.round((maxCount * i) / 5);
            const y = padding + chartHeight - (i * chartHeight / 5) + 4;
            ctx.fillText(value.toString(), padding - 10, y);
        }
        
    } catch (error) {
        console.error('Error loading hourly chart:', error);
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
        
        // Get all mentions for today
        const todayMentionsQuery = await db.collection('userMentions')
            .where('date', '==', today)
            .get();
        
        const legendElement = document.getElementById('dailyLegend');
        
        if (!todayMentionsQuery.empty) {
            // Find the earliest mention by comparing timestamps
            let earliestMention = null;
            let earliestTimestamp = null;
            
            todayMentionsQuery.forEach(doc => {
                const data = doc.data();
                const timestamp = data.timestamp;
                
                if (timestamp && (!earliestTimestamp || timestamp.toMillis() < earliestTimestamp.toMillis())) {
                    earliestTimestamp = timestamp;
                    earliestMention = data;
                }
            });
            
            if (earliestMention && earliestTimestamp) {
                const firstMentioner = earliestMention.mentionedBy;
                const clickTime = earliestTimestamp.toDate();
                const timeString = clickTime.toLocaleTimeString('uk-UA', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                legendElement.innerHTML = `Легенда дня: ${firstMentioner} 👑<br>Згадано о ${timeString}`;
            } else {
                legendElement.textContent = 'Будь першою хто згадав сьогодні!';
            }
        } else {
            legendElement.textContent = 'Будь першою хто згадав сьогодні!';
        }
        
    } catch (error) {
        console.error('Error loading daily legend:', error);
        document.getElementById('dailyLegend').textContent = 'Будь першою хто згадав сьогодні!';
    }
}

async function checkButtonCooldown() {
    if (!currentUser) return;
    
    try {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        // Get all mentions by this user (no timestamp filter to avoid index requirement)
        const userMentionsQuery = await db.collection('userMentions')
            .where('mentionedBy', '==', currentUser)
            .get();
        
        const button = document.querySelector('.yes-button');
        const cooldownMessage = document.getElementById('cooldownMessage');
        if (!button) return;
        
        // Find most recent mention by this user (regardless of when)
        let mostRecentMention = null;
        let mostRecentTimestamp = null;
        
        userMentionsQuery.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp;
            
            if (timestamp) {
                const clickTime = timestamp.toDate();
                
                // Find the most recent mention regardless of time
                if (!mostRecentTimestamp || clickTime > mostRecentTimestamp) {
                    mostRecentTimestamp = clickTime;
                    mostRecentMention = data;
                }
            }
        });
        
        if (mostRecentMention && mostRecentTimestamp) {
            const timeDiff = now - mostRecentTimestamp;
            const timeLeft = 5 * 60 * 1000 - timeDiff; // 5 minutes in milliseconds
            
            // Only show cooldown if the last click was within 5 minutes
            if (timeLeft > 0 && timeDiff < 5 * 60 * 1000) {
                const totalSecondsLeft = Math.ceil(timeLeft / 1000);
                const minutesLeft = Math.floor(totalSecondsLeft / 60);
                const secondsLeft = totalSecondsLeft % 60;
                
                // Show countdown in button
                if (minutesLeft > 0) {
                    button.textContent = `⏰ ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
                } else {
                    button.textContent = `⏰ ${secondsLeft}с`;
                }
                
                // Disable button and show message
                button.disabled = true;
                cooldownMessage.style.display = 'block';
                
                // Set timeout to re-check button state
                setTimeout(() => {
                    checkButtonCooldown();
                }, 1000); // Check every second for precise countdown
                
                return;
            }
        }
        
        // Enable button and hide message (no recent mentions or cooldown expired)
        button.disabled = false;
        button.textContent = 'Так! 🎉';
        cooldownMessage.style.display = 'none';
        
    } catch (error) {
        console.error('Error checking button cooldown:', error);
        // Fallback: enable button
        const button = document.querySelector('.yes-button');
        if (button) {
            button.disabled = false;
            button.textContent = 'Так! 🎉';
        }
    }
}

async function checkDayGapAchievement() {
    try {
        // Check if sad achievement is already unlocked
        const achievementDoc = await db.collection('achievements').doc('nobody_remembered').get();
        if (achievementDoc.exists) {
            return; // Already unlocked
        }
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        
        // Get all mentions (no orderBy to avoid index requirement)
        const allMentionsQuery = await db.collection('userMentions')
            .get();
        
        if (allMentionsQuery.empty) {
            return; // No mentions yet
        }
        
        const mentions = [];
        allMentionsQuery.forEach(doc => {
            const data = doc.data();
            if (data.timestamp) {
                mentions.push({
                    date: data.date,
                    timestamp: data.timestamp.toDate()
                });
            }
        });
        
        // Sort by timestamp ascending to check chronologically
        mentions.sort((a, b) => a.timestamp - b.timestamp);
        
        // Check for gaps of more than 24 hours between consecutive mentions
        for (let i = 1; i < mentions.length; i++) {
            const currentMention = mentions[i];
            const previousMention = mentions[i - 1];
            
            const timeDiff = currentMention.timestamp - previousMention.timestamp;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // If gap is more than 24 hours, unlock the sad achievement
            if (hoursDiff > 24) {
                await db.collection('achievements').doc('nobody_remembered').set({
                    achievementId: 'nobody_remembered',
                    unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    unlockedDate: new Date().toLocaleDateString('uk-UA'),
                    gapStart: previousMention.date,
                    gapEnd: currentMention.date,
                    hoursBetween: Math.floor(hoursDiff)
                });
                
                // Show a sad notification
                setTimeout(() => {
                    showNotification('😢 Досягнення відкрито: "Його ніхто не згадав"', 'success');
                }, 2000);
                
                break;
            }
        }
        
    } catch (error) {
        console.error('Error checking day gap achievement:', error);
    }
}

// Global variables for achievements
let currentAchievementView = 'global';

// Global variables for stats
let currentStatsMode = 'allTime';
let currentStatsRequestId = 0;

// Global achievements system
const GLOBAL_ACHIEVEMENTS = [
    {
        id: 'sinabon',
        icon: '🧁',
        title: 'Сінабон',
        description: 'Досягніть 1 день страйку',
        requirement: { type: 'streak', value: 1 }
    },
    {
        id: 'cocoa',
        icon: '☕',
        title: 'Какао',
        description: 'Досягніть 5 днів страйку',
        requirement: { type: 'streak', value: 5 }
    },
    {
        id: 'currant_tea',
        icon: '🫖',
        title: 'Горнятко чаю зі смородиною',
        description: 'Досягніть 10 днів страйку',
        requirement: { type: 'streak', value: 10 }
    },
    {
        id: 'bergamot_tea',
        icon: '🍵',
        title: 'Чай чорний з бергамотом',
        description: 'Досягніть 20 днів страйку',
        requirement: { type: 'streak', value: 20 }
    },
    {
        id: 'herbal_potion',
        icon: '🌿',
        title: 'Зілля-мазілля',
        description: 'Досягніть 30 днів страйку',
        requirement: { type: 'streak', value: 30 }
    },
    {
        id: 'everyone_loves',
        icon: '❤️',
        title: 'Всі люблять Михайла',
        description: '5 різних людей натиснули протягом дня кнопку',
        requirement: { type: 'daily_users', value: 5 }
    },
    {
        id: 'ring_lord',
        icon: '💍',
        title: 'Володар перснів',
        description: 'Натиснути кнопку 24 рази протягом одного дня (сумарно серед усіх людей)',
        requirement: { type: 'daily_total_clicks', value: 24 }
    },
    {
        id: 'nobody_remembered',
        icon: '😢',
        title: 'Його ніхто не згадав',
        description: 'Протягом дня ніхто не згадав Михайла (краще не відкривати)',
        requirement: { type: 'day_gap', value: 1 }
    }
];

// Personal achievements system (excluding group achievements)
const PERSONAL_ACHIEVEMENTS = [
    {
        id: 'personal_sinabon',
        icon: '🧁',
        title: 'Сінабон',
        description: 'Досягніть 1 день страйку',
        requirement: { type: 'streak', value: 1 }
    },
    {
        id: 'personal_cocoa',
        icon: '☕',
        title: 'Какао',
        description: 'Досягніть 5 днів страйку',
        requirement: { type: 'streak', value: 5 }
    },
    {
        id: 'personal_currant_tea',
        icon: '🫖',
        title: 'Горнятко чаю зі смородиною',
        description: 'Досягніть 10 днів страйку',
        requirement: { type: 'streak', value: 10 }
    },
    {
        id: 'personal_bergamot_tea',
        icon: '🍵',
        title: 'Чай чорний з бергамотом',
        description: 'Досягніть 20 днів страйку',
        requirement: { type: 'streak', value: 20 }
    },
    {
        id: 'personal_herbal_potion',
        icon: '🌿',
        title: 'Зілля-мазілля',
        description: 'Досягніть 30 днів страйку',
        requirement: { type: 'streak', value: 30 }
    },
    {
        id: 'personal_forgot_mykhailo',
        icon: '😢',
        title: 'Ти забув про Михайла',
        description: 'Не згадати Михайла протягом дня (краще не відкривати)',
        requirement: { type: 'personal_day_skip', value: 1 }
    },
    {
        id: 'legend',
        icon: '⚡',
        title: 'Легенда',
        description: 'Найшвидше згадати Михайла (стати легендою дня)',
        requirement: { type: 'daily_first', value: 1 }
    },
    {
        id: 'fanatic',
        icon: '🔥',
        title: 'Фанат',
        description: 'Три рази найшвидше згадати Михайла',
        requirement: { type: 'daily_first', value: 3 }
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
        
        const totalClicksToday = todayMentions.size;
        
        // Check each achievement
        for (const achievement of GLOBAL_ACHIEVEMENTS) {
            const achievementDoc = await db.collection('achievements').doc(achievement.id).get();
            
            let isUnlocked = false;
            
            if (achievement.requirement.type === 'streak') {
                isUnlocked = currentStreak >= achievement.requirement.value;
            } else if (achievement.requirement.type === 'daily_users') {
                isUnlocked = uniqueUsersToday.size >= achievement.requirement.value;
            } else if (achievement.requirement.type === 'daily_total_clicks') {
                isUnlocked = totalClicksToday >= achievement.requirement.value;
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

async function getCurrentStreak() {
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
        
        return streak;
    } catch (error) {
        console.error('Error calculating streak:', error);
        return 0;
    }
}

async function getUserPersonalStreak(username) {
    try {
        let streak = 0;
        const today = new Date();
        let currentDate = new Date(today);
        
        // Check consecutive days backwards for this specific user
        while (true) {
            const dateString = currentDate.toDateString();
            
            // Check if this user mentioned on this day
            const userMentionsQuery = await db.collection('userMentions')
                .where('mentionedBy', '==', username)
                .where('date', '==', dateString)
                .limit(1)
                .get();
            
            if (!userMentionsQuery.empty) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    } catch (error) {
        console.error('Error calculating user personal streak:', error);
        return 0;
    }
}

async function checkPersonalAchievements(userWasFirstToday = false) {
    if (!currentUser) return;
    
    try {
        // Get current streak directly from database (not DOM)
        const currentStreak = await getCurrentStreak();
        
        // Get user's daily first count (how many times they were first in the past)
        const userDailyFirstCount = await getUserDailyFirstCount();
        
        // For Legend achievement, check if user was first today OR their past count
        const legendCount = userWasFirstToday ? userDailyFirstCount + 1 : userDailyFirstCount;
        
        // Check each personal achievement
        for (const achievement of PERSONAL_ACHIEVEMENTS) {
            const achievementDoc = await db.collection('personalAchievements').doc(`${currentUser}_${achievement.id}`).get();
            
            let isUnlocked = false;
            
            if (achievement.requirement.type === 'streak') {
                isUnlocked = currentStreak >= achievement.requirement.value;
            } else if (achievement.requirement.type === 'daily_first') {
                // Use legendCount which includes today's first mention if applicable
                isUnlocked = legendCount >= achievement.requirement.value;
            } else if (achievement.requirement.type === 'personal_day_skip') {
                isUnlocked = await checkPersonalDaySkip();
            }
            
            // If achievement is unlocked and not yet recorded
            if (isUnlocked && !achievementDoc.exists) {
                await db.collection('personalAchievements').doc(`${currentUser}_${achievement.id}`).set({
                    achievementId: achievement.id,
                    username: currentUser,
                    unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    unlockedDate: new Date().toLocaleDateString('uk-UA')
                });
                
                // Show notification for unlocked achievement
                showNotification(`Досягнення відкрито: ${achievement.title} ${achievement.icon}`, 'success');
            }
        }
        
    } catch (error) {
        console.error('Error checking personal achievements:', error);
    }
}

async function getUserDailyFirstCount() {
    try {
        // Since mentions collection now correctly stores firstMentionBy without overwriting,
        // we can simply count how many times this user was the daily legend
        const allMentions = await db.collection('mentions').get();
        let dailyFirstCount = 0;
        
        allMentions.forEach(doc => {
            const data = doc.data();
            if (data.firstMentionBy === currentUser) {
                dailyFirstCount++;
            }
        });
        
        return dailyFirstCount;
    } catch (error) {
        console.error('Error getting daily first count:', error);
        return 0;
    }
}

async function checkPersonalDaySkip() {
    try {
        // Check if this user has skipped any days (day-based, not 24-hour based)
        const userMentions = await db.collection('userMentions')
            .where('mentionedBy', '==', currentUser)
            .get();
        
        if (userMentions.empty) {
            return false; // No mentions yet, can't have skipped
        }
        
        // Get all dates this user mentioned (as date strings)
        const mentionDates = new Set();
        userMentions.forEach(doc => {
            const data = doc.data();
            if (data.date) {
                mentionDates.add(data.date);
            }
        });
        
        // Convert to sorted array of actual Date objects for easier comparison
        const sortedDates = Array.from(mentionDates)
            .map(dateStr => new Date(dateStr))
            .sort((a, b) => a - b);
        
        if (sortedDates.length < 2) {
            return false; // Need at least 2 mention days to have a gap
        }
        
        // Check for gaps of more than 1 day between consecutive mention days
        for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = sortedDates[i - 1];
            const currDate = sortedDates[i];
            
            // Calculate difference in days (not hours)
            const timeDiff = currDate - prevDate;
            const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            
            // If there's a gap of more than 1 day, user forgot Mykhailo
            if (daysDiff > 1) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking personal day skip:', error);
        return false;
    }
}

function switchAchievements(type) {
    currentAchievementView = type;
    localStorage.setItem('achievementView', type);
    
    // Update button states
    document.querySelectorAll('.switcher-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (type === 'global') {
        document.querySelectorAll('.switcher-btn')[0].classList.add('active');
    } else {
        document.querySelectorAll('.switcher-btn')[1].classList.add('active');
    }
    
    // Reload achievements
    loadAchievements();
}

async function loadAchievements() {
    try {
        const achievementsContainer = document.getElementById('achievementsList');
        achievementsContainer.innerHTML = '';
        
        const achievements = currentAchievementView === 'global' ? GLOBAL_ACHIEVEMENTS : PERSONAL_ACHIEVEMENTS;
        const collectionName = currentAchievementView === 'global' ? 'achievements' : 'personalAchievements';
        
        // Get unlocked achievements
        let unlockedAchievements;
        if (currentAchievementView === 'global') {
            unlockedAchievements = await db.collection(collectionName).get();
        } else {
            // For personal achievements, filter by current user
            unlockedAchievements = await db.collection(collectionName)
                .where('username', '==', currentUser)
                .get();
        }
        
        const unlockedIds = new Set();
        const unlockedData = {};
        
        unlockedAchievements.forEach(doc => {
            const data = doc.data();
            if (currentAchievementView === 'personal') {
                // Extract achievement ID from document ID (format: "username_achievementId")
                const achievementId = data.achievementId;
                unlockedIds.add(achievementId);
                unlockedData[achievementId] = data;
            } else {
                unlockedIds.add(doc.id);
                unlockedData[doc.id] = data;
            }
        });
        
        // Create achievement items
        for (const achievement of achievements) {
            const isUnlocked = unlockedIds.has(achievement.id);
            const isSadAchievement = achievement.id === 'nobody_remembered' || achievement.id === 'personal_nobody_remembered';
            
            const achievementEl = document.createElement('div');
            let className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            if (isSadAchievement && isUnlocked) {
                className += ' sad';
            }
            achievementEl.className = className;
            
            let statusText = isUnlocked 
                ? `Відкрито: ${unlockedData[achievement.id].unlockedDate}`
                : 'Заблоковано';
            
            // Add extra info for sad achievement
            if (isSadAchievement && isUnlocked && unlockedData[achievement.id].hoursBetween) {
                statusText += ` (${unlockedData[achievement.id].hoursBetween} годин пропуску)`;
            }
            
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
        
        // Set the correct button state based on saved stats mode
        const savedStatsMode = localStorage.getItem('statsMode') || 'allTime';
        currentStatsMode = savedStatsMode;
        
        document.querySelectorAll('.stats-switcher .switcher-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (savedStatsMode === 'allTime') {
            document.querySelector('.stats-switcher .switcher-btn:first-child').classList.add('active');
        } else {
            document.querySelector('.stats-switcher .switcher-btn:last-child').classList.add('active');
        }
        
        loadUserStats();
    } else if (tabName === 'achievements') {
        document.getElementById('achievementsTab').style.display = 'block';
        document.querySelectorAll('.tab-button')[2].classList.add('active');
        
        // Set the correct button state based on saved view
        const savedView = localStorage.getItem('achievementView') || 'global';
        currentAchievementView = savedView;
        
        document.querySelectorAll('.switcher-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (savedView === 'global') {
            document.querySelectorAll('.switcher-btn')[0].classList.add('active');
        } else {
            document.querySelectorAll('.switcher-btn')[1].classList.add('active');
        }
        
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
    checkButtonCooldown();
}

function clearForm() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function switchStatsMode(mode) {
    currentStatsMode = mode;
    localStorage.setItem('statsMode', mode);
    
    // Update button states
    document.querySelectorAll('.stats-switcher .switcher-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'allTime') {
        document.querySelector('.stats-switcher .switcher-btn:first-child').classList.add('active');
    } else {
        document.querySelector('.stats-switcher .switcher-btn:last-child').classList.add('active');
    }
    
    // Reload user stats with new mode
    loadUserStats();
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
