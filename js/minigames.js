/**
 * Minigames Module for Misha Tracker
 * Organized daily challenges and interactive games
 */

// Minigame state management
let currentMinigame = null;
let minigameProgress = {};

// Initialize minigames system
function initializeMinigames() {
    loadMinigameProgress();
    setupMinigameTab();
}

// Load user's minigame progress from localStorage
function loadMinigameProgress() {
    try {
        const saved = localStorage.getItem('minigame_progress');
        if (saved) {
            minigameProgress = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading minigame progress:', error);
        minigameProgress = {};
    }
}

// Save minigame progress
function saveMinigameProgress() {
    try {
        localStorage.setItem('minigame_progress', JSON.stringify(minigameProgress));
    } catch (error) {
        console.error('Error saving minigame progress:', error);
    }
}

// Setup minigames tab content
async function setupMinigameTab() {
    const minigamesContainer = document.getElementById('minigamesContainer');
    if (!minigamesContainer) return;

    const mazeStatusHtml = await getMazeStatus();

    minigamesContainer.innerHTML = `
        <div class="minigames-header">
            <h2>🎮 Щоденні Міні-Ігри</h2>
            <p>Допоможи Михайлу в його пригодах!</p>
        </div>
        
        <div class="daily-challenges">
           <div class="challenge-card available">
                <div class="challenge-icon">🐍</div>
                <div class="challenge-info">
                    <h3>Михайло збирає зілля</h3>
                    <p>Допоможи зібрати ☕ чай, 🍫 какао та 🌿 зілля-мазілля</p>
                    <div class="challenge-buttons">
                        <div class="challenge-status" onclick="startSnakeGame()">▶️ Грати</div>
                        <div class="records-status" onclick="showSnakeLeaderboard()">🏆 Рекорди</div>
                    </div>
                </div>
            </div>

            <div class="challenge-card available">
                <div class="challenge-icon">🧭</div>
                <div class="challenge-info">
                    <h3>Лабіринт дня</h3>
                    <p>Допоможи Михайлу дістатитись Краківської</p>
                    <div class="challenge-buttons">
                        <div class="challenge-status" onclick="startMazeGame()" id="mazeStatus">${mazeStatusHtml}</div>
                        <div class="records-status" onclick="showMazeLeaderboard()">🏆 Рекорди</div>
                    </div>
                </div>
            </div>
            
            <div class="challenge-card coming-soon">
                <div class="challenge-icon">🎯</div>
                <div class="challenge-info">
                    <h3>Пам'ять</h3>
                    <p>Знайди пари українських символів</p>
                    <div class="challenge-status">Незабаром...</div>
                </div>
            </div>
            
            <div class="challenge-card coming-soon">
                <div class="challenge-icon">🔤</div>
                <div class="challenge-info">
                    <h3>Словесні Сходи</h3>
                    <p>Перетвори "Михайло" на інші слова</p>
                    <div class="challenge-status">Незабаром...</div>
                </div>
            </div>
        </div>
        
        <div id="gameArea" class="game-area" style="display: none;">
            <!-- Game content will be inserted here -->
        </div>
    `;
}

// Get today's maze completion status
async function getMazeStatus() {
    const today = new Date().toDateString();
    const completionData = await getUserMazeCompletion(today);

    if (completionData) {
        const timeText = completionData.completionTime ? ` за ${completionData.completionTime}с` : '';
        return `<span>✅ Пройдено${timeText}</span>`;
    } else {
        return '<span class="not-started">▶️ Почати</span>';
    }
}

// Update challenge status display
function updateChallengeStatus(gameType, status) {
    const statusElement = document.getElementById(`${gameType}Status`);
    if (statusElement) {
        statusElement.innerHTML = status;
    }
}

// Snake game leaderboard
function showSnakeLeaderboard() {
    // Create leaderboard modal
    const existingModal = document.getElementById('snakeLeaderboardModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'snakeLeaderboardModal';
    modal.className = 'game-over-modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10000';

    modal.innerHTML = `
        <div class="modal-content leaderboard-modal-content">
            <h3>🏆 Рекорди змійки</h3>
            <div class="leaderboard-switcher">
                <button id="scoreLeaderboardBtn" class="switcher-btn active" onclick="showScoreLeaderboard()">Очки</button>
                <button id="lengthLeaderboardBtn" class="switcher-btn" onclick="showLengthLeaderboard()">Довжина</button>
            </div>
            <div id="leaderboardContent" class="leaderboard-content">
                <div class="loading">Завантаження...</div>
            </div>
            <div class="modal-buttons">
                <button onclick="closeSnakeLeaderboard()" class="close-btn">Закрити</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load score leaderboard by default
    loadScoreLeaderboard();
}

function closeSnakeLeaderboard() {
    const modal = document.getElementById('snakeLeaderboardModal');
    if (modal) {
        modal.remove();
    }
}

function showScoreLeaderboard() {
    document.getElementById('scoreLeaderboardBtn').classList.add('active');
    document.getElementById('lengthLeaderboardBtn').classList.remove('active');
    loadScoreLeaderboard();
}

function showLengthLeaderboard() {
    document.getElementById('lengthLeaderboardBtn').classList.add('active');
    document.getElementById('scoreLeaderboardBtn').classList.remove('active');
    loadLengthLeaderboard();
}

async function loadScoreLeaderboard() {
    const content = document.getElementById('leaderboardContent');
    if (!content) return;

    content.innerHTML = '<div class="loading">Завантаження рекордів...</div>';

    try {
        const leaderboard = await getSnakeLeaderboard('score');
        displayLeaderboard(leaderboard, 'score');
    } catch (error) {
        console.log('Could not load leaderboard from Firebase:', error);
        content.innerHTML = `
            <div class="error-message">
                <p>Не вдалося завантажити рекорди</p>
                <p>Спробуйте пізніше</p>
            </div>
        `;
    }
}

async function loadLengthLeaderboard() {
    const content = document.getElementById('leaderboardContent');
    if (!content) return;

    content.innerHTML = '<div class="loading">Завантаження рекордів...</div>';

    try {
        const leaderboard = await getSnakeLeaderboard('length');
        displayLeaderboard(leaderboard, 'length');
    } catch (error) {
        console.log('Could not load leaderboard from Firebase:', error);
        content.innerHTML = `
            <div class="error-message">
                <p>Не вдалося завантажити рекорди</p>
                <p>Спробуйте пізніше</p>
            </div>
        `;
    }
}

function displayLeaderboard(leaderboard, type) {
    console.log('displayLeaderboard called with:', { leaderboard, type });
    const content = document.getElementById('leaderboardContent');
    console.log('leaderboardContent element:', content);

    if (!content) {
        console.error('leaderboardContent element not found');
        return;
    }

    if (!leaderboard) {
        console.log('leaderboard is null/undefined');
    } else {
        console.log('leaderboard length:', leaderboard.length);
        console.log('leaderboard data:', leaderboard);
    }

    if (!content || !leaderboard || leaderboard.length === 0) {
        console.log('Showing no records message');
        content.innerHTML = `
            <div class="no-records">
                <p>Поки що немає рекордів</p>
                <p>Станьте першим! 🎮</p>
            </div>
        `;
        return;
    }

    const currentUser = getCurrentUser();
    let html = '<div class="leaderboard-list">';

    leaderboard.forEach((record, index) => {
        const rank = index + 1;
        const isCurrentUser = record.username === currentUser;
        const value = type === 'score' ? record.maxScore : record.maxLength;
        const label = type === 'score' ? 'очок' : 'сегментів';

        let rankIcon = `${rank}`;
        if (rank === 1) rankIcon = '🥇';
        else if (rank === 2) rankIcon = '🥈';
        else if (rank === 3) rankIcon = '🥉';

        html += `
            <div class="leaderboard-entry ${rank <= 3 ? 'top-three' : ''} ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank">${rankIcon}</div>
                <div class="player-info">
                    <div class="player-name">${record.username}${isCurrentUser ? ' (ви)' : ''}</div>
                    <div class="player-score">${value} ${label}</div>
                </div>
                ${record.achievedAt ? `<div class="achievement-date">${formatDate(record.achievedAt)}</div>` : ''}
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сьогодні';
    if (diffDays === 1) return 'Вчора';
    if (diffDays < 7) return `${diffDays} днів тому`;

    return date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short'
    });
}

// Firebase functions for snake leaderboard
async function getSnakeLeaderboard(type = 'score') {
    try {
        console.log('Fetching snake leaderboard for type:', type);
        const orderByField = type === 'score' ? 'maxScore' : 'maxLength';

        const snapshot = await firebase.firestore()
            .collection('snakeHighScores')
            .orderBy(orderByField, 'desc')
            .limit(10)
            .get();

        console.log('Firebase snapshot size:', snapshot.size);
        console.log('Firebase snapshot docs:', snapshot.docs);

        const leaderboardData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Document data:', doc.id, data);
            return {
                username: data.username,
                maxScore: data.maxScore || 0,
                maxLength: data.maxLength || 0,
                achievedAt: data.lastUpdated || data.timestamp
            };
        });

        console.log('Processed leaderboard data:', leaderboardData);
        return leaderboardData;
    } catch (error) {
        console.error('Error fetching snake leaderboard:', error);
        throw error;
    }
}

async function saveSnakeHighScoresToFirebase(username, maxScore, maxLength) {
    try {
        const docRef = firebase.firestore()
            .collection('snakeHighScores')
            .doc(username);

        const doc = await docRef.get();
        const now = Date.now();

        if (doc.exists) {
            const currentData = doc.data();
            const updateData = {
                lastUpdated: now
            };

            // Only update if new scores are higher
            if (maxScore > (currentData.maxScore || 0)) {
                updateData.maxScore = maxScore;
            }
            if (maxLength > (currentData.maxLength || 0)) {
                updateData.maxLength = maxLength;
            }

            // Only update if there are actual changes
            if (updateData.maxScore !== undefined || updateData.maxLength !== undefined) {
                await docRef.update(updateData);
                console.log('Snake high scores updated in Firebase');
                return true;
            }
        } else {
            // Create new document
            await docRef.set({
                username: username,
                maxScore: maxScore,
                maxLength: maxLength,
                timestamp: now,
                lastUpdated: now
            });
            console.log('Snake high scores created in Firebase');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving snake high scores to Firebase:', error);
        throw error;
    }
}

// Debug function to create test data
async function createTestSnakeData() {
    try {
        console.log('Creating test snake data...');
        await firebase.firestore().collection('snakeHighScores').doc('testuser1').set({
            username: 'testuser1',
            maxScore: 150,
            maxLength: 8,
            timestamp: Date.now(),
            lastUpdated: Date.now()
        });

        await firebase.firestore().collection('snakeHighScores').doc('testuser2').set({
            username: 'testuser2',
            maxScore: 120,
            maxLength: 6,
            timestamp: Date.now(),
            lastUpdated: Date.now()
        });

        console.log('Test data created successfully');
    } catch (error) {
        console.error('Error creating test data:', error);
    }
}

// Debug function to clean up test data
async function cleanupTestSnakeData() {
    try {
        console.log('Cleaning up test snake data...');
        await firebase.firestore().collection('snakeHighScores').doc('testuser1').delete();
        await firebase.firestore().collection('snakeHighScores').doc('testuser2').delete();
        console.log('Test data cleaned up successfully');
    } catch (error) {
        console.error('Error cleaning up test data:', error);
    }
}

// Run cleanup once to remove test data (comment out after running)
// cleanupTestSnakeData();

// Uncomment to create test data once
// createTestSnakeData();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMinigames);
} else {
    initializeMinigames();
}
