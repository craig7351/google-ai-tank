
import { 
  GameState, Player, Bullet, Particle, InputState, 
  MAP_SIZE, PLAYER_RADIUS, PLAYER_SPEED, BULLET_SPEED, FIRE_RATE, REGION_COLORS, Region 
} from '../types';
import { audioService } from './audioService';

// Helper to generate UUID
const uuid = () => Math.random().toString(36).substr(2, 9);

// Map Generation (Simple Walls)
const generateWalls = () => {
  const walls = [];
  // Borders
  walls.push({ x: -50, y: -50, w: MAP_SIZE + 100, h: 50 }); // Top
  walls.push({ x: -50, y: MAP_SIZE, w: MAP_SIZE + 100, h: 50 }); // Bottom
  walls.push({ x: -50, y: 0, w: 50, h: MAP_SIZE }); // Left
  walls.push({ x: MAP_SIZE, y: 0, w: 50, h: MAP_SIZE }); // Right
  
  // Random obstacles
  for (let i = 0; i < 30; i++) {
    walls.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      w: Math.random() * 150 + 50,
      h: Math.random() * 150 + 50,
    });
  }
  return walls;
};

const checkCollision = (rect1: {x: number, y: number, w: number, h: number}, rect2: {x: number, y: number, w: number, h: number}) => {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  );
};

// 安全出生點檢查 (確保不會生在牆壁裡)
const getSafePosition = (walls: {x: number, y: number, w: number, h: number}[]) => {
  let safe = false;
  let x = 0;
  let y = 0;
  let attempts = 0;

  // 嘗試 100 次找到一個空位
  while (!safe && attempts < 100) {
    x = Math.random() * (MAP_SIZE - 100) + 50;
    y = Math.random() * (MAP_SIZE - 100) + 50;
    
    // 定義坦克的邊界 (稍微比實際半徑大一點，保留緩衝空間)
    const tankRect = { 
        x: x - PLAYER_RADIUS - 10, 
        y: y - PLAYER_RADIUS - 10, 
        w: (PLAYER_RADIUS * 2) + 20, 
        h: (PLAYER_RADIUS * 2) + 20 
    };

    const hitWall = walls.some(w => checkCollision(tankRect, w));
    if (!hitWall) {
      safe = true;
    }
    attempts++;
  }
  
  // 如果 100 次都失敗，回傳一個地圖中央附近的預設點 (雖然機率很低)
  if (!safe) {
      return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  }

  return { x, y };
};

// Initial State
export const initGame = (playerName: string, playerRegion: Region): GameState => {
  const walls = generateWalls();
  
  const startPos = getSafePosition(walls);

  const player: Player = {
    id: 'me',
    name: playerName,
    region: playerRegion,
    x: startPos.x,
    y: startPos.y,
    rotation: 0,
    hp: 100,
    maxHp: 100,
    score: 0,
    color: REGION_COLORS[playerRegion],
    isBot: false,
    lastShotTime: 0,
    dead: false,
  };

  // Generate Bots
  const bots: Player[] = [];
  const regions = Object.keys(REGION_COLORS) as Region[];
  
  for (let i = 0; i < 14; i++) { // 增加一點 BOT 數量讓地圖熱鬧些
    const reg = regions[Math.floor(Math.random() * regions.length)];
    const botPos = getSafePosition(walls);
    bots.push({
      id: `bot-${i}`,
      name: `Bot ${i+1}`,
      region: reg,
      x: botPos.x,
      y: botPos.y,
      rotation: Math.random() * Math.PI * 2,
      hp: 100,
      maxHp: 100,
      score: 0,
      color: REGION_COLORS[reg],
      isBot: true,
      lastShotTime: 0,
      dead: false,
    });
  }

  // Init all scores to 0
  const initialScores = regions.reduce((acc, r) => ({...acc, [r]: 0}), {} as Record<Region, number>);

  return {
    players: [player, ...bots],
    bullets: [],
    particles: [],
    walls,
    myId: 'me',
    regionScores: initialScores,
    gameTime: 0,
  };
};

export const updateGame = (state: GameState, input: InputState, dt: number): GameState => {
  const now = Date.now();
  let nextPlayers = state.players.map(p => ({ ...p }));
  let nextBullets = state.bullets.map(b => ({ ...b }));
  let nextParticles = state.particles.map(p => ({ ...p }));
  const nextRegionScores = { ...state.regionScores };

  // --- 1. Player Movement ---
  const myPlayer = nextPlayers.find(p => p.id === state.myId);
  if (myPlayer && !myPlayer.dead) {
    let dx = 0;
    let dy = 0;
    if (input.up) dy = -1;
    if (input.down) dy = 1;
    if (input.left) dx = -1;
    if (input.right) dx = 1;

    // Normalize diagonal speed
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      const nextX = myPlayer.x + dx * PLAYER_SPEED;
      const nextY = myPlayer.y + dy * PLAYER_SPEED;

      // Rotate towards movement
      myPlayer.rotation = Math.atan2(dy, dx);

      // Wall Collision (Simple bounding box for player)
      const playerRectX = { x: nextX - PLAYER_RADIUS, y: myPlayer.y - PLAYER_RADIUS, w: PLAYER_RADIUS * 2, h: PLAYER_RADIUS * 2 };
      const playerRectY = { x: myPlayer.x - PLAYER_RADIUS, y: nextY - PLAYER_RADIUS, w: PLAYER_RADIUS * 2, h: PLAYER_RADIUS * 2 };
      
      let collideX = state.walls.some(w => checkCollision(playerRectX, w));
      let collideY = state.walls.some(w => checkCollision(playerRectY, w));

      if (!collideX) myPlayer.x = nextX;
      if (!collideY) myPlayer.y = nextY;
    }

    // Firing
    if (input.fire && now - myPlayer.lastShotTime > FIRE_RATE) {
      myPlayer.lastShotTime = now;
      audioService.playShoot();
      nextBullets.push({
        id: uuid(),
        ownerId: myPlayer.id,
        ownerRegion: myPlayer.region, // 記錄地區
        color: myPlayer.color,        // 子彈顏色跟隨坦克
        x: myPlayer.x + Math.cos(myPlayer.rotation) * (PLAYER_RADIUS + 5),
        y: myPlayer.y + Math.sin(myPlayer.rotation) * (PLAYER_RADIUS + 5),
        vx: Math.cos(myPlayer.rotation) * BULLET_SPEED,
        vy: Math.sin(myPlayer.rotation) * BULLET_SPEED,
        bounces: 0,
      });
    }
  }

  // --- 2. Bot Logic (Simulated Multiplayer) ---
  nextPlayers.forEach(bot => {
    if (bot.id !== state.myId && !bot.dead) {
      if (Math.random() < 0.02) {
         bot.rotation = Math.random() * Math.PI * 2;
      }

      const nextX = bot.x + Math.cos(bot.rotation) * (PLAYER_SPEED * 0.5); 
      const nextY = bot.y + Math.sin(bot.rotation) * (PLAYER_SPEED * 0.5);

      const botRect = { x: nextX - PLAYER_RADIUS, y: nextY - PLAYER_RADIUS, w: PLAYER_RADIUS * 2, h: PLAYER_RADIUS * 2 };
      if (!state.walls.some(w => checkCollision(botRect, w))) {
        bot.x = nextX;
        bot.y = nextY;
      } else {
        bot.rotation += Math.PI / 2; 
      }

      if (Math.random() < 0.015 && now - bot.lastShotTime > FIRE_RATE) {
        bot.lastShotTime = now;
        audioService.playShoot();
        nextBullets.push({
          id: uuid(),
          ownerId: bot.id,
          ownerRegion: bot.region, // 記錄地區
          color: bot.color,        // 子彈顏色跟隨坦克
          x: bot.x + Math.cos(bot.rotation) * (PLAYER_RADIUS + 5),
          y: bot.y + Math.sin(bot.rotation) * (PLAYER_RADIUS + 5),
          vx: Math.cos(bot.rotation) * BULLET_SPEED,
          vy: Math.sin(bot.rotation) * BULLET_SPEED,
          bounces: 0,
        });
      }
    }
  });

  // --- 3. Respawn Logic ---
  nextPlayers.forEach(p => {
    if (p.dead && Math.random() < 0.01) { 
        p.dead = false;
        p.hp = 100;
        const spawn = getSafePosition(state.walls); // 使用安全重生點檢查
        p.x = spawn.x;
        p.y = spawn.y;
        audioService.playSpawn();
    }
  });

  // --- 4. Bullet Physics & Collision ---
  const survivingBullets: Bullet[] = [];
  
  nextBullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;

    // Wall Bounce
    let hitWall = false;
    for (const w of state.walls) {
      if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
        hitWall = true;
        if (b.bounces < 1) {
             b.vx = -b.vx; 
             b.vy = -b.vy;
             b.bounces++;
             hitWall = false; 
        }
        break;
      }
    }

    if (hitWall) return;

    // Player Collision
    let hitPlayer = false;
    for (const p of nextPlayers) {
      if (!p.dead && p.id !== b.ownerId) {
        // --- 同地區不受傷邏輯 (Friendly Fire Protection) ---
        if (p.region === b.ownerRegion) {
            // 子彈直接穿過自己人，不做任何事情
            continue;
        }

        const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
        if (dist < PLAYER_RADIUS) {
          hitPlayer = true;
          p.hp -= 20; 
          
          for(let k=0; k<5; k++) {
             nextParticles.push({
                 id: uuid(),
                 x: b.x, y: b.y,
                 vx: (Math.random() - 0.5) * 5,
                 vy: (Math.random() - 0.5) * 5,
                 life: 1.0,
                 color: p.color,
                 size: Math.random() * 4 + 2
             });
          }

          if (p.hp <= 0) {
            p.dead = true;
            audioService.playExplosion();
            
            const killer = nextPlayers.find(k => k.id === b.ownerId);
            if (killer) {
                killer.score += 100;
                nextRegionScores[killer.region] += 100;
            }
          }
          break;
        }
      }
    }

    if (!hitPlayer) {
        if (b.x < -100 || b.x > MAP_SIZE + 100 || b.y < -100 || b.y > MAP_SIZE + 100) return;
        survivingBullets.push(b);
    }
  });

  // --- 5. Particles ---
  const survivingParticles: Particle[] = [];
  nextParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life > 0) survivingParticles.push(p);
  });

  return {
    ...state,
    players: nextPlayers,
    bullets: survivingBullets,
    particles: survivingParticles,
    regionScores: nextRegionScores,
    gameTime: state.gameTime + dt
  };
};
