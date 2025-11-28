
import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, InputState, Region, NetMessage } from './types';
import { initGame, updateGame, addPlayer, removePlayer } from './services/gameLogic';
import { audioService } from './services/audioService';
// Import PeerJS from ESM
import { Peer, DataConnection } from 'peerjs';

// Prefix to avoid collisions on public PeerJS server
const ROOM_PREFIX = 'rtw-pixel-tank-';
const MAX_CONNECTIONS = 8; // Limit players to prevent host overload

const MobileControls: React.FC<{ setInput: (updater: (prev: InputState) => InputState) => void }> = ({ setInput }) => {
    return (
        <div className="fixed bottom-4 left-4 right-4 flex justify-between pointer-events-auto lg:hidden touch-none select-none z-50">
            <div className="relative w-32 h-32 bg-gray-800/50 rounded-full border border-gray-500">
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
  const [statusMsg, setStatusMsg] = useState('');
  
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, fire: false });
  // Map of ALL inputs (including bots/remote). Host uses this to run physics.
  const allInputsRef = useRef<Record<string, InputState>>({}); 
  
  const reqRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // Network Refs
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]); // For Host: list of clients
  const hostConnRef = useRef<DataConnection | null>(null); // For Client: connection to host

  const handleJoin = async (name: string, region: Region, roomId: string, withBots: boolean) => {
    setStatusMsg('連接中...');
    
    // Initialize Peer
    const peer = new Peer(undefined, {
       debug: 1
    });
    
    // Strategy: Try to be the Host with specific ID.
    const fullRoomId = ROOM_PREFIX + roomId;
    
    // Attempt to be HOST
    const hostPeer = new Peer(fullRoomId);
    
    hostPeer.on('open', (id) => {
        // SUCCESS: We are the HOST
        console.log('Host created room:', id);
        setStatusMsg('');
        
        peerRef.current = hostPeer;
        const initialState = initGame(name, region, roomId, withBots);
        stateRef.current = initialState;
        setGameState(initialState);
        setIsPlaying(true);
        audioService.init();
        audioService.startBGM();

        // Host Input Setup
        allInputsRef.current['host'] = inputRef.current;

        // Listen for connections
        hostPeer.on('connection', (conn) => {
            // CHECK PLAYER LIMIT
            if (connectionsRef.current.length >= MAX_CONNECTIONS) {
                console.log('Room full, rejecting connection:', conn.peer);
                conn.on('open', () => {
                    conn.send({ type: 'ERROR', message: '房間人數已滿 (Room Full)' } as NetMessage);
                    setTimeout(() => conn.close(), 500);
                });
                return;
            }

            conn.on('open', () => {
                console.log('Client connected:', conn.peer);
                connectionsRef.current.push(conn);
            });
            
            conn.on('data', (data: any) => {
                const msg = data as NetMessage;
                if (msg.type === 'JOIN') {
                    if (stateRef.current) {
                        stateRef.current = addPlayer(stateRef.current, conn.peer, msg.name, msg.region);
                        // Send Welcome
                        const welcomeMsg: NetMessage = {
                            type: 'WELCOME',
                            playerId: conn.peer,
                            state: stateRef.current
                        };
                        conn.send(welcomeMsg);
                    }
                } else if (msg.type === 'INPUT') {
                    allInputsRef.current[conn.peer] = msg.input;
                }
            });

            conn.on('close', () => {
                if (stateRef.current) {
                    stateRef.current = removePlayer(stateRef.current, conn.peer);
                    delete allInputsRef.current[conn.peer];
                    connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
                }
            });
        });
    });

    hostPeer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
            // ID taken, so Room exists. We are a CLIENT.
            console.log('Room exists, joining as client...');
            hostPeer.destroy();
            
            const clientPeer = new Peer();
            peerRef.current = clientPeer;

            clientPeer.on('open', () => {
                const conn = clientPeer.connect(fullRoomId);
                hostConnRef.current = conn;
                
                conn.on('open', () => {
                    console.log('Connected to Host');
                    setStatusMsg('已連線，等待同步...');
                    conn.send({ type: 'JOIN', name, region } as NetMessage);
                });

                conn.on('data', (data: any) => {
                    const msg = data as NetMessage;
                    if (msg.type === 'WELCOME') {
                        setIsPlaying(true);
                        setStatusMsg('');
                        audioService.init();
                        audioService.startBGM();
                        stateRef.current = { ...msg.state, myId: msg.playerId, isHost: false };
                        setGameState(stateRef.current);
                    } else if (msg.type === 'STATE_UPDATE') {
                        if (stateRef.current) {
                            // Update local state with host state
                            // Keep myId intact
                            stateRef.current = { 
                                ...msg.state, 
                                myId: stateRef.current.myId,
                                isHost: false 
                            };
                            setGameState(stateRef.current);
                        }
                    } else if (msg.type === 'ERROR') {
                        alert(msg.message);
                        conn.close();
                        window.location.reload();
                    }
                });
                
                conn.on('close', () => {
                   // If we were kicked or host died
                   if (isPlaying) {
                     alert('與主機的連線中斷');
                     window.location.reload();
                   }
                });
            });
            
            clientPeer.on('error', (e) => {
                 console.error(e);
                 setStatusMsg('連線錯誤: ' + e.message);
            });
        } else {
            console.error('Peer Error', err);
            setStatusMsg('連線錯誤: ' + err.type);
        }
    });
  };

  // Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { inputRef.current.up = true; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { inputRef.current.down = true; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { inputRef.current.left = true; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { inputRef.current.right = true; changed = true; }
      if (e.code === 'Space') { inputRef.current.fire = true; changed = true; }
      
      // If Client, send input immediately (naive approach)
      if (changed && hostConnRef.current && hostConnRef.current.open) {
          hostConnRef.current.send({ type: 'INPUT', input: inputRef.current } as NetMessage);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { inputRef.current.up = false; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { inputRef.current.down = false; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { inputRef.current.left = false; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { inputRef.current.right = false; changed = true; }
      if (e.code === 'Space') { inputRef.current.fire = false; changed = true; }

      if (changed && hostConnRef.current && hostConnRef.current.open) {
          hostConnRef.current.send({ type: 'INPUT', input: inputRef.current } as NetMessage);
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
      const dt = (time - lastTimeRef.current) / 16.67;
      lastTimeRef.current = time;

      // HOST LOGIC: Calculate physics, Broadcast state
      if (stateRef.current && stateRef.current.isHost) {
        // Update Host input in the map
        allInputsRef.current['host'] = inputRef.current;
        
        // Run Physics
        stateRef.current = updateGame(stateRef.current, allInputsRef.current, dt);
        
        // Broadcast
        const updateMsg: NetMessage = { type: 'STATE_UPDATE', state: stateRef.current };
        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(updateMsg);
        });

        setGameState(stateRef.current);
      } 
      // CLIENT LOGIC: Just render (handled by setGameState in peer listener)
      
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying]);

  const setInputState = (updater: (prev: InputState) => InputState) => {
      inputRef.current = updater(inputRef.current);
      // For mobile controls, send update if client
      if (hostConnRef.current && hostConnRef.current.open) {
          hostConnRef.current.send({ type: 'INPUT', input: inputRef.current } as NetMessage);
      }
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex flex-col items-center justify-center">
      {!isPlaying ? (
        <>
          <LoginScreen onJoin={handleJoin} />
          {statusMsg && <div className="absolute bottom-10 text-yellow-400 pixel-font animate-pulse">{statusMsg}</div>}
        </>
      ) : (
        gameState && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <GameCanvas gameState={gameState} />
            <UIOverlay gameState={gameState} />
            <MobileControls setInput={setInputState} />
            {/* Connection Status Indicator */}
            <div className="absolute top-2 right-2 text-xs text-green-500 font-mono pointer-events-none z-50">
                {gameState.isHost 
                  ? `HOST (${connectionsRef.current.length}/${MAX_CONNECTIONS} clients)` 
                  : `CLIENT (Connected)`}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default App;
