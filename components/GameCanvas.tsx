import React, { useRef, useEffect } from 'react';
import { GameState, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, PLAYER_RADIUS, MAP_SIZE } from '../types';

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

    // 5. Particles (Behind tanks)
    gameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // 6. Tanks (Players)
    gameState.players.forEach(p => {
        if (p.dead) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Name and Region
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, 0, -PLAYER_RADIUS - 15);
        ctx.fillStyle = p.color;
        ctx.fillText(`[${p.region}]`, 0, -PLAYER_RADIUS - 5);

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
        ctx.fillRect(0, -5, PLAYER_RADIUS + 10, 10);
        
        // Center
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();

        ctx.restore();
    });

    // 7. Bullets
    gameState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
        ctx.strokeStyle = '#FFAA00';
        ctx.stroke();
    });

    ctx.restore(); // Restore camera transform

    // 8. Minimap Overlay (Top Left)
    const mmScale = 0.1;
    const mmSize = MAP_SIZE * mmScale;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, 10, mmSize, mmSize);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(10, 10, mmSize, mmSize);
    
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
