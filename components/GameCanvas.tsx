
import React, { useRef, useEffect } from 'react';
import { GameState, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, PLAYER_RADIUS, MAP_SIZE, REGION_LABELS, ITEM_RADIUS } from '../types';

interface GameCanvasProps {
  gameState: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find local player to center camera
    const me = gameState.players.find(p => p.id === gameState.myId);
    const camX = me ? me.x - VIEWPORT_WIDTH / 2 : 0;
    const camY = me ? me.y - VIEWPORT_HEIGHT / 2 : 0;
    const now = Date.now();

    // --- Rendering ---
    
    // 1. Clear Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    ctx.save();
    // 2. Camera Transform
    ctx.translate(-camX, -camY);

    // 3. Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let x=0; x<=MAP_SIZE; x+=100) {
        ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE);
    }
    for(let y=0; y<=MAP_SIZE; y+=100) {
        ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y);
    }
    ctx.stroke();

    // 4. Walls
    ctx.fillStyle = '#555';
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 4;
    gameState.walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        
        // 3D effect top
        ctx.fillStyle = '#333';
        ctx.fillRect(w.x + 5, w.y + 5, w.w - 5, w.h - 5);
    });

    // 5. Items
    gameState.items.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        
        // Glow
        ctx.shadowBlur = 15;
        
        if (item.type === 'HEALTH') {
            ctx.fillStyle = '#f43f5e'; // Rose
            ctx.shadowColor = '#f43f5e';
            ctx.fillRect(-ITEM_RADIUS, -ITEM_RADIUS, ITEM_RADIUS*2, ITEM_RADIUS*2);
            // Plus symbol
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(-4, -10, 8, 20);
            ctx.fillRect(-10, -4, 20, 8);
        } else if (item.type === 'DOUBLE_DAMAGE') {
            ctx.fillStyle = '#a855f7'; // Purple
            ctx.shadowColor = '#a855f7';
            ctx.beginPath();
            ctx.moveTo(0, -ITEM_RADIUS);
            ctx.lineTo(ITEM_RADIUS, 0);
            ctx.lineTo(0, ITEM_RADIUS);
            ctx.lineTo(-ITEM_RADIUS, 0);
            ctx.fill();
            // Sword/Icon (simplified as X)
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
            ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
            ctx.stroke();
        } else if (item.type === 'DOUBLE_SPEED') {
            ctx.fillStyle = '#0ea5e9'; // Cyan
            ctx.shadowColor = '#0ea5e9';
            ctx.beginPath();
            ctx.arc(0, 0, ITEM_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            // Arrow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(-6, 6); ctx.lineTo(8, 0); ctx.lineTo(-6, -6);
            ctx.fill();
        }

        ctx.restore();
    });

    // 6. Particles (Behind tanks)
    gameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // 7. Tanks (Players)
    gameState.players.forEach(p => {
        if (p.dead) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Buff Indicators (Aura)
        if (p.damageBoostUntil > now) {
            ctx.beginPath();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.arc(0, 0, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (p.speedBoostUntil > now) {
            ctx.beginPath();
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.arc(0, 0, PLAYER_RADIUS + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Name and Region
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, 0, -PLAYER_RADIUS - 15);
        ctx.fillStyle = p.color;
        // Display Chinese Region Label
        const regionLabel = REGION_LABELS[p.region] || p.region;
        ctx.fillText(`[${regionLabel}]`, 0, -PLAYER_RADIUS - 5);

        // HP Bar
        ctx.fillStyle = 'red';
        ctx.fillRect(-15, -PLAYER_RADIUS - 25, 30, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-15, -PLAYER_RADIUS - 25, 30 * (p.hp / p.maxHp), 4);

        ctx.rotate(p.rotation);

        // Tank Body
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.fillRect(-PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
        ctx.strokeRect(-PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);

        // Turret
        ctx.fillStyle = '#ccc';
        // Turret gets bigger if heavy damage
        const turretW = (p.damageBoostUntil > now) ? PLAYER_RADIUS + 15 : PLAYER_RADIUS + 10;
        const turretH = (p.damageBoostUntil > now) ? 14 : 10;
        ctx.fillRect(0, -turretH/2, turretW, turretH);
        
        // Center
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();

        ctx.restore();
    });

    // 8. Bullets
    gameState.bullets.forEach(b => {
        ctx.beginPath();
        // Larger bullets for damage boost
        const r = b.damage > 20 ? 6 : 4;
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        // Bullet center color matches player's region color
        ctx.fillStyle = b.color;
        ctx.fill();
        // White outline for visibility
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    });

    ctx.restore(); // Restore camera transform

    // 9. Minimap Overlay (Top Left)
    const mmScale = 0.1;
    const mmSize = MAP_SIZE * mmScale;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, 10, mmSize, mmSize);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(10, 10, mmSize, mmSize);
    
    // Minimap items
    gameState.items.forEach(item => {
        ctx.fillStyle = item.type === 'HEALTH' ? '#f00' : (item.type === 'DOUBLE_DAMAGE' ? '#a0f' : '#0ff');
        ctx.fillRect(10 + item.x * mmScale - 1, 10 + item.y * mmScale - 1, 3, 3);
    });

    gameState.players.forEach(p => {
        if(p.dead) return;
        ctx.fillStyle = p.id === gameState.myId ? '#fff' : p.color;
        ctx.beginPath();
        ctx.arc(10 + p.x * mmScale, 10 + p.y * mmScale, 2, 0, Math.PI * 2);
        ctx.fill();
    });


  }, [gameState]);

  return (
    <canvas 
      ref={canvasRef} 
      width={VIEWPORT_WIDTH} 
      height={VIEWPORT_HEIGHT} 
      className="border-4 border-gray-700 rounded-lg shadow-2xl bg-black max-w-full h-auto"
    />
  );
};

export default GameCanvas;
