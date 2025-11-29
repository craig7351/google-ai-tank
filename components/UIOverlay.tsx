

import React, { useState, useRef, useEffect } from 'react';
import { GameState, Region, REGION_COLORS, REGION_LABELS, ChatMessage, WIN_SCORE } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  chatMessages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  setChatFocus?: (focused: boolean) => void;
  aiCommentary?: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, chatMessages = [], onSendMessage, setChatFocus, aiCommentary }) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sortedRegions = (Object.keys(gameState.regionScores) as Region[])
    .sort((a, b) => gameState.regionScores[b] - gameState.regionScores[a]);

  const me = gameState.players.find(p => p.id === gameState.myId);
  const totalPlayers = gameState.players.length;
  const botCount = gameState.players.filter(p => p.isBot).length;

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && onSendMessage) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const formatTime = (frames: number) => {
    // Assuming roughly 60 updates per second in gameLogic
    const totalSeconds = Math.floor(frames / 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPingColor = (ping: number) => {
      if (ping < 100) return 'text-green-400';
      if (ping < 200) return 'text-yellow-400';
      return 'text-red-400';
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex justify-between items-start">
      
      {/* Left: Player Status */}
      {/* On mobile/tablet: Top-left with small margin (covering minimap but clearing center). Desktop: Pushed down below minimap */}
      <div className="mt-0 lg:mt-[220px] pointer-events-auto origin-top-left scale-75 lg:scale-100"> 
        <div className="bg-black/70 border border-gray-500 p-4 rounded text-white font-mono text-sm shadow-lg backdrop-blur-sm">
           <h3 className="text-yellow-400 font-bold mb-2 pixel-font">STATUS</h3>
           <p className="mb-1">Room: <span className="text-yellow-200">{gameState.roomName || gameState.roomId}</span></p>
           {gameState.roomName && <p className="mb-1 text-xs text-gray-400">ID: {gameState.roomId}</p>}
           <p className="mb-1">Name: <span style={{ color: me?.color }}>{me?.name}</span></p>
           <p className="mb-1">HP: {Math.max(0, me?.hp || 0)}/100</p>
           {me?.shield && me.shield > 0 ? <p className="mb-1 text-blue-400">Shield: {me.shield}</p> : null}
           <p className="mb-1">Score: {me?.score}</p>
           {me?.id !== 'host' && !me?.isBot && (
               <p className="mb-1">Ping: <span className={getPingColor(me?.ping || 0)}>{me?.ping || 0}ms</span></p>
           )}
           <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
             <p className="text-green-400">線上人數: {totalPlayers}</p>
             <p className="text-blue-400">BOT 數量: {botCount}</p>
           </div>
        </div>
      </div>

      {/* Center: Game Timer */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
          <div className="bg-black/50 px-4 py-2 rounded border border-gray-600">
             <span className="text-3xl font-mono text-white tracking-widest pixel-font drop-shadow-md">
                 {formatTime(gameState.gameTime)}
             </span>
             <div className="text-xs text-gray-400 mt-1">Goal: {WIN_SCORE}</div>
          </div>
      </div>
      
      {/* AI Commentary Banner */}
      {aiCommentary && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-2xl pointer-events-none z-40 px-4">
            <div className="bg-gradient-to-r from-transparent via-black/80 to-transparent text-center py-2">
                <span className="text-yellow-400 font-bold mr-2 pixel-font">[AI 戰報]</span>
                <span className="text-white text-sm shadow-black drop-shadow-md animate-pulse">{aiCommentary}</span>
            </div>
        </div>
      )}

      {/* Right: Leaderboard */}
      <div className="bg-black/80 border-2 border-gray-600 p-4 rounded-lg text-white font-mono text-sm min-w-[200px] shadow-xl backdrop-blur-md pointer-events-auto max-h-[400px] overflow-y-auto custom-scrollbar scale-75 lg:scale-100 origin-top-right">
        <h3 className="text-center text-green-400 font-bold mb-2 border-b border-gray-600 pb-1 pixel-font">地區戰況</h3>
        <ul>
          {sortedRegions.map((region, index) => {
            if (gameState.regionScores[region] === 0 && index > 4) return null; // 簡化顯示：0分的且排名靠後的隱藏
            const score = gameState.regionScores[region];
            const progress = Math.min(100, (score / WIN_SCORE) * 100);
            
            return (
            <li key={region} className="flex flex-col py-1 border-b border-gray-800">
              <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: REGION_COLORS[region]}}></span>
                    <span className={`${index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                        {index + 1}. {REGION_LABELS[region] || region}
                    </span>
                  </span>
                  <span className="font-bold">{score}</span>
              </div>
              {/* Progress Bar for Win Condition */}
              <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </li>
            )
          })}
        </ul>
      </div>

      {/* Bottom Left: Chat Box */}
      <div className="absolute bottom-4 left-4 w-72 h-48 pointer-events-auto flex flex-col z-40">
          <div className="flex-1 bg-black/60 border border-gray-600 rounded-t p-2 overflow-y-auto custom-scrollbar text-xs font-mono">
              {chatMessages.map((msg) => (
                  <div key={msg.id} className="mb-1 break-words">
                      <span style={{ color: msg.color }} className="font-bold">{msg.sender}:</span>
                      <span className="text-white ml-1">{msg.text}</span>
                  </div>
              ))}
              <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="flex">
              <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onFocus={() => setChatFocus && setChatFocus(true)}
                  onBlur={() => setChatFocus && setChatFocus(false)}
                  className="flex-1 bg-black/80 border border-t-0 border-gray-600 text-white px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                  placeholder="按 Enter 聊天..."
              />
          </form>
      </div>

      {/* Death Screen */}
      {!gameState.gameOver && me?.dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 z-50 pointer-events-none">
             <div className="text-center animate-bounce">
                <h1 className="text-6xl text-red-500 font-bold pixel-font drop-shadow-lg stroke-black">陣亡</h1>
                <p className="text-white mt-4 text-xl">重生中...</p>
             </div>
          </div>
      )}

      {/* Game Over Screen */}
      {gameState.gameOver && gameState.winnerRegion && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[100] pointer-events-auto">
              <div className="bg-gray-800 border-4 border-yellow-500 p-10 rounded-xl text-center shadow-2xl animate-pulse">
                  <h1 className="text-5xl text-yellow-400 font-bold mb-6 pixel-font">GAME OVER</h1>
                  <h2 className="text-3xl text-white mb-4">勝利地區</h2>
                  <div className="text-6xl font-bold mb-8" style={{ color: REGION_COLORS[gameState.winnerRegion] }}>
                      {REGION_LABELS[gameState.winnerRegion]}
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded text-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                  >
                      再戰一場 (重新整理)
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default UIOverlay;