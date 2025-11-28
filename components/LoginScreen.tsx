
import React, { useState, useEffect } from 'react';
import { Region, REGION_COLORS, REGION_LABELS } from '../types';

interface LoginScreenProps {
  onJoin: (name: string, region: Region, roomId: string, withBots: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Taipei');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomId, setRoomId] = useState('');
  const [withBots, setWithBots] = useState(true);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && roomId.trim()) {
      // If joining, we ignore the local withBots state (it depends on the host)
      // Passing false for join mode just to be clean, though logic is handled by host state mostly
      onJoin(name, selectedRegion, roomId, mode === 'create' ? withBots : false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
               backgroundSize: '40px 40px'
           }}>
      </div>

      <div className="bg-gray-800 p-8 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-gray-700 z-10 max-w-2xl w-full">
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
            <div className="flex items-center space-x-2 bg-gray-700/30 p-2 rounded border border-gray-600">
                <input 
                type="checkbox" 
                id="withBots" 
                checked={withBots} 
                onChange={(e) => setWithBots(e.target.checked)}
                className="w-5 h-5 accent-green-500 cursor-pointer"
                />
                <label htmlFor="withBots" className="text-sm font-bold text-gray-300 cursor-pointer select-none">
                加入 AI 機器人 (Bots)
                </label>
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

      <div className="mt-8 text-gray-500 text-xs max-w-md text-center">
        <p>提示: 使用 WASD 或 方向鍵移動。 空白鍵 或 點擊發射。</p>
        <p>相同房間代碼將生成相同的地圖地形。</p>
      </div>
    </div>
  );
};

export default LoginScreen;
