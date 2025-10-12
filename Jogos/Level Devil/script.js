// Levil Devil - simples plataforma 2D (externalized from index.html)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
let width, height;

function resize(){
  const rect = canvas.getBoundingClientRect();
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resize);
// fullscreen change listener — resize canvas when toggling fullscreen
document.addEventListener('fullscreenchange', ()=>{
  // when entering fullscreen we want canvas to match window size
  if(document.fullscreenElement){
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  } else {
    canvas.style.width = '';
    canvas.style.height = '';
  }
  // call resize to update internal pixel size
  resize();
});

// Game state
let keys = {};
  document.addEventListener('keydown', e=>{ keys[e.key]=true; 
    // allow restart with R (uppercase or lowercase)
    if(e.key === 'r' || e.key === 'R'){
      // if game over overlay visible or player dead, restart; otherwise just call init
      const go = document.getElementById('gameOver');
      if(go && !go.classList.contains('hidden')){
        go.classList.add('hidden');
      }
      const win = document.getElementById('winOverlay'); if(win && !win.classList.contains('hidden')) win.classList.add('hidden');
      init();
      paused = false;
    }
  });
document.addEventListener('keyup', e=>{ keys[e.key]=false; });

// Fullscreen toggle: button and F key
const fsBtn = document.getElementById('fullscreen');
if(fsBtn){ fsBtn.addEventListener('click', toggleFull); }
document.addEventListener('keydown', e=>{ if(e.key === 'f' || e.key === 'F'){ toggleFull(); } });

function toggleFull(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}

// Touch buttons (may be absent on desktop builds, guard with getElementById)
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const jumpBtn = document.getElementById('jump');
if(leftBtn){ leftBtn.addEventListener('touchstart',()=>keys['ArrowLeft']=true); leftBtn.addEventListener('touchend',()=>keys['ArrowLeft']=false); }
if(rightBtn){ rightBtn.addEventListener('touchstart',()=>keys['ArrowRight']=true); rightBtn.addEventListener('touchend',()=>keys['ArrowRight']=false); }
if(jumpBtn){ jumpBtn.addEventListener('touchstart',()=>keys[' ']=true); jumpBtn.addEventListener('touchend',()=>keys[' ']=false); }

const restartBtn = document.getElementById('restart');
if(restartBtn) restartBtn.addEventListener('click',()=>{ const go = document.getElementById('gameOver'); if(go) go.classList.add('hidden'); const win = document.getElementById('winOverlay'); if(win) win.classList.add('hidden'); init(); });

// The overlay elements are declared after the <script> tag in the HTML, so
// attach their event listeners after DOMContentLoaded to ensure they exist.
document.addEventListener('DOMContentLoaded', ()=>{
  const btnRestartOverlay = document.getElementById('btnRestartOverlay');
  if(btnRestartOverlay) btnRestartOverlay.addEventListener('click', ()=>{ const go = document.getElementById('gameOver'); if(go) go.classList.add('hidden'); const win = document.getElementById('winOverlay'); if(win) win.classList.add('hidden'); init(); paused = false; });

  const btnRestartWin = document.getElementById('btnRestartWin');
  if(btnRestartWin) btnRestartWin.addEventListener('click', ()=>{ const win = document.getElementById('winOverlay'); if(win) win.classList.add('hidden'); init(); paused = false; });

  const btnCloseWin = document.getElementById('btnCloseWin');
  if(btnCloseWin) btnCloseWin.addEventListener('click', ()=>{ const win = document.getElementById('winOverlay'); if(win) win.classList.add('hidden'); document.body.classList.remove('playing'); document.body.classList.add('minimal'); const menu = document.getElementById('menu'); if(menu) menu.classList.remove('hidden'); paused = true; });
});

// Level definition
function makeLevel(){
  return {
    player: {x:60,y:300,w:28,h:36,vx:0,vy:0,onGround:false,alive:true,won:false},
    gravity: 1600,
    platforms:[
      {x:0,y:420,w:1200,h:60},
      {x:180,y:340,w:90,h:16},
      {x:360,y:280,w:80,h:16},
      {x:520,y:220,w:100,h:16},
      {x:740,y:320,w:110,h:16},
      {x:960,y:260,w:90,h:16},
      // Novas plataformas para aumentar o desafio
      {x:1150,y:380,w:80,h:16},
      {x:1280,y:320,w:100,h:16},
      {x:1420,y:260,w:80,h:16},
      {x:1550,y:200,w:120,h:16},
      {x:1720,y:340,w:90,h:16},
      {x:1850,y:280,w:80,h:16},
      {x:1980,y:220,w:100,h:16},
      {x:2100,y:180,w:90,h:16},
      {x:2250,y:400,w:120,h:16},
      {x:2400,y:340,w:80,h:16},
      {x:2550,y:280,w:100,h:16},
      {x:2700,y:220,w:90,h:16},
      {x:2850,y:180,w:120,h:16},
    ],
    spikes:[
      {x:320,y:400,w:40,h:20,dir:1,osc:0},
      {x:660,y:400,w:40,h:20,dir:-1,osc:0},
      {x:820,y:280,w:40,h:20,dir:1,osc:0},
      // Novos obstáculos
      {x:1200,y:410,w:40,h:20,dir:1,osc:0},
      {x:1350,y:350,w:40,h:20,dir:-1,osc:0},
      {x:1500,y:190,w:40,h:20,dir:1,osc:0},
      {x:1650,y:330,w:40,h:20,dir:-1,osc:0},
      {x:1800,y:270,w:40,h:20,dir:1,osc:0},
      {x:1950,y:210,w:40,h:20,dir:-1,osc:0},
      {x:2100,y:170,w:40,h:20,dir:1,osc:0},
      {x:2300,y:390,w:40,h:20,dir:-1,osc:0},
      {x:2450,y:330,w:40,h:20,dir:1,osc:0},
      {x:2600,y:270,w:40,h:20,dir:-1,osc:0},
      {x:2750,y:210,w:40,h:20,dir:1,osc:0},
    ],
    coins:[
      {x:220,y:300,collected:false},
      {x:420,y:240,collected:false},
      {x:600,y:180,collected:false},
      {x:780,y:280,collected:false},
      {x:1040,y:220,collected:false},
      // Novas moedas
      {x:1180,y:360,collected:false},
      {x:1320,y:300,collected:false},
      {x:1460,y:240,collected:false},
      {x:1600,y:180,collected:false},
      {x:1740,y:320,collected:false},
      {x:1880,y:260,collected:false},
      {x:2020,y:200,collected:false},
      {x:2160,y:160,collected:false},
      {x:2300,y:380,collected:false},
      {x:2440,y:320,collected:false},
      {x:2580,y:260,collected:false},
      {x:2720,y:200,collected:false},
      {x:2860,y:160,collected:false},
    ],
    flag:{x:2900,y:120,w:24,h:64},
  }
}

let level;
let lastTime=0;
let scoreEl = document.getElementById('score');
const menuEl = document.getElementById('menu');
const howEl = document.getElementById('howto');
const btnPlay = document.getElementById('btnPlay');
const btnHow = document.getElementById('btnHow');
const btnBack = document.getElementById('btnBack');
const btnObj = document.getElementById('btnObj');
const objBack = document.getElementById('btnObjBack');

let paused = true; // start paused with menu

if(btnPlay) btnPlay.addEventListener('click', ()=>{
  paused = false;
  if(menuEl) menuEl.classList.add('hidden');
  // enter minimal play mode
  document.body.classList.remove('minimal');
  document.body.classList.add('playing');
  resize();
});

// set minimal mode initially to hide chrome but keep menu
document.addEventListener('DOMContentLoaded', ()=>{ document.body.classList.add('minimal'); resize(); });
// ensure overflow hidden to remove scrollbars on some browsers
document.addEventListener('DOMContentLoaded', ()=>{ document.body.style.overflow = 'hidden'; });
if(btnHow) btnHow.addEventListener('click', ()=>{ if(howEl) howEl.classList.remove('hidden'); });
if(btnHow) btnHow.addEventListener('click', ()=>{
  if(howEl) howEl.classList.remove('hidden');
  if(menuEl) menuEl.classList.add('hidden');
});
if(btnBack) btnBack.addEventListener('click', ()=>{ if(howEl) howEl.classList.add('hidden'); if(menuEl) menuEl.classList.remove('hidden'); });
if(btnObj) btnObj.addEventListener('click', ()=>{ if(document.getElementById('objectives')) document.getElementById('objectives').classList.remove('hidden'); if(menuEl) menuEl.classList.add('hidden'); });
if(objBack) objBack.addEventListener('click', ()=>{ if(document.getElementById('objectives')) document.getElementById('objectives').classList.add('hidden'); if(menuEl) menuEl.classList.remove('hidden'); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && howEl) howEl.classList.add('hidden'); });

function init(){
  level = makeLevel();
  camera.x = 0; camera.y = 0; score=0; updateScore(); resize();
  // ensure overlay is hidden when initializing/restarting the level
  const go = document.getElementById('gameOver'); if(go) go.classList.add('hidden');
  const win = document.getElementById('winOverlay'); if(win) win.classList.add('hidden');
  const goScore = document.getElementById('goScore'); if(goScore) goScore.textContent = 'Pontuação: 0';
}

// Camera
const camera = {x:0,y:0,w:800,h:480};

// Helpers
function rectsOverlap(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function showGameOver(){
  const goScore = document.getElementById('goScore'); if(goScore) goScore.textContent = 'Pontuação: ' + score;
  const go = document.getElementById('gameOver'); if(go) go.classList.remove('hidden');
}

function update(dt){
  const p = level.player; if(!p.alive) return;
  // make player slightly faster but jump weaker
  const speed = 260;
  if(keys['ArrowLeft'] || keys['a']) p.vx = -speed; else if(keys['ArrowRight'] || keys['d']) p.vx = speed; else p.vx = 0;
  const wantJump = keys['ArrowUp'] || keys['w'] || keys[' ']; if(wantJump && p.onGround){ p.vy = -520; p.onGround = false; }
  // axis-separated movement to avoid teleport/overlap issues
  p.vy += level.gravity * dt;
  const dx = p.vx * dt;
  const dy = p.vy * dt;

  // move horizontally and resolve X collisions
  p.x += dx;
  for(const plat of level.platforms){
    const box = {x:plat.x, y:plat.y, w:plat.w, h:plat.h};
    if(rectsOverlap(p, box)){
      if(dx > 0){
        // moving right, place to left of platform
        p.x = box.x - p.w;
      } else if(dx < 0){
        // moving left, place to right of platform
        p.x = box.x + box.w;
      }
      p.vx = 0;
    }
  }

  // move vertically and resolve Y collisions
  p.y += dy;
  p.onGround = false;
  for(const plat of level.platforms){
    const box = {x:plat.x, y:plat.y, w:plat.w, h:plat.h};
    if(rectsOverlap(p, box)){
      if(dy > 0){
        // falling -> landed on top
        p.y = box.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if(dy < 0){
        // rising -> hit bottom of platform
        p.y = box.y + box.h;
        p.vy = 0;
      }
    }
  }
  if(p.y > 1000){ p.alive=false; showGameOver(); }
  for(const s of level.spikes){ const spikeBox = {x:s.x,y:s.y,w:s.w,h:s.h}; if(rectsOverlap(p,spikeBox)){ p.alive=false; showGameOver(); } }
  for(const s of level.spikes){ const spikeBox = {x:s.x,y:s.y,w:s.w,h:s.h}; if(rectsOverlap(p,spikeBox)) p.alive=false; }
  // moving spikes: oscillate horizontally a bit
  for(const s of level.spikes){
    s.osc += dt * 2;
    const ox = Math.sin(s.osc) * 30;
    s.x += (ox - (s._lastOx || 0));
    s._lastOx = ox;
  }

  // occasional extra spike spawn ahead of player to surprise
  if(Math.random() < dt * 0.08){
    const aheadX = p.x + 500 + Math.random() * 200;
    level.spikes.push({x:aheadX,y:level.platforms[0].y-20,w:40,h:20,osc:0});
  }
  for(const c of level.coins){ if(!c.collected){ const coinBox = {x:c.x-10,y:c.y-10,w:20,h:20}; if(rectsOverlap(p,coinBox)){ c.collected=true; score+=10; updateScore(); } } }
  const flagBox = {x:level.flag.x, y:level.flag.y, w:level.flag.w, h:level.flag.h};
  if(rectsOverlap(p,flagBox)){
    // mark as won and pause the game; do not mark as dead so Game Over overlay is not shown
    p.won = true;
    paused = true;
    // show win overlay with final score
    const win = document.getElementById('winOverlay');
    const winScore = document.getElementById('winScore');
    if(winScore) winScore.textContent = 'Pontuação: ' + score;
    if(win) win.classList.remove('hidden');
    showMessage('Você venceu! 🎉');
  }
  const camCenterX = width*0.5;
  camera.x = p.x - camCenterX + p.w/2;
  if(camera.x < 0) camera.x = 0;
  // Ajusta o limite máximo da câmera para acompanhar o boneco até o final da fase
  const levelEnd = level.flag.x + 100; // margem extra após a bandeira
  const maxCam = levelEnd - width;
  if(camera.x > maxCam) camera.x = maxCam;
}

function draw(){
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = '#071027'; ctx.fillRect(0,0,width,height);
  ctx.save(); ctx.translate(-camera.x*0.2,0);
  for(let i=0;i<40;i++){ ctx.fillStyle = 'rgba(255,255,255,0.03)'; const sx = (i*97)%1200; const sy = (i*53)%200 + 20; ctx.fillRect(sx%width,sy,2,2); }
  ctx.restore();
  for(const plat of level.platforms){ const x = plat.x - camera.x; const y = plat.y - camera.y; ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x,y,plat.w,plat.h); ctx.fillStyle = '#16203a'; ctx.fillRect(x,y,plat.w,Math.min(6,plat.h)); }
  for(const s of level.spikes){ const x = s.x - camera.x; const y = s.y - camera.y; ctx.beginPath(); const count = Math.floor(s.w/10); for(let i=0;i<count;i++){ const sx = x + i*(s.w/count); ctx.moveTo(sx, y+s.h); ctx.lineTo(sx + (s.w/count)/2, y); ctx.lineTo(sx + (s.w/count), y+s.h); } ctx.fillStyle = 'rgba(255,50,50,0.95)'; ctx.fill(); }
  for(const c of level.coins){ if(c.collected) continue; const x = c.x - camera.x; const y = c.y - camera.y; ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fillStyle = '#ffcc33'; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x-10,y+6,20,4); }
  const fx = level.flag.x - camera.x; const fy = level.flag.y - camera.y; ctx.fillStyle = '#0ea5a5'; ctx.fillRect(fx,fy,level.flag.w,level.flag.h); ctx.fillStyle = '#fff'; ctx.fillRect(fx+6, fy+10, 28, 6);
  const p = level.player; const px = p.x - camera.x; const py = p.y - camera.y; ctx.fillStyle = p.alive ? '#ff3b3b' : '#663333'; ctx.fillRect(px,py,p.w,p.h); ctx.beginPath(); ctx.moveTo(px+4,py); ctx.lineTo(px+12,py-10); ctx.lineTo(px+18,py); ctx.fillStyle='#ffccd5'; ctx.fill(); ctx.fillStyle='#111'; ctx.fillRect(px+6,py+10,6,6); ctx.fillRect(px+16,py+10,6,6);
  if(!p.alive && !p.won){ 
    // darken canvas and show DOM overlay
    ctx.fillStyle = 'rgba(6,6,10,0.55)'; ctx.fillRect(0,0,width,height);
    const go = document.getElementById('gameOver'); if(go){ go.classList.remove('hidden'); }
  }
  ctx.fillStyle = '#dfe8ff'; ctx.font = '16px Inter, Arial'; ctx.fillText('Score: '+score, 14, 22);
}

let score = 0; function updateScore(){ scoreEl.textContent = score; }

// legacy canvas popup removed — we now use DOM overlays for win and game over
let showTimer = 0; function showMessage(txt){ /* no-op: kept for compatibility */ }

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(0.033, (ts-lastTime)/1000);
  lastTime = ts;
  if(!paused){
    update(dt);
  }
  draw();
  // showTimer is no-op now; victory display handled by #winOverlay DOM
  requestAnimationFrame(loop);
}

// initial setup
resize(); init(); requestAnimationFrame(loop);
