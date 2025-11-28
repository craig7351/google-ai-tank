
import { 
  GameState, Player, Bullet, Particle, InputState, Item, ItemType,
  MAP_SIZE, PLAYER_RADIUS, PLAYER_SPEED, BULLET_SPEED, FIRE_RATE, REGION_COLORS, Region, ITEM_RADIUS 
} from '../types';
import { audioService } from './audioService';

// Helper to generate UUID
const uuid = () => Math.random().toString(36).substr(2, 9);

// Item Constants
const ITEM_SPAWN_RATE = 5000; // Spawn check every 5s
const MAX_ITEMS = 15;
const BUFF_DURATION = 15000; // 15 seconds

// --- SEEDED RANDOM UTILS ---
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
  return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Map Generation
const generateWalls = (roomId: string) => {
  const seed = xmur3(roomId);
  const rand = mulberry32(seed());
  const walls = [];
  walls.push({ x: -50, y: -50, w: MAP_SIZE + 100, h: 50 });
  walls.push({ x: -50, y: MAP_SIZE, w: MAP_SIZE + 100, h: 50 });
  walls.push({ x: -50, y: 0, w: 50, h: MAP_SIZE });
  walls.push({ x: MAP_SIZE, y: 0, w: 50, h: MAP_SIZE });
  for (let i = 0; i < 30; i++) {
    walls.push({
      x: rand() * (MAP_SIZE - 200) + 100,
      y: rand() * (MAP_SIZE - 200) + 100,
      w: rand() * 150 + 50,
      h: rand() * 150 + 50,
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

const checkCircleCollision = (c1: {x: number, y: number, r: number}, c2: {x: number, y: number, r: number}) => {
    const dist = Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
    return dist < c1.r + c2.r;
}

const getSafePosition = (walls: {x: number, y: number, w: number, h: number}[], seededRand?: () => number) => {
  let safe = false;
  let x = 0, y = 0, attempts = 0;
  const rng = seededRand || Math.random;
  while (!safe && attempts < 100) {
    x = rng() * (MAP_SIZE - 100) + 50;
    y = rng() * (MAP_SIZE - 100) + 50;
    const tankRect = { 
        x: x - PLAYER_RADIUS - 10, 
        y: y - PLAYER_RADIUS - 10, 
        w: (PLAYER_RADIUS * 2) + 20, 
        h: (PLAYER_RADIUS * 2) + 20 
    };
    if (!walls.some(w => checkCollision(tankRect, w))) safe = true;
    attempts++;
  }
  if (!safe) return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  return { x, y };
};

// Initial State (HOST ONLY USES THIS)
export const initGame = (hostName: string, hostRegion: Region, roomId: string, withBots: boolean): GameState => {
  const walls = generateWalls(roomId);
  const seed = xmur3(roomId + "_spawns");
  const rand = mulberry32(seed());

  const hostId = 'host'; // Host is always 'host' internally initially, but we map inputs to it
  const startPos = getSafePosition(walls); 

  const hostPlayer: Player = {
    id: hostId,
    name: hostName,
    region: hostRegion,
    x: startPos.x,
    y: startPos.y,
    rotation: 0,
    hp: 100,
    maxHp: 100,
    score: 0,
    color: REGION_COLORS[hostRegion],
    isBot: false,
    lastShotTime: 0,
    dead: false,
    damageBoostUntil: 0,
    speedBoostUntil: 0,
  };

  const bots: Player[] = [];
  if (withBots) {
    const regions = Object.keys(REGION_COLORS) as Region[];
    for (let i = 0; i < 14; i++) {
      const reg = regions[Math.floor(rand() * regions.length)];
      const botPos = getSafePosition(walls, rand);
      bots.push({
        id: `bot-${i}`,
        name: `Bot ${i+1}`,
        region: reg,
        x: botPos.x,
        y: botPos.y,
        rotation: rand() * Math.PI * 2,
        hp: 100,
        maxHp: 100,
        score: 0,
        color: REGION_COLORS[reg],
        isBot: true,
        lastShotTime: 0,
        dead: false,
        damageBoostUntil: 0,
        speedBoostUntil: 0,
      });
    }
  }

  const allRegions = Object.keys(REGION_COLORS) as Region[];
  const initialScores = allRegions.reduce((acc, r) => ({...acc, [r]: 0}), {} as Record<Region, number>);

  return {
    roomId,
    isHost: true,
    players: [hostPlayer, ...bots],
    bullets: [],
    particles: [],
    items: [],
    walls,
    myId: hostId,
    regionScores: initialScores,
    gameTime: 0,
    lastItemSpawnTime: 0,
  };
};

export const addPlayer = (state: GameState, playerId: string, name: string, region: Region): GameState => {
    const startPos = getSafePosition(state.walls);
    const newPlayer: Player = {
        id: playerId,
        name,
        region,
        x: startPos.x,
        y: startPos.y,
        rotation: 0,
        hp: 100,
        maxHp: 100,
        score: 0,
        color: REGION_COLORS[region],
        isBot: false,
        lastShotTime: 0,
        dead: false,
        damageBoostUntil: 0,
        speedBoostUntil: 0,
    };
    return {
        ...state,
        players: [...state.players, newPlayer]
    };
};

export const removePlayer = (state: GameState, playerId: string): GameState => {
    return {
        ...state,
        players: state.players.filter(p => p.id !== playerId)
    };
};

// Main Loop (HOST ONLY RUNS THIS)
export const updateGame = (state: GameState, inputs: Record<string, InputState>, dt: number): GameState => {
  const now = Date.now();
  let nextPlayers = state.players.map(p => ({ ...p }));
  let nextBullets = state.bullets.map(b => ({ ...b }));
  let nextParticles = state.particles.map(p => ({ ...p }));
  let nextItems = state.items.map(i => ({ ...i }));
  const nextRegionScores = { ...state.regionScores };

  // --- 0. Item Spawning Logic ---
  let nextLastItemSpawnTime = state.lastItemSpawnTime;
  if (now - state.lastItemSpawnTime > ITEM_SPAWN_RATE) {
      nextLastItemSpawnTime = now;
      if (nextItems.length < MAX_ITEMS) {
          const spawn = getSafePosition(state.walls);
          const randType = Math.random();
          let type: ItemType = 'HEALTH';
          if (randType > 0.4 && randType <= 0.7) type = 'DOUBLE_DAMAGE';
          if (randType > 0.7) type = 'DOUBLE_SPEED';

          nextItems.push({
              id: uuid(),
              x: spawn.x,
              y: spawn.y,
              type
          });
      }
  }

  // --- 1. Player Movement & Actions (For ALL players based on input map) ---
  nextPlayers.forEach(p => {
    if (!p.isBot && !p.dead) {
        const input = inputs[p.id];
        if (input) {
            // Speed Boost Logic
            const speedMultiplier = (p.speedBoostUntil > now) ? 2 : 1;
            const currentSpeed = PLAYER_SPEED * speedMultiplier;

            let dx = 0;
            let dy = 0;
            if (input.up) dy = -1;
            if (input.down) dy = 1;
            if (input.left) dx = -1;
            if (input.right) dx = 1;

            if (dx !== 0 || dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;

                const nextX = p.x + dx * currentSpeed;
                const nextY = p.y + dy * currentSpeed;

                // Rotation
                p.rotation = Math.atan2(dy, dx);

                // Wall Collision
                const playerRectX = { x: nextX - PLAYER_RADIUS, y: p.y - PLAYER_RADIUS, w: PLAYER_RADIUS * 2, h: PLAYER_RADIUS * 2 };
                const playerRectY = { x: p.x - PLAYER_RADIUS, y: nextY - PLAYER_RADIUS, w: PLAYER_RADIUS * 2, h: PLAYER_RADIUS * 2 };
                
                if (!state.walls.some(w => checkCollision(playerRectX, w))) p.x = nextX;
                if (!state.walls.some(w => checkCollision(playerRectY, w))) p.y = nextY;
            }

            // Fire
            if (input.fire && now - p.lastShotTime > FIRE_RATE) {
                p.lastShotTime = now;
                audioService.playShoot();
                
                const damage = (p.damageBoostUntil > now) ? 40 : 20;

                nextBullets.push({
                    id: uuid(),
                    ownerId: p.id,
                    ownerRegion: p.region,
                    color: p.color,
                    x: p.x + Math.cos(p.rotation) * (PLAYER_RADIUS + 5),
                    y: p.y + Math.sin(p.rotation) * (PLAYER_RADIUS + 5),
                    vx: Math.cos(p.rotation) * BULLET_SPEED,
                    vy: Math.sin(p.rotation) * BULLET_SPEED,
                    bounces: 0,
                    damage
                });
            }
        }
    }
  });

  // --- 2. Bot Logic ---
  nextPlayers.forEach(bot => {
    if (bot.isBot && !bot.dead) {
      // Bot random behavior also gets buffs? Sure, why not
      const speedMultiplier = (bot.speedBoostUntil > now) ? 2 : 1;
      const currentSpeed = (PLAYER_SPEED * 0.5) * speedMultiplier;

      if (Math.random() < 0.02) bot.rotation = Math.random() * Math.PI * 2;
      const nextX = bot.x + Math.cos(bot.rotation) * currentSpeed; 
      const nextY = bot.y + Math.sin(bot.rotation) * currentSpeed;
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
        const damage = (bot.damageBoostUntil > now) ? 40 : 20;
        nextBullets.push({
          id: uuid(),
          ownerId: bot.id,
          ownerRegion: bot.region,
          color: bot.color,
          x: bot.x + Math.cos(bot.rotation) * (PLAYER_RADIUS + 5),
          y: bot.y + Math.sin(bot.rotation) * (PLAYER_RADIUS + 5),
          vx: Math.cos(bot.rotation) * BULLET_SPEED,
          vy: Math.sin(bot.rotation) * BULLET_SPEED,
          bounces: 0,
          damage
        });
      }
    }
  });

  // --- 3. Item Collection Logic ---
  // Check collisions between living players and items
  nextPlayers.forEach(p => {
      if (!p.dead) {
          for (let i = nextItems.length - 1; i >= 0; i--) {
              const item = nextItems[i];
              if (checkCircleCollision({x: p.x, y: p.y, r: PLAYER_RADIUS}, {x: item.x, y: item.y, r: ITEM_RADIUS})) {
                  // Item Collected
                  audioService.playSpawn(); // Re-use spawn sound for pickup
                  nextItems.splice(i, 1);
                  
                  if (item.type === 'HEALTH') {
                      p.hp = Math.min(p.maxHp, p.hp + 30); // Recover 30 HP
                  } else if (item.type === 'DOUBLE_DAMAGE') {
                      p.damageBoostUntil = now + BUFF_DURATION;
                  } else if (item.type === 'DOUBLE_SPEED') {
                      p.speedBoostUntil = now + BUFF_DURATION;
                  }
              }
          }
      }
  });

  // --- 4. Respawn Logic ---
  nextPlayers.forEach(p => {
    if (p.dead && Math.random() < 0.01) { 
        p.dead = false;
        p.hp = 100;
        p.damageBoostUntil = 0;
        p.speedBoostUntil = 0;
        const spawn = getSafePosition(state.walls); 
        p.x = spawn.x;
        p.y = spawn.y;
        audioService.playSpawn();
    }
  });

  // --- 5. Bullet Physics ---
  const survivingBullets: Bullet[] = [];
  nextBullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
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

    let hitPlayer = false;
    for (const p of nextPlayers) {
      if (!p.dead && p.id !== b.ownerId) {
        if (p.region === b.ownerRegion) continue;
        const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
        if (dist < PLAYER_RADIUS) {
          hitPlayer = true;
          // Apply bullet specific damage
          p.hp -= b.damage; 

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
        if (b.x > -100 && b.x < MAP_SIZE + 100 && b.y > -100 && b.y < MAP_SIZE + 100) survivingBullets.push(b);
    }
  });

  // --- 6. Particles ---
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
    items: nextItems,
    regionScores: nextRegionScores,
    gameTime: state.gameTime + dt,
    lastItemSpawnTime: nextLastItemSpawnTime,
  };
};
