export type Region = 'Taipei' | 'Taichung' | 'Kaohsiung' | 'Tainan' | 'NewTaipei';

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
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number; // Bullets can bounce once
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

export interface GameState {
  players: Player[];
  bullets: Bullet[];
  particles: Particle[];
  walls: { x: number; y: number; w: number; h: number }[];
  myId: string | null;
  regionScores: Record<Region, number>;
  gameTime: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export const REGION_COLORS: Record<Region, string> = {
  Taipei: '#10B981',    // Green
  NewTaipei: '#34D399', // Light Green
  Taichung: '#3B82F6',  // Blue
  Tainan: '#F59E0B',    // Orange
  Kaohsiung: '#EF4444', // Red
};

export const MAP_SIZE = 2000;
export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 600;
export const PLAYER_RADIUS = 20;
export const BULLET_SPEED = 12;
export const PLAYER_SPEED = 4;
export const FIRE_RATE = 500; // ms
