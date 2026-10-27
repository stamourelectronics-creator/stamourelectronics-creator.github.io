import React, { useState, useEffect, useRef, useId } from 'react';
import { 
  Play, RotateCcw, Volume2, VolumeX, Shield, Trophy, Sparkles, Send, Skull, Swords, 
  Gamepad, Info, UserCheck, MessageSquare, AlertCircle
} from 'lucide-react';
import { 
  db, 
  collection, 
  addDoc, 
  setDoc,
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from '../firebase';

// Game Map Model (1 = Cyber fortress brick, 2 = Glowing neon blue pillar, 3 = Warning core barrier)
const MAP_SIZE = 12;
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,3,0,0,1],
  [1,0,2,2,0,1,0,1,1,1,0,1],
  [1,0,2,0,0,0,0,0,0,2,0,1],
  [1,0,0,0,3,3,3,3,0,0,0,1],
  [1,2,1,0,1,0,1,1,0,1,2,1],
  [1,0,0,0,1,0,0,1,0,0,0,1],
  [1,0,3,0,1,2,2,1,1,3,0,1],
  [1,0,3,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,3,0,2,3,3,2,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1]
];

interface CyberDoom3DProps {
  userNickname: string;
  currentUser?: any;
}

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  score: number;
  lastActive: any;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  edited: boolean;
  timestamp: any;
}

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  isDead: boolean;
  scoreValue: number;
}

export default function CyberDoom3D({ userNickname, currentUser }: CyberDoom3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playId = useRef<string>(`p_${Math.random().toString(36).substr(2, 9)}`);
  
  // Game Play Coordinate States
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [isGameOver, setIsGameOver] = useState(false);
  const [muted, setMuted] = useState(false);
  
  // Players and Chat collection states
  const [otherPlayers, setOtherPlayers] = useState<PlayerState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRoomCount, setChatRoomCount] = useState(1);

  // Player physics variables (using Ref to prevent React re-render lag)
  const px = useRef(1.5); // Player X cell position
  const py = useRef(1.5); // Player Y cell position
  const pa = useRef(0.0); // Player angle in radians
  const movementKeys = useRef<{ [key: string]: boolean }>({});
  const localBullets = useRef<Bullet[]>([]);

  // Local floating beholders (Enemies)
  const enemies = useRef<Enemy[]>([
    { id: 'e1', x: 4.5, y: 1.5, health: 100, isDead: false, scoreValue: 50 },
    { id: 'e2', x: 10.5, y: 5.5, health: 100, isDead: false, scoreValue: 75 },
    { id: 'e3', x: 2.5, y: 8.5, health: 100, isDead: false, scoreValue: 100 },
    { id: 'e4', x: 8.5, y: 10.5, health: 100, isDead: false, scoreValue: 120 }
  ]);

  // Plasma Blaster fire animation frame
  const [fireFrame, setFireFrame] = useState(0);

  // Synth Audio feedback
  const playSynthNote = (freq: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine') => {
    if (muted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  };

  // 1. Subscription to Multiplayers positions
  useEffect(() => {
    if (!db) return;
    const playersCol = collection(db, 'cyber_doom_players');
    const unsubscribe = onSnapshot(playersCol, (snapshot) => {
      const list: PlayerState[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (doc.id !== playId.current) {
          list.push({
            id: doc.id,
            name: d.name || 'Core Cyber Slayer',
            x: d.x ?? 1.5,
            y: d.y ?? 1.5,
            angle: d.angle ?? 0,
            score: d.score ?? 0,
            lastActive: d.lastActive
          });
        }
      });
      setOtherPlayers(list);
      setChatRoomCount(list.length + 1);
    });

    return () => {
      unsubscribe();
      // Remove our player document when leaving
      deleteDoc(doc(db, 'cyber_doom_players', playId.current)).catch(() => {});
    };
  }, []);

  // 2. Subscription to safe multiplayer chats
  useEffect(() => {
    if (!db) return;
    const chatCol = collection(db, 'cyber_doom_chat');
    const q = query(chatCol, orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        list.push({
          id: doc.id,
          sender: d.sender || 'Anonymous',
          text: d.text || '',
          edited: !!d.edited,
          timestamp: d.timestamp
        });
      });
      // Show newest at bottom
      setChatMessages(list.reverse());
    });

    return () => unsubscribe();
  }, []);

  // 3. Keep Firestore player document updated with coordinates periodically
  useEffect(() => {
    if (!db || !isPlaying) return;
    const interval = setInterval(() => {
      const playerDoc = doc(db, 'cyber_doom_players', playId.current);
      setDoc(playerDoc, {
        name: userNickname || 'Slayer Guest',
        x: px.current,
        y: py.current,
        angle: pa.current,
        score: score,
        lastActive: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying, score, userNickname]);

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const k = e.key.toLowerCase();
      // Prevent scrolling
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) {
        e.preventDefault();
      }
      movementKeys.current[k] = true;

      if (e.key === ' ' || e.key === 'Spacebar') {
        shootPlasma();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      movementKeys.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  // Plasma Firing core
  const shootPlasma = () => {
    if (health <= 0) return;
    
    // Animate muzzle recoil
    setFireFrame(1);
    playSynthNote(440, 0.15, 'sawtooth');
    setTimeout(() => setFireFrame(2), 60);
    setTimeout(() => setFireFrame(0), 155);

    // Append bullet towards player vector
    localBullets.current.push({
      x: px.current,
      y: py.current,
      dx: Math.cos(pa.current) * 0.16,
      dy: Math.sin(pa.current) * 0.16
    });
  };

  // Chat message submit containing AI Moderation filters
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || chatLoading) return;
    setChatLoading(true);
    const rawText = chatText;
    setChatText('');

    try {
      // Direct call to Express server AI moderation proxy
      const res = await fetch('/api/moderate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      const data = await res.json();

      if (db) {
        await addDoc(collection(db, 'cyber_doom_chat'), {
          sender: userNickname || 'Slayer Guest',
          text: data.text || rawText,
          edited: !!data.edited,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn("Lobby moderation failed, publishing text directly", err);
      if (db) {
        await addDoc(collection(db, 'cyber_doom_chat'), {
          sender: userNickname || 'Slayer Guest',
          text: rawText,
          edited: false,
          timestamp: serverTimestamp()
        });
      }
    } finally {
      setChatLoading(false);
    }
  };

  // Main Loop Raycaster rendering logic
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const keys = movementKeys.current;
      const moveSpeed = 0.055;
      const rotSpeed = 0.045;

      // Player rotation inputs
      if (keys['arrowleft'] || keys['a']) {
        pa.current -= rotSpeed;
        if (pa.current < 0) pa.current += Math.PI * 2;
      }
      if (keys['arrowright'] || keys['d']) {
        pa.current += rotSpeed;
        if (pa.current > Math.PI * 2) pa.current -= Math.PI * 2;
      }

      // Player forward/backward calculations with solid collision boundaries
      let newX = px.current;
      let newY = py.current;

      if (keys['arrowup'] || keys['w']) {
        newX += Math.cos(pa.current) * moveSpeed;
        newY += Math.sin(pa.current) * moveSpeed;
      }
      if (keys['arrowdown'] || keys['s']) {
        newX -= Math.cos(pa.current) * moveSpeed;
        newY -= Math.sin(pa.current) * moveSpeed;
      }

      // Border collision validation checks
      if (newX > 0 && newX < MAP_SIZE && MAP[Math.floor(py.current)][Math.floor(newX)] === 0) {
        px.current = newX;
      }
      if (newY > 0 && newY < MAP_SIZE && MAP[Math.floor(newY)][Math.floor(px.current)] === 0) {
        py.current = newY;
      }

      // Update bullets coordinates & wall hit impact bounds
      const activeBullets: Bullet[] = [];
      localBullets.current.forEach(b => {
        const nx = b.x + b.dx;
        const ny = b.y + b.dy;
        const cellX = Math.floor(nx);
        const cellY = Math.floor(ny);

        if (cellX >= 0 && cellX < MAP_SIZE && cellY >= 0 && cellY < MAP_SIZE && MAP[cellY][cellX] === 0) {
          // Check if bullet collides with enemies
          let hitEnemy = false;
          enemies.current.forEach(e => {
            if (!e.isDead) {
              const dist = Math.hypot(e.x - nx, e.y - ny);
              if (dist < 0.45) {
                hitEnemy = true;
                e.health -= 35;
                playSynthNote(680, 0.08, 'sine');
                if (e.health <= 0) {
                  e.isDead = true;
                  setScore(s => s + e.scoreValue);
                  playSynthNote(120, 0.4, 'sawtooth');
                }
              }
            }
          });

          if (!hitEnemy) {
            b.x = nx;
            b.y = ny;
            activeBullets.push(b);
          }
        } else {
          // Spark particle wall splash
          playSynthNote(180, 0.06, 'sine');
        }
      });
      localBullets.current = activeBullets;

      // Enemy fire-ring logic checks
      if (Math.random() < 0.02) {
        enemies.current.forEach(e => {
          if (!e.isDead) {
            const dPlayer = Math.hypot(e.x - px.current, e.y - py.current);
            if (dPlayer < 4.0) {
              // Beholder shoots at user
              setHealth(h => {
                const updated = Math.max(0, h - 8);
                if (updated === 0) {
                  setIsGameOver(true);
                  setIsPlaying(false);
                  playSynthNote(80, 0.9, 'sawtooth');
                } else {
                  playSynthNote(220, 0.1, 'sawtooth');
                }
                return updated;
              });
            }
          }
        });
      }

      // -------------------------------------------------------------
      // RAYCAST 3D ENGINE GRAPHICAL DRAWING
      // -------------------------------------------------------------
      const W = canvas.width;
      const H = canvas.height;
      
      // Draw background (Sky and Floor)
      ctx.fillStyle = '#0f172a'; // Deep slate dark ceiling
      ctx.fillRect(0, 0, W, H / 2);
      ctx.fillStyle = '#020617'; // Absolute black void floor
      ctx.fillRect(0, H / 2, W, H / 2);

      // Floor grid lane accents
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < W; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, H / 2);
        ctx.lineTo(i + (i - W/2) * 2, H);
        ctx.stroke();
      }

      // Casting rays across horizontal viewport columns
      const FOV = Math.PI / 3; // 60 degrees standard FOV
      const numRays = W;
      const stepAngle = FOV / numRays;
      const startAngle = pa.current - FOV / 2;

      // Store wall depths to correctly billboard sprites underneath behind walls
      const wallDepths = new Float32Array(numRays);

      for (let r = 0; r < numRays; r++) {
        const rayAngle = startAngle + r * stepAngle;
        let distance = 0;
        let hitWall = false;
        let wallType = 1;

        const cosR = Math.cos(rayAngle);
        const sinR = Math.sin(rayAngle);

        while (!hitWall && distance < 16) {
          distance += 0.05;
          const checkX = Math.floor(px.current + cosR * distance);
          const checkY = Math.floor(py.current + sinR * distance);

          if (checkX < 0 || checkX >= MAP_SIZE || checkY < 0 || checkY >= MAP_SIZE) {
            distance = 16;
            break;
          }

          if (MAP[checkY][checkX] > 0) {
            hitWall = true;
            wallType = MAP[checkY][checkX];
          }
        }

        // Correct fish-eye distortion
        const correctedDist = distance * Math.cos(rayAngle - pa.current);
        wallDepths[r] = correctedDist;

        // Draw wall slice columns
        const sliceHeight = Math.min(H, (H / correctedDist));
        const sliceY = (H - sliceHeight) / 2;

        // Establish styled core color layouts based on wall definitions
        let col = '#ef4444'; // Red brick
        if (wallType === 2) col = '#06b6d4'; // Glowing blue neon matrix
        if (wallType === 3) col = '#f59e0b'; // Amber hazard barriers

        // Apply dark depth shade overlay relative to distance
        ctx.fillStyle = col;
        ctx.globalAlpha = Math.max(0.08, 1 - (correctedDist / 12));
        ctx.fillRect(r, sliceY, 1, sliceHeight);
        ctx.globalAlpha = 1.0;
      }

      // Render Bullets in 3D Space
      localBullets.current.forEach(b => {
        // Translate bullet to player POV coordinates vector
        const rx = b.x - px.current;
        const ry = b.y - py.current;

        // Orthogonal projection
        const cosP = Math.cos(-pa.current);
        const sinP = Math.sin(-pa.current);
        const rotX = rx * cosP - ry * sinP;
        const rotY = rx * sinP + ry * cosP;

        if (rotX > 0.1) {
          const depth = rotX;
          const colX = (W / 2) + (rotY / depth) * (W / 2);
          const size = Math.max(3, 40 / depth);

          // Draw neon cyan plasma bullet sprite sphere
          if (colX >= 0 && colX < W && depth < wallDepths[Math.floor(colX)]) {
            ctx.fillStyle = '#22d3ee';
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(colX, H / 2, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
          }
        }
      });

      // Render Floating Beholders (Enemies) as 3D Billboards
      enemies.current.forEach(e => {
        if (e.isDead) return;

        const rx = e.x - px.current;
        const ry = e.y - py.current;

        const cosP = Math.cos(-pa.current);
        const sinP = Math.sin(-pa.current);
        const rotX = rx * cosP - ry * sinP;
        const rotY = rx * sinP + ry * cosP;

        // Front of screen checks
        if (rotX > 0.15) {
          const depth = rotX;
          const colX = (W / 2) + (rotY / depth) * (W / 2);
          const sHeight = Math.min(H, (H / depth));
          const size = sHeight * 0.42;

          // Check coordinates with depth z-buffer
          if (colX >= 0 && colX < W && depth < wallDepths[Math.floor(colX)]) {
            const spriteY = (H - size) / 2;

            // Draw Beholder Body circle
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(colX, H / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Beholder Central Laser Eye core
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(colX, H / 2, size / 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(colX - size/10, H / 2 - size/10, size / 16, 0, Math.PI * 2);
            ctx.fill();

            // Glowing horns/feelers vector lines
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(colX - size/4, spriteY);
            ctx.lineTo(colX - size/2, spriteY - size/4);
            ctx.moveTo(colX + size/4, spriteY);
            ctx.lineTo(colX + size/2, spriteY - size/4);
            ctx.stroke();

            // Healthbar indicator atop enemy
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(colX - 25, spriteY - 14, 50, 4);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(colX - 25, spriteY - 14, 50 * (e.health / 100), 4);
          }
        }
      });

      // Render Other Multiplayer Players Billboards
      otherPlayers.forEach(p => {
        const rx = p.x - px.current;
        const ry = p.y - py.current;

        const cosP = Math.cos(-pa.current);
        const sinP = Math.sin(-pa.current);
        const rotX = rx * cosP - ry * sinP;
        const rotY = rx * sinP + ry * cosP;

        if (rotX > 0.15) {
          const depth = rotX;
          const colX = (W / 2) + (rotY / depth) * (W / 2);
          const sHeight = Math.min(H, (H / depth));
          const size = sHeight * 0.45;

          if (colX >= 0 && colX < W && depth < wallDepths[Math.floor(colX)]) {
            const spriteY = (H - size) / 2;

            // Draw clean holographic floating avatar sphere representing other slayer player
            ctx.fillStyle = '#d946ef'; // Magenta holo core
            ctx.shadowColor = '#d946ef';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(colX, H / 2 + size/6, size / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Simple vector details representing holographic helmet visor
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(colX - size/6, H / 2 + size/12, size/3, size/10);

            // Floating Nickname Tag
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 1;
            ctx.font = 'bold 9px monospace';
            const tagText = `${p.name} (${~~p.score})`;
            const tW = ctx.measureText(tagText).width;
            
            ctx.fillRect(colX - (tW / 2) - 4, spriteY - 16, tW + 8, 12);
            ctx.strokeRect(colX - (tW / 2) - 4, spriteY - 16, tW + 8, 12);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(tagText, colX, spriteY - 7);
          }
        }
      });

      // Request next frame coordinate tick
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, muted]);

  const handleStartGame = () => {
    // Reset player position and health states
    px.current = 1.5;
    py.current = 1.5;
    pa.current = 0.0;
    setHealth(100);
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    playSynthNote(330, 0.25, 'sine');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-100 font-sans">
      <div className="bg-slate-950 p-6 border border-red-500/10 rounded-2xl shadow-xl space-y-6">
        
        {/* Doom Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-red-950/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center font-bold text-lg text-red-500 animate-pulse">
              💀
            </div>
            <div>
              <h4 className="font-display font-semibold text-white text-base">IsaiahAI Cyber-Doom 3D</h4>
              <p className="text-xs text-red-500 font-mono tracking-wider flex items-center gap-1.5 uppercase font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                ST.AMOUR MULTIPLAYER LOBBY • NET_STAGE_01
              </p>
            </div>
          </div>

          {/* Telemetry dashboard statistics */}
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
              <Gamepad className="w-3.5 h-3.5 text-slate-500" />
              <span>ROOM: <b className="text-slate-300">{chatRoomCount} players</b></span>
            </div>
            
            <button 
              onClick={() => setMuted(!muted)}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* 3D viewport canvas box */}
        <div className="relative flex flex-col items-center justify-center select-none">
          <div className="relative border-4 border-red-950/60 rounded-2xl overflow-hidden bg-black shadow-2xl shadow-red-950/5">
            <canvas 
              ref={canvasRef}
              width={640}
              height={360}
              className="block max-w-full bg-black"
            />

            {/* Retro centered muzzle weapon blasters overlays when playing */}
            {isPlaying && (
              <div className="absolute inset-x-0 bottom-0 pointer-events-none flex justify-center">
                {fireFrame === 1 && (
                  <div className="w-32 h-32 bg-center bg-contain bg-no-repeat transform scale-110 translate-y-1 animate-flash"
                       style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cpath d=\'M50,0 L53,30 L70,10 L56,40 L90,30 L59,50 L80,70 L53,60 L50,100 L47,60 L20,70 L41,50 L10,30 L44,40 L30,10 L47,30 Z\' fill=\'%2322d3ee\'/%3E%3C/svg%3E")' }} />
                )}
                {fireFrame === 2 && (
                  <div className="w-36 h-28 bg-center bg-contain bg-no-repeat transform translate-y-2 opacity-95 transition-all"
                       style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cpath d=\'M30,80 L70,80 L65,40 L35,40 Z\' fill=\'%23334155\'/%3E%3Crect x=\'44\' y=\'10\' width=\'12\' height=\'35\' rx=\'4\' fill=\'%231e293b\'/%3E%3Ccircle cx=\'50\' cy=\'55\' r=\'10\' fill=\'%2306b6d4\' stroke=\'%2322d3ee\' stroke-width=\'2\'/%3E%3C/svg%3E")' }} />
                )}
                {fireFrame === 0 && (
                  <div className="w-32 h-26 bg-center bg-contain bg-no-repeat transform translate-y-4 hover:translate-y-2 transition-all duration-300"
                       style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cpath d=\'M30,80 L70,80 L65,40 L35,40 Z\' fill=\'%23475569\'/%3E%3Crect x=\'44\' y=\'15\' width=\'12\' height=\'30\' rx=\'4\' fill=\'%23334155\'/%3E%3Ccircle cx=\'50\' cy=\'55\' r=\'8\' fill=\'%230891b2\'/%3E%3C/svg%3E")' }} />
                )}
              </div>
            )}

            {/* Overlaid Screens */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in backdrop-blur-md">
                {isGameOver ? (
                  <div className="space-y-4 max-w-sm">
                    <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto text-3xl animate-bounce">
                      💥
                    </div>
                    <div>
                      <h5 className="font-display font-bold text-white text-lg uppercase tracking-wider text-red-500">Slayer Wasted!</h5>
                      <p className="text-xs text-slate-400 mt-1">Holographic integrity collapsed under heavy cyber core damage coordinates.</p>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                      SCORE: <span className="text-red-500 font-bold">{score}</span> CELLS SHOT
                    </div>
                    <button
                      onClick={handleStartGame}
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:brightness-110 text-white rounded-xl py-3 text-xs font-bold font-mono tracking-widest uppercase shadow-lg shadow-red-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-500/30"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>LAUNCH RE-TRY</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto text-3xl">
                      🚀
                    </div>
                    <div>
                      <h5 className="font-display font-semibold text-white text-lg uppercase tracking-wider text-center">Doom 3D Multiplayer Simulator</h5>
                      <p className="text-xs text-slate-400 mt-2 text-center leading-relaxed">
                        Navigate a high-speed real-time 3D raycast corridor fortress. Encounter floating cyber entities, shoot with cyan plasma blasters, and compete/coexist with other live players sharing the grid world simultaneously!
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-left font-mono max-w-xs mx-auto border border-slate-800 bg-slate-900/40 p-3 rounded-xl text-[10px] text-slate-400">
                      <div>
                        <span className="text-red-400 font-bold block">W / A / S / D</span>
                        <span className="text-slate-500">Maneuver and Strut</span>
                      </div>
                      <div>
                        <span className="text-red-400 font-bold block">Left / Right / Mouse</span>
                        <span className="text-slate-500">Look Around</span>
                      </div>
                      <div className="col-span-2 text-center pt-2 border-t border-slate-850/40">
                        <span className="text-cyan-400 font-bold block">Space / Click Canvas</span>
                        <span className="text-slate-500">Discharge Plasma Blaster</span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartGame}
                      className="bg-red-600 text-white rounded-xl px-10 py-3 text-xs font-bold font-mono tracking-widest uppercase shadow-xl hover:bg-red-500 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer border border-red-500/40"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>INITIATE CORE PORTAL</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Active Gameplay telemetry headers overlays */}
            {isPlaying && (
              <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white/80 font-mono text-[9px] pointer-events-none select-none">
                <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1.5 border border-red-500/30 rounded-md">
                  <span className="text-red-500">HEALTH:</span>
                  <span className={`font-bold text-sm ${health > 30 ? 'text-emerald-400 animate-pulse' : 'text-red-500 animate-ping'}`}>{health}%</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1.5 border border-red-500/30 rounded-md">
                  <span className="text-slate-500">HOLO SCORE:</span>
                  <span className="text-cyan-400 font-bold text-sm">{score} XP</span>
                </div>
              </div>
            )}
          </div>

          {/* Touch assistance labels for mobile layouts */}
          {isPlaying && (
            <div className="flex items-center justify-center gap-4 w-full max-w-[320px] mt-4 font-mono select-none">
              <button 
                onMouseDown={() => { pa.current -= 0.18; }}
                className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ◀ ROTATE LEFT
              </button>
              <button 
                onClick={shootPlasma}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/30 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                💥 FIRE
              </button>
              <button 
                onMouseDown={() => { pa.current += 0.18; }}
                className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ROTATE RIGHT ▶
              </button>
            </div>
          )}
        </div>

        {/* Safe AI-moderated Multiplayer Chat Zone */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850/60 flex flex-col gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-red-500 border-b border-slate-850/50 pb-3">
            <MessageSquare className="w-4 h-4 text-red-500" />
            <span>AI SAFE MULTIPLAYER COMMS PANEL</span>
          </div>

          {/* scrolling messages bucket */}
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {chatMessages.length === 0 ? (
              <p className="text-[10px] text-slate-500 font-mono py-6 text-center">Comm channels are clean and silent. Introduce yourself to start multiplayer logs!</p>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className="text-xs flex flex-col items-start bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between gap-1.5 w-full mb-1">
                    <span className="font-semibold text-red-400 font-mono block text-[10px]">
                      👤 {msg.sender === userNickname ? 'You (' + msg.sender + ')' : msg.sender}
                    </span>
                    {msg.edited && (
                      <span className="text-[9px] text-slate-500 font-mono capitalize tracking-wide flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        IsaiahAI edited.
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 font-sans tracking-wide leading-relaxed break-all text-left">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* input trigger pill */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-1">
            <input 
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={chatLoading ? 'Filtering with IsaiahAI...' : 'Post a safe safe message to all slayers...'}
              disabled={chatLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 text-left font-sans placeholder-slate-500"
              maxLength={70}
            />
            <button 
              type="submit"
              disabled={chatLoading || !chatText.trim()}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transmit</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
