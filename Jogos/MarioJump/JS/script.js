const mario = document.querySelector('.mario');
const pipe = document.querySelector('.pipe');
const scoreDisplay = document.querySelector('.score');
const restartBtn = document.querySelector('.restart-btn');
// Congela pipe e mario até o jogo começar
pipe.style.animation = 'none';
mario.style.animation = 'none';


// Adiciona funcionalidade ao botão de reiniciar
restartBtn.addEventListener('click', () => {
    location.reload();
});

// Start overlay logic
const startOverlay = document.getElementById('startOverlay');
const startButton = document.getElementById('startButton');
const countdownEl = document.getElementById('countdown');

let gameStarted = false;
let loopId = null;
let scoreId = null;

function startGameWithCountdown() {
  let t = 3;
  // Hide the button, show the countdown
  startButton.style.display = 'none';
  countdownEl.style.display = 'block';
  countdownEl.textContent = t;

  const timer = setInterval(() => {
    t -= 1;
    if (t > 0) {
      countdownEl.textContent = t;
    } else {
      clearInterval(timer);
      // hide overlay
      startOverlay.style.display = 'none';
      // start game
      startGame();
    }
  }, 1000);
}

// On load, hide countdown (only show after button click)
if (countdownEl) countdownEl.style.display = 'none';
startButton && startButton.addEventListener('click', startGameWithCountdown);

function startGame() {
  gameStarted = true;
  // Inicia animações
  pipe.style.animation = '';
  mario.style.animation = '';
  // start main loop
  loopId = setInterval(gameLoop, 10);
  scoreId = setInterval(updateScore, 100);
}

function gameLoop() {
  const pipePosition = pipe.offsetLeft;
  const marioPosition = +window.getComputedStyle(mario).bottom.replace('px', '');

  if (pipePosition <= 120 && pipePosition > 0 && marioPosition < 80) {
    pipe.style.animation = 'none';
    pipe.style.left = `${pipePosition}px`;

    mario.style.animation = 'none';
    mario.style.bottom = '0px';

    mario.src = './IMG/game-over.png';
    mario.style.width = '75px';
    mario.style.marginLeft = '50px';
    mario.classList.add('dead');

    isAlive = false;
    scoreDisplay.textContent = `GAME OVER | Score: ${score}`;
    scoreDisplay.classList.add('game-over');
    const restartBtn = document.querySelector('.restart-btn');
    restartBtn.style.display = 'block';
    clearInterval(loopId);
    clearInterval(scoreId);
  }
}

function updateScore() {
  if (isAlive) {
    score += 1;
    scoreDisplay.textContent = `Score: ${score}`;
  }
}

let score = 0;
let isAlive = true;

// Função de pulo
const jump = () => {
  if (!mario.classList.contains('dead')) { // só pula se não morreu
    mario.classList.add('jump');

    setTimeout(() => {
      mario.classList.remove('jump');
    }, 500);
  }
};


// Only allow jump after game started
document.addEventListener('keydown', (e) => {
  if (!gameStarted) return;
  jump(e);
});


