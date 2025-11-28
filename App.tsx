
import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, InputState, Region, NetMessage, GameSettings, MAX_CONNECTIONS, ChatMessage } from './types';
import { initGame, updateGame, addPlayer, removePlayer } from './services/gameLogic';
import { audioService } from './services/audioService';
// Import PeerJS from ESM
import { Peer, DataConnection } from 'peerjs';

// Prefix to avoid collisions on public PeerJS server
const ROOM_PREFIX = 'rtw-pixel-tank-';

const MobileControls: React.FC<{ setInput: (updater: (prev: InputState) => InputState) => void }> = ({ setInput }) => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isAutoFire, setIsAutoFire] = useState(false);

    // Helper to calculate direction
    const handleTouch = (touch: React.Touch) => {
        const rect = joystickRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        
        // Visuals
        const maxRadius = rect.width / 2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxRadius) {
            const ratio = maxRadius / dist;
            setKnobPos({ x: dx * ratio, y: dy * ratio });
        } else {
            setKnobPos({ x: dx, y: dy });
        }
        
        // Input Logic (Threshold 15px)
        const deadZone = 15;
        setInput(prev => ({
            ...prev,
            up: dy < -deadZone,
            down: dy > deadZone,
            left: dx < -deadZone,
            right: dx > deadZone
        }));
    };

    const onTouchStart = (e: React.TouchEvent) => {
        handleTouch(e.targetTouches[0]);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        handleTouch(e.targetTouches[0]);
    };

    const onTouchEnd = () => {
        setKnobPos({ x: 0, y: 0 });
        setInput(prev => ({ ...prev, up: false, down: false, left: false, right: false }));
    };

    const toggleAutoFire = () => {
        const newVal = !isAutoFire;
        setIsAutoFire(newVal);
        setInput(prev => ({ ...prev, fire: newVal }));
    };

    return (
        <div className="fixed bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none lg:hidden z-50 select-none">
            {/* Joystick */}
            <div 
                ref={joystickRef}
                className="relative w-36 h-36 bg-gray-800/50 rounded-full border-2 border-gray-500 pointer-events-auto backdrop-blur-sm touch-none"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                 <div 
                    className="absolute w-12 h-12 bg-gray-300/80 rounded-full shadow-lg transition-transform duration-75 ease-out"
                    style={{ 
                        top: '50%', left: '50%', 
                        marginTop: '-24px', marginLeft: '-24px',
                        transform: `translate(${knobPos.x}px, ${knobPos.y}px)` 
                    }}
                />
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col items-end gap-4 pointer-events-auto">
                <button
                    onClick={toggleAutoFire}
                    className={`px-4 py-2 rounded-full font-bold text-xs pixel-font border-2 shadow-md transition-all ${isAutoFire ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                >
                    AUTO FIRE: {isAutoFire ? 'ON' : 'OFF'}
                </button>
                
                <button 
                    className={`w-20 h-20 rounded-full border-4 shadow-lg flex items-center justify-center font-bold text-white pixel-font touch-none transition-all active:scale-95 ${isAutoFire ? 'opacity-50 cursor-not-allowed bg-gray-700 border-gray-600' : 'bg-red-600/80 border-red-500 active:bg-red-500'}`}
                    onTouchStart={() => !isAutoFire && setInput(s => ({...s, fire: true}))}
                    onTouchEnd={() => !isAutoFire && setInput(s => ({...s, fire: false}))}
                >
                    FIRE
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatFocused, setIsChatFocused] = useState(false);
  
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
  
  const handleJoin = async (name: string, region: Region, roomId: string, settings: GameSettings) => {
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
        const initialState = initGame(name, region, roomId, settings);
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
                } else if (msg.type === 'CHAT') {
                    // Host receives chat from client: Update local & Broadcast to others
                    setChatMessages(prev => [...prev, msg.message]);
                    connectionsRef.current.forEach(c => {
                        if (c.peer !== conn.peer && c.open) {
                            c.send(msg);
                        }
                    });
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
                    } else if (msg.type === 'CHAT') {
                        setChatMessages(prev => [...prev, msg.message]);
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

  const handleSendMessage = (text: string) => {
      if (!gameState || !gameState.myId) return;
      const me = gameState.players.find(p => p.id === gameState.myId);
      const msg: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: me?.name || 'Unknown',
          text,
          color: me?.color || '#fff',
          timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, msg]);

      const netMsg: NetMessage = { type: 'CHAT', message: msg };
      if (gameState.isHost) {
          // If host, broadcast to all clients
          connectionsRef.current.forEach(c => { if (c.open) c.send(netMsg); });
      } else {
          // If client, send to host (who will broadcast)
          if (hostConnRef.current && hostConnRef.current.open) {
              hostConnRef.current.send(netMsg);
          }
      }
  };

  // Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent movement when typing in chat
      if (isChatFocused) return;

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
      if (isChatFocused) {
          // Ensure we clear inputs if user focuses chat while moving
          inputRef.current = { up: false, down: false, left: false, right: false, fire: false };
          return;
      }

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
  }, [isChatFocused]);

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
            <UIOverlay 
                gameState={gameState} 
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                setChatFocus={setIsChatFocused}
            />
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
