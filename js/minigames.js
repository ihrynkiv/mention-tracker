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
            <div class="challenge-card coming-soon">
                <div class="challenge-icon">🧭</div>
                <div class="challenge-info">
                    <h3>Лабіринт дня</h3>
                    <p>Допоможи Михайлу дістатитись Краківської</p>
                    <div class="challenge-status">Незабаром...</div>
                </div>
            </div>
            
            <div class="challenge-card coming-soon">
                <div class="challenge-icon">🐍</div>
                <div class="challenge-info">
                    <h3>Михайло збирає зілля</h3>
                    <p>Допоможи зібрати ☕ чай, 🍫 какао та 🌿 зілля-мазілля</p>
                    <div class="challenge-status">Незабаром...</div>
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
        return `<span class="completed">✅ Пройдено${timeText}</span>`;
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMinigames);
} else {
    initializeMinigames();
}
