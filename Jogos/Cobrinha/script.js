 const foodTypes = [
  { color: "#FF003D", points: 1 },    // Red
  { color: "#32CD32", points: 1 },    // Green
  { color: "#FFD700", points: 1 },    // Yellow
  { color: "#FF69B4", points: 1 }     // Pink
];

const playBoard = document.querySelector(".play-board");
const scoreElement = document.querySelector(".score");
const highScoreElement = document.querySelector(".high-score");
const controls = document.querySelectorAll(".controls i");
const gameOverOverlay = document.querySelector(".game-over-overlay");
const gameOverScore = document.querySelector(".game-over-score");
const gameOverTime = document.querySelector(".game-over-time"); 
const replayBtn = document.querySelector(".replay-btn");
const menuBtn = document.querySelector(".menu-btn");
const bgMusic = document.getElementById('bg-music');
const musicToggleBtn = document.querySelector('.music-toggle-btn');
const musicIcon = document.getElementById('music-icon');

const menuOverlay = document.querySelector(".menu-overlay");
const menuPlayBtn = document.querySelector(".menu-play-btn");
const menuHowBtn = document.querySelector(".menu-how-btn");
const tutorialOverlay = document.querySelector(".tutorial-overlay");
const tutorialBackBtn = document.querySelector(".tutorial-back-btn");

let startTime = null;
let musicEnabled = false;
let elapsedTime = 0;
let gameOver = false;
let currentFoodType;
let foodX, foodY;
let snakeX, snakeY;
let velocityX, velocityY;
let snakeBody;
let setIntervalId;
let score;
let highScore = localStorage.getItem("high-score") || 0;
highScoreElement.innerText = `Maior Pontuação: ${highScore}`;

function updateMusicState() {
  if (musicEnabled) {
    bgMusic.volume = 0.5;
    bgMusic.play();
    musicIcon.classList.remove("fa-volume-xmark");
    musicIcon.classList.add("fa-music");
  } else {
    bgMusic.pause();
    musicIcon.classList.remove("fa-music");
    musicIcon.classList.add("fa-volume-xmark");
  }
}

musicToggleBtn.addEventListener("click", function() {
  musicEnabled = !musicEnabled;
  updateMusicState();
});

function showMenu() {
    menuOverlay.classList.remove("hidden");
    tutorialOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");
    playBoard.style.opacity = "0.3";
    document.querySelector(".game-details").style.opacity = "0.3";
}

menuPlayBtn.addEventListener("click", function() {
    menuOverlay.classList.add("hidden");
    tutorialOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");
    playBoard.style.opacity = "1";
    document.querySelector(".game-details").style.opacity = "1";
    startGame();
});

menuHowBtn.addEventListener("click", function() {
    menuOverlay.classList.add("hidden");
    tutorialOverlay.classList.remove("hidden");
    gameOverOverlay.classList.add("hidden");
    playBoard.style.opacity = "0.3";
    document.querySelector(".game-details").style.opacity = "0.3";
});

tutorialBackBtn.addEventListener("click", function() {
    showMenu();
});

function initVariables() {
    snakeX = 5;
    snakeY = 5;
    velocityX = 0;
    velocityY = 0;
    snakeBody = [];
    score = 0;
    scoreElement.innerText = `Pontos: ${score}`;
    // Hide overlay if shown
    gameOverOverlay.classList.add("hidden");
    // Show board
    playBoard.style.opacity = "1";
}

const updateFoodPosition = () => {
    foodX = Math.floor(Math.random() * 30) + 1;
    foodY = Math.floor(Math.random() * 30) + 1;

    currentFoodType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
}

const handleGameOver = () => {
    clearInterval(setIntervalId);
    playBoard.style.opacity = "0.3";
    gameOverOverlay.classList.remove("hidden");
    gameOverScore.innerText = `Pontos: ${score}`;

    elapsedTime = Math.floor((Date.now() - startTime) / 1000);

    const min = Math.floor(elapsedTime / 60);
    const sec = elapsedTime % 60;
    gameOverTime.innerText = `Tempo: ${min}:${sec.toString().padStart(2, '0')}`;
}

const changeDirection = e => {
    if(gameOver) return;
    if(e.key === "ArrowUp" && velocityY != 1) {
        velocityX = 0;
        velocityY = -1;
    } else if(e.key === "ArrowDown" && velocityY != -1) {
        velocityX = 0;
        velocityY = 1;
    } else if(e.key === "ArrowLeft" && velocityX != 1) {
        velocityX = -1;
        velocityY = 0;
    } else if(e.key === "ArrowRight" && velocityX != -1) {
        velocityX = 1;
        velocityY = 0;
    }
}
controls.forEach(button => button.addEventListener("click", () => changeDirection({ key: button.dataset.key })));

function showFloatingPoint(x, y, value, color) {
  const container = document.querySelector('.floating-points-container');
  const pointElem = document.createElement('div');
  pointElem.className = 'floating-point';
  pointElem.textContent = `+${value}`;
  pointElem.style.color = color;

  // Get the board's position & cell size for correct placement
  const boardRect = playBoard.getBoundingClientRect();
  const cellSize = boardRect.width / 30; // Your board is 30x30
  const px = (x - 1) * cellSize + cellSize / 2;
  const py = (y - 1) * cellSize + cellSize / 2;

  pointElem.style.left = `${px}px`;
  pointElem.style.top = `${py}px`;

  container.appendChild(pointElem);

  // Animate: move up and fade out
  setTimeout(() => {
    pointElem.style.transform = 'translateY(-32px)';
    pointElem.style.opacity = '0';
  }, 50);

  // Remove after animation
  setTimeout(() => {
    pointElem.remove();
  }, 850);
}

const initGame = () => {
    if(gameOver) return handleGameOver();
    let html = `<div class="food" style="grid-area: ${foodY} / ${foodX}; background: ${currentFoodType.color};"></div>`;

    // Eat food
    if(snakeX === foodX && snakeY === foodY) {
        showFloatingPoint(foodX, foodY, currentFoodType.points, currentFoodType.color);
        updateFoodPosition();
        snakeBody.push([foodY, foodX]);
        score += currentFoodType.points;
        highScore = score >= highScore ? score : highScore;
        localStorage.setItem("high-score", highScore);
        scoreElement.innerText = `Pontos: ${score}`;
        highScoreElement.innerText = `Maior Pontuação: ${highScore}`;
    }
    // Move snake
    snakeX += velocityX;
    snakeY += velocityY;
    for (let i = snakeBody.length - 1; i > 0; i--) {
        snakeBody[i] = snakeBody[i - 1];
    }
    snakeBody[0] = [snakeX, snakeY];

    // Wall collision
    if(snakeX <= 0 || snakeX > 30 || snakeY <= 0 || snakeY > 30) {
        gameOver = true;
        return;
    }

    // Draw snake
    for (let i = 0; i < snakeBody.length; i++) {
        html += `<div class="head" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;
        if (i !== 0 && snakeBody[0][1] === snakeBody[i][1] && snakeBody[0][0] === snakeBody[i][0]) {
            gameOver = true;
            return;
        }
    }
    playBoard.innerHTML = html;
}

function startGameLoop() {
    setIntervalId = setInterval(initGame, 100);
}

function startGame() {
    gameOver = false;
    initVariables();
    updateFoodPosition();
    startTime = Date.now();
    elapsedTime = 0;
    startGameLoop();
}

document.addEventListener("keyup", changeDirection);

replayBtn.addEventListener("click", function() {
    clearInterval(setIntervalId);
    startGame();
});

menuBtn.addEventListener("click", function() {
    clearInterval(setIntervalId);
    showMenu();
});

window.onload = function() {
  showMenu();
  updateMusicState();
};