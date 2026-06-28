// Game setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('scoreValue');
const healthEl = document.getElementById('healthValue');
const levelEl = document.getElementById('levelValue');
const healthFill = document.getElementById('healthFill');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restartBtn');
const messageEl = document.getElementById('message');

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

// Player state
const player = {
  x: width / 2,
  y: height / 2,
  size: 18,
  speed: 260,
  health: 100,
  maxHealth: 100,
  angle: 0
};

// Game state
let score = 0;
let level = 1;
let killsSinceLevel = 0;
let gameOver = false;
let bossActive = false;
let bossSpawned = false;
let spawnTimer = 0;
let shootCooldown = 0;
let mouseX = width / 2;
let mouseY = height / 2;

const keys = {};
const bullets = [];
const zombies = [];

// Helper functions
function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  player.x = Math.min(Math.max(player.x, 30), width - 30);
  player.y = Math.min(Math.max(player.y, 30), height - 30);
}

window.addEventListener('resize', resizeCanvas);

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
  player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

window.addEventListener('mousedown', (event) => {
  if (event.button === 0 && !gameOver) {
    shoot();
  }
});

function shoot() {
  if (shootCooldown > 0) return;

  const bulletSpeed = 520;
  const bullet = {
    x: player.x,
    y: player.y,
    vx: Math.cos(player.angle) * bulletSpeed,
    vy: Math.sin(player.angle) * bulletSpeed,
    radius: 4,
    life: 1.2
  };

  bullets.push(bullet);
  shootCooldown = 0.12;
}

function spawnZombie() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = -20;
    y = Math.random() * height;
  } else if (side === 1) {
    x = width + 20;
    y = Math.random() * height;
  } else if (side === 2) {
    x = Math.random() * width;
    y = -20;
  } else {
    x = Math.random() * width;
    y = height + 20;
  }

  const speed = level === 1 ? 65 : 65 + level * 8;
  const size = 14;
  const zombie = {
    x,
    y,
    radius: size,
    speed,
    maxHealth: 1,
    health: 1,
    isBoss: false
  };

  zombies.push(zombie);
}

function spawnBoss() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = -40;
    y = Math.random() * height;
  } else if (side === 1) {
    x = width + 40;
    y = Math.random() * height;
  } else if (side === 2) {
    x = Math.random() * width;
    y = -40;
  } else {
    x = Math.random() * width;
    y = height + 40;
  }

  const boss = {
    x,
    y,
    radius: 24,
    speed: 55 + level * 2,
    maxHealth: 12 + level * 4,
    health: 12 + level * 4,
    isBoss: true
  };

  zombies.push(boss);
  bossActive = true;
  bossSpawned = true;
}

function updatePlayer(delta) {
  let moveX = 0;
  let moveY = 0;

  if (keys['w']) moveY -= 1;
  if (keys['s']) moveY += 1;
  if (keys['a']) moveX -= 1;
  if (keys['d']) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY) || 1;
    moveX = (moveX / length) * player.speed * delta;
    moveY = (moveY / length) * player.speed * delta;

    player.x += moveX;
    player.y += moveY;
  }

  player.x = Math.max(20, Math.min(width - 20, player.x));
  player.y = Math.max(20, Math.min(height - 20, player.y));
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    if (bullet.life <= 0 || bullet.x < -20 || bullet.x > width + 20 || bullet.y < -20 || bullet.y > height + 20) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = zombies.length - 1; j >= 0; j -= 1) {
      const zombie = zombies[j];
      const dist = Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y);

      if (dist < bullet.radius + zombie.radius) {
        zombie.health -= 1;
        bullets.splice(i, 1);
        if (zombie.health <= 0) {
          zombies.splice(j, 1);
          score += zombie.isBoss ? 50 : 10;
          killsSinceLevel += 1;

          if (zombie.isBoss) {
            bossActive = false;
            bossSpawned = false;
            level += 1;
            killsSinceLevel = 0;
            spawnTimer = 0.6;
            setOverlayMessage(`Level ${level} begins!`);
          } else if (killsSinceLevel >= level * 4) {
            level += 1;
            killsSinceLevel = 0;
            bossSpawned = false;
            spawnTimer = 0.6;
            setOverlayMessage(`Level ${level} begins!`);
          }
        }
        break;
      }
    }
  }
}

function updateZombies(delta) {
  for (let i = zombies.length - 1; i >= 0; i -= 1) {
    const zombie = zombies[i];
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const distance = Math.hypot(dx, dy) || 1;

    zombie.x += (dx / distance) * zombie.speed * delta;
    zombie.y += (dy / distance) * zombie.speed * delta;

    const hitDistance = Math.hypot(player.x - zombie.x, player.y - zombie.y);
    if (hitDistance < player.size + zombie.radius) {
      player.health -= zombie.isBoss ? 18 : 8;
      zombies.splice(i, 1);
      if (player.health <= 0) {
        gameOver = true;
        overlay.classList.add('show');
        messageEl.textContent = 'You were overwhelmed by the horde.';
      }
    }
  }
}

function updateSpawns(delta) {
  if (gameOver) return;

  if (level % 5 === 0 && !bossSpawned && !bossActive) {
    spawnBoss();
    return;
  }

  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnZombie();
    spawnTimer = Math.max(0.4, 1.2 - level * 0.05);
  }
}

function updateUI() {
  scoreEl.textContent = score;
  healthEl.textContent = `${Math.max(0, player.health)} / ${player.maxHealth}`;
  levelEl.textContent = level;
  healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
}

function setOverlayMessage(text) {
  messageEl.textContent = text;
}

function drawBackground() {
  ctx.fillStyle = '#060b08';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(80, 140, 80, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.fillStyle = '#3ddc97';
  ctx.beginPath();
  ctx.arc(0, 0, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f3524';
  ctx.fillRect(10, -6, 16, 12);

  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = '#ffd166';
  bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawZombies() {
  zombies.forEach((zombie) => {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    ctx.fillStyle = zombie.isBoss ? '#c0392b' : '#7f8c8d';
    ctx.beginPath();
    ctx.arc(0, 0, zombie.radius, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.isBoss) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-zombie.radius, -zombie.radius - 10, zombie.radius * 2, 5);
      ctx.fillStyle = '#ff5d5d';
      ctx.fillRect(-zombie.radius, -zombie.radius - 10, (zombie.health / zombie.maxHealth) * zombie.radius * 2, 5);
    }

    ctx.restore();
  });
}

function gameLoop(timestamp) {
  if (!gameLoop.lastTime) gameLoop.lastTime = timestamp;
  const delta = Math.min(0.03, (timestamp - gameLoop.lastTime) / 1000);
  gameLoop.lastTime = timestamp;

  if (!gameOver) {
    shootCooldown = Math.max(0, shootCooldown - delta);
    updatePlayer(delta);
    updateBullets(delta);
    updateZombies(delta);
    updateSpawns(delta);
    updateUI();
  }

  drawBackground();
  drawBullets();
  drawZombies();
  drawPlayer();

  requestAnimationFrame(gameLoop);
}

restartBtn.addEventListener('click', () => {
  overlay.classList.remove('show');
  resetGame();
});

function resetGame() {
  player.x = width / 2;
  player.y = height / 2;
  player.health = player.maxHealth;
  score = 0;
  level = 1;
  killsSinceLevel = 0;
  gameOver = false;
  bossActive = false;
  bossSpawned = false;
  spawnTimer = 0.6;
  shootCooldown = 0;
  bullets.length = 0;
  zombies.length = 0;
  updateUI();
}

resetGame();
requestAnimationFrame(gameLoop);
