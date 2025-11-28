import React, { useState } from 'react';
import { Region, REGION_COLORS } from '../types';

interface LoginScreenProps {
  onJoin: (name: string, region: Region) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Taipei');
  
  const regions: Region[] = ['Taipei', 'NewTaipei', 'Taichung', 'Tainan', 'Kaohsiung'];

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

      <div className="bg-gray-800 p-8 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-gray-700 z-10 max-w-md w-full">
        <h1 className="text-4xl mb-6 text-center text-yellow-400 pixel-font tracking-tighter">TANK WARS</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">Select your territory and dominate the battlefield.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">SOLDIER NAME</label>
            <input 
              type="text" 
              maxLength={12}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border-2 border-gray-600 rounded p-3 text-white focus:border-green-500 focus:outline-none font-mono text-lg"
              placeholder="Enter name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">ALLEGIANCE (REGION)</label>
            <div className="grid grid-cols-2 gap-2">
              {regions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  className={`p-2 rounded text-sm font-bold transition-all border-2 ${selectedRegion === r ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: REGION_COLORS[r], color: '#fff', textShadow: '1px 1px 0 #000' }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all pixel-font"
          >
            DEPLOY TANK
          </button>
        </form>
      </div>

      <div className="mt-8 text-gray-500 text-xs max-w-md text-center">
        <p>Tip: Use WASD or Arrows to Move. SPACE or Click to Shoot.</p>
        <p className="mt-2 text-yellow-500/50">Gemini AI Enabled Commentary</p>
      </div>
    </div>
  );
};

export default LoginScreen;
