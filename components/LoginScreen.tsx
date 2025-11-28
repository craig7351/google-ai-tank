
import React, { useState } from 'react';
import { Region, REGION_COLORS, REGION_LABELS } from '../types';

interface LoginScreenProps {
  onJoin: (name: string, region: Region) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Taipei');
  
  const regions = Object.keys(REGION_COLORS) as Region[];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name, selectedRegion);
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
        <h1 className="text-4xl mb-6 text-center text-yellow-400 pixel-font tracking-tighter">坦克大戰：台灣爭霸</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">選擇你的陣營並主宰戰場。</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
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

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">選擇地區 (同地區互不傷害)</label>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all pixel-font"
          >
            加入戰鬥
          </button>
        </form>
      </div>

      <div className="mt-8 text-gray-500 text-xs max-w-md text-center">
        <p>提示: 使用 WASD 或 方向鍵移動。 空白鍵 或 點擊發射。</p>
        <p className="mt-2 text-yellow-500/50">Gemini AI 即時戰況播報</p>
      </div>
    </div>
  );
};

export default LoginScreen;
