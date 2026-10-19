// ---- CONFIGURACIÓN RETRO ----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('scoreDisplay');
const levelSpan = document.getElementById('levelDisplay');
const soundButton = document.getElementById('soundBtn');

const CW = 400, CH = 500;
canvas.width = CW; canvas.height = CH;

// ---- ESTADO DEL JUEGO ----
let player = { x: 180, y: 450, w: 30, h: 16 };
let enemies = [];
let bullets = [];
let score = 0;
let gameOver = false;
let winFlag = false;
let level = 1;
const MAX_LEVEL = 10;
let soundEnabled = true;
let audioContext = null;

let leftPressed = false;
let rightPressed = false;
let moveX = 0;

const ENEMY_W = 26;
const ENEMY_H = 20;
const ENEMY_SPACING = 12;
let enemyDirection = 1;
let enemySpeed = 0.8;
let enemyMoveCounter = 0;
let enemyMoveFrames = 12;

function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioContext && AudioContextClass) audioContext = new AudioContextClass();
    if (audioContext?.state === 'suspended') audioContext.resume();
}

function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const settings = {
        shoot: { start: 620, end: 260, duration: 0.07, wave: 'square' },
        hit: { start: 240, end: 90, duration: 0.12, wave: 'sawtooth' },
        level: { start: 440, end: 880, duration: 0.24, wave: 'triangle' },
        gameover: { start: 300, end: 70, duration: 0.42, wave: 'triangle' },
        victory: { start: 520, end: 1040, duration: 0.5, wave: 'sine' }
    }[type];
    if (!settings) return;

    oscillator.type = settings.wave;
    oscillator.frequency.setValueAtTime(settings.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
}

let shootCooldown = 0;
const SHOOT_DELAY = 14;

// ---- INICIALIZAR ENEMIGOS ----
function initEnemies() {
    enemies = [];
    const rows = Math.min(4 + Math.floor((level - 1) / 2), 6);
    const cols = level >= 4 ? 7 : 6;
    const formationWidth = cols * ENEMY_W + (cols - 1) * ENEMY_SPACING;
    const startX = (CW - formationWidth) / 2;
    const startY = 40;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            enemies.push({
                x: startX + col * (ENEMY_W + ENEMY_SPACING),
                y: startY + row * (ENEMY_H + ENEMY_SPACING),
                w: ENEMY_W,
                h: ENEMY_H,
                alive: true,
                type: 'formation',
                color: row === 0 ? '#f2b84b' : (row === 1 ? '#d96c4a' : '#6bb0d9')
            });
        }
    }
    const raiderCount = Math.min(1 + Math.floor((level - 1) / 2), 5);
    for (let index = 0; index < raiderCount; index++) {
        const entersFromLeft = index % 2 === 0;
        enemies.push({
            x: entersFromLeft ? 0 : CW - ENEMY_W,
            y: 85 + index * 34,
            w: ENEMY_W,
            h: ENEMY_H,
            vx: (entersFromLeft ? 1 : -1) * (1.5 + level * 0.22),
            vy: 0.45 + level * 0.06,
            alive: true,
            type: 'raider',
            color: '#d77cff'
        });
    }
    enemyDirection = 1;
    enemySpeed = 0.8 + (level - 1) * 0.22;
    enemyMoveCounter = 0;
    enemyMoveFrames = Math.max(4, 12 - Math.floor((level - 1) / 2));
}

// ---- REINICIAR ----
function resetGame() {
    player.x = 180;
    bullets = [];
    score = 0;
    level = 1;
    gameOver = false;
    winFlag = false;
    leftPressed = false;
    rightPressed = false;
    moveX = 0;
    shootCooldown = 0;
    initEnemies();
    updateScore();
    updateLevel();
}

// ---- DISPARAR ----
function shootBullet() {
    if (gameOver || winFlag) return;
    bullets.push({
        x: player.x + player.w/2 - 3,
        y: player.y - 8,
        w: 6,
        h: 14,
        speed: 5
    });
    playSound('shoot');
}

// ---- ACTUALIZAR PUNTUACIÓN ----
function updateScore() {
    scoreSpan.textContent = score;
}

function updateLevel() {
    levelSpan.textContent = level;
}

// ---- COLISIONES ----
function rectCollide(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

// ---- LÓGICA DEL JUEGO ----
function update() {
    if (gameOver || winFlag) return;

    // Movimiento del jugador
    const SPEED = 5;
    if (moveX !== 0) {
        player.x += moveX * SPEED;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > CW) player.x = CW - player.w;
    }

    // Disparo automático
    shootCooldown--;
    if (shootCooldown <= 0) {
        shootBullet();
        shootCooldown = SHOOT_DELAY;
    }

    // Mover balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= b.speed;
        if (b.y + b.h < 0) {
            bullets.splice(i, 1);
        }
    }

    // Verificar si hay enemigos vivos
    let anyAlive = false;
    for (const e of enemies) {
        if (e.alive) { anyAlive = true; break; }
    }
    if (!anyAlive) {
        if (level === MAX_LEVEL) {
            winFlag = true;
            playSound('victory');
            return;
        }
        level++;
        updateLevel();
        initEnemies();
        playSound('level');
        return;
    }

    for (const e of enemies) {
        if (!e.alive || e.type !== 'raider') continue;
        e.x += e.vx;
        e.y += e.vy;
        if (e.x <= 0 || e.x + e.w >= CW) e.vx *= -1;
    }

    // Movimiento de enemigos
    enemyMoveCounter++;
    if (enemyMoveCounter >= enemyMoveFrames) {
        enemyMoveCounter = 0;
        let minX = 999, maxX = -999;
        for (const e of enemies) {
            if (!e.alive || e.type !== 'formation') continue;
            if (e.x < minX) minX = e.x;
            if (e.x + e.w > maxX) maxX = e.x + e.w;
        }
        if (maxX > CW - 10) {
            enemyDirection = -1;
            for (const e of enemies) {
                if (e.alive && e.type === 'formation') e.y += 6;
            }
        } else if (minX < 10) {
            enemyDirection = 1;
            for (const e of enemies) {
                if (e.alive && e.type === 'formation') e.y += 6;
            }
        }
        for (const e of enemies) {
            if (e.alive && e.type === 'formation') e.x += enemyDirection * enemySpeed;
        }
    }

    // Colisiones balas vs enemigos
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let bulletUsed = false;
        for (const e of enemies) {
            if (!e.alive) continue;
            if (rectCollide(b, e)) {
                e.alive = false;
                bulletUsed = true;
                score += 10;
                updateScore();
                playSound('hit');
                break;
            }
        }
        if (bulletUsed) {
            bullets.splice(i, 1);
        }
    }

    // Colisiones enemigos vs jugador
    for (const e of enemies) {
        if (!e.alive) continue;
        if (rectCollide(player, e)) {
            gameOver = true;
            playSound('gameover');
            return;
        }
        if (e.y + e.h > player.y + 10) {
            gameOver = true;
            playSound('gameover');
            return;
        }
    }
}

// ---- DIBUJAR ----
function draw() {
    ctx.clearRect(0, 0, CW, CH);

    // Fondo estrellado
    ctx.fillStyle = '#0b111f';
    ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 70; i++) {
        if (i % 2 === 0) continue;
        ctx.fillStyle = `rgba(255,255,240,${0.5+Math.random()*0.5})`;
        ctx.beginPath();
        ctx.arc((i*23)%CW, (i*13)%CH, 1.2, 0, Math.PI*2);
        ctx.fill();
    }

    // Jugador
    ctx.shadowColor = '#7bb3ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#b1dcff';
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.w, player.h, 6);
    ctx.fill();
    ctx.fillStyle = '#76b8ff';
    ctx.beginPath();
    ctx.roundRect(player.x+8, player.y-6, 14, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#5f9eff';
    ctx.fillRect(player.x-4, player.y+4, 4, 8);
    ctx.fillRect(player.x+player.w, player.y+4, 4, 8);
    ctx.shadowBlur = 0;

    // Balas
    ctx.fillStyle = '#f2ff80';
    ctx.shadowColor = '#f0ff60';
    ctx.shadowBlur = 16;
    for (const b of bullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.shadowBlur = 0;

    // Enemigos
    for (const e of enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.type === 'raider' ? '#d77cff' : '#b0d0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(e.x, e.y, e.w, e.h, 6);
        ctx.fill();
        ctx.fillStyle = '#fcf9ea';
        ctx.shadowBlur = 4;
        ctx.fillRect(e.x+4, e.y+3, 6, 6);
        ctx.fillRect(e.x+e.w-10, e.y+3, 6, 6);
        ctx.fillStyle = '#121212';
        ctx.fillRect(e.x+6, e.y+5, 3, 3);
        ctx.fillRect(e.x+e.w-8, e.y+5, 3, 3);
    }
    ctx.shadowBlur = 0;

    // Mensajes
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (gameOver) {
        ctx.fillStyle = '#ffb0a0';
        ctx.shadowColor = '#ff4f4f';
        ctx.shadowBlur = 24;
        ctx.fillText('💀 GAME OVER', CW/2, CH/2 - 20);
        ctx.shadowBlur = 0;
    } else if (winFlag) {
        ctx.fillStyle = '#f5e56b';
        ctx.shadowColor = '#ffd966';
        ctx.shadowBlur = 30;
        ctx.fillText('✨ ¡VICTORIA! ✨', CW/2, CH/2 - 20);
        ctx.shadowBlur = 0;
    }

    ctx.font = '12px monospace';
    ctx.fillStyle = '#617e9e';
    ctx.fillText(`NIVEL ${level} / ${MAX_LEVEL}`, CW / 2, 18);
    ctx.fillText('←  →', CW-60, CH-16);
}

// Helper para rectángulos redondeados
CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (r > w/2) r = w/2;
    if (r > h/2) r = h/2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
};

// ---- LOOP PRINCIPAL ----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ---- CONTROLES TECLADO ----
function handleKeyDown(e) {
    ensureAudio();
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'Left') {
        leftPressed = true;
        moveX = -1;
        e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'Right') {
        rightPressed = true;
        moveX = 1;
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'Left') {
        leftPressed = false;
        if (rightPressed) moveX = 1;
        else moveX = 0;
        e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'Right') {
        rightPressed = false;
        if (leftPressed) moveX = -1;
        else moveX = 0;
        e.preventDefault();
    }
}

// ---- CONTROLES MÓVIL ----
function handleTouchStart(e) {
    e.preventDefault();
    ensureAudio();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const canvasX = (touch.clientX - rect.left) * (CW / rect.width);
    if (canvasX < player.x + player.w/2) {
        moveX = -1;
        leftPressed = true;
        rightPressed = false;
    } else {
        moveX = 1;
        rightPressed = true;
        leftPressed = false;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const canvasX = (touch.clientX - rect.left) * (CW / rect.width);
    if (canvasX < player.x + player.w/2) {
        moveX = -1;
        leftPressed = true;
        rightPressed = false;
    } else {
        moveX = 1;
        rightPressed = true;
        leftPressed = false;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    moveX = 0;
    leftPressed = false;
    rightPressed = false;
}

// ---- EVENTOS ----
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('resetBtn').addEventListener('click', ensureAudio);
soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? '🔊' : '🔇';
    soundButton.setAttribute('aria-label', soundEnabled ? 'Silenciar sonido' : 'Activar sonido');
    if (soundEnabled) {
        ensureAudio();
        playSound('level');
    }
});

// ---- INICIO ----
initEnemies();
updateScore();
updateLevel();
gameLoop();
