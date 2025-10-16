// Crashes and Cars - Fixed version with enemy color variants and collision sound (complete)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('start-btn');
const menu = document.getElementById('menu');
const gameOverEl = document.getElementById('game-over');
const restartBtn = document.getElementById('restart');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');

let W = 420, H = 640;
function resize(){ canvas.width = W; canvas.height = H; }
resize();

// assets
const assets = {};
const toLoad = ['player.png','enemy.png','bg_tile.png'];
let loaded = 0;
const colors = ['#e24b4b','#4be25a','#ffd23f','#9b59ff','#9aa0a6']; // red, green, yellow, purple, gray
const enemyVariants = [];

function loadImages(){
  return new Promise((resolve)=>{
    toLoad.forEach(name=>{
      const img = new Image();
      img.src = name;
      img.onload = ()=>{
        assets[name]=img;
        loaded++;
        if(loaded===toLoad.length){
          createEnemyVariants();
          resolve();
        }
      };
      img.onerror = ()=>{ // fallback: still resolve to avoid lock
        console.error('Failed to load', name);
        loaded++;
        if(loaded===toLoad.length){
          createEnemyVariants();
          resolve();
        }
      };
    });
  });
}

function createEnemyVariants(){
  const base = assets['enemy.png'];
  // helper to draw rounded rect
  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  if(base){
    // Use only the original base image (no color variants)
    enemyVariants.push(base);
  } else {
    // No base image available: create a single default (yellow) procedural sprite
    const c = document.createElement('canvas');
    c.width = 120; c.height = 70;
    const cx = c.getContext('2d');

    // subtle shadow under car
    cx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(cx, 12, c.height - 18, c.width - 24, 10, 6);
    cx.fill();

    // car body (default color)
    cx.fillStyle = '#ffd800';
    roundRect(cx, 8, 8, c.width - 16, c.height - 30, 12);
    cx.fill();

    // hood highlight
    cx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(cx, c.width*0.2, 12, c.width*0.6, c.height*0.22, 8);
    cx.fill();

    // windows
    cx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(cx, c.width*0.26, c.height*0.22, c.width*0.48, c.height*0.26, 6);
    cx.fill();

    // wheels
    cx.fillStyle = 'rgba(0,0,0,0.9)';
    cx.beginPath(); cx.ellipse(22, c.height - 18, 6, 8, 0, 0, Math.PI*2); cx.fill();
    cx.beginPath(); cx.ellipse(c.width - 22, c.height - 18, 6, 8, 0, 0, Math.PI*2); cx.fill();

    // lights
    cx.fillStyle = 'rgba(255,255,150,0.9)';
    cx.beginPath(); cx.ellipse(12, c.height/2 - 4, 3, 6, 0, 0, Math.PI*2); cx.fill();
    cx.beginPath(); cx.ellipse(c.width - 12, c.height/2 - 4, 3, 6, 0, 0, Math.PI*2); cx.fill();

    enemyVariants.push(c);
  }
}

// game variables
let lanes = [];
const laneCount = 3;
const road = {x:60,width:300};
const stripeWidth = 8;

let player = {
  lane:1, // 0..2
  x:0,y:0,w:34,h:56,
};
let enemies = [];
let spawnTimer = 0;
let gameRunning = false;
let elapsed = 0; // seconds
let score = 0.0;
let totalTime = 300; // seconds
let remaining = totalTime;

// audio: collision sound via WebAudio
let audioCtx = null;
function playCollisionSound(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 200;
    g.gain.value = 0.12;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    o.stop(audioCtx.currentTime + 0.32);
  }catch(e){ /* ignore */ }
}

function formatTime(s){
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(Math.floor(s%60)).padStart(2,'0');
  return mm + ':' + ss;
}

function resetState(){
  enemies = [];
  spawnTimer = 40;
  elapsed = 0;
  score = 0.0;
  remaining = totalTime;
  player.lane = 1;
  player.x = lanes[player.lane];
  player.y = H - 120;
  gameRunning = false;
  // UI
  timerEl.textContent = formatTime(remaining);
  scoreEl.textContent = score.toFixed(2);
  finalScoreEl.textContent = score.toFixed(2);
  // hide game over overlay and show menu
  if(gameOverEl) {
    gameOverEl.classList.add('hidden');
    gameOverEl.style.display = 'none';
  }
  if(menu) menu.style.display = 'flex';
}

function startGame(){
  // ensure images loaded
  if(!assets['player.png']){
    console.warn('Assets not loaded yet.');
  }
  resetState();
  gameRunning = true;
  // hide menu explicitly (inline style) so it disappears immediately
  if(menu) menu.style.display = 'none';
  gameOverEl.classList.add('hidden');
  last = performance.now();
  requestAnimationFrame(loop);
}

loadImages().then(()=>{
  // compute lanes after images loaded
  const laneW = road.width / laneCount;
  for(let i=0;i<laneCount;i++){
    lanes.push(road.x + laneW*i + laneW/2);
  }
  player.x = lanes[player.lane];
  player.y = H - 120;
  // initial UI
  timerEl.textContent = formatTime(remaining);
  scoreEl.textContent = score.toFixed(2);
  // show initial scene
  drawScene();  
});

startBtn.addEventListener('click', ()=>{ startGame(); });
restartBtn && restartBtn.addEventListener('click', ()=>{ startGame(); });

document.addEventListener('keydown', (e)=>{
  if(e.key==='a' || e.key==='A' || e.code==='ArrowLeft') moveLeft();
  if(e.key==='d' || e.key==='D' || e.code==='ArrowRight') moveRight();
  if(e.code==='Space'){ if(!gameRunning) startGame(); }
});

function moveLeft(){ if(player.lane>0){ player.lane--; } }
function moveRight(){ if(player.lane<laneCount-1){ player.lane++; } }

// touch controls
let touchStartX = null;
canvas.addEventListener('touchstart', (e)=>{
  touchStartX = e.touches[0].clientX;
});
canvas.addEventListener('touchend', (e)=>{
  if(touchStartX===null) return;
  const endX = e.changedTouches[0].clientX;
  const dx = endX - touchStartX;
  if(dx < -20) moveLeft();
  else if(dx > 20) moveRight();
  touchStartX = null;
});

function spawnEnemy(){
  if(enemyVariants.length===0){
    // fallback draw simple rectangle enemy
    const lane = Math.floor(Math.random()*laneCount);
    enemies.push({
      lane, x: lanes[lane], y: -60, w:40, h:56, vy: 2 + Math.random()*2 + Math.min(4, Math.floor(elapsed/10)), img: null, color: colors[Math.floor(Math.random()*colors.length)]
    });
  } else {
    const lane = Math.floor(Math.random()*laneCount);
    const idx = Math.floor(Math.random()*enemyVariants.length);
    const img = enemyVariants[idx];
    const w = 40, h = 56;
    enemies.push({
      lane,
      x: lanes[lane],
      y: -h - 10,
      w,h,
      vy: 2 + Math.random()*2 + Math.min(4, Math.floor(elapsed/10)),
      img
    });
  }
  spawnTimer = Math.max(24, 60 - Math.floor(elapsed/6));
}

function update(dt){
  if(!gameRunning) return;
  elapsed += dt;
  remaining = Math.max(0, totalTime - Math.floor(elapsed));
  // spawn logic
  spawnTimer -= 1;
  if(spawnTimer<=0) spawnEnemy();
  // move enemies and check collisions
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    e.y += e.vy;
    // collision check: treat positions as centered
    if(collides(e, player)){
      // collision happened
      console.log('collision detected with enemy at', e.x, e.y);
      playCollisionSound();
      gameOver();
      return;
    }
    // offscreen -> remove and reward score
    if(e.y > H + 100){
      enemies.splice(i,1);
      score += 0.5;
    }
  }
  // increase score by survival
  score += dt*0.2;
  scoreEl.textContent = score.toFixed(2);
  timerEl.textContent = formatTime(remaining);
  if(remaining<=0){
    console.log('time up, triggering gameOver');
    gameOver();
  }
}

function collides(a,b){
  // ensure player has numeric x,y
  const ax = a.x, ay = a.y, aw=a.w, ah=a.h;
  const bx = b.x, by = b.y, bw=b.w, bh=b.h;
  return Math.abs(ax-bx) < (aw+bw)/2 - 6 && Math.abs(ay-by) < (ah+bh)/2 - 6;
}

function renderRoad(){
  // background panel and road
  ctx.fillStyle = '#3b3b3b';
  ctx.fillRect(0,0,W,H);
  // side panels
  ctx.fillStyle = '#565656';
  ctx.fillRect(0,0,road.x, H);
  ctx.fillRect(road.x+road.width,0,W-(road.x+road.width), H);

  // road base
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(road.x,0,road.width,H);

  // dashed yellow stripes between lanes
  const laneW = road.width / laneCount;
  ctx.fillStyle = '#ffd800';
  const dashH = 40;
  const gap = 20;
  const offset = (performance.now()/8) % (dashH+gap);
  for(let i=0;i<laneCount-1;i++){
    const x = road.x + (i+1)*laneW - stripeWidth/2;
    for(let y = -dashH - offset; y < H; y += dashH + gap){
      ctx.fillRect(x, y, stripeWidth, dashH);
    }
  }
}

function drawScene(){
  renderRoad();
  // draw enemies
  enemies.forEach(e=>{
    if(e.img){
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.drawImage(e.img, -e.w/2, -e.h/2, e.w, e.h);
      ctx.restore();
    } else {
      // fallback rectangle with color
      ctx.fillStyle = e.color || '#e24b4b';
      ctx.fillRect(e.x - 18, e.y - 28, 36, 56);
    }
  });
  // draw player (centered)
  if(assets['player.png']){
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.drawImage(assets['player.png'], -player.w/2, -player.h/2, player.w, player.h);
    ctx.restore();
  } else {
    ctx.fillStyle = '#2f80ff';
    ctx.fillRect(player.x - player.w/2, player.y - player.h/2, player.w, player.h);
  }
}

let last = performance.now();
function loop(now){
  const dt = (now - last)/1000;
  last = now;
  // smooth player x towards lane center
  player.x += (lanes[player.lane] - player.x) * 0.25;
  update(dt);
  // render
  ctx.clearRect(0,0,W,H);
  drawScene();
  if(gameRunning) requestAnimationFrame(loop);
}

function gameOver(){
  gameRunning = false;
  finalScoreEl.textContent = score.toFixed(2);
  console.log('gameOver() called, showing overlay');
  if(gameOverEl){
    gameOverEl.classList.remove('hidden');
    gameOverEl.style.display = 'flex';
  }
  // show menu via inline style
  if(menu) menu.style.display = 'flex';
}

// initial draw while waiting
function drawInitial(){
  ctx.clearRect(0,0,W,H);
  renderRoad();
  if(assets['player.png']){
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.drawImage(assets['player.png'], -player.w/2, -player.h/2, player.w, player.h);
    ctx.restore();
  }
  requestAnimationFrame(drawInitial);
}
