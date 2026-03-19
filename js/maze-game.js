/**
 * Daily Maze Game - "Допоможи Михайлу дістатитись Краківської"
 * Date-seeded maze generation for daily consistency
 */

// Firebase integration for maze completion
async function checkMazeCompletion(dateString) {
    if (!currentUser) return false;

    try {
        const docId = `${dateString}_${currentUser}`;
        const doc = await db.collection('mazeCompletions').doc(docId).get();
        return doc.exists;
    } catch (error) {
        console.error('Error checking maze completion:', error);
        return false;
    }
}

async function saveMazeCompletion(dateString, completionData) {
    if (!currentUser) return;

    try {
        const docId = `${dateString}_${currentUser}`;
        await db.collection('mazeCompletions').doc(docId).set({
            username: currentUser,
            date: dateString,
            completionTime: completionData.time,
            moves: completionData.moves,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Maze completion saved to Firebase');
    } catch (error) {
        console.error('Error saving maze completion:', error);
    }
}

async function getTodaysMazeLeaderboard(dateString) {
    try {
        const completions = await db.collection('mazeCompletions')
            .where('date', '==', dateString)
            .orderBy('completionTime')
            .limit(10)
            .get();

        const leaderboard = [];
        completions.forEach(doc => {
            leaderboard.push(doc.data());
        });

        return leaderboard;
    } catch (error) {
        console.error('Error fetching maze leaderboard:', error);
        return [];
    }
}

// Get user's maze completion data from Firebase
async function getUserMazeCompletion(dateString) {
    if (!currentUser) return null;

    try {
        const docId = `${dateString}_${currentUser}`;
        const doc = await db.collection('mazeCompletions').doc(docId).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user maze completion:', error);
        return null;
    }
}

// Check and award maze completion achievement
async function checkMazeCompletionAchievement() {
    if (!currentUser) return;

    try {
        // Check if user already has this achievement
        const achievementId = `${currentUser}_personal_maze_completion`;
        const achievementDoc = await db.collection('personalAchievements').doc(achievementId).get();

        if (!achievementDoc.exists) {
            // Award the achievement
            await db.collection('personalAchievements').doc(achievementId).set({
                username: currentUser,
                achievementId: 'maze_completion',
                unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                unlockedDate: new Date().toLocaleDateString('uk-UA')
            });

            showNotification('🏆 Досягнення відкрито: Дістався Краківської!', 'success');
        }
    } catch (error) {
        console.error('Error checking maze completion achievement:', error);
    }
}

// Maze game state
let mazeGame = {
    width: 15,
    height: 15,
    maze: null,
    playerPos: null,
    targetPos: null,
    startTime: null,
    moves: 0,
    gameActive: false
};

// Simple hash function for date-based seeding
function hashDate(dateString) {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Seeded random number generator
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

// Generate daily maze using date as seed
function generateDailyMaze() {
    const today = new Date().toDateString();
    const seed = hashDate(today);
    const rng = new SeededRandom(seed);

    const { width, height } = mazeGame;
    const maze = Array(height).fill(null).map(() => Array(width).fill(1)); // 1 = wall

    // Recursive backtracking maze generation
    function carve(x, y) {
        maze[y][x] = 0; // 0 = path

        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0] // North, East, South, West
        ];

        // Shuffle directions using seeded random
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height && maze[ny][nx] === 1) {
                maze[y + dy/2][x + dx/2] = 0; // Carve connecting path
                carve(nx, ny);
            }
        }
    }

    // Start carving from (1,1) to ensure odd coordinates
    carve(1, 1);

    // Ensure start and end are accessible
    maze[1][1] = 0; // Start position
    maze[height-2][width-2] = 0; // End position

    return maze;
}

// Start the maze game
async function startMazeGame() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    // Check if user already completed today's maze
    const today = new Date().toDateString();
    const hasCompleted = await checkMazeCompletion(today);

    if (hasCompleted) {
        showMazeLeaderboard();
        return;
    }

    // Generate today's maze
    mazeGame.maze = generateDailyMaze();
    mazeGame.playerPos = { x: 1, y: 1 };
    mazeGame.targetPos = { x: mazeGame.width - 2, y: mazeGame.height - 2 };
    mazeGame.startTime = Date.now();
    mazeGame.moves = 0;
    mazeGame.gameActive = true;

    gameArea.style.display = 'block';
    gameArea.innerHTML = `
        <div class="maze-game">
            <div class="maze-header">
                <button class="back-btn" onclick="closeMazeGame()">← Назад</button>
                <div class="maze-info">
                    <h3>🧭 Допоможи Михайлу дістатитись Краківської</h3>
                    <div class="maze-stats">
                        <span>Ходів: <span id="moveCount">0</span></span>
                        <span>Час: <span id="timeCount">00:00</span></span>
                    </div>
                </div>
            </div>
            
            <div class="maze-container">
                <canvas id="mazeCanvas" width="450" height="450"></canvas>
            </div>
            
            <div class="maze-controls">
                <div class="control-instructions">
                    <p>Використовуй клавіші ← ↑ ↓ → або кнопки для руху</p>
                </div>
                <div class="control-buttons">
                    <div class="control-row">
                        <button class="control-btn" onclick="moveMazePlayer(0, -1)">↑</button>
                    </div>
                    <div class="control-row">
                        <button class="control-btn" onclick="moveMazePlayer(-1, 0)">←</button>
                        <button class="control-btn" onclick="moveMazePlayer(1, 0)">→</button>
                    </div>
                    <div class="control-row">
                        <button class="control-btn" onclick="moveMazePlayer(0, 1)">↓</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup keyboard controls
    document.addEventListener('keydown', handleMazeKeydown);

    // Start game timer
    startMazeTimer();

    // Initial render
    renderMaze();

    // Scroll to game area
    gameArea.scrollIntoView({ behavior: 'smooth' });
}

// Handle keyboard input
function handleMazeKeydown(event) {
    if (!mazeGame.gameActive) return;

    switch(event.key) {
        case 'ArrowUp':
            moveMazePlayer(0, -1);
            event.preventDefault();
            break;
        case 'ArrowDown':
            moveMazePlayer(0, 1);
            event.preventDefault();
            break;
        case 'ArrowLeft':
            moveMazePlayer(-1, 0);
            event.preventDefault();
            break;
        case 'ArrowRight':
            moveMazePlayer(1, 0);
            event.preventDefault();
            break;
    }
}

// Move player in maze
function moveMazePlayer(dx, dy) {
    if (!mazeGame.gameActive) return;

    const newX = mazeGame.playerPos.x + dx;
    const newY = mazeGame.playerPos.y + dy;

    // Check boundaries and walls
    if (newX >= 0 && newX < mazeGame.width &&
        newY >= 0 && newY < mazeGame.height &&
        mazeGame.maze[newY][newX] === 0) {

        mazeGame.playerPos.x = newX;
        mazeGame.playerPos.y = newY;
        mazeGame.moves++;

        document.getElementById('moveCount').textContent = mazeGame.moves;
        renderMaze();

        // Check if reached target
        if (newX === mazeGame.targetPos.x && newY === mazeGame.targetPos.y) {
            completeMazeGame();
        }
    }
}

// Render the maze on canvas
function renderMaze() {
    const canvas = document.getElementById('mazeCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 30;

    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze
    for (let y = 0; y < mazeGame.height; y++) {
        for (let x = 0; x < mazeGame.width; x++) {
            const cellX = x * cellSize;
            const cellY = y * cellSize;

            if (mazeGame.maze[y][x] === 0) {
                // Path
                ctx.fillStyle = '#ecf0f1';
                ctx.fillRect(cellX, cellY, cellSize, cellSize);
            }
            // Walls remain dark (already filled)
        }
    }

    // Draw target (Kraków - books)
    const targetX = mazeGame.targetPos.x * cellSize;
    const targetY = mazeGame.targetPos.y * cellSize;
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(targetX + 2, targetY + 2, cellSize - 4, cellSize - 4);
    ctx.font = '20px Arial';
    ctx.fillText('📚', targetX + 5, targetY + 22);

    // Draw start (plane)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(2, 2, cellSize - 4, cellSize - 4);
    ctx.font = '20px Arial';
    ctx.fillText('✈️', 5, 22);

    // Draw player (Mykhailo)
    const playerX = mazeGame.playerPos.x * cellSize;
    const playerY = mazeGame.playerPos.y * cellSize;
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(playerX + 2, playerY + 2, cellSize - 4, cellSize - 4);
    ctx.font = '20px Arial';
    ctx.fillText('👦', playerX + 5, playerY + 22);
}

// Game timer
let mazeTimer = null;
function startMazeTimer() {
    mazeTimer = setInterval(() => {
        if (mazeGame.gameActive) {
            const elapsed = Math.floor((Date.now() - mazeGame.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timeCount').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Complete the maze game
async function completeMazeGame() {
    mazeGame.gameActive = false;
    clearInterval(mazeTimer);

    const elapsed = Math.floor((Date.now() - mazeGame.startTime) / 1000);
    const today = new Date().toDateString();

    const completionData = {
        time: elapsed,
        moves: mazeGame.moves
    };

    // Save to Firebase
    await saveMazeCompletion(today, completionData);

    // Check and award personal achievement
    await checkMazeCompletionAchievement();

    // Show completion message
    showNotification(`🎉 Михайло дістався Краківської! Час: ${elapsed}с, Ходів: ${mazeGame.moves}`, 'success');

    // Update status in main menu
    updateChallengeStatus('maze', `<span>✅ Пройдено за ${elapsed}с</span>`);

    // Show leaderboard after delay
    setTimeout(() => {
        showMazeLeaderboard();
    }, 2000);
}

// Show maze leaderboard
async function showMazeLeaderboard() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    const today = new Date().toDateString();
    const leaderboard = await getTodaysMazeLeaderboard(today);

    let leaderboardHtml = '';
    if (leaderboard.length === 0) {
        leaderboardHtml = '<div class="no-completions">Ще ніхто не пройшов сьогоднішній лабіринт 🤔</div>';
    } else {
        leaderboardHtml = leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.username === currentUser;
            const crownIcon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

            return `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''} rank-${rank}">
                    <div class="rank-icon">${crownIcon}</div>
                    <div class="player-name">${entry.username}</div>
                    <div class="completion-stats">
                        <span class="time">⏱️ ${entry.completionTime}с</span>
                        <span class="moves">👣 ${entry.moves}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    gameArea.style.display = 'block';
    gameArea.innerHTML = `
        <div class="maze-leaderboard">
            <div class="leaderboard-header">
                <button class="back-btn" onclick="closeMazeGame()">← Назад</button>
                <div class="leaderboard-title">
                    <h3>🏆 Сьогоднішні Рекорди</h3>
                    <p>Лабіринт "Допоможи Михайлу дістатитись Краківської"</p>
                </div>
            </div>
            
            <div class="leaderboard-content">
                ${leaderboardHtml}
            </div>
            
            <div class="leaderboard-footer">
                <p>💡 Новий лабіринт завтра!</p>
            </div>
        </div>
    `;

    // Scroll to game area
    gameArea.scrollIntoView({ behavior: 'smooth' });
}

// Close maze game
function closeMazeGame() {
    document.removeEventListener('keydown', handleMazeKeydown);
    clearInterval(mazeTimer);
    mazeGame.gameActive = false;

    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.style.display = 'none';
    }
}
