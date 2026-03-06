/**
 * Snake Game - "Михайло збирає зілля"
 * Mobile-first with swipe controls and Ukrainian food theme
 */

// Snake game state
let snakeGame = {
    canvas: null,
    ctx: null,
    gridSize: 20,
    tileCount: 15,
    snake: [{ x: 10, y: 10 }],
    food: { x: 5, y: 5, type: 'tea' },
    direction: { x: 0, y: 0 },
    score: 0,
    gameActive: false,
    gameSpeed: 150,
    lastDirection: { x: 0, y: 0 },
    touchStartX: 0,
    touchStartY: 0,
    minSwipeDistance: 30,
    isFullscreen: false,
    originalParent: null
};

// Ukrainian food items (matching achievements theme)
const foodTypes = [
    { type: 'tea', emoji: '☕', name: 'Чай', points: 10 },
    { type: 'kakao', emoji: '🍫', name: 'Какао', points: 15 },
    { type: 'potion', emoji: '🌿', name: 'Зілля-мазілля', points: 25 }
];

// Start the snake game
function startSnakeGame() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    // Initialize game
    initializeSnakeGame();
    
    gameArea.style.display = 'block';
    
    // Different instructions for mobile vs desktop
    const isMobile = 'ontouchstart' in window && window.innerWidth <= 768;
    const instructions = isMobile ? 
        `<p>📱 Проведіть пальцем будь-де для руху</p>` :
        `<p>⌨️ Використовуйте клавіші ← ↑ ↓ → для руху</p>`;
    
    gameArea.innerHTML = `
        <div class="snake-game" id="snakeGameContainer">
            <div class="snake-header">
                <button class="back-btn" onclick="closeSnakeGame()">← Назад</button>
                <div class="snake-info">
                    <h3>🐍 Михайло збирає зілля</h3>
                    <div class="snake-stats">
                        <span>Рахунок: <span id="snakeScore">0</span></span>
                        <span>Довжина: <span id="snakeLength">1</span></span>
                    </div>
                </div>
                ${isMobile ? '<button class="fullscreen-btn" onclick="toggleFullscreen()" title="Повний екран">⛶</button>' : ''}
            </div>
            
            <div class="snake-container">
                <canvas id="snakeCanvas" width="300" height="300"></canvas>
                <div class="food-legend">
                    <div class="food-item">☕ Чай (+10)</div>
                    <div class="food-item">🍫 Какао (+15)</div>
                    <div class="food-item">🌿 Зілля-мазілля (+25)</div>
                </div>
            </div>
            
            <div class="snake-controls">
                <div class="game-instructions">
                    ${instructions}
                    <p>🎯 Збирайте їжу, не врізайтеся в стіни!</p>
                </div>
                <button class="start-btn" id="snakeStartBtn" onclick="toggleSnakeGame()">Почати гру</button>
            </div>
            
            <div id="gameOverModal" class="game-over-modal" style="display: none;">
                <div class="modal-content">
                    <h3>🎮 Гру закінчено!</h3>
                    <div id="finalScore"></div>
                    <div class="modal-buttons">
                        <button onclick="restartSnakeGame()" class="restart-btn">Грати знову</button>
                        <button onclick="closeSnakeGame()" class="close-btn">Закрити</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Setup canvas and controls
    setupSnakeCanvas();
    setupSnakeControls();
    
    // Only auto-enter fullscreen on mobile devices
    if (isMobile) {
        setTimeout(() => {
            enterFullscreen();
        }, 300);
    }
    
    // Scroll to game area
    gameArea.scrollIntoView({ behavior: 'smooth' });
}

// Initialize game state
function initializeSnakeGame() {
    snakeGame.snake = [{ x: 10, y: 10 }];
    snakeGame.direction = { x: 0, y: 0 };
    snakeGame.lastDirection = { x: 0, y: 0 };
    snakeGame.score = 0;
    snakeGame.gameActive = false;
    generateFood();
}

// Setup canvas
function setupSnakeCanvas() {
    snakeGame.canvas = document.getElementById('snakeCanvas');
    snakeGame.ctx = snakeGame.canvas.getContext('2d');
    
    if (!snakeGame.canvas || !snakeGame.ctx) return;
    
    resizeCanvas();
    drawGame();
}

// Resize canvas based on screen size
function resizeCanvas() {
    if (!snakeGame.canvas) return;
    
    let size;
    
    if (snakeGame.isFullscreen || window.innerWidth <= 768) {
        // Fullscreen mode: use most of screen space
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const availableHeight = screenHeight - 120; // Leave space for UI
        
        size = Math.min(screenWidth - 20, availableHeight);
        size = Math.floor(size / snakeGame.tileCount) * snakeGame.tileCount;
        
        // Ensure minimum size
        size = Math.max(size, 300);
    } else {
        // Normal mode: responsive within container
        const container = document.querySelector('.snake-container');
        const containerWidth = Math.min(container.clientWidth - 40, 400);
        size = Math.floor(containerWidth / snakeGame.tileCount) * snakeGame.tileCount;
    }
    
    snakeGame.canvas.width = size;
    snakeGame.canvas.height = size;
    snakeGame.gridSize = size / snakeGame.tileCount;
}

// Setup touch/swipe controls
function setupSnakeControls() {
    // Remove any existing listeners
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchmove', preventScrolling);
    document.removeEventListener('keydown', handleKeyPress);
    
    // Add touch events for mobile (only on mobile devices)
    if ('ontouchstart' in window) {
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchmove', preventScrolling, { passive: false });
    }
    
    // Keyboard events for desktop
    document.addEventListener('keydown', handleKeyPress);
}

// Prevent scrolling during touch
function preventScrolling(e) {
    if (snakeGame.gameActive || snakeGame.isFullscreen) {
        e.preventDefault();
    }
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    snakeGame.touchStartX = touch.clientX;
    snakeGame.touchStartY = touch.clientY;
}

// Handle touch end (swipe detection)
function handleTouchEnd(e) {
    e.preventDefault();
    if (!snakeGame.gameActive) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - snakeGame.touchStartX;
    const deltaY = touch.clientY - snakeGame.touchStartY;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Check if swipe is long enough
    if (Math.max(absDeltaX, absDeltaY) < snakeGame.minSwipeDistance) {
        return;
    }
    
    // Determine swipe direction
    if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && snakeGame.lastDirection.x !== -1) {
            // Swipe right
            snakeGame.direction = { x: 1, y: 0 };
        } else if (deltaX < 0 && snakeGame.lastDirection.x !== 1) {
            // Swipe left
            snakeGame.direction = { x: -1, y: 0 };
        }
    } else {
        // Vertical swipe
        if (deltaY > 0 && snakeGame.lastDirection.y !== -1) {
            // Swipe down
            snakeGame.direction = { x: 0, y: 1 };
        } else if (deltaY < 0 && snakeGame.lastDirection.y !== 1) {
            // Swipe up
            snakeGame.direction = { x: 0, y: -1 };
        }
    }
}

// Handle keyboard input for desktop
function handleKeyPress(e) {
    // Allow ESC to exit fullscreen
    if (e.key === 'Escape' && snakeGame.isFullscreen) {
        exitFullscreen();
        e.preventDefault();
        return;
    }
    
    if (!snakeGame.gameActive) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (snakeGame.lastDirection.y !== 1) {
                snakeGame.direction = { x: 0, y: -1 };
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (snakeGame.lastDirection.y !== -1) {
                snakeGame.direction = { x: 0, y: 1 };
            }
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (snakeGame.lastDirection.x !== 1) {
                snakeGame.direction = { x: -1, y: 0 };
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (snakeGame.lastDirection.x !== -1) {
                snakeGame.direction = { x: 1, y: 0 };
            }
            e.preventDefault();
            break;
    }
}

// Generate random food
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * snakeGame.tileCount),
            y: Math.floor(Math.random() * snakeGame.tileCount),
            type: foodTypes[Math.floor(Math.random() * foodTypes.length)].type
        };
    } while (snakeGame.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    snakeGame.food = newFood;
}

// Toggle game start/pause
function toggleSnakeGame() {
    const btn = document.getElementById('snakeStartBtn');
    if (!snakeGame.gameActive) {
        startSnakeGameLoop();
        btn.textContent = 'Пауза';
        btn.classList.add('pause');
    } else {
        stopSnakeGameLoop();
        btn.textContent = 'Продовжити';
        btn.classList.remove('pause');
    }
}

// Start game loop
function startSnakeGameLoop() {
    snakeGame.gameActive = true;
    snakeGame.gameLoop = setInterval(updateGame, snakeGame.gameSpeed);
}

// Stop game loop
function stopSnakeGameLoop() {
    snakeGame.gameActive = false;
    if (snakeGame.gameLoop) {
        clearInterval(snakeGame.gameLoop);
    }
}

// Update game state
function updateGame() {
    moveSnake();
    
    // Check collisions
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    // Check food collision
    const head = snakeGame.snake[0];
    if (head.x === snakeGame.food.x && head.y === snakeGame.food.y) {
        eatFood();
    }
    
    drawGame();
    updateUI();
}

// Handle window resize
window.addEventListener('resize', () => {
    if (snakeGame.canvas && (snakeGame.isFullscreen || window.innerWidth <= 768)) {
        resizeCanvas();
        drawGame();
    }
});

// Move snake
function moveSnake() {
    if (snakeGame.direction.x === 0 && snakeGame.direction.y === 0) return;
    
    const head = { ...snakeGame.snake[0] };
    head.x += snakeGame.direction.x;
    head.y += snakeGame.direction.y;
    
    snakeGame.snake.unshift(head);
    snakeGame.lastDirection = { ...snakeGame.direction };
    
    // Remove tail (unless food was eaten, handled in eatFood)
    if (!snakeGame.justAte) {
        snakeGame.snake.pop();
    }
    snakeGame.justAte = false;
}

// Check for collisions
function checkCollision() {
    const head = snakeGame.snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= snakeGame.tileCount || 
        head.y < 0 || head.y >= snakeGame.tileCount) {
        return true;
    }
    
    // Self collision
    for (let i = 1; i < snakeGame.snake.length; i++) {
        if (head.x === snakeGame.snake[i].x && head.y === snakeGame.snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// Eat food
function eatFood() {
    const foodType = foodTypes.find(f => f.type === snakeGame.food.type);
    snakeGame.score += foodType.points;
    snakeGame.justAte = true;
    
    // Show food eaten notification
    showFoodEaten(foodType);
    
    generateFood();
    
    // Increase speed slightly
    if (snakeGame.gameSpeed > 80) {
        snakeGame.gameSpeed -= 2;
        stopSnakeGameLoop();
        startSnakeGameLoop();
    }
}

// Show food eaten effect
function showFoodEaten(foodType) {
    // Create floating text effect
    const canvas = snakeGame.canvas;
    const rect = canvas.getBoundingClientRect();
    
    const effect = document.createElement('div');
    effect.className = 'food-eaten-effect';
    effect.textContent = `+${foodType.points} ${foodType.name}`;
    effect.style.left = `${rect.left + rect.width / 2}px`;
    effect.style.top = `${rect.top + rect.height / 2}px`;
    
    document.body.appendChild(effect);
    
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 1500);
}

// Draw game
function drawGame() {
    const ctx = snakeGame.ctx;
    const gridSize = snakeGame.gridSize;
    
    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, snakeGame.canvas.width, snakeGame.canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= snakeGame.tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, snakeGame.canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(snakeGame.canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    // Draw snake
    snakeGame.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#e74c3c' : '#27ae60'; // Head red, body green
        ctx.fillRect(
            segment.x * gridSize + 2, 
            segment.y * gridSize + 2, 
            gridSize - 4, 
            gridSize - 4
        );
        
        // Draw eyes on head
        if (index === 0) {
            ctx.fillStyle = 'white';
            ctx.fillRect(segment.x * gridSize + 6, segment.y * gridSize + 6, 3, 3);
            ctx.fillRect(segment.x * gridSize + 11, segment.y * gridSize + 6, 3, 3);
        }
    });
    
    // Draw food
    const foodType = foodTypes.find(f => f.type === snakeGame.food.type);
    ctx.font = `${gridSize - 4}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
        foodType.emoji,
        snakeGame.food.x * gridSize + gridSize / 2,
        snakeGame.food.y * gridSize + gridSize - 3
    );
}

// Update UI elements
function updateUI() {
    document.getElementById('snakeScore').textContent = snakeGame.score;
    document.getElementById('snakeLength').textContent = snakeGame.snake.length;
}

// Game over
function gameOver() {
    stopSnakeGameLoop();
    
    const modal = document.getElementById('gameOverModal');
    const finalScore = document.getElementById('finalScore');
    
    finalScore.innerHTML = `
        <p>Рахунок: <strong>${snakeGame.score}</strong></p>
        <p>Довжина змійки: <strong>${snakeGame.snake.length}</strong></p>
        <p>🎉 Михайло зібрав багато смачнощів!</p>
    `;
    
    modal.style.display = 'flex';
}

// Restart game
function restartSnakeGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('snakeStartBtn').textContent = 'Почати гру';
    document.getElementById('snakeStartBtn').classList.remove('pause');
    
    initializeSnakeGame();
    drawGame();
    updateUI();
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (snakeGame.isFullscreen) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

// Enter fullscreen mode
function enterFullscreen() {
    snakeGame.isFullscreen = true;
    const container = document.getElementById('snakeGameContainer');
    const gameArea = document.getElementById('gameArea');
    
    if (container && gameArea) {
        // Store original parent for restoration
        snakeGame.originalParent = container.parentNode;
        
        // Add fullscreen classes
        container.classList.add('snake-fullscreen');
        document.body.classList.add('snake-game-active');
        
        // Move to body for true fullscreen
        document.body.appendChild(container);
        
        // Resize canvas for fullscreen
        resizeCanvas();
        drawGame();
        
        // Update fullscreen button
        const btn = document.querySelector('.fullscreen-btn');
        if (btn) {
            btn.textContent = '✕';
            btn.title = 'Вийти з повного екрану';
            btn.onclick = exitFullscreen;
        }
        
        // Update back button to exit fullscreen
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.onclick = exitFullscreen;
        }
        
        // Lock screen orientation on mobile
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(() => {});
        }
    }
}

// Exit fullscreen mode
function exitFullscreen() {
    // Stop game if active
    if (snakeGame.gameActive) {
        stopSnakeGameLoop();
        const btn = document.getElementById('snakeStartBtn');
        if (btn) {
            btn.textContent = 'Почати гру';
            btn.classList.remove('pause');
        }
    }
    
    snakeGame.isFullscreen = false;
    const container = document.getElementById('snakeGameContainer');
    
    if (container && snakeGame.originalParent) {
        // Remove fullscreen classes
        container.classList.remove('snake-fullscreen');
        document.body.classList.remove('snake-game-active');
        
        // Move back to original location
        snakeGame.originalParent.appendChild(container);
        
        // Resize canvas for normal mode
        resizeCanvas();
        drawGame();
        
        // Update fullscreen button
        const btn = document.querySelector('.fullscreen-btn');
        if (btn) {
            btn.textContent = '⛶';
            btn.title = 'Повний екран';
            btn.onclick = enterFullscreen;
        }
        
        // Restore back button functionality
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.onclick = closeSnakeGame;
        }
        
        // Unlock screen orientation
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
}

// Close snake game
function closeSnakeGame() {
    stopSnakeGameLoop();
    
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyPress);
    if ('ontouchstart' in window) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchmove', preventScrolling);
    }
    
    // Exit fullscreen if active
    if (snakeGame.isFullscreen) {
        exitFullscreen();
        return; // exitFullscreen will handle cleanup
    }
    
    // Clean up and hide game
    document.body.classList.remove('snake-game-active');
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.style.display = 'none';
    }
}
