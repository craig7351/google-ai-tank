

import React, { useState, useEffect } from 'react';
import { Region, REGION_COLORS, REGION_LABELS, GameSettings, LobbyRoomInfo, MAX_CONNECTIONS } from '../types';
import { fetchLobbyRooms, setScriptUrl, getSavedScriptUrl } from '../services/lobbyService';

interface LoginScreenProps {
  onJoin: (name: string, region: Region, roomId: string, roomName: string, settings: GameSettings) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Taipei');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState(''); // New State for Room Name
  
  // Game Settings State
  const [botCount, setBotCount] = useState(5);
  const [spawnInterval, setSpawnInterval] = useState(5); // seconds
  const [buffDuration, setBuffDuration] = useState(15); // seconds
  const [enableAICommentary, setEnableAICommentary] = useState(false);

  // Lobby State
  const [scriptUrl, setScriptUrlState] = useState(getSavedScriptUrl());
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoomInfo[]>([]);
  const [loadingLobby, setLoadingLobby] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const regions = Object.keys(REGION_COLORS) as Region[];

  // Generate a random room code on mount/switch to create
  useEffect(() => {
    if (mode === 'create') {
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomId(randomCode);
    } else {
      setRoomId('');
    }
  }, [mode]);

  // Load Lobby when script URL is present
  useEffect(() => {
    if (scriptUrl) {
      setScriptUrl(scriptUrl);
      refreshLobby();
    }
  }, [scriptUrl]);

  const refreshLobby = async () => {
      setLoadingLobby(true);
      const rooms = await fetchLobbyRooms();
      setLobbyRooms(rooms);
      setLoadingLobby(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeRoomId = String(roomId); // Ensure string before using string methods
    if (name.trim() && safeRoomId.trim()) {
      const settings: GameSettings = {
          botCount: mode === 'create' ? botCount : 0, // Joiners ignore this, host decides
          itemSpawnInterval: spawnInterval * 1000,
          buffDuration: buffDuration * 1000,
          enableAICommentary: mode === 'create' ? enableAICommentary : false,
      };
      // Pass roomName only if creating
      onJoin(name, selectedRegion, safeRoomId, mode === 'create' ? roomName : '', settings);
    }
  };

  const handleLobbyClick = (r: LobbyRoomInfo) => {
      setMode('join');
      setRoomId(String(r.roomId)); // Explicitly convert to string to prevent TypeError
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative overflow-y-auto custom-scrollbar w-full">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" 
           style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               zIndex: 0
           }}>
      </div>

      <div className="flex flex-col md:flex-row gap-8 max-w-6xl w-full z-10">
          
          {/* Main Login Form */}
          <div className="flex-1 bg-gray-800 p-8 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-gray-700">
            <h1 className="text-3xl md:text-4xl mb-6 text-center text-yellow-400 pixel-font tracking-tighter">坦克大戰：台灣爭霸</h1>
            
            {/* Room Mode Tabs */}
            <div className="flex mb-6 border-b border-gray-600">
            <button 
                type="button"
                onClick={() => setMode('create')}
                className={`flex-1 py-2 font-bold pixel-font transition-colors ${mode === 'create' ? 'text-green-400 border-b-2 border-green-400 bg-gray-700/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
                建立房間
            </button>
            <button 
                type="button"
                onClick={() => setMode('join')}
                className={`flex-1 py-2 font-bold pixel-font transition-colors ${mode === 'join' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
                加入房間
            </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-bold mb-2 text-gray-300">戰士名稱</label>
                    <input 
                    type="text" 
                    maxLength={12}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black border-2 border-gray-600 rounded p-3 text-white focus:border-green-500 focus:outline-none font-mono text-lg"
                    placeholder="輸入名稱..."
                    required
                    />
                </div>
                
                <div className="w-1/3">
                    <label className="block text-sm font-bold mb-2 text-gray-300">
                        {mode === 'create' ? '房間代碼 (自動)' : '房間代碼'}
                    </label>
                    <input 
                    type="text" 
                    maxLength={6}
                    value={roomId}
                    onChange={(e) => mode === 'join' && setRoomId(e.target.value)}
                    readOnly={mode === 'create'}
                    className={`w-full bg-black border-2 rounded p-3 text-white font-mono text-lg text-center ${mode === 'create' ? 'border-green-800 text-green-400 cursor-not-allowed' : 'border-gray-600 focus:border-blue-500'}`}
                    placeholder="CODE"
                    required
                    />
                </div>
            </div>

            {mode === 'create' && (
                <div>
                    <label className="block text-sm font-bold mb-2 text-gray-300">房間名稱 (選填)</label>
                    <input 
                    type="text" 
                    maxLength={20}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-black border-2 border-gray-600 rounded p-3 text-white focus:border-purple-500 focus:outline-none font-mono text-lg"
                    placeholder="例如：快樂農場"
                    />
                    <p className="text-xs text-gray-500 mt-1">此名稱將顯示於線上戰情室，方便朋友辨識。</p>
                </div>
            )}

            {mode === 'create' && (
                <div className="bg-gray-700/30 p-4 rounded border border-gray-600 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-300">AI 機器人數量: <span className="text-green-400">{botCount}</span></label>
                        <input 
                            type="range" min="0" max="14" step="1"
                            value={botCount} onChange={(e) => setBotCount(parseInt(e.target.value))}
                            className="w-1/2 accent-green-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-300">道具生成間隔: <span className="text-blue-400">{spawnInterval}s</span></label>
                        <input 
                            type="range" min="1" max="20" step="1"
                            value={spawnInterval} onChange={(e) => setSpawnInterval(parseInt(e.target.value))}
                            className="w-1/2 accent-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-300">道具持續時間: <span className="text-purple-400">{buffDuration}s</span></label>
                        <input 
                            type="range" min="5" max="30" step="1"
                            value={buffDuration} onChange={(e) => setBuffDuration(parseInt(e.target.value))}
                            className="w-1/2 accent-purple-500"
                        />
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-600 pt-3">
                        <label className="text-sm font-bold text-gray-300">啟用 AI 戰情廣播 (Gemini)</label>
                        <input 
                            type="checkbox"
                            checked={enableAICommentary}
                            onChange={(e) => setEnableAICommentary(e.target.checked)}
                            className="w-5 h-5 accent-yellow-500"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">選擇地區 (同地區互不傷害)</label>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {regions.map(r => (
                    <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRegion(r)}
                    className={`p-2 rounded text-xs font-bold transition-all border-2 truncate flex items-center justify-center ${selectedRegion === r ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: REGION_COLORS[r], color: '#fff', textShadow: '1px 1px 0 #000' }}
                    >
                    {REGION_LABELS[r]}
                    </button>
                ))}
                </div>
            </div>

            <button 
                type="submit"
                className={`w-full font-bold py-4 px-4 rounded border-b-4 active:border-b-0 active:translate-y-1 transition-all pixel-font ${mode === 'create' ? 'bg-green-600 hover:bg-green-500 border-green-800' : 'bg-blue-600 hover:bg-blue-500 border-blue-800'}`}
            >
                {mode === 'create' ? '創建戰場' : '加入戰鬥'}
            </button>
            </form>
          </div>

          {/* Lobby Panel */}
          <div className="w-full md:w-80 flex flex-col gap-4">
              <div className="bg-gray-800 p-4 rounded-xl border-4 border-gray-600 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
                      <h2 className="text-xl text-cyan-400 font-bold pixel-font">線上戰情室</h2>
                      <button onClick={refreshLobby} className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
                          {loadingLobby ? '...' : '刷新'}
                      </button>
                  </div>

                  {!scriptUrl && (
                      <div className="text-center text-gray-400 text-sm py-4">
                          <p className="mb-2">未設定 Google Script URL</p>
                          <button 
                             onClick={() => setShowConfig(!showConfig)}
                             className="text-blue-400 underline"
                          >
                              {showConfig ? '隱藏設定' : '設定後端'}
                          </button>
                      </div>
                  )}

                  {showConfig && (
                      <div className="mb-4 bg-gray-900 p-2 rounded">
                          <label className="text-xs text-gray-400 block mb-1">Google Web App URL:</label>
                          <input 
                             type="text" 
                             value={scriptUrl}
                             onChange={(e) => setScriptUrlState(e.target.value)}
                             className="w-full bg-black border border-gray-700 text-xs p-1 text-white mb-1"
                             placeholder="https://script.google.com/..."
                          />
                          <p className="text-[10px] text-gray-500">部署 Apps Script 以啟用大廳功能。</p>
                      </div>
                  )}

                  {scriptUrl && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {lobbyRooms.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 text-sm">目前無活躍戰場</div>
                        ) : (
                            <div className="space-y-2">
                                {lobbyRooms.map((room) => (
                                    <div 
                                        key={room.roomId}
                                        onClick={() => handleLobbyClick(room)}
                                        className="bg-gray-700/50 p-3 rounded border border-gray-600 hover:bg-gray-600 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-yellow-300 pixel-font">#{room.roomId}</span>
                                            <span className="text-xs bg-black px-1 rounded text-green-400">
                                                {room.playerCount}/{MAX_CONNECTIONS}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-300">
                                            <span className="truncate max-w-[120px]" title={room.hostName}>{room.hostName}</span>
                                            <span style={{ color: REGION_COLORS[room.region] }}>
                                                {REGION_LABELS[room.region]}
                                            </span>
                                        </div>
                                        {room.botCount > 0 && (
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                BOT: {room.botCount}
                                            </div>
                                        )}
                                        <div className="hidden group-hover:block text-center mt-2 text-xs text-blue-300 font-bold">
                                            點擊加入
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default LoginScreen;