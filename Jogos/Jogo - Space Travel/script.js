const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Variáveis de Estado do Jogo
let score = 0;
let shield = 100;
let isGameOver = false; 
let gameState = "MENU"; 

// Variável de estado para a contagem regressiva
let isCountingDown = false;
let countdownTimer = 3; 

// Arrays de Objetos
let asteroids = [];
let bullets = [];
let explosions = []; 
let powerUps = []; 
let hitEffects = []; 
const keys = {}; 

// Configurações do Jogo
const ASTEROID_SPAWN_RATE_BASE = 1500; 
const BULLET_SPEED = 12; 
const BULLET_DAMAGE = 1; 
let asteroidInterval; 

// Variáveis de Dificuldade
let gameDifficultyFactor = 1.2; 
const SCORE_FOR_DIFFICULTY_INCREASE = 500; 
const MAX_DIFFICULTY_FACTOR = 3.0; 

// Variável para o deslocamento do fundo
let backgroundYOffset = 0;
const BACKGROUND_SCROLL_SPEED = 1.5; 

// Configurações de Tiro Automático
const SHOOT_RATE = 10; 
let bulletTimer = 0;   

// Variáveis para o Efeito Shake da Tela
let screenShakeMagnitude = 0;
let screenShakeDuration = 0;
const MAX_SHAKE_MAGNITUDE = 8; 
const SHAKE_DECAY = 0.85;     

// Variáveis de Invulnerabilidade (1.5 segundos)
const FPS = 60;
const INVULNERABILITY_DURATION = 1.5 * FPS; 
let invulnerabilityTimer = 0;

// Configurações de Power-up
let doubleShotActive = false;
let doubleShotTimer = 0; 
const POWER_UP_DROP_CHANCE = 0.05; 

const POWER_UP_TYPES = {
    SHIELD: { color: 'blue', size: 20, effectDuration: 0, effectValue: 25 },
    DOUBLE_SHOT: { color: 'gold', size: 20, effectDuration: 300, effectValue: 0 },
};

// Configurações para o Efeito de Impacto do Tiro
const HIT_EFFECT_COLORS = ['#FFD700', '#FFA500', '#FF4500']; 
const HIT_EFFECT_PARTICLES = 5;
const HIT_EFFECT_SIZE_MIN = 3;
const HIT_EFFECT_SIZE_MAX = 8;
const HIT_EFFECT_LIFESPAN = 15; 

// Configurações para o Recuo (Knockback) do Asteroide
const ASTEROID_KNOCKBACK_FORCE = 1.0; 
const ASTEROID_KNOCKBACK_DECAY = 0.9; 

// Tipos de Asteroides (Com Saúde/Vida implementada)
const ASTEROID_TYPES = {
    LARGE: { size: 70, damage: 25, speed: 1.8, score: 10, nextType: 'MEDIUM', shake: 6, maxAngle: 20, initialHealth: 3 }, 
    MEDIUM: { size: 50, damage: 15, speed: 2.8, score: 20, nextType: 'SMALL', shake: 3, maxAngle: 30, initialHealth: 3 }, 
    SMALL: { size: 30, damage: 5, speed: 2.5, score: 30, nextType: null, shake: 1, maxAngle: 45, initialHealth: 2 }      
};

// --- DECLARAÇÃO DE IMAGENS ---
const backgroundImage = new Image();
// Nomes de arquivos genéricos. Se você estiver usando imagens, verifique os nomes exatos.
backgroundImage.src = 'space_background.png'; 

const asteroidImage = new Image();
asteroidImage.src = 'asteroid.png'; 

const spaceshipImage = new Image();
spaceshipImage.src = 'spaceship.png'; 
// --- FIM DA DECLARAÇÃO DE IMAGENS ---

// Variáveis para Menu e Clique
let mouseX = 0;
let mouseY = 0;
const BUTTON_WIDTH = 250;
const BUTTON_HEIGHT = 50;
const BUTTON_X = canvas.width / 2 - BUTTON_WIDTH / 2;
const BUTTON_Y_START = canvas.height / 2 + 100; 


// =================================================================
// OBJETOS DO JOGO
// =================================================================

// Objeto Nave (Spaceship)
const spaceship = {
    x: canvas.width / 2 - 25, 
    y: canvas.height - 80, 
    width: 50, // Largura para desenhar a imagem
    height: 50, // Altura para desenhar a imagem
    speed: 5, // VELOCIDADE AJUSTADA
    
    // HITBOX AJUSTADA
    hitboxWidth: 30,
    hitboxHeight: 40,
    
    draw: function() {
        // Lógica de piscar (invulnerabilidade)
        if (invulnerabilityTimer > 0 && Math.floor(invulnerabilityTimer / 3) % 2 === 0) {
            return; 
        }

        // Desenha a imagem da nave
        if (spaceshipImage.complete && spaceshipImage.naturalHeight !== 0) {
            ctx.drawImage(spaceshipImage, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: Retângulo ciano
            let shipColor = 'cyan';
            if (shield < 50) shipColor = 'yellow';
            if (shield < 25) shipColor = 'red';
            ctx.fillStyle = shipColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },
    
    // Função para obter a área de colisão da nave
    getHitbox: function() {
        // Centraliza a hitbox no centro da imagem de 50x50
        const offsetX = (this.width - this.hitboxWidth) / 2;
        const offsetY = (this.height - this.hitboxHeight); // Coloca a hitbox mais baixa na nave
        
        return {
            x: this.x + offsetX,
            y: this.y + offsetY,
            width: this.hitboxWidth,
            height: this.hitboxHeight
        };
    }
};

// =================================================================
// FUNÇÕES DE CRIAÇÃO 
// =================================================================

/** Cria um novo asteroide. */
function createAsteroid(type = 'LARGE', x = null, y = null, angle = null, baseSpeed = null, health = null) {
    const config = ASTEROID_TYPES[type];
    
    const startX = x !== null ? x : Math.random() * (canvas.width - config.size);
    const startY = y !== null ? y : -config.size;
    
    const initialBaseSpeed = baseSpeed !== null ? baseSpeed : config.speed;
    const finalBaseSpeed = initialBaseSpeed * gameDifficultyFactor; 
    
    let finalAngle;
    if (angle !== null) {
        finalAngle = angle; 
    } else {
        const maxAngleRad = config.maxAngle * (Math.PI / 180);
        finalAngle = Math.random() * maxAngleRad * 2 - maxAngleRad; 
    }
    
    const speedY = Math.cos(finalAngle) * finalBaseSpeed;
    const speedX = Math.sin(finalAngle) * finalBaseSpeed;
    
    const initialHealth = health !== null ? health : config.initialHealth;

    const newAsteroid = {
        x: startX,
        y: startY,
        width: config.size,
        height: config.size,
        speedX: speedX, 
        speedY: speedY, 
        damage: config.damage,
        scoreValue: config.score,
        type: type, 
        nextType: config.nextType, 
        shakeMagnitude: config.shake,
        baseSpeed: finalBaseSpeed, 
        health: initialHealth, 
        knockbackX: 0, 
        knockbackY: 0, 

        draw: function() {
            // Desenha a imagem do asteroide
            if (asteroidImage.complete && asteroidImage.naturalHeight !== 0) {
                ctx.drawImage(asteroidImage, this.x, this.y, this.width, this.height);
            } else {
                // Fallback: Desenha um círculo cinza
                ctx.fillStyle = 'gray';
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }

            // Desenha a vida do asteroide sobre a imagem
            ctx.fillStyle = 'white'; 
            ctx.font = '12px "Press Start 2P"'; 
            ctx.textAlign = 'center';
            ctx.fillText(this.health.toString(), this.x + this.width / 2, this.y + this.height / 2 + 5);
        }
    };
    asteroids.push(newAsteroid);
}

/** Cria um tiro na posição da nave. */
function createBullet() {
    if (isGameOver || gameState !== "PLAYING") return;
    
    const spawnSingleBullet = (offsetX = 0) => {
        // Usa o centro da hitbox para o spawn do tiro
        const hitbox = spaceship.getHitbox();
        const newBullet = {
            x: hitbox.x + hitbox.width / 2 - 2 + offsetX, 
            y: hitbox.y,
            width: 4,
            height: 10,
            speed: BULLET_SPEED,
            damage: BULLET_DAMAGE, 
            draw: function() {
                ctx.fillStyle = doubleShotActive ? 'red' : 'lime'; 
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        };
        bullets.push(newBullet);
    };

    if (doubleShotActive) {
        spawnSingleBullet(-8);
        spawnSingleBullet(8);
    } else {
        spawnSingleBullet(0);
    }
}

/** Cria uma explosão de destruição (partículas de fogo). */
function createExplosion(x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    const numParticles = Math.floor(size * 1.5); 

    for (let i = 0; i < numParticles; i++) {
        const fireColors = ['#FF4500', '#FF8C00', '#FFA500', '#FFD700']; 
        const randomColor = fireColors[Math.floor(Math.random() * fireColors.length)];

        const particle = {
            x: centerX, 
            y: centerY,
            size: Math.random() * 6 + 2, 
            speedX: (Math.random() * 12 - 6), 
            speedY: (Math.random() * 12 - 6), 
            alpha: 1, 
            color: randomColor, 
            lifespan: Math.random() * 30 + 20 
        };
        explosions.push(particle);
    }
}

/** Cria um efeito de impacto (faíscas/partículas) quando um tiro acerta. */
function createHitEffect(x, y) {
    for (let i = 0; i < HIT_EFFECT_PARTICLES; i++) {
        const particle = {
            x: x,
            y: y,
            size: Math.random() * (HIT_EFFECT_SIZE_MAX - HIT_EFFECT_SIZE_MIN) + HIT_EFFECT_SIZE_MIN,
            speedX: (Math.random() - 0.5) * 6, 
            speedY: (Math.random() - 0.5) * 6, 
            color: HIT_EFFECT_COLORS[Math.floor(Math.random() * HIT_EFFECT_COLORS.length)],
            alpha: 1,
            lifespan: HIT_EFFECT_LIFESPAN
        };
        hitEffects.push(particle);
    }
}

/** Cria um power-up. */
function createPowerUp(x, y, type) {
    const config = POWER_UP_TYPES[type];
    const newPowerUp = {
        x: x,
        y: y,
        width: config.size,
        height: config.size,
        speed: ASTEROID_TYPES.SMALL.speed / 2, 
        type: type,
        draw: function() {
            ctx.fillStyle = config.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            ctx.fillStyle = 'black';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            const initial = type === 'SHIELD' ? 'S' : 'D';
            ctx.fillText(initial, this.x + this.width / 2, this.y + this.height / 2 + 3);
        }
    };
    powerUps.push(newPowerUp);
}

// =================================================================
// FUNÇÕES DE UI (DESENHO NO CANVAS - Usando Fonte Pixelizada)
// =================================================================

/** Helper function para quebrar texto em múltiplas linhas (tutorial). */
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y; 

    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, currentY);
    // Retorna a próxima posição Y após a quebra para continuar o layout
    return currentY + lineHeight; 
}

/** Desenha um botão retangular no Canvas. */
function drawButton(x, y, w, h, text) {
    const isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;

    ctx.fillStyle = isHover ? '#005f7c' : '#008CBA';
    ctx.fillRect(x, y, w, h);
    
    ctx.strokeStyle = isHover ? '#003d4f' : '#005f7c';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = 'white';
    ctx.font = '18px "Press Start 2P"'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
}

/** Desenha a tela de Menu Principal no Canvas. */
function drawMainMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '24px "Press Start 2P"'; 
    ctx.fillStyle = '#ffffffff'; 
    ctx.textAlign = 'center';
    ctx.fillText("SPACE TRAVEL", canvas.width / 2, canvas.height / 2 - 150); 

    drawButton(BUTTON_X, BUTTON_Y_START, BUTTON_WIDTH, BUTTON_HEIGHT, "JOGAR");
    drawButton(BUTTON_X, BUTTON_Y_START + BUTTON_HEIGHT + 20, BUTTON_WIDTH, BUTTON_HEIGHT, "TUTORIAL");
}

/** Desenha a tela de Tutorial no Canvas. (CORRIGIDA) */
function drawTutorialScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '24px "Press Start 2P"'; 
    ctx.fillStyle = 'lime';
    ctx.textAlign = 'center';
    ctx.fillText("TUTORIAL", canvas.width / 2, 60); 
    
    // --- Configurações de Layout ---
    let y = 120; 
    const lineHeight = 30; // Espaçamento grande entre blocos de títulos
    const textLineHeight = 25; // Linhas de texto mais próximas dentro de um bloco
    const marginX = 40; 
    const wrapWidth = canvas.width - 2 * marginX; 
    
    // --- CONTROLES ---
    ctx.font = '16px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText("CONTROLES:", marginX, y); y += lineHeight;
    
    ctx.font = '12px "Press Start 2P"'; 
    ctx.fillStyle = '#ccc';
    ctx.fillText("MOVIMENTO: W, A, S, D", marginX, y); y += textLineHeight;
    ctx.fillText("ATIRAR: ESPAÇO", marginX, y); y += lineHeight * 2; // Espaço após o bloco

    // --- OBJETIVO ---
    ctx.font = '16px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.fillText("OBJETIVO:", marginX, y); y += lineHeight;
    
    ctx.font = '12px "Press Start 2P"'; 
    ctx.fillStyle = '#ccc';
    const objectiveText = "PROTEJA SEU ESCUDO DOS ASTEROIDES. ASTEROIDES COM NUMEROS EXIGEM VARIOS TIROS PARA SEREM DESTRUIDOS.";
    
    // wrapText agora atualiza 'y' internamente e retorna a posição final
    y = wrapText(ctx, objectiveText, marginX, y, wrapWidth, textLineHeight);
    y += lineHeight; // Espaço após o bloco
    
    // --- POWER-UPS ---
    ctx.font = '16px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.fillText("POWER-UPS:", marginX, y); y += lineHeight;
    
    ctx.font = '12px "Press Start 2P"'; 
    ctx.fillStyle = 'blue';
    ctx.fillText("S (SHIELD): RESTAURA O ESCUDO.", marginX, y); y += textLineHeight;
    
    ctx.fillStyle = 'gold';
    ctx.fillText("D (DOUBLE SHOT): TIRO DUPLO TEMPORARIO.", marginX, y); y += lineHeight;

    // --- BOTÃO VOLTAR ---
    drawButton(BUTTON_X, canvas.height - 80, BUTTON_WIDTH, BUTTON_HEIGHT, "VOLTAR");
}


/** Desenha a tela de Game Over no Canvas. */
function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '30px "Press Start 2P"'; 
    ctx.fillStyle = '#FF4500'; 
    ctx.textAlign = 'center';
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = '16px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.fillText(`PONTUAÇÃO FINAL: ${score}`, canvas.width / 2, canvas.height / 2 - 30);

    drawButton(BUTTON_X, BUTTON_Y_START, BUTTON_WIDTH, BUTTON_HEIGHT, "JOGAR NOVAMENTE");
    drawButton(BUTTON_X, BUTTON_Y_START + BUTTON_HEIGHT + 20, BUTTON_WIDTH, BUTTON_HEIGHT, "MENU PRINCIPAL");
}


// =================================================================
// FUNÇÕES DE JOGABILIDADE 
// =================================================================

/** Aplica um tremor na tela. */
function applyScreenShake(magnitude, duration = 10) {
    screenShakeMagnitude = Math.max(screenShakeMagnitude, Math.min(magnitude, MAX_SHAKE_MAGNITUDE));
    screenShakeDuration = Math.max(screenShakeDuration, duration);
}

/** Atualiza o efeito de tremor da tela. */
function updateScreenShake() {
    if (screenShakeDuration > 0) {
        const offsetX = Math.random() * screenShakeMagnitude * 2 - screenShakeMagnitude;
        const offsetY = Math.random() * screenShakeMagnitude * 2 - screenShakeMagnitude;
        
        ctx.translate(offsetX, offsetY);
        
        screenShakeMagnitude *= SHAKE_DECAY; 
        screenShakeDuration--;
        
        if (screenShakeMagnitude < 0.5) {
            screenShakeMagnitude = 0;
            screenShakeDuration = 0;
        }
    }
}

/** Aplica o efeito do power-up. */
function applyPowerUpEffect(type) {
    const config = POWER_UP_TYPES[type];

    if (type === 'SHIELD') {
        shield = Math.min(100, shield + config.effectValue);
    } else if (type === 'DOUBLE_SHOT') {
        doubleShotActive = true;
        doubleShotTimer = config.effectDuration;
    }
}

/** Lida com o tempo de duração dos power-ups e timers. */
function handlePowerUpEffects() {
    if (doubleShotActive) {
        doubleShotTimer--;
        if (doubleShotTimer <= 0) {
            doubleShotActive = false;
        }
    }

    if (invulnerabilityTimer > 0) {
        invulnerabilityTimer--;
    }

    if (bulletTimer > 0) {
        bulletTimer--;
    }
}

/** Lida com o tiro automático. */
function handleShooting() {
    if (gameState !== "PLAYING") return; 

    if (keys['Space'] && bulletTimer <= 0) {
        createBullet();
        bulletTimer = SHOOT_RATE; 
    }
}

/** Desenha a contagem regressiva na tela. */
function drawCountdown() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '60px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const display = countdownTimer > 0 ? countdownTimer.toString() : 'GO!';
    
    ctx.fillText(display, canvas.width / 2, canvas.height / 2);
    
    ctx.textBaseline = 'alphabetic'; 
}

/** Desenha a pontuação e o escudo no canvas. */
function drawHUD() {
    ctx.font = '14px "Press Start 2P"'; 
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';

    ctx.fillText(`SCORE: ${score}`, 10, 30);

    let shieldColor = 'cyan';
    if (shield < 50) shieldColor = 'yellow';
    if (shield < 25) shieldColor = 'red';
    
    ctx.fillStyle = shieldColor;
    ctx.textAlign = 'right';
    ctx.fillText(`SHIELD: ${shield}%`, canvas.width - 10, 30);
    
    if (doubleShotActive) {
        ctx.font = '12px "Press Start 2P"'; 
        ctx.fillStyle = 'red';
        ctx.textAlign = 'right';
        const timerSeconds = Math.ceil(doubleShotTimer / FPS);
        ctx.fillText(`DOUBLE SHOT (${timerSeconds})`, canvas.width - 10, 55);
    }
}

/** Aumenta a dificuldade do jogo com base no score. */
function handleDifficulty() {
    if (gameState !== "PLAYING") return;

    const currentDifficultyLevel = Math.floor(score / SCORE_FOR_DIFFICULTY_INCREASE);
    const calculatedFactor = 1.2 + currentDifficultyLevel * 0.15; 
    
    const newFactor = Math.min(calculatedFactor, MAX_DIFFICULTY_FACTOR);

    if (newFactor > gameDifficultyFactor + 0.001) { 
        gameDifficultyFactor = newFactor;
        
        const newSpawnRate = ASTEROID_SPAWN_RATE_BASE / gameDifficultyFactor;
        
        if (asteroidInterval) clearInterval(asteroidInterval); 
        asteroidInterval = setInterval(() => createAsteroid('LARGE'), newSpawnRate);
        
        console.log(`DIFICULDADE AUMENTADA! Fator: ${gameDifficultyFactor.toFixed(2)}, Spawn Rate: ${newSpawnRate.toFixed(0)}ms`);
    }
}


// =================================================================
// FUNÇÕES DE ATUALIZAÇÃO E MOVIMENTO
// =================================================================

/** Atualiza a posição dos tiros. */
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed; 
        if (bullet.y < 0) {
            bullets.splice(i, 1);
        } else {
            bullet.draw();
        }
    }
}

/** Atualiza a posição dos asteroides (incluindo o recuo/knockback). */
function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        asteroid.y += asteroid.speedY + asteroid.knockbackY; 
        asteroid.x += asteroid.speedX + asteroid.knockbackX; 

        asteroid.knockbackX *= ASTEROID_KNOCKBACK_DECAY;
        asteroid.knockbackY *= ASTEROID_KNOCKBACK_DECAY;
        
        if (Math.abs(asteroid.knockbackX) < 0.1) asteroid.knockbackX = 0;
        if (Math.abs(asteroid.knockbackY) < 0.1) asteroid.knockbackY = 0;

        const isOffScreen = (
            asteroid.y > canvas.height || 
            asteroid.x < -asteroid.width || 
            asteroid.x > canvas.width       
        );
        
        if (isOffScreen) {
            asteroids.splice(i, 1);
        } else {
            asteroid.draw();
        }
    }
}

/** Atualiza e desenha as partículas de explosão. */
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const particle = explosions[i];

        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.alpha -= 0.05; 
        particle.lifespan--;

        if (particle.lifespan <= 0 || particle.alpha <= 0) {
            explosions.splice(i, 1);
        } else {
            ctx.globalAlpha = particle.alpha; 
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            ctx.globalAlpha = 1; 
        }
    }
}

/** Atualiza e desenha os efeitos de impacto de tiro. */
function updateHitEffects() {
    for (let i = hitEffects.length - 1; i >= 0; i--) {
        const particle = hitEffects[i];
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.alpha -= (1 / particle.lifespan); 
        particle.lifespan--;

        if (particle.lifespan <= 0 || particle.alpha <= 0) {
            hitEffects.splice(i, 1);
        } else {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            ctx.globalAlpha = 1; 
        }
    }
}


/** Atualiza a posição dos power-ups. */
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        powerUp.y += powerUp.speed; 

        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
        } else {
            powerUp.draw();
        }
    }
}

/** Lida com a movimentação da nave. */
function handleMovement() {
    if (gameState !== "PLAYING") return;
    
    if (keys['KeyA'] && spaceship.x > 0) {
        spaceship.x -= spaceship.speed;
    }
    if (keys['KeyD'] && spaceship.x < canvas.width - spaceship.width) {
        spaceship.x += spaceship.speed;
    }
    if (keys['KeyW'] && spaceship.y > 0) {
        spaceship.y -= spaceship.speed;
    }
    if (keys['KeyS'] && spaceship.y < canvas.height - spaceship.height) {
        spaceship.y += spaceship.speed;
    }
}


// =================================================================
// COLISÕES E DESTRUIÇÃO
// =================================================================

/** Verifica se dois retângulos se sobrepõem. */
function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

/** Quebra o asteroide em dois pedaços menores. */
function breakAsteroid(asteroid) {
    if (!asteroid.nextType) return; 
    
    const newType = asteroid.nextType;
    const MAX_SPREAD = ASTEROID_TYPES[newType].size / 2; 
    
    const currentAngle = Math.atan2(asteroid.speedX, asteroid.speedY); 
    const angleSpreadRad = 30 * (Math.PI / 180); 
    
    const newHealth = ASTEROID_TYPES[newType].initialHealth;

    const angle1 = currentAngle - angleSpreadRad + (Math.random() * angleSpreadRad);
    const offset1 = Math.random() * MAX_SPREAD - (MAX_SPREAD / 2); 
    const x1 = asteroid.x + offset1;
    const y1 = asteroid.y;
    createAsteroid(newType, x1, y1, angle1, asteroid.baseSpeed, newHealth); 
    
    const angle2 = currentAngle + angleSpreadRad - (Math.random() * angleSpreadRad);
    const offset2 = Math.random() * MAX_SPREAD - (MAX_SPREAD / 2);
    const x2 = asteroid.x + offset2;
    const y2 = asteroid.y;
    createAsteroid(newType, x2, y2, angle2, asteroid.baseSpeed, newHealth); 
}

/** Checa todas as colisões. */
function checkCollisions() {
    if (gameState !== "PLAYING") return; 

    // --- 1. TIRO vs ASTEROIDE ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        let bulletHit = false;

        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];

            if (isColliding(bullet, asteroid)) {
                
                const impactX = bullet.x + bullet.width / 2;
                const impactY = bullet.y + bullet.height / 2;
                createHitEffect(impactX, impactY);

                asteroid.knockbackY = -ASTEROID_KNOCKBACK_FORCE; 
                asteroid.knockbackX = 0; 
                
                asteroid.health -= bullet.damage;
                bulletHit = true;

                if (asteroid.health <= 0) {
                    breakAsteroid(asteroid); 
                    createExplosion(asteroid.x, asteroid.y, asteroid.width); 
                    applyScreenShake(asteroid.shakeMagnitude);

                    if (Math.random() < POWER_UP_DROP_CHANCE) {
                        const types = Object.keys(POWER_UP_TYPES);
                        const randomType = types[Math.floor(Math.random() * types.length)];
                        createPowerUp(asteroid.x + asteroid.width / 2 - 10, asteroid.y + asteroid.height / 2 - 10, randomType);
                    }

                    score += asteroid.scoreValue; 
                    asteroids.splice(j, 1);
                    break; 
                }
                
                break; 
            }
        }
        
        if (bulletHit) {
            bullets.splice(i, 1);
        }
    }

    // --- 2. NAVE vs ASTEROIDE ---
    const spaceshipHitbox = spaceship.getHitbox(); // Obtém a hitbox real da nave
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        if (isColliding(spaceshipHitbox, asteroid)) { // Usa a hitbox na colisão
            if (invulnerabilityTimer <= 0) {
                shield -= asteroid.damage;
                invulnerabilityTimer = INVULNERABILITY_DURATION;

                applyScreenShake(asteroid.shakeMagnitude / 2); 

                if (shield <= 0) {
                    endGame();
                }
            }

            createExplosion(asteroid.x, asteroid.y, asteroid.width); 
            asteroids.splice(i, 1);

            if (isGameOver) break; 
        }
    }

    // --- 3. NAVE vs POWER-UP ---
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (isColliding(spaceshipHitbox, powerUp)) { // Usa a hitbox na colisão
            applyPowerUpEffect(powerUp.type);
            powerUps.splice(i, 1); 
        }
    }
}


// =================================================================
// CONTROLE DE ESTADO E INICIALIZAÇÃO
// =================================================================

/** Finaliza o jogo. */
function endGame() {
    isGameOver = true;
    gameState = "GAME_OVER";
    clearInterval(asteroidInterval); 
}

/** Inicializa o estado do jogo (chamado por Jogar ou Jogar Novamente). */
function initGame() {
    score = 0;
    shield = 100;
    isGameOver = false;
    countdownTimer = 3; 
    gameDifficultyFactor = 1.2; 
    asteroids = [];
    bullets = [];
    explosions = []; 
    powerUps = []; 
    hitEffects = []; 
    doubleShotActive = false; 
    doubleShotTimer = 0;
    invulnerabilityTimer = 0; 
    bulletTimer = 0; 
    backgroundYOffset = 0; 
    spaceship.x = canvas.width / 2 - 25; 
    spaceship.y = canvas.height - 80;
    screenShakeMagnitude = 0;
    screenShakeDuration = 0;
    
    startGameLoop();
}

/** Configura os loops e inicia a contagem. */
function startGameLoop() {
    if (asteroidInterval) clearInterval(asteroidInterval); 
    
    gameState = "COUNTDOWN";
    
    const interval = setInterval(() => {
        countdownTimer--;
        if (countdownTimer < 0) {
            clearInterval(interval);
            gameState = "PLAYING";
            const initialSpawnRate = ASTEROID_SPAWN_RATE_BASE / gameDifficultyFactor;
            asteroidInterval = setInterval(() => createAsteroid('LARGE'), initialSpawnRate);
            console.log("Contagem regressiva finalizada. Jogo iniciado!");
        }
    }, 1000); 
}


// =================================================================
// LOOP PRINCIPAL
// =================================================================

/** Loop principal do jogo. */
function updateGame() {
    ctx.save();
    
    updateScreenShake(); 

    const scrollSpeed = (gameState === "MENU" || gameState === "TUTORIAL" || gameState === "GAME_OVER") ? BACKGROUND_SCROLL_SPEED / 2 : BACKGROUND_SCROLL_SPEED;
    backgroundYOffset += scrollSpeed;
    if (backgroundYOffset >= canvas.height) {
        backgroundYOffset = 0; 
    }
    // Desenha a imagem de fundo duas vezes para criar um efeito de loop infinito
    ctx.drawImage(backgroundImage, 0, backgroundYOffset, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, backgroundYOffset - canvas.height, canvas.width, canvas.height);
    
    switch (gameState) {
        case "MENU":
            drawMainMenu();
            break;
            
        case "TUTORIAL":
            drawTutorialScreen();
            break;

        case "COUNTDOWN":
        case "PLAYING":
            spaceship.draw();
            handleShooting(); 
            updateBullets();
            updateAsteroids();
            updateExplosions(); 
            updateHitEffects(); 
            updatePowerUps();
            
            if (gameState === "PLAYING") {
                checkCollisions();
                handlePowerUpEffects(); 
                handleDifficulty(); 
            }
            
            drawHUD();

            if (gameState === "COUNTDOWN") {
                drawCountdown(); 
            }
            break;

        case "GAME_OVER":
            drawGameOverScreen();
            break;
    }

    ctx.restore();
    requestAnimationFrame(updateGame);
}


// =================================================================
// EVENT LISTENERS DE INPUT
// =================================================================

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === "PLAYING") e.preventDefault();
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const checkButtonClick = (btnX, btnY) => {
        return clickX >= btnX && clickX <= btnX + BUTTON_WIDTH && 
               clickY >= btnY && clickY <= btnY + BUTTON_HEIGHT;
    };

    if (gameState === "MENU") {
        const playBtnY = BUTTON_Y_START;
        const tutorialBtnY = BUTTON_Y_START + BUTTON_HEIGHT + 20;

        if (checkButtonClick(BUTTON_X, playBtnY)) {
            initGame(); 
        } else if (checkButtonClick(BUTTON_X, tutorialBtnY)) {
            gameState = "TUTORIAL"; 
        }
    } else if (gameState === "TUTORIAL") {
        const backBtnY = canvas.height - 80;
        if (checkButtonClick(BUTTON_X, backBtnY)) {
            gameState = "MENU"; 
        }
    } else if (gameState === "GAME_OVER") {
        const restartBtnY = BUTTON_Y_START;
        const menuBtnY = BUTTON_Y_START + BUTTON_HEIGHT + 20;

        if (checkButtonClick(BUTTON_X, restartBtnY)) {
            initGame(); 
        } else if (checkButtonClick(BUTTON_X, menuBtnY)) {
            gameState = "MENU"; 
        }
    }
});


setInterval(handleMovement, 1000 / 60);

// =================================================================
// INÍCIO DO JOGO (GARANTE QUE AS IMAGENS ESTÃO CARREGADAS)
// =================================================================

let gameStarted = false;
const startTime = Date.now();

function attemptStartGame() {
    if (gameStarted) return;
    
    // Verifica se todas as três imagens estão carregadas OU se passou muito tempo (fallback)
    const allImagesLoaded = backgroundImage.complete && asteroidImage.complete && spaceshipImage.complete;

    if (allImagesLoaded || Date.now() - startTime > 3000) {
        gameStarted = true;
        requestAnimationFrame(updateGame);
        console.log("Pré-inicialização completa. Desenhando Menu Principal no Canvas.");
    } else {
        setTimeout(attemptStartGame, 100);
    }
}

// Adiciona os event listeners para as três imagens
backgroundImage.onload = attemptStartGame;
asteroidImage.onload = attemptStartGame;
spaceshipImage.onload = attemptStartGame;

// Em caso de erro ao carregar as imagens, tente iniciar o jogo após um aviso
backgroundImage.onerror = () => {
    console.warn("Erro ao carregar a imagem de fundo. Usando cor de fundo padrão.");
    attemptStartGame();
};
asteroidImage.onerror = () => {
    console.warn("Erro ao carregar a imagem do asteroide. Usando fallback de círculo.");
    attemptStartGame();
};
spaceshipImage.onerror = () => { 
    console.warn("Erro ao carregar a imagem da nave. Usando fallback de retângulo.");
    attemptStartGame();
};

attemptStartGame();