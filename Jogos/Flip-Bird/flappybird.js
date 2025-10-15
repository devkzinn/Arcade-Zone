//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34; //width/height ratio = 408/228 = 17/12
let birdHeight = 24;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight
}

//iamgem mapas 
let bgImg = new Image();
bgImg.src = "./background.png";


//pipes
let pipeArray = [];
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2; //pipes moving left speed
let velocityY = 0; //bird jump speed
let gravity = 0.4;

let gameOver = false;
let score = 0;
let gameStarted = false;
let pipeInterval; // Para controlar o intervalo de pipes
let animationId; // Novo: Para controlar e cancelar o requestAnimationFrame

let countdown = 3;
let countdownInterval;

window.onload = function () {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); //used for drawing on the board

    //load images
    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = function () {
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    // Cria os modais
    createGameOverModal();
    createCountdownModal();

    // Adiciona o listener de teclado UMA VEZ aqui
    document.addEventListener("keydown", moveBird);

    // Inicia com contagem
    showCountdownModal();
}

// ... (resto do código permanece igual, até window.onload)

// No window.onload, nada muda.

// Função para criar gradiente de background (chamada no update)
function drawBackground() {
    let gradient = context.createLinearGradient(0, 0, 0, boardHeight);
    gradient.addColorStop(0, '#6A0DAD');    // Roxo forte no topo
    gradient.addColorStop(0.5, '#512DA8');  // Roxo-azulado no meio
    gradient.addColorStop(1, '#eeeef1ff');    // Azul profundo no fundo

    context.fillStyle = gradient;
    context.fillRect(0, 0, board.width, board.height);
}

// Função update() modificada: Adicione drawBackground() após clearRect
function update() {
    if (gameOver || !gameStarted) {
        return;
    }

    context.clearRect(0, 0, board.width, board.height);
    //drawBackground(); // Novo: Desenha o gradiente harmonioso
    context.clearRect(0, 0, board.width, board.height);
    context.drawImage(bgImg, 0, 0, board.width, board.height);

    //bird
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0);
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
        showGameOverModal();
        return;
    }

    //pipes (sem mudança)
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5;
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
            showGameOverModal();
            return;
        }
    }

    //clear pipes (sem mudança)
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    //score: Cor branca com sombra para legibilidade no gradiente
    context.fillStyle = "#FFFFFF";
    context.font = "45px sans-serif";
    context.shadowColor = "rgba(0,0,0,0.5)"; // Sombra sutil
    context.shadowBlur = 2;
    context.fillText(Math.floor(score), 5, 45); // Math.floor para score inteiro
    context.shadowColor = "transparent"; // Reset sombra

    if (gameOver) {
        context.fillStyle = "#1E40FF"; // Azul vívido para "GAME OVER" no canvas
        context.font = "35px sans-serif";
        context.fillText("GAME OVER", boardWidth / 4, boardHeight / 2);
    }

    if (!gameOver && gameStarted) {
        animationId = requestAnimationFrame(update);
    }
}

// Modal Game Over melhorado
function createGameOverModal() {
    const modal = document.createElement("div");
    modal.id = "gameOverModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "linear-gradient(135deg, rgba(106, 13, 173, 0.8), rgba(40, 53, 147, 0.8))"; // #6A0DAD e #283593
    modal.style.display = "none";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    const content = document.createElement("div");
    content.style.background = "linear-gradient(135deg, #7B1FA2, #512DA8)"; // Roxo médio para roxo-azulado
    content.style.padding = "50px";
    content.style.borderRadius = "15px";
    content.style.textAlign = "center";
    content.style.boxShadow = "0 10px 30px rgba(48, 63, 159, 0.5)"; // Sombra em #303F9F
    content.style.border = "2px solid #303F9F"; // Borda azul escuro com roxo
    content.style.color = "#FFFFFF";
    content.style.fontFamily = "sans-serif";
    content.innerHTML = `
        <h2 style="font-size: 32px; margin: 0 0 20px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">GAME OVER</h2>
        <p id="finalScore" style="font-size: 18px; margin: 0 0 30px 0;"></p>
        <button id="restartBtn" style="
            background: #1E40FF; /* Azul vívido */
            color: #FFFFFF;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s ease;
            box-shadow: 0 4px 8px rgba(30, 64, 255, 0.3);
        ">Reiniciar</button>
    `;
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Hover no botão
    const restartBtn = document.getElementById("restartBtn");
    restartBtn.onmouseover = function () {
        this.style.background = "#3F51B5"; // Azul médio no hover
    };
    restartBtn.onmouseout = function () {
        this.style.background = "#1E40FF"; // Volta ao azul vívido
    };

    restartBtn.onclick = function () {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (pipeInterval) {
            clearInterval(pipeInterval);
            pipeInterval = null;
        }
        gameStarted = false;
        bird.y = birdY;
        velocityY = 0;
        pipeArray = [];
        score = 0;
        gameOver = false;
        context.clearRect(0, 0, board.width, board.height);
        hideGameOverModal();
        showCountdownModal();
    };
}

function showGameOverModal() {
    document.getElementById("finalScore").innerText = "Pontuação: " + Math.floor(score);
    document.getElementById("gameOverModal").style.display = "flex";
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (pipeInterval) {
        clearInterval(pipeInterval);
        pipeInterval = null;
    }
}

function hideGameOverModal() {
    document.getElementById("gameOverModal").style.display = "none";
}

// Modal Countdown melhorado
function createCountdownModal() {
    const modal = document.createElement("div");
    modal.id = "countdownModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "linear-gradient(135deg, rgba(106, 13, 173, 0.8), rgba(40, 53, 147, 0.8))"; // Mesmo overlay
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "2000";

    const content = document.createElement("div");
    content.style.background = "linear-gradient(135deg)"; // Mesmo gradiente
    content.style.padding = "60px";
    content.style.borderRadius = "15px";
    content.style.textAlign = "center";
    content.style.boxShadow = "0 10px 30px rgba(48, 63, 159, 0.5)";
    content.style.border = "2px solid #303F9F";
    content.style.color = "#FFFFFF";
    content.style.fontFamily = "sans-serif";

    const countdownSpan = document.createElement("span");
    countdownSpan.id = "countdownValue";
    countdownSpan.style.fontSize = "64px"; // Maior para impacto
    countdownSpan.style.fontWeight = "bold";
    countdownSpan.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
    countdownSpan.style.transition = "transform 0.3s ease, color 0.3s ease"; // Animação sutil de escala e cor
    countdownSpan.style.display = "inline-block";

    content.appendChild(countdownSpan);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function showCountdownModal() {
    document.getElementById("countdownModal").style.display = "flex";
    countdown = 3;
    const countdownValue = document.getElementById("countdownValue");
    countdownValue.innerText = countdown;
    countdownValue.style.color = "#FFFFFF"; // Branco inicial
    countdownValue.style.transform = "scale(1)"; // Reset escala

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownValue.innerText = countdown;
            countdownValue.style.color = "#FFFFFF";
            countdownValue.style.transform = "scale(1.1)"; // Escala sutil no número
            setTimeout(() => { countdownValue.style.transform = "scale(1)"; }, 300);
        } else {
            countdownValue.innerText = "GO!";
            countdownValue.style.color = "#1E40FF"; // Azul vívido para GO!
            countdownValue.style.transform = "scale(1.2)"; // Escala maior no GO!
            setTimeout(() => {
                hideCountdownModal();
                startGame();
            }, 800);
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }, 1000);
}

function hideCountdownModal() {
    document.getElementById("countdownModal").style.display = "none";
}

// ... (resto do código permanece igual: startGame, placePipes, moveBird, detectCollision)

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        // Inicia o loop de animação APENAS aqui
        animationId = requestAnimationFrame(update);
        pipeInterval = setInterval(placePipes, 1500);
    }
}

function update() {
    // Aplica a física e desenha APENAS se o jogo estiver ativo
    if (gameOver || !gameStarted) {
        return;
    }

    context.clearRect(0, 0, board.width, board.height);

    //bird
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
        showGameOverModal();
        return;
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
            showGameOverModal();
            return;
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); //removes first element from the array
    }

    //score
    context.fillStyle = "red";
    context.font = "45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }

    // Continua o loop APENAS se o jogo ainda estiver rodando
    if (!gameOver && gameStarted) {
        animationId = requestAnimationFrame(update);
    }
}

function placePipes() {
    if (gameOver || !gameStarted) {
        return;
    }

    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    let openingSpace = board.height / 4;

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {
        // Só pula se o jogo estiver rodando ATIVAMENTE (não durante contagem ou game over)
        if (gameStarted && !gameOver) {
            velocityY = -5.5; // Aumentei um pouco para compensar gravidade e tornar mais responsivo
        }
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
        a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
        a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
        a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}