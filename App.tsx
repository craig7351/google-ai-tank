
import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, InputState, Region } from './types';
import { initGame, updateGame } from './services/gameLogic';
import { audioService } from './services/audioService';
import { generateCommentary } from './services/geminiService';

// Mobile controls helper
const MobileControls: React.FC<{ setInput: (updater: (prev: InputState) => InputState) => void }> = ({ setInput }) => {
    return (
        <div className="fixed bottom-4 left-4 right-4 flex justify-between pointer-events-auto md:hidden touch-none select-none z-50">
            <div className="relative w-32 h-32 bg-gray-800/50 rounded-full border border-gray-500">
                {/* D-Pad approximation */}
                <div 
                    className="absolute top-0 left-1/3 w-1/3 h-1/3 bg-gray-600/50 rounded-t active:bg-white/50"
                    onTouchStart={() => setInput(s => ({...s, up: true}))} onTouchEnd={() => setInput(s => ({...s, up: false}))}
                ></div>
                <div 
                    className="absolute bottom-0 left-1/3 w-1/3 h-1/3 bg-gray-600/50 rounded-b active:bg-white/50"
                    onTouchStart={() => setInput(s => ({...s, down: true}))} onTouchEnd={() => setInput(s => ({...s, down: false}))}
                ></div>
                <div 
                    className="absolute left-0 top-1/3 w-1/3 h-1/3 bg-gray-600/50 rounded-l active:bg-white/50"
                    onTouchStart={() => setInput(s => ({...s, left: true}))} onTouchEnd={() => setInput(s => ({...s, left: false}))}
                ></div>
                <div 
                    className="absolute right-0 top-1/3 w-1/3 h-1/3 bg-gray-600/50 rounded-r active:bg-white/50"
                    onTouchStart={() => setInput(s => ({...s, right: true}))} onTouchEnd={() => setInput(s => ({...s, right: false}))}
                ></div>
            </div>
            
            <button 
                className="w-24 h-24 bg-red-600/80 rounded-full border-4 border-red-800 active:bg-red-500 shadow-lg flex items-center justify-center font-bold text-white pixel-font"
                onTouchStart={() => setInput(s => ({...s, fire: true}))} 
                onTouchEnd={() => setInput(s => ({...s, fire: false}))}
            >
                FIRE
            </button>
        </div>
    )
}

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiCommentary, setAiCommentary] = useState<string>("歡迎來到坦克大戰競技場！");
  
  // Use refs for game loop to avoid stale closures
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, fire: false });
  const reqRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const commentaryTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const handleJoin = (name: string, region: Region) => {
    const initialState = initGame(name, region);
    setGameState(initialState);
    stateRef.current = initialState;
    setIsPlaying(true);
    audioService.init();
    audioService.startBGM();

    // Start AI Commentary Loop (Every 15 seconds)
    if (commentaryTimerRef.current) clearInterval(commentaryTimerRef.current);
    commentaryTimerRef.current = setInterval(async () => {
       if(stateRef.current) {
           // Find leader
           const scores = stateRef.current.regionScores;
           const regions = Object.keys(scores) as Region[];
           if (regions.length === 0) return;
           
           const leader = regions.reduce((a, b) => scores[a] > scores[b] ? a : b);
           const comment = await generateCommentary(scores, leader);
           setAiCommentary(comment);
       }
    }, 15000);
  };

  // Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': inputRef.current.up = true; break;
        case 'KeyS': inputRef.current.down = true; break;
        case 'KeyA': inputRef.current.left = true; break;
        case 'KeyD': inputRef.current.right = true; break;
        case 'ArrowUp': inputRef.current.up = true; break;
        case 'ArrowDown': inputRef.current.down = true; break;
        case 'ArrowLeft': inputRef.current.left = true; break;
        case 'ArrowRight': inputRef.current.right = true; break;
        case 'Space': inputRef.current.fire = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': inputRef.current.up = false; break;
        case 'KeyS': inputRef.current.down = false; break;
        case 'KeyA': inputRef.current.left = false; break;
        case 'KeyD': inputRef.current.right = false; break;
        case 'ArrowUp': inputRef.current.up = false; break;
        case 'ArrowDown': inputRef.current.down = false; break;
        case 'ArrowLeft': inputRef.current.left = false; break;
        case 'ArrowRight': inputRef.current.right = false; break;
        case 'Space': inputRef.current.fire = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game Loop
  useEffect(() => {
    if (!isPlaying) return;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 16.67; // Normalize to ~60fps
      lastTimeRef.current = time;

      if (stateRef.current) {
        stateRef.current = updateGame(stateRef.current, inputRef.current, dt);
        setGameState(stateRef.current); // Trigger re-render
      }

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      if (commentaryTimerRef.current) clearInterval(commentaryTimerRef.current);
    };
  }, [isPlaying]);

  const setInputState = (updater: (prev: InputState) => InputState) => {
      inputRef.current = updater(inputRef.current);
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex flex-col items-center justify-center">
      {!isPlaying ? (
        <LoginScreen onJoin={handleJoin} />
      ) : (
        gameState && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <GameCanvas gameState={gameState} />
            <UIOverlay gameState={gameState} aiCommentary={aiCommentary} />
            <MobileControls setInput={setInputState} />
          </div>
        )
      )}
    </div>
  );
};

export default App;
