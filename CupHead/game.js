const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===================================
// NOVOS TAMANHOS DE TELA
// ===================================
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let lastTime = 0;

// ===================================
// VARIÁVEIS DE ESTADO DO JOGO (HUD) 📊
// ===================================
let playerLives = 3;
let score = 0;
let phaseTimer = 0;
let countdownTimer = 0;
const COUNTDOWN_DURATION = 3.0;

let isInvincible = false;
const INVINCIBILITY_DURATION = 1.0;


// ===================================
// PRÉ-CARREGAMENTO DE IMAGENS 🖼️
// (ATENÇÃO: VERIFIQUE SE ESTES CAMINHOS CORRESPONDEM AOS SEUS ARQUIVOS)
// ===================================
const ASSETS = {};
let assetsLoadedCount = 0;
const assetsToLoad = [
    { name: 'playerRun', path: 'Video Game Running Sticker by Xbox.gif' },
    { name: 'playerIdle', path: 'Xbox One Microsoft Sticker by Xbox.gif' },
    { name: 'bossPotato', path: 'image_03a6dc.png' }, 
    { name: 'bossOnion', path: 'image_033201.png' }, 
    { name: 'bossCarrot', path: 'image_d0cfe5.png' }, 
    { name: 'tearProjectile', path: 'image_0323b6.png' }, 
    { name: 'carrotProjectile', path: 'image_d0c0c0.png' }, 
    { name: 'backgroundGarden', path: 'image_0314d6.jpg' },
    { name: 'playerProjectile', path: 'image_cf5ca2.png' } // <--- CORRIGIDO: Agora usa a imagem do tiro azul
];
const totalAssets = assetsToLoad.length; // Novo contador de total

function loadAssets() {
    return new Promise(resolve => {
        assetsToLoad.forEach(asset => {
            const img = new Image();
            img.src = asset.path;
            
            const handleLoad = () => {
                ASSETS[asset.name] = img;
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    resolve();
                }
            };
            
            const handleError = () => {
                console.error(`Erro ao carregar a imagem: ${asset.path}. Usando fallback de cor.`);
                ASSETS[asset.name] = null; // Marcar como nula em caso de falha
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    resolve();
                }
            };

            img.onload = handleLoad;
            img.onerror = handleError;
            
            // Garantir que a imagem não seja marcada como carregada instantaneamente
            // se o carregamento já estiver completo
            if (img.complete && img.naturalWidth !== 0) {
                 handleLoad();
            } else if (img.complete && img.naturalWidth === 0) {
                 handleError();
            }
        });
    });
}


// ===================================
// CONSTANTES DE FÍSICA E CENÁRIO 🌍
// ===================================
const GRAVITY = 800;
const JUMP_VELOCITY = -450;
const PLATFORM_Y = GAME_HEIGHT - 100; // Nível do chão

const GAME_STATE = {
    LOADING: 'LOADING',
    COUNTDOWN_PHASE_1: 'COUNTDOWN_PHASE_1',
    BOSS_FIGHT: 'BOSS_FIGHT',
    COUNTDOWN_PHASE_2: 'COUNTDOWN_PHASE_2',
    BOSS_FIGHT_PHASE_2: 'BOSS_FIGHT_PHASE_2',
    COUNTDOWN_PHASE_3: 'COUNTDOWN_PHASE_3',
    BOSS_FIGHT_PHASE_3: 'BOSS_FIGHT_PHASE_3',
    EXPLORATION: 'EXPLORATION',
    VICTORY: 'VICTORY',
    GAME_OVER: 'GAME_OVER'
};
let gameState = GAME_STATE.LOADING;

const LEVEL_DATA = {
    BOSS_FIGHT: [
        // Apenas a plataforma do chão
        { x: 0, y: PLATFORM_Y, width: GAME_WIDTH, height: 20, color: 'rgba(0, 0, 0, 0)' }
    ],
    EXPLORATION: [
        { x: 0, y: PLATFORM_Y, width: 250, height: 20, color: 'darkgreen' },
        { x: 350, y: PLATFORM_Y - 50, width: 100, height: 10, color: 'gray' },
        { x: 500, y: PLATFORM_Y, width: 300, height: 20, color: 'darkgreen' },
        { x: 150, y: 350, width: 80, height: 10, color: 'gray' },
        { x: 600, y: 400, width: 100, height: 10, color: 'gray' }
    ]
};

let currentPlatforms = LEVEL_DATA.BOSS_FIGHT;

// ===================================
// CLASSE INIMIGO SIMPLES 🐛
// ===================================
class Enemy {
    constructor(x, y, range = 100, speed = 80) {
        this.width = 30;
        this.height = 30;
        this.x = x;
        this.y = y - this.height;
        this.speed = speed;
        this.color = 'yellowgreen';
        this.active = true;

        this.startX = x;
        this.range = range;
        this.direction = 1;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.x += this.speed * this.direction * deltaTime;

        if (this.direction === 1 && this.x > this.startX + this.range) {
            this.direction = -1;
        } else if (this.direction === -1 && this.x < this.startX - this.range) {
            this.direction = 1;
        }
    }

    draw() {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 + this.direction * 5, this.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ===================================
// CLASSE JOGADOR 🤸
// ===================================
class Player {
    constructor() {
        this.baseWidth = 50;
        this.baseHeight = 70;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
        this.x = GAME_WIDTH / 4;
        this.y = PLATFORM_Y - this.height;
        this.speed = 250;
        this.direction = 1;

        this.vy = 0;
        this.isGrounded = false;

        this.color = 'blue';
        this.shooting = false;

        this.currentState = 'idle';
    }

    takeDamage() {
        if (isInvincible) return;

        playerLives--;
        isInvincible = true;
        this.color = 'red';

        if (playerLives <= 0) {
            gameState = GAME_STATE.GAME_OVER;
            console.log("Game Over!");
            return;
        }

        setTimeout(() => {
            isInvincible = false;
            this.color = 'blue';
        }, INVINCIBILITY_DURATION * 1000);
    }

    jump() {
        if (this.isGrounded) {
            this.vy = JUMP_VELOCITY;
            this.isGrounded = false;
        }
    }

    update(deltaTime) {
        if (gameState === GAME_STATE.GAME_OVER) return;

        let dx = 0;
        if (keys['ArrowLeft'] || keys['a']) dx = -1;
        if (keys['ArrowRight'] || keys['d']) dx = 1;

        if (dx !== 0) {
            this.direction = dx;
        }

        const currentSpeed = this.speed;
        this.x += dx * currentSpeed * deltaTime;

        this.x = Math.max(0, Math.min(GAME_WIDTH - this.width, this.x));

        this.vy += GRAVITY * deltaTime;
        this.y += this.vy * deltaTime;

        this.isGrounded = false;

        currentPlatforms.forEach(p => {
            if (this.y + this.height > p.y && this.y < p.y + p.height &&
                this.x + this.width > p.x && this.x < p.x + p.width) {

                if (this.vy > 0 && this.y + this.height - (this.vy * deltaTime) <= p.y) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                }
                else if (this.vy < 0 && this.y - (this.vy * deltaTime) >= p.y + p.height) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                    this.isGrounded = 0;
                }
            }
        });

        // Atualização do Estado de Animação
        if (!this.isGrounded) {
            this.currentState = 'jump';
        } else if (dx !== 0) {
            this.currentState = 'run';
        } else {
            this.currentState = 'idle';
        }
    }

    draw() {
        if (isInvincible && Math.floor(lastTime / 100) % 2 === 0) {
            return;
        }

        let spriteToDraw;

        if (this.currentState === 'run' || this.currentState === 'jump') {
            spriteToDraw = ASSETS.playerRun;
        } else {
            spriteToDraw = ASSETS.playerIdle;
        }

        if (!spriteToDraw) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        ctx.save();

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;

        ctx.translate(playerCenterX, playerCenterY);

        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }

        const spriteDrawWidth = 100;
        const spriteDrawHeight = 100;

        let yOffset = (this.height / 2) - (spriteDrawHeight * 0.4);

        ctx.drawImage(
            spriteToDraw,
            -spriteDrawWidth / 2,
            -spriteDrawHeight / 2 + yOffset,
            spriteDrawWidth,
            spriteDrawHeight
        );

        ctx.restore();
    }
}


// ===================================
// CLASSE PROJÉTIL (HOMING FUNCIONAL)
// ===================================
class Projectile {
    constructor(x, y, vx, vy, color = 'yellow', hasGravity = false, isTear = false, isCarrot = false) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.velocity = { x: vx, y: vy };
        this.color = color;
        this.active = true;
        this.hasGravity = hasGravity;
        this.isTear = isTear;
        this.isCarrot = isCarrot;
    }

    update(deltaTime) {
        // --- Lógica de Homing (Teleguiado) para o projétil da cenoura ---
        if (this.isCarrot && player.active) {
            const targetX = player.x + player.width / 2;
            const targetY = player.y + player.height / 2;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const speed = 300; // Velocidade de rastreamento

            // Normaliza o vetor de direção e aplica a velocidade
            if (distance > 0) {
                this.velocity.x = (dx / distance) * speed;
                this.velocity.y = (dy / distance) * speed;
            }
        }
        // ------------------------------------------------------------------

        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Gravidade condicional
        if (this.hasGravity) {
            this.velocity.y += GRAVITY * deltaTime * 0.5;
        }

        if (this.x < 0 || this.x > GAME_WIDTH || this.y > GAME_HEIGHT || this.y < 0) {
            this.active = false;
        }
    }

    draw() {
        if (this.isCarrot && ASSETS.carrotProjectile) {
            const drawSize = 80; // Tamanho do projétil da cenoura
            ctx.drawImage(ASSETS.carrotProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        } else if (this.isTear && ASSETS.tearProjectile) {
            // Projétil de lágrima
            const drawSize = 40;
            ctx.drawImage(ASSETS.tearProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        } else if (this.color === 'yellow' && ASSETS.playerProjectile) { 
            // Desenha a imagem para o projétil do jogador, mantendo o tamanho original do círculo (raio * 2)
            const drawSize = this.radius * 2; 
            ctx.drawImage(ASSETS.playerProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        }
        else {
            // Desenho padrão (círculo) para outros projéteis
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ===================================
// CLASSE BOSS 🥔🧅🥕
// ===================================
class Boss {
    constructor(type = 'potato') {
        this.type = type;
        this.active = true;
        this.hp = 0;
        this.maxHp = 0;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.color = 'red';

        this.attackTimer = 0;
        this.timeBetweenAttacks = 0;
        this.shotCounter = 0;
        this.attackSequence = 0;
        this.bossDirection = 1;

        if (this.type === 'potato') {
            this.setupPotato();
        } else if (this.type === 'onion') {
            this.setupOnion();
        } else if (this.type === 'carrot') {
            this.setupCarrot();
        }
    }

    setupPotato() {
        this.width = 150;
        this.height = 130;
        this.x = GAME_WIDTH - this.width - 80;
        this.y = PLATFORM_Y - this.height;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.timeBetweenAttacks = 0.6;
        this.attackSequence = 4;
        this.bossDirection = -1;
    }

    setupOnion() {
        this.width = 150;
        this.height = 160;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = PLATFORM_Y - this.height;
        this.maxHp = 120;
        this.hp = this.maxHp;
        this.timeBetweenAttacks = 1.2;
        this.attackSequence = 1;
        this.color = 'purple';
    }

    setupCarrot() { // SETUP DA CENOURA (Maior e Centralizada)
        this.width = 250;
        this.height = 300;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = PLATFORM_Y - this.height;
        this.maxHp = 150;
        this.hp = this.maxHp;
        this.timeBetweenAttacks = 0.2;
        this.attackSequence = 3;
        this.color = 'orange';
    }

    update(deltaTime) {
        if (!this.active) return;

        if (this.hp <= 0) {
            this.active = false;
            // Lógica de transição de fase
            if (this.type === 'potato') {
                gameState = GAME_STATE.COUNTDOWN_PHASE_2;
                countdownTimer = 0;
            } else if (this.type === 'onion') {
                gameState = GAME_STATE.COUNTDOWN_PHASE_3;
                countdownTimer = 0;
            } else if (this.type === 'carrot') {
                gameState = GAME_STATE.VICTORY;
            }
            return;
        }

        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.timeBetweenAttacks) {
            this.executeAttack();
            this.attackTimer = 0;
        }
    }

    executeAttack() {
        if (this.type === 'potato') {
            this.executePotatoAttack();
        } else if (this.type === 'onion') {
            this.executeOnionAttack();
        } else if (this.type === 'carrot') {
            this.executeCarrotAttack();
        }
    }

    executePotatoAttack() {
        const bulletSpeed = 400;
        const spawnX = this.x + this.width / 2;
        const spawnY = this.y + this.height * 0.7;

        if (this.shotCounter < this.attackSequence - 1) {
            const vx = this.bossDirection * bulletSpeed;
            const vy = 0;
            projectiles.push(new Projectile(spawnX, spawnY, vx, vy, 'saddlebrown'));
            this.timeBetweenAttacks = 0.45;
        } else {
            const vx = this.bossDirection * (bulletSpeed * 0.8);
            const vy = 0;
            projectiles.push(new Projectile(spawnX, spawnY, vx, vy, 'pink'));
            this.timeBetweenAttacks = 1.0;
        }

        this.shotCounter++;
        if (this.shotCounter >= this.attackSequence) {
            this.shotCounter = 0;
            this.bossDirection *= -1;
        }
    }

    executeOnionAttack() {
        const tearSpeed = 200;
        const tearRadius = 15;

        const spawnX = Math.random() * (GAME_WIDTH - tearRadius * 2) + tearRadius;
        const spawnY = 0;

        projectiles.push(new Projectile(spawnX, spawnY, 0, tearSpeed, 'lightblue', true, true));

        this.timeBetweenAttacks = 0.5;
    }

    executeCarrotAttack() { // ATAQUE DA CENOURA (HOMING MISSILE) - CORRIGIDO
        const spawnX = this.x + this.width / 2;
        const spawnY = this.y + this.height * 0.4; // Ajustado para sair do centro da cenoura

        // === CORREÇÃO: ADICIONAR VELOCIDADE INICIAL PARA FORÇAR A SAÍDA ===
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const dx = targetX - spawnX;
        const dy = targetY - spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const launchSpeed = 300; 
        
        let vx = 0;
        let vy = 0;

        if (distance > 0) {
            // Calcula o vetor de velocidade inicial na direção do jogador
            vx = (dx / distance) * launchSpeed;
            vy = (dy / distance) * launchSpeed;
        }
        // ==================================================================

        // Projétil Cenoura (isCarrot: true). Usando a velocidade calculada.
        projectiles.push(new Projectile(spawnX, spawnY, vx, vy, 'orange', false, false, true));

        this.shotCounter++;

        if (this.shotCounter < this.attackSequence) {
            this.timeBetweenAttacks = 0.3;
        } else {
            this.shotCounter = 0;
            this.timeBetweenAttacks = 1.5;
        }
    }

    draw() {
        if (!this.active) return;

        let spriteToDraw;
        if (this.type === 'potato' && ASSETS.bossPotato) {
            spriteToDraw = ASSETS.bossPotato;
        } else if (this.type === 'onion' && ASSETS.bossOnion) {
            spriteToDraw = ASSETS.bossOnion;
        } else if (this.type === 'carrot' && ASSETS.bossCarrot) {
            spriteToDraw = ASSETS.bossCarrot;
        }


        if (spriteToDraw) {
            ctx.drawImage(spriteToDraw, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Barra de vida do boss
        const barWidth = 200;
        const barHeight = 10;
        const currentHpWidth = (this.hp / this.maxHp) * barWidth;

        ctx.fillStyle = 'gray';
        ctx.fillRect(GAME_WIDTH / 2 - barWidth / 2, 20, barWidth, barHeight);
        ctx.fillStyle = 'lime';
        ctx.fillRect(GAME_WIDTH / 2 - barWidth / 2, 20, currentHpWidth, barHeight);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(GAME_WIDTH / 2 - barWidth / 2, 20, barWidth, barHeight);
    }
}


// ===================================
// INICIALIZAÇÃO E GERENCIAMENTO DE OBJETOS
// ===================================
let player = new Player();
let currentBoss = new Boss('potato');
let projectiles = [];
let enemies = [
    new Enemy(200, PLATFORM_Y, 150, 80),
    new Enemy(600, PLATFORM_Y - 100, 50, 50)
];

let keys = {};

// ===================================
// O LOOP PRINCIPAL DO JOGO 🔄
// ===================================
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (gameState === GAME_STATE.LOADING) {
        drawLoading();
        return requestAnimationFrame(gameLoop);
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// ===================================
// FUNÇÃO UPDATE (Lógica do Jogo) ⚙️
// ===================================
function update(deltaTime) {
    if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.VICTORY) return;

    // --- Lógica de Contagem Regressiva ---
    if (gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
        countdownTimer += deltaTime;

        if (countdownTimer >= COUNTDOWN_DURATION) {
            countdownTimer = 0;
            // Transiciona para a próxima fase ativa
            if (gameState === GAME_STATE.COUNTDOWN_PHASE_1) {
                gameState = GAME_STATE.BOSS_FIGHT;
            } else if (gameState === GAME_STATE.COUNTDOWN_PHASE_2) {
                gameState = GAME_STATE.BOSS_FIGHT_PHASE_2;
                currentBoss = new Boss('onion');
                phaseTimer = 0;
            } else if (gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
                gameState = GAME_STATE.BOSS_FIGHT_PHASE_3;
                currentBoss = new Boss('carrot');
                phaseTimer = 0;
            }
        }
        return;
    }
    // --- Fim da Lógica de Contagem Regressiva ---

    phaseTimer += deltaTime;

    player.update(deltaTime);

    // Atualiza o boss atual
    if ((gameState === GAME_STATE.BOSS_FIGHT || gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 || gameState === GAME_STATE.BOSS_FIGHT_PHASE_3) && currentBoss.active) {
        currentBoss.update(deltaTime);
    }

    if (gameState === GAME_STATE.EXPLORATION) {
        enemies.forEach(e => e.update(deltaTime));
        enemies = enemies.filter(e => e.active);
    }

    projectiles = projectiles.filter(p => p.active);
    projectiles.forEach(p => p.update(deltaTime));

    // --- Checagem de Colisão ---
    projectiles.forEach(p => {
        if (p.color === 'yellow') { // Tiro do jogador
            // Colisão do tiro do jogador com o Boss atual
            if ((gameState === GAME_STATE.BOSS_FIGHT || gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 || gameState === GAME_STATE.BOSS_FIGHT_PHASE_3) &&
                currentBoss.active && checkCollision(p, currentBoss)) {
                p.active = false;
                currentBoss.hp -= 2;
            }
            // Colisão do tiro do jogador com inimigos
            if (gameState === GAME_STATE.EXPLORATION) {
                enemies.forEach(e => {
                    if (e.active && checkRectRectCollision(p, e)) {
                        p.active = false;
                        e.active = false;
                        score += 100;
                    }
                });
            }
        }

        // Colisão do projétil do Boss/Inimigo com o jogador
        if (p.color !== 'yellow' && checkCollision(p, player)) {
            p.active = false;
            player.takeDamage();
        }
    });

    // --- Colisão Jogador vs Inimigo (Toque) ---
    if (gameState === GAME_STATE.EXPLORATION) {
        enemies.forEach(e => {
            if (e.active && checkRectRectCollision(player, e)) {
                player.takeDamage();
            }
        });
    }

    // --- Condição de Vitória Completa (Para a fase de exploração) ---
    if (gameState === GAME_STATE.EXPLORATION && player.x > GAME_WIDTH - player.width) {
        gameState = GAME_STATE.VICTORY;
    }
}

// ===================================
// FUNÇÃO DRAW (Desenho na Tela) 🎨
// ===================================
function draw() {
    // SEMPRE desenha a imagem de fundo primeiro
    if (ASSETS.backgroundGarden) {
        ctx.drawImage(ASSETS.backgroundGarden, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        // Fallback para cor sólida se a imagem não carregar
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // As plataformas
    currentPlatforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // --- Lógica de Desenho da Contagem Regressiva ---
    if (gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
        ctx.textAlign = 'center';

        let phaseText = '';
        if (gameState === GAME_STATE.COUNTDOWN_PHASE_2) {
            phaseText = 'FASE 2';
        } else if (gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
            phaseText = 'FASE 3';
        }

        if (phaseText) {
            ctx.fillStyle = 'yellow';
            ctx.font = '50px Arial';
            ctx.fillText(phaseText, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);
        }

        let displayValue;
        let fontSize;
        const timeRemaining = COUNTDOWN_DURATION - countdownTimer;
        const integerPart = Math.ceil(timeRemaining);
        const fractionalPart = timeRemaining - Math.floor(timeRemaining);

        if (timeRemaining > 0.01) {
            displayValue = integerPart.toString();
            fontSize = 100 + (1 - fractionalPart) * 50;
        } else {
            displayValue = 'GO!';
            fontSize = 120;
        }

        ctx.fillStyle = 'red';
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(displayValue, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    }
    // --- Fim da Lógica de Desenho da Contagem Regressiva ---


    player.draw();

    // Desenha o boss atual
    if ((gameState === GAME_STATE.BOSS_FIGHT || gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 || gameState === GAME_STATE.BOSS_FIGHT_PHASE_3) && currentBoss.active) {
        currentBoss.draw();
    }

    if (gameState === GAME_STATE.EXPLORATION) {
        enemies.forEach(e => e.draw());
    }

    projectiles.forEach(p => p.draw());

    // --- DESENHO DO HUD (VIDA, SCORE, TEMPO) ---
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';

    ctx.fillText(`VIDA: ${playerLives}`, 10, 50);
    ctx.fillText(`PONTOS: ${score}`, 10, 80);

    const minutes = Math.floor(phaseTimer / 60);
    const seconds = Math.floor(phaseTimer % 60);
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.fillText(`TEMPO: ${timeString}`, GAME_WIDTH - 10, 50);
    ctx.textAlign = 'left';

    // Mensagens de Estado
    if (gameState === GAME_STATE.VICTORY) {
        ctx.fillStyle = 'yellow';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NÍVEL COMPLETO!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    } else if (gameState === GAME_STATE.BOSS_FIGHT && currentBoss.active) {
        ctx.fillStyle = 'red';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 1 - BATATA', GAME_WIDTH / 2, 60);
    } else if (gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 && currentBoss.active) {
        ctx.fillStyle = 'purple';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 2 - CEBOLA', GAME_WIDTH / 2, 60);
    } else if (gameState === GAME_STATE.BOSS_FIGHT_PHASE_3 && currentBoss.active) {
        ctx.fillStyle = 'orange';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 3 - CENOURA', GAME_WIDTH / 2, 60);
    } else if (gameState === GAME_STATE.EXPLORATION) {
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('FASE DE EXPLORAÇÃO', 10, 30);
    } else if (gameState === GAME_STATE.GAME_OVER) {
        ctx.fillStyle = 'red';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Pontuação Final: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    }
}

function drawLoading() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Carregando Sprites... ${assetsLoadedCount}/${totalAssets}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
}


// ===================================
// FUNÇÕES DE COLISÃO 🛠️
// ===================================
function checkRectRectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

function checkCollision(circle, rect) {
    // Colisão Círculo (Projétil) vs Retângulo (Jogador/Boss)
    let closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    let closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    let dx = circle.x - closestX;
    let dy = circle.y - closestY;

    // Aumenta o raio de colisão para projéteis da cenoura para corresponder ao sprite
    const effectiveRadius = circle.isCarrot ? 40 : circle.radius; 

    return (dx * dx + dy * dy) < (effectiveRadius * effectiveRadius);
}

// ===================================
// CONTROLE DE TECLADO ⌨️
// ===================================
window.addEventListener('keydown', (e) => {
    // Bloqueia inputs durante estados de loading e countdown
    if (gameState === GAME_STATE.LOADING || gameState === GAME_STATE.VICTORY || gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) return;

    keys[e.key] = true;

    if (e.key === 'ArrowLeft' || e.key === 'a') player.direction = -1;
    if (e.key === 'ArrowRight' || e.key === 'd') player.direction = 1;

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        player.jump();
    }

    // Ação de Tiro: Tecla 'j'
    if (e.key === 'j' && !player.shooting) {
        player.shooting = true;

        const bulletSpeed = 500;
        const vx = player.direction * bulletSpeed;
        const vy = 0;

        let bulletY = player.y + player.baseHeight / 4;

        projectiles.push(new Projectile(
            player.x + player.width / 2,
            bulletY,
            vx,
            vy,
            'yellow' // Cor 'yellow' sinaliza que é o tiro do jogador
        ));
    }
});

window.addEventListener('keyup', (e) => {
    // Bloqueia inputs durante estados de loading e countdown
    if (gameState === GAME_STATE.LOADING || gameState === GAME_STATE.VICTORY || gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) return;

    keys[e.key] = false;

    // Fim da Ação de Tiro: Tecla 'j'
    if (e.key === 'j') {
        player.shooting = false;
    }
});

// ===================================
// INICIALIZAÇÃO DO JOGO (Após Carregamento)
// ===================================

loadAssets().then(() => {
    // Se tudo carregou corretamente (ou pelo menos tentou), inicia o jogo.
    gameState = GAME_STATE.COUNTDOWN_PHASE_1;
    requestAnimationFrame(gameLoop);
});