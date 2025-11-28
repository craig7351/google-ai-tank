import React from 'react';
import { GameState, Region, REGION_COLORS } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  aiCommentary: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, aiCommentary }) => {
  const sortedRegions = (Object.keys(gameState.regionScores) as Region[])
    .sort((a, b) => gameState.regionScores[b] - gameState.regionScores[a]);

  const me = gameState.players.find(p => p.id === gameState.myId);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex justify-between items-start">
      
      {/* Left: Player Status */}
      <div className="mt-[220px] pointer-events-auto"> 
        {/* Adjusted margin top to avoid minimap */}
        <div className="bg-black/70 border border-gray-500 p-4 rounded text-white font-mono text-sm shadow-lg backdrop-blur-sm">
           <h3 className="text-yellow-400 font-bold mb-2 pixel-font">STATUS</h3>
           <p>Name: <span style={{ color: me?.color }}>{me?.name}</span></p>
           <p>HP: {Math.max(0, me?.hp || 0)}/100</p>
           <p>Score: {me?.score}</p>
           <p>Kills: {me?.score ? me.score / 100 : 0}</p>
        </div>
      </div>

      {/* Center: AI Commentary */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-lg text-center">
        {aiCommentary && (
            <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 border-y-2 border-yellow-400 p-2 shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                <p className="text-yellow-300 font-bold text-sm md:text-base animate-pulse tracking-wider">
                   🎙️ {aiCommentary}
                </p>
            </div>
        )}
      </div>

      {/* Right: Leaderboard */}
      <div className="bg-black/80 border-2 border-gray-600 p-4 rounded-lg text-white font-mono text-sm min-w-[200px] shadow-xl backdrop-blur-md pointer-events-auto">
        <h3 className="text-center text-green-400 font-bold mb-2 border-b border-gray-600 pb-1 pixel-font">REGION WARS</h3>
        <ul>
          {sortedRegions.map((region, index) => (
            <li key={region} className="flex justify-between items-center py-1">
              <span className="flex items-center">
                 <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: REGION_COLORS[region]}}></span>
                 <span className={`${index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                    {index + 1}. {region}
                 </span>
              </span>
              <span className="font-bold">{gameState.regionScores[region]}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Death Screen */}
      {me?.dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 z-50">
             <div className="text-center animate-bounce">
                <h1 className="text-6xl text-red-500 font-bold pixel-font drop-shadow-lg stroke-black">WASTED</h1>
                <p className="text-white mt-4 text-xl">Respawning...</p>
             </div>
          </div>
      )}
    </div>
  );
};

export default UIOverlay;
