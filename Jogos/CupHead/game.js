const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===================================
// TAMANHOS DE TELA E CONFIGURAÇÕES
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

// CONSTANTES DE PONTUAÇÃO
const SCORE_BOSS_DEFEAT = 100;
const SCORE_LIFE_LOST = -25;

// ===================================
// PRÉ-CARREGAMENTO DE IMAGENS 🖼️
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
    { name: 'playerProjectile', path: 'image_cf5ca2.png' }
];
const totalAssets = assetsToLoad.length;

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
                ASSETS[asset.name] = null;
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    resolve();
                }
            };

            img.onload = handleLoad;
            img.onerror = handleError;
            
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
const PLATFORM_Y = GAME_HEIGHT - 100;

const GAME_STATE = {
    LOADING: 'LOADING',
    MAIN_MENU: 'MAIN_MENU',
    INSTRUCTIONS: 'INSTRUCTIONS',
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
        this.canShoot = true;
        this.shootCooldown = 0.25;
        this.shootTimer = 0;

        this.currentState = 'idle';
    }

    takeDamage() {
        if (isInvincible) return;

        playerLives--;
        score += SCORE_LIFE_LOST;

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

    shoot() {
        if (!this.canShoot) return;
        
        this.canShoot = false;
        this.shootTimer = this.shootCooldown;

        const bulletSpeed = 500;
        const vx = this.direction * bulletSpeed;
        const vy = 0;

        let bulletY = this.y + this.baseHeight / 4;

        projectiles.push(new Projectile(
            this.x + this.width / 2,
            bulletY,
            vx,
            vy,
            'yellow'
        ));
    }

    update(deltaTime) {
        if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.VICTORY) return;

        if (!this.canShoot) {
            this.shootTimer -= deltaTime;
            if (this.shootTimer <= 0) {
                this.canShoot = true;
            }
        }

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

        if (keys['j']) {
            this.shoot();
        }

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
// CLASSE PROJÉTIL
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
        if (this.isCarrot && player.active) {
            const targetX = player.x + player.width / 2;
            const targetY = player.y + player.height / 2;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const speed = 300; 

            if (distance > 0) {
                this.velocity.x = (dx / distance) * speed;
                this.velocity.y = (dy / distance) * speed;
            }
        }

        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        if (this.hasGravity) {
            this.velocity.y += GRAVITY * deltaTime * 0.5;
        }

        if (this.x < 0 || this.x > GAME_WIDTH || this.y > GAME_HEIGHT || this.y < 0) {
            this.active = false;
        }
    }

    draw() {
        if (this.isCarrot && ASSETS.carrotProjectile) {
            const drawSize = 80;
            ctx.drawImage(ASSETS.carrotProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        } else if (this.isTear && ASSETS.tearProjectile) {
            const drawSize = 40;
            ctx.drawImage(ASSETS.tearProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        } else if (this.color === 'yellow' && ASSETS.playerProjectile) { 
            const drawSize = this.radius * 2; 
            ctx.drawImage(ASSETS.playerProjectile, this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize);
        }
        else {
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

    setupCarrot() {
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
            score += SCORE_BOSS_DEFEAT;

            if (this.type === 'potato') {
                gameState = GAME_STATE.COUNTDOWN_PHASE_2;
                countdownTimer = 0;
            } else if (this.type === 'onion') {
                gameState = GAME_STATE.COUNTDOWN_PHASE_3;
                countdownTimer = 0;
            } else if (this.type === 'carrot') {
                // Altera para a fase de vitória ou exploração final
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

    executeCarrotAttack() {
        const spawnX = this.x + this.width / 2;
        const spawnY = this.y + this.height * 0.4;

        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const dx = targetX - spawnX;
        const dy = targetY - spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const launchSpeed = 300; 
        
        let vx = 0;
        let vy = 0;

        if (distance > 0) {
            vx = (dx / distance) * launchSpeed;
            vy = (dy / distance) * launchSpeed;
        }

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
let player;
let currentBoss;
let projectiles = [];
let enemies = [];

let keys = {};

function resetGame() {
    playerLives = 3;
    score = 0;
    phaseTimer = 0;
    countdownTimer = 0;
    isInvincible = false;
    keys = {};

    player = new Player();
    currentBoss = new Boss('potato');
    projectiles = [];
    enemies = [
        new Enemy(200, PLATFORM_Y, 150, 80),
        new Enemy(600, PLATFORM_Y - 100, 50, 50)
    ];
    currentPlatforms = LEVEL_DATA.BOSS_FIGHT;
    gameState = GAME_STATE.COUNTDOWN_PHASE_1;
}

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
    
    if (gameState === GAME_STATE.MAIN_MENU) {
        drawMenu();
        return requestAnimationFrame(gameLoop);
    }
    if (gameState === GAME_STATE.INSTRUCTIONS) {
        drawInstructions();
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

    if (gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
        countdownTimer += deltaTime;

        if (countdownTimer >= COUNTDOWN_DURATION) {
            countdownTimer = 0;
            
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

    phaseTimer += deltaTime;

    player.update(deltaTime);

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
        if (p.color === 'yellow') { 
            if ((gameState === GAME_STATE.BOSS_FIGHT || gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 || gameState === GAME_STATE.BOSS_FIGHT_PHASE_3) &&
                currentBoss.active && checkCollision(p, currentBoss)) {
                p.active = false;
                currentBoss.hp -= 2;
            }
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

        if (p.color !== 'yellow' && checkCollision(p, player) && !isInvincible) {
            p.active = false;
            player.takeDamage();
        }
    });

    if (gameState === GAME_STATE.EXPLORATION) {
        enemies.forEach(e => {
            if (e.active && checkRectRectCollision(player, e) && !isInvincible) {
                player.takeDamage();
            }
        });
    }

    if (gameState === GAME_STATE.BOSS_FIGHT_PHASE_3 && !currentBoss.active) {
         gameState = GAME_STATE.VICTORY; 
    } else if (gameState === GAME_STATE.EXPLORATION && player.x > GAME_WIDTH - player.width) {
        gameState = GAME_STATE.VICTORY;
    }
}

// ===================================
// FUNÇÃO DRAW (Desenho na Tela) 🎨
// ===================================
function draw() {
    if (ASSETS.backgroundGarden) {
        ctx.drawImage(ASSETS.backgroundGarden, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    currentPlatforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // ... (Lógica de Desenho da Contagem Regressiva) ...
    if (gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
        ctx.textAlign = 'center';

        let phaseText = 'FASE 1: THE ROOT PACK (BATATA)';
        if (gameState === GAME_STATE.COUNTDOWN_PHASE_2) {
            phaseText = 'FASE 2: THE ROOT PACK (CEBOLA)';
        } else if (gameState === GAME_STATE.COUNTDOWN_PHASE_3) {
            phaseText = 'FASE 3: THE ROOT PACK (CENOURA)';
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


    player.draw();

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
        ctx.fillText('CONTRATO CUMPRIDO!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Pontuação Final: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
        ctx.fillText('Pressione R para voltar ao Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);

    } else if (gameState === GAME_STATE.BOSS_FIGHT && currentBoss.active) {
        ctx.fillStyle = 'red';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 1 - POTATO', GAME_WIDTH / 2, 60);
    } else if (gameState === GAME_STATE.BOSS_FIGHT_PHASE_2 && currentBoss.active) {
        ctx.fillStyle = 'purple';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 2 - ONION', GAME_WIDTH / 2, 60);
    } else if (gameState === GAME_STATE.BOSS_FIGHT_PHASE_3 && currentBoss.active) {
        ctx.fillStyle = 'orange';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHEFE DA FASE 3 - CARROT', GAME_WIDTH / 2, 60);
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
        ctx.fillText('Pressione R para voltar ao Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);
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
// LÓGICA DE BOTÕES E INTERFACE DE MENU
// ===================================
const buttonStyle = {
    width: 300,
    height: 70,
    // NOVO: Marrom escuro com amarelo ouro para o texto
    color: '#654321', // Marrom Café Escuro
    hoverColor: '#8B4513', // Marrom Claro
    font: '36px "Times New Roman"', 
    textColor: '#FFD700', // Amarelo Ouro
    yStart: GAME_HEIGHT / 2 - 40,
    spacing: 100
};

const menuButtons = [
    { text: 'COMEÇAR', action: resetGame, y: buttonStyle.yStart },
    { text: 'COMO JOGAR', action: () => gameState = GAME_STATE.INSTRUCTIONS, y: buttonStyle.yStart + buttonStyle.spacing }
];

let hoveredButton = null;

function drawButton(text, x, y, width, height, isHovered) {
    ctx.fillStyle = isHovered ? buttonStyle.hoverColor : buttonStyle.color;
    // Borda preta estilo Cuphead
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 5;
    
    // Desenha o retângulo do botão
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    ctx.fillStyle = buttonStyle.textColor;
    ctx.font = buttonStyle.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

function drawMenu() {
    if (ASSETS.backgroundGarden) {
        ctx.drawImage(ASSETS.backgroundGarden, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    ctx.textAlign = 'center';
    
    // Título do Jogo
    ctx.fillStyle = 'red';
    ctx.font = '100px "Times New Roman"';
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 4;
    ctx.strokeText('CUPHEAD', GAME_WIDTH / 2, GAME_HEIGHT / 4 - 20);
    ctx.fillText('CUPHEAD', GAME_WIDTH / 2, GAME_HEIGHT / 4 - 20);
    
    menuButtons.forEach(button => {
        drawButton(
            button.text,
            GAME_WIDTH / 2, 
            button.y,
            buttonStyle.width,
            buttonStyle.height,
            button === hoveredButton
        );
    });
}

function drawInstructions() {
    if (ASSETS.backgroundGarden) {
        ctx.drawImage(ASSETS.backgroundGarden, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // NOVO: Fundo semi-transparente para melhorar a legibilidade
    const boxWidth = GAME_WIDTH * 0.6;
    const boxHeight = GAME_HEIGHT * 0.6;
    const boxX = (GAME_WIDTH - boxWidth) / 2;
    const boxY = (GAME_HEIGHT - boxHeight) / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#FFD700'; // Borda amarela
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);


    ctx.textAlign = 'center';
    
    // TÍTULO
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('COMO JOGAR', GAME_WIDTH / 2, boxY + 70);
    
    // INSTRUÇÕES DE MOVIMENTO
    ctx.fillStyle = '#FFD700'; // Amarelo
    ctx.font = '30px Arial';
    ctx.fillText('MOVIMENTAÇÃO:', GAME_WIDTH / 2, boxY + 150);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('A (Esquerda) / D (Direita)', GAME_WIDTH / 2, boxY + 190);
    ctx.fillText('W (Pular)', GAME_WIDTH / 2, boxY + 230);
    
    // INSTRUÇÕES DE ATAQUE
    ctx.fillStyle = 'red';
    ctx.font = '30px Arial';
    ctx.fillText('ATAQUE:', GAME_WIDTH / 2, boxY + 310);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('J (Atirar)', GAME_WIDTH / 2, boxY + 350);

    // Botão de retorno
    const backButtonY = GAME_HEIGHT - 80;
    const backButton = { text: 'VOLTAR', action: () => gameState = GAME_STATE.MAIN_MENU, y: backButtonY };
    
    drawButton(
        backButton.text, 
        GAME_WIDTH / 2, 
        backButton.y, 
        buttonStyle.width + 50, 
        buttonStyle.height, 
        hoveredButton && hoveredButton.text === backButton.text
    );
    if (hoveredButton && hoveredButton.text === backButton.text) {
        hoveredButton.action = backButton.action;
    } 
}

// ===================================
// FUNÇÕES DE COLISÃO
// ===================================
function checkRectRectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

function checkCollision(circle, rect) {
    let closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    let closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    let dx = circle.x - closestX;
    let dy = circle.y - closestY;

    const effectiveRadius = circle.isCarrot ? 40 : circle.radius; 

    return (dx * dx + dy * dy) < (effectiveRadius * effectiveRadius);
}

// ===================================
// CONTROLE DE EVENTOS (Teclado e Mouse)
// ===================================
window.addEventListener('keydown', (e) => {
    if ((gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.VICTORY) && (e.key === 'r' || e.key === 'R')) {
        gameState = GAME_STATE.MAIN_MENU;
        return;
    }

    if (gameState === GAME_STATE.LOADING || gameState === GAME_STATE.MAIN_MENU || gameState === GAME_STATE.INSTRUCTIONS || gameState === GAME_STATE.VICTORY || gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.COUNTDOWN_PHASE_1 || gameState === GAME_STATE.COUNTDOWN_PHASE_2 || gameState === GAME_STATE.COUNTDOWN_PHASE_3) return;

    keys[e.key] = true;

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        player.jump();
    }
});

window.addEventListener('keyup', (e) => {
    if (gameState !== GAME_STATE.BOSS_FIGHT && gameState !== GAME_STATE.BOSS_FIGHT_PHASE_2 && gameState !== GAME_STATE.BOSS_FIGHT_PHASE_3 && gameState !== GAME_STATE.EXPLORATION) return;

    keys[e.key] = false;
});

// Eventos do Mouse (Interação com Botões)
canvas.addEventListener('mousemove', (e) => {
    if (gameState !== GAME_STATE.MAIN_MENU && gameState !== GAME_STATE.INSTRUCTIONS) {
        hoveredButton = null;
        canvas.style.cursor = 'default';
        return;
    }
    // Map mouse coordinates to the canvas's internal coordinate system
    // This accounts for CSS scaling (e.g., fullscreen or responsive sizing)
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    let buttonsToCheck = gameState === GAME_STATE.MAIN_MENU ? menuButtons : 
                         [{ text: 'VOLTAR', action: () => gameState = GAME_STATE.MAIN_MENU, y: GAME_HEIGHT - 80, width: buttonStyle.width + 50, height: buttonStyle.height }];

    let found = false;
    for (const button of buttonsToCheck) {
        const x = GAME_WIDTH / 2;
        const y = button.y;
        const width = button.width || buttonStyle.width;
        const height = button.height || buttonStyle.height;

        if (mouseX >= x - width / 2 && mouseX <= x + width / 2 &&
            mouseY >= y - height / 2 && mouseY <= y + height / 2) {
            
            hoveredButton = button;
            canvas.style.cursor = 'pointer'; 
            found = true;
            break;
        }
    }

    if (!found) {
        hoveredButton = null;
        canvas.style.cursor = 'default';
    }
});

canvas.addEventListener('click', (e) => {
    // Map click coordinates to canvas internal coordinates (same approach as mousemove)
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (hoveredButton) {
        // Chama a ação do botão
        hoveredButton.action();
        
        // Pequeno atraso para evitar clique duplo/indesejado
        const clickedButton = hoveredButton;
        hoveredButton = null; 
        canvas.style.cursor = 'default';

        // Garante que o estado seja atualizado antes de qualquer próxima iteração do loop
        if (clickedButton.text === 'COMEÇAR') {
            resetGame();
        } else if (clickedButton.text === 'COMO JOGAR') {
            gameState = GAME_STATE.INSTRUCTIONS;
        } else if (clickedButton.text === 'VOLTAR') {
            gameState = GAME_STATE.MAIN_MENU;
        }
    }
});

// ===================================
// INICIALIZAÇÃO DO JOGO (Após Carregamento)
// ===================================

loadAssets().then(() => {
    gameState = GAME_STATE.MAIN_MENU;
    requestAnimationFrame(gameLoop);
});