
import React, { useState, useRef, useEffect } from 'react';
import { GameState, Region, REGION_COLORS, REGION_LABELS, ChatMessage } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  chatMessages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  setChatFocus?: (focused: boolean) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, chatMessages = [], onSendMessage, setChatFocus }) => {
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

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex justify-between items-start">
      
      {/* Left: Player Status */}
      {/* On mobile/tablet: Top-left with small margin (covering minimap but clearing center). Desktop: Pushed down below minimap */}
      <div className="mt-0 lg:mt-[220px] pointer-events-auto origin-top-left scale-75 lg:scale-100"> 
        <div className="bg-black/70 border border-gray-500 p-4 rounded text-white font-mono text-sm shadow-lg backdrop-blur-sm">
           <h3 className="text-yellow-400 font-bold mb-2 pixel-font">STATUS</h3>
           <p className="mb-1">Room: <span className="text-yellow-200">{gameState.roomId}</span></p>
           <p className="mb-1">Name: <span style={{ color: me?.color }}>{me?.name}</span></p>
           <p className="mb-1">HP: {Math.max(0, me?.hp || 0)}/100</p>
           <p className="mb-1">Score: {me?.score}</p>
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
          </div>
      </div>

      {/* Right: Leaderboard */}
      <div className="bg-black/80 border-2 border-gray-600 p-4 rounded-lg text-white font-mono text-sm min-w-[200px] shadow-xl backdrop-blur-md pointer-events-auto max-h-[400px] overflow-y-auto custom-scrollbar scale-75 lg:scale-100 origin-top-right">
        <h3 className="text-center text-green-400 font-bold mb-2 border-b border-gray-600 pb-1 pixel-font">地區戰況</h3>
        <ul>
          {sortedRegions.map((region, index) => {
            if (gameState.regionScores[region] === 0 && index > 4) return null; // 簡化顯示：0分的且排名靠後的隱藏
            return (
            <li key={region} className="flex justify-between items-center py-1">
              <span className="flex items-center">
                 <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: REGION_COLORS[region]}}></span>
                 <span className={`${index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                    {index + 1}. {REGION_LABELS[region] || region}
                 </span>
              </span>
              <span className="font-bold">{gameState.regionScores[region]}</span>
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
      {me?.dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 z-50 pointer-events-none">
             <div className="text-center animate-bounce">
                <h1 className="text-6xl text-red-500 font-bold pixel-font drop-shadow-lg stroke-black">陣亡</h1>
                <p className="text-white mt-4 text-xl">重生中...</p>
             </div>
          </div>
      )}
    </div>
  );
};

export default UIOverlay;
