const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const brickHitSound = new Audio('brick.wav');
const paddleWallHitSound = new Audio('ball.wav');

const startButton = document.getElementById("startButton");
const startMenu = document.getElementById("startMenu");
let gameStarted = false; // Estado do jogo

let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2; 
let dy = -2;

const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 5;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
let score = 0;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 }; 
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#feffff";
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#af5423";
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = "#FF7F50";
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Score: " + score, 8, 20);
}

const INITIAL_DX = 2; 
const INITIAL_DY = -2;

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy;
                    b.status = 0;
                    score++;

                    brickHitSound.currentTime = 0; // Reinicia o som para que ele possa tocar novamente rapidamente
                    brickHitSound.play();

                    dx *= 1.01;
                    dy *= 1.01;

                    console.log(`Velocidade atual: dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}`);

                    if (score === brickRowCount * brickColumnCount) {
                        alert("PARABÉNS, VOCÊ GANHOU!");
                        document.location.reload(); 
                    }
                }
            }
        }
    }
}

function movePaddle() {
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }
}


function draw() {
    if (!gameStarted) {
        return; // Sai da função se o jogo não tiver começado (embora o startButton já trate isso)
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    collisionDetection();
    movePaddle();

    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
        paddleWallHitSound.currentTime = 0; 
        paddleWallHitSound.play();
    }
    if (y + dy < ballRadius) {
        dy = -dy;
        paddleWallHitSound.currentTime = 0; 
        paddleWallHitSound.play();
    } 
    
    if (y + ballRadius >= canvas.height - paddleHeight) {
        
        if (x > paddleX && x < paddleX + paddleWidth) {
            
            y = canvas.height - paddleHeight - ballRadius; 
            
            const centerPaddle = paddleX + paddleWidth / 2;

            const hitDifference = x - centerPaddle;
            const normalizedDiff = hitDifference / (paddleWidth / 2);
            let currentSpeed = Math.sqrt(dx * dx + dy * dy);
            currentSpeed *= 1.01; 
            
            const angleFactor = 0.5; 
            
            dx = currentSpeed * normalizedDiff * angleFactor;
            dy = -Math.sqrt(currentSpeed * currentSpeed - dx * dx);
            paddleWallHitSound.currentTime = 0; 
            paddleWallHitSound.play();
        } else if (y + ballRadius > canvas.height) {
            alert("GAME OVER! Sua pontuação: " + score);
            document.location.reload();
            return; 
        }
    }

    x += dx;
    y += dy;

    requestAnimationFrame(draw);
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

startButton.addEventListener('click', () => {
    startMenu.classList.add('hidden');

    gameStarted = true;
    
    draw(); 
});