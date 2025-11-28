
export type Region = 
  | 'Taipei'    
  | 'NewTaipei' 
  | 'Taoyuan'   
  | 'Hsinchu'   
  | 'Miaoli'
  | 'Taichung'  
  | 'Changhua'
  | 'Nantou'
  | 'Yunlin'
  | 'Chiayi'    
  | 'Tainan'    
  | 'Kaohsiung' 
  | 'Pingtung'  
  | 'Keelung'   
  | 'Yilan'     
  | 'Hualien'   
  | 'Taitung'
  | 'Penghu'
  | 'Kinmen';

export interface Player {
  id: string;
  name: string;
  region: Region;
  x: number;
  y: number;
  rotation: number; // in radians
  hp: number;
  maxHp: number;
  score: number;
  color: string;
  isBot: boolean;
  lastShotTime: number;
  dead: boolean;
  // Buffs (timestamp when it expires)
  damageBoostUntil: number;
  speedBoostUntil: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  ownerRegion: Region; // 用於判斷同隊傷害
  color: string;       // 子彈顏色同玩家
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  damage: number; // 子彈傷害 (普通20, 加倍40)
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export type ItemType = 'HEALTH' | 'DOUBLE_DAMAGE' | 'DOUBLE_SPEED';

export interface Item {
  id: string;
  x: number;
  y: number;
  type: ItemType;
}

export interface GameSettings {
  botCount: number;
  itemSpawnInterval: number; // ms
  buffDuration: number;      // ms
}

export interface GameState {
  roomId: string;
  isHost: boolean; // Know if we are the authority
  settings: GameSettings; // Add settings to state
  players: Player[];
  bullets: Bullet[];
  particles: Particle[];
  items: Item[]; // Map items
  walls: { x: number; y: number; w: number; h: number }[];
  myId: string | null;
  regionScores: Record<Region, number>;
  gameTime: number;
  lastItemSpawnTime: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  color: string;
  timestamp: number;
}

// Network Types
export type NetMessage = 
  | { type: 'JOIN'; name: string; region: Region }
  | { type: 'WELCOME'; playerId: string; state: GameState }
  | { type: 'INPUT'; input: InputState }
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'ERROR'; message: string }
  | { type: 'CHAT'; message: ChatMessage };

export const MAX_CONNECTIONS = 8;

export const REGION_LABELS: Record<Region, string> = {
  Taipei: '台北市',
  NewTaipei: '新北市',
  Taoyuan: '桃園市',
  Hsinchu: '新竹市',
  Miaoli: '苗栗縣',
  Taichung: '台中市',
  Changhua: '彰化縣',
  Nantou: '南投縣',
  Yunlin: '雲林縣',
  Chiayi: '嘉義市',
  Tainan: '台南市',
  Kaohsiung: '高雄市',
  Pingtung: '屏東縣',
  Keelung: '基隆市',
  Yilan: '宜蘭縣',
  Hualien: '花蓮縣',
  Taitung: '台東縣',
  Penghu: '澎湖縣',
  Kinmen: '金門縣',
};

export const REGION_COLORS: Record<Region, string> = {
  Taipei: '#22c55e',    // Green
  NewTaipei: '#86efac', // Light Green
  Taoyuan: '#14b8a6',   // Teal
  Hsinchu: '#06b6d4',   // Cyan
  Miaoli: '#a3e635',    // Lime
  Taichung: '#3b82f6',  // Blue
  Changhua: '#60a5fa',  // Light Blue
  Nantou: '#818cf8',    // Indigo Light
  Yunlin: '#a78bfa',    // Violet
  Chiayi: '#6366f1',    // Indigo
  Tainan: '#f59e0b',    // Orange
  Kaohsiung: '#ef4444', // Red
  Pingtung: '#be123c',  // Rose
  Keelung: '#a855f7',   // Purple
  Yilan: '#ec4899',     // Pink
  Hualien: '#10b981',   // Emerald
  Taitung: '#f97316',   // Orange Red
  Penghu: '#0ea5e9',    // Sky Blue
  Kinmen: '#eab308',    // Yellow
};

export const MAP_SIZE = 2000;
export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 600;
export const PLAYER_RADIUS = 20;
export const BULLET_SPEED = 12;
export const PLAYER_SPEED = 4;
export const FIRE_RATE = 500; // ms
export const ITEM_RADIUS = 15;
