/* ==========================================================
   STATE & NAVIGATION
   ========================================================== */
const pages = {
  welcome: document.getElementById('page-welcome'),
  menu: document.getElementById('page-menu'),
  s1: document.getElementById('page-s1'),
  s2: document.getElementById('page-s2'),
  s3: document.getElementById('page-s3'),
  s4: document.getElementById('page-s4'),
  end: document.getElementById('page-end'),
};

function goTo(id){
  Object.values(pages).forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  target.classList.add('active');
  // restart bloom + content animations each time a page is shown
  retriggerAnimations(target);
}

function retriggerAnimations(root){
  const animated = root.querySelectorAll('.bloom, .welcome-content, .menu-content, .end-content');
  animated.forEach(el => {
    el.style.animation = 'none';
    // force reflow
    void el.offsetWidth;
    el.style.animation = '';
  });
}

/* Envelope open -> reveal menu */
const envelope = document.getElementById('envelope');
const openBtn = document.getElementById('openBtn');
const bgMusic = document.getElementById('bgMusic');

openBtn.addEventListener('click', () => {
  envelope.classList.add('is-open');
  burstSparkles(window.innerWidth/2, window.innerHeight/2 - 40, 36);
  spawnPetalBurst();
  bgMusic.play().catch(() => {});
  setTimeout(() => {
    goTo('page-menu');
  }, 950);
});

/* Menu -> surprise pages */
document.querySelectorAll('[data-surprise]').forEach(btn => {
  btn.addEventListener('click', () => {
    const n = btn.dataset.surprise;
    goTo('page-s' + n);
    const cardId = 'card' + n;
    setTimeout(() => {
      document.getElementById(cardId).classList.add('is-open');
    }, 180);
  });
});

/* Next buttons */
document.querySelectorAll('.btn--next').forEach(btn => {
  btn.addEventListener('click', () => {
    goTo(btn.dataset.next);
    const nextPage = document.getElementById(btn.dataset.next);
    const card = nextPage.querySelector('.card');
    if (card){
      card.classList.remove('is-open');
      setTimeout(() => card.classList.add('is-open'), 180);
    }
  });
});

/* Re-read -> restart everything */
document.getElementById('rereadBtn').addEventListener('click', () => {
  envelope.classList.remove('is-open');
  bgMusic.pause();
  bgMusic.currentTime = 0;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('is-open'));
  goTo('page-welcome');
});

/* ==========================================================
   SPARKLE FIELD — SURPRISE 3
   ========================================================== */
const sparkleField = document.getElementById('sparkleField');
const SPARKLE_GLYPHS = ['✦','✧','✨','❋','✺'];

function buildSparkleField(count = 50){
  sparkleField.innerHTML = '';
  for (let i = 0; i < count; i++){
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = SPARKLE_GLYPHS[Math.floor(Math.random()*SPARKLE_GLYPHS.length)];
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*100 + '%';
    s.style.setProperty('--size', (10 + Math.random()*22) + 'px');
    s.style.setProperty('--dur', (1.6 + Math.random()*3) + 's');
    s.style.setProperty('--delay', (Math.random()*4) + 's');
    sparkleField.appendChild(s);
  }
}
buildSparkleField();

/* ==========================================================
   CANVAS LAYER — floating particles, falling petals, hearts,
   and click/open sparkle bursts
   ========================================================== */
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
let W, H, DPR;

function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = window.innerWidth * DPR;
  H = canvas.height = window.innerHeight * DPR;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
resize();
window.addEventListener('resize', resize);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* particle pools */
let glowParticles = [];
let petals = [];
let bursts = [];

function rand(min, max){ return min + Math.random()*(max-min); }

/* ---- ambient glow particles (page 1 & 2 / cherry pages) ---- */
function makeGlow(){
  return {
    x: rand(0, window.innerWidth),
    y: rand(0, window.innerHeight),
    r: rand(1, 2.6),
    speed: rand(.12, .4),
    drift: rand(-.15, .15),
    alpha: rand(.25, .8),
    phase: rand(0, Math.PI*2),
  };
}
function initGlow(n){
  glowParticles = Array.from({length:n}, makeGlow);
}
initGlow(reduceMotion ? 0 : 38);

/* ---- falling petals ---- */
function makePetal(){
  return {
    x: rand(0, window.innerWidth),
    y: rand(-50, -10),
    size: rand(8, 16),
    speedY: rand(.35, .9),
    speedX: rand(-.3, .3),
    rot: rand(0, 360),
    rotSpeed: rand(-.6, .6),
    sway: rand(0, Math.PI*2),
    swaySpeed: rand(.01, .025),
    hue: Math.random() > .5 ? 'gold' : 'white',
  };
}
function initPetals(n){
  petals = Array.from({length:n}, makePetal);
}
initPetals(reduceMotion ? 0 : 26);

function drawPetal(p){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot * Math.PI/180);
  const grad = ctx.createLinearGradient(-p.size,0,p.size,0);
  if (p.hue === 'gold'){
    grad.addColorStop(0, 'rgba(243,216,119,0.9)');
    grad.addColorStop(1, 'rgba(212,175,55,0.55)');
  } else {
    grad.addColorStop(0, 'rgba(255,250,243,0.95)');
    grad.addColorStop(1, 'rgba(255,182,193,0.5)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size*0.55, p.size, Math.PI/4, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ---- burst sparkles (on click / envelope open) ---- */
function burstSparkles(x, y, count = 24){
  for (let i = 0; i < count; i++){
    const angle = rand(0, Math.PI*2);
    const speed = rand(1.2, 4.2);
    bursts.push({
      x, y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed - 1,
      life: 1,
      decay: rand(.012, .022),
      size: rand(2, 4.5),
    });
  }
}
function spawnPetalBurst(){
  for (let i = 0; i < 14; i++){
    petals.push({
      ...makePetal(),
      x: window.innerWidth/2 + rand(-80,80),
      y: window.innerHeight/2 + rand(-40,40),
      speedY: rand(.6, 1.4),
    });
  }
}

function drawBurst(b){
  ctx.save();
  ctx.globalAlpha = Math.max(b.life, 0);
  ctx.fillStyle = '#f3d877';
  ctx.shadowColor = '#d4af37';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ---- main loop ---- */
let t = 0;
function tick(){
  t += 1;
  ctx.clearRect(0,0,window.innerWidth, window.innerHeight);

  const activePage = document.querySelector('.page.active');
  const isBlack = activePage && activePage.id === 'page-s3';
  const isWhite = activePage && activePage.id === 'page-s2';
  const isPink = activePage && activePage.id === 'page-s4';

  // ambient glow particles — skip on the black sparkle page (it has its own field)
  if (!isBlack){
    glowParticles.forEach(p => {
      p.y -= p.speed;
      p.x += Math.sin(t*0.01 + p.phase) * 0.25;
      if (p.y < -10){ p.y = window.innerHeight + 10; p.x = rand(0, window.innerWidth); }
      const flicker = 0.5 + 0.5*Math.sin(t*0.04 + p.phase);
      ctx.save();
      ctx.globalAlpha = p.alpha * flicker;
      ctx.fillStyle = isWhite ? '#d4af37' : (isPink ? '#ffd6e6' : '#f3d877');
      ctx.shadowColor = '#f3d877';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });

    // falling petals
    petals.forEach(p => {
      p.y += p.speedY;
      p.sway += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.sway)*0.6;
      p.rot += p.rotSpeed;
      if (p.y > window.innerHeight + 20){
        p.y = rand(-60, -10);
        p.x = rand(0, window.innerWidth);
      }
      drawPetal(p);
    });
  }

  // bursts (always)
  bursts.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy += 0.04;
    b.life -= b.decay;
    drawBurst(b);
  });
  bursts = bursts.filter(b => b.life > 0);

  requestAnimationFrame(tick);
}
if (!reduceMotion){
  requestAnimationFrame(tick);
}

/* click sparkle burst anywhere on cherry/white pages for delight */
document.addEventListener('click', (e) => {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  if (e.target.closest('.card__inner')) return; // don't spam while typing/clicking text
  burstSparkles(e.clientX, e.clientY, 10);
});