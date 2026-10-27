import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Play, RotateCcw, AlertTriangle, ShieldCheck, 
  HelpCircle, Lightbulb, User, Cpu, Sparkles, Download, Code,
  Trash2, Save, Globe, Eye
} from 'lucide-react';
import { TriviaQuestion, LeaderboardEntry } from '../types';
import CyberDoom3D from './CyberDoom3D';
import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  where,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from '../firebase';

interface GamesDashboardProps {
  theme: string;
  userNickname: string;
  activeTab?: 'trivia' | 'pong' | 'snake' | 'creative' | 'runner3d' | 'saved' | 'doom';
  currentUser?: any;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  initialCreativePrompt?: string;
}

export function GamesDashboard({ 
  theme, 
  userNickname, 
  activeTab: propActiveTab,
  currentUser,
  onGoogleSignIn,
  onGoogleSignOut,
  initialCreativePrompt
}: GamesDashboardProps) {
  const [activeTab, setActiveTab] = useState<'trivia' | 'pong' | 'snake' | 'creative' | 'runner3d' | 'saved' | 'doom'>('trivia');

  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  useEffect(() => {
    if (initialCreativePrompt) {
      setCreativePrompt(initialCreativePrompt);
    }
  }, [initialCreativePrompt]);

  // ==========================================
  // COLLABORATIVE CO-DEVS GAMES WORKSPACE
  // ==========================================
  const [collabDrafts, setCollabDrafts] = useState<any[]>([]);
  const [activeCollabDraft, setActiveCollabDraft] = useState<any | null>(null);
  const [collabInviteEmail, setCollabInviteEmail] = useState('');
  const [copilotText, setCopilotText] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [collabStatus, setCollabStatus] = useState('');

  useEffect(() => {
    if (!db) return;
    const userEmail = currentUser?.email || 'guest@isaiahai.com';
    const draftCol = collection(db, 'collaborative_games');
    const unsubscribe = onSnapshot(draftCol, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const allowed = d.allowedEmails || [];
        if (allowed.includes(userEmail) || d.ownerId === (currentUser?.uid || 'guest')) {
          list.push({ id: doc.id, ...d });
        }
      });
      setCollabDrafts(list);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleSaveAsCollaborativeDraft = async () => {
    if (!creativeGame || !db) return;
    setCollabStatus('Saving draft to St.Amour workspace...');
    try {
      const email = currentUser?.email || 'guest@isaiahai.com';
      const draftId = `collab_${Date.now()}`;
      const draftDoc = doc(db, 'collaborative_games', draftId);
      
      const draftData = {
        title: creativeGame.title,
        tagline: creativeGame.tagline || 'Collaborative Experiment',
        codeHtml: creativeGame.codeHtml,
        genre: creativeGame.genre || 'Action',
        rules: creativeGame.rules || [],
        ownerId: currentUser?.uid || 'guest',
        ownerEmail: email,
        allowedEmails: [email],
        copilotChat: [
          { role: 'ai', text: `Welcome to your collaborative co-pilot sandbox workspace! Invite friends or type prompt updates directly to build with IsaiahAI!`, sender: 'IsaiahAI' }
        ],
        updatedAt: new Date().toISOString()
      };

      await setDoc(draftDoc, draftData);
      setCollabStatus('Collaborative sharing workspace activated!');
      setActiveCollabDraft({ id: draftId, ...draftData });
    } catch (err: any) {
      setCollabStatus(`Error sharing: ${err.message}`);
    }
  };

  const handleInviteCollaborator = async () => {
    if (!activeCollabDraft || !collabInviteEmail.trim() || !db) return;
    setCollabStatus('Inviting collaborator...');
    try {
      const draftRef = doc(db, 'collaborative_games', activeCollabDraft.id);
      const updatedEmails = [...(activeCollabDraft.allowedEmails || [])];
      const newEmail = collabInviteEmail.trim().toLowerCase();
      if (!updatedEmails.includes(newEmail)) {
        updatedEmails.push(newEmail);
      }
      await setDoc(draftRef, { allowedEmails: updatedEmails }, { merge: true });
      setActiveCollabDraft(prev => prev ? { ...prev, allowedEmails: updatedEmails } : null);
      setCollabInviteEmail('');
      setCollabStatus(`Successfully invited ${newEmail}!`);
    } catch (err: any) {
      setCollabStatus(`Invite failed: ${err.message}`);
    }
  };

  const handleCopilotEditPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCollabDraft || !copilotText.trim() || copilotLoading) return;
    setCopilotLoading(true);
    setCollabStatus('IsaiahAI co-pilot edits and compiles...');
    const userPrompt = copilotText;
    setCopilotText('');

    try {
      const response = await fetch('/api/edit-generated-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeHtml: activeCollabDraft.codeHtml,
          prompt: userPrompt
        })
      });

      if (!response.ok) throw new Error('AI Compiler failed to compile custom updates.');
      const data = await response.json();

      const updatedChat = [
        ...(activeCollabDraft.copilotChat || []),
        { role: 'user', text: userPrompt, sender: userNickname },
        { role: 'ai', text: `Successfully compiled updates! Re-rendered draft to integrate your requested styles, scripts, and physics.`, sender: 'IsaiahAI' }
      ];

      const draftRef = doc(db, 'collaborative_games', activeCollabDraft.id);
      await setDoc(draftRef, {
        codeHtml: data.codeHtml,
        copilotChat: updatedChat,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setActiveCollabDraft(prev => prev ? { ...prev, codeHtml: data.codeHtml, copilotChat: updatedChat } : null);
      setCreativeGame(prev => prev ? { ...prev, codeHtml: data.codeHtml } : null);
      setCollabStatus('AI update compiled successfully!');
    } catch (err: any) {
      setCollabStatus(`Compilation failed: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  // ==========================================
  // 1. AI TRIVIA
  // ==========================================
  const [triviaCategory, setTriviaCategory] = useState<string>('Random');
  const [triviaItem, setTriviaItem] = useState<TriviaQuestion | null>(null);
  const [triviaLoading, setTriviaLoading] = useState<boolean>(false);
  const [selectedTriviaIndex, setSelectedTriviaIndex] = useState<number | null>(null);
  const [answeredTrivia, setAnsweredTrivia] = useState<boolean>(false);
  const [triviaScore, setTriviaScore] = useState<number>(0);
  const [triviaStreak, setTriviaStreak] = useState<number>(0);
  const [triviaError, setTriviaError] = useState<string | null>(null);

  const fetchTriviaQuestion = async (category: string) => {
    setTriviaLoading(true);
    setTriviaError(null);
    setSelectedTriviaIndex(null);
    setAnsweredTrivia(false);
    try {
      const response = await fetch('/api/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (!response.ok) throw new Error('Could not request trivia question from St.Amour AI engine.');
      const data = await response.json();
      setTriviaItem(data);
    } catch (err: any) {
      setTriviaError(err.message || 'An error occurred.');
    } finally {
      setTriviaLoading(false);
    }
  };

  const handleSelectTriviaAnswer = (index: number) => {
    if (answeredTrivia || !triviaItem) return;
    setSelectedTriviaIndex(index);
    setAnsweredTrivia(true);
    
    // Play sound feedback using synth
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (index === triviaItem.answerIndex) {
        setTriviaScore(prev => prev + 1);
        setTriviaStreak(prev => prev + 1);
        // Correct note
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        setTriviaStreak(0);
        // Incorrect note
        osc.frequency.setValueAtTime(196.00, audioCtx.currentTime); // G3
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio context might be blocked or unsupported
      if (index === triviaItem.answerIndex) {
        setTriviaScore(prev => prev + 1);
        setTriviaStreak(prev => prev + 1);
      } else {
        setTriviaStreak(0);
      }
    }
  };

  useEffect(() => {
    fetchTriviaQuestion('Random');
  }, []);

  // ==========================================
  // 2. PONG GAME
  // ==========================================
  const pongCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pongMode, setPongMode] = useState<'ai' | 'local'>('ai');
  const [pongScoreLeft, setPongScoreLeft] = useState<number>(0);
  const [pongScoreRight, setPongScoreRight] = useState<number>(0);
  const [pongRunning, setPongRunning] = useState<boolean>(false);
  const [pongWinner, setPongWinner] = useState<string | null>(null);

  // Keyboard state for Pong
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const triggerPongSound = (type: 'paddle' | 'wall' | 'score') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'paddle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'wall') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'score') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(147, audioCtx.currentTime); // D3
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab !== 'pong') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'w', 's', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'pong' || !pongCanvasRef.current) return;

    const canvas = pongCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const paddleWidth = 10;
    const paddleHeight = 70;
    const ballSize = 8;

    let leftPaddleY = canvas.height / 2 - paddleHeight / 2;
    let rightPaddleY = canvas.height / 2 - paddleHeight / 2;
    
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballVX = 3.5 * (Math.random() > 0.5 ? 1 : -1);
    let ballVY = 2 * (Math.random() > 0.5 ? 1 : -1);

    const paddleSpeed = 5;

    const resetBall = (pointingLeft: boolean) => {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballVX = 3.5 * (pointingLeft ? -1 : 1);
      ballVY = 2 * (Math.random() > 0.5 ? 1 : -1);
    };

    const updateLoop = () => {
      if (!pongRunning) return;

      // Move player left (W and S keys)
      if (keysPressed.current['w']) {
        leftPaddleY = Math.max(0, leftPaddleY - paddleSpeed);
      }
      if (keysPressed.current['s']) {
        leftPaddleY = Math.min(canvas.height - paddleHeight, leftPaddleY + paddleSpeed);
      }

      // Move player right (AI or Arrows)
      if (pongMode === 'local') {
        if (keysPressed.current['arrowup']) {
          rightPaddleY = Math.max(0, rightPaddleY - paddleSpeed);
        }
        if (keysPressed.current['arrowdown']) {
          rightPaddleY = Math.min(canvas.height - paddleHeight, rightPaddleY + paddleSpeed);
        }
      } else {
        // AI follow logic with imperfect tracking / human reaction
        let errorFactor = 0;
        // Wavy overshoot factor when ball moves fast and is closer to AI paddle
        if (ballVX > 0 && ballX > canvas.width / 2.5) {
          errorFactor = Math.sin(ballX / 8) * 20;
        }
        const targetY = ballY - paddleHeight / 2 + errorFactor;
        const diff = targetY - rightPaddleY;
        const aiMovementSpeed = 2.6; // Speed reduced to 2.6 for natural winnability
        if (diff > 3) {
          rightPaddleY = Math.min(canvas.height - paddleHeight, rightPaddleY + aiMovementSpeed);
        } else if (diff < -3) {
          rightPaddleY = Math.max(0, rightPaddleY - aiMovementSpeed);
        }
      }

      // Physics update ball
      ballX += ballVX;
      ballY += ballVY;

      // Bounce top & bottom
      if (ballY <= 0 || ballY >= canvas.height - ballSize) {
        ballVY = -ballVY;
        triggerPongSound('wall');
      }

      // Left Paddle collusion
      if (ballX <= paddleWidth + 10 && ballX >= 10 && ballY + ballSize >= leftPaddleY && ballY <= leftPaddleY + paddleHeight) {
        ballVX = -ballVX * 1.05; // speed up slightly
        ballX = paddleWidth + 11;
        // Adjust angle based on collision point
        const relativeIntersectionY = (leftPaddleY + (paddleHeight / 2)) - ballY;
        const normalizedIntersectionY = relativeIntersectionY / (paddleHeight / 2);
        ballVY = -normalizedIntersectionY * 3.5;
        triggerPongSound('paddle');
      }

      // Right Paddle collusion
      if (ballX >= canvas.width - paddleWidth - 10 - ballSize && ballX <= canvas.width - 10 && ballY + ballSize >= rightPaddleY && ballY <= rightPaddleY + paddleHeight) {
        ballVX = -ballVX * 1.05;
        ballX = canvas.width - paddleWidth - 11 - ballSize;
        const relativeIntersectionY = (rightPaddleY + (paddleHeight / 2)) - ballY;
        const normalizedIntersectionY = relativeIntersectionY / (paddleHeight / 2);
        ballVY = -normalizedIntersectionY * 3.5;
        triggerPongSound('paddle');
      }

      // Score update / boundaries
      if (ballX < 0) {
        // Right scores
        setPongScoreRight(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) {
            setPongWinner(pongMode === 'ai' ? 'IsaiahAI' : 'Player 2 (Arrow Keys)');
            setPongRunning(false);
          }
          return newScore;
        });
        triggerPongSound('score');
        resetBall(false);
      } else if (ballX > canvas.width) {
        // Left scores
        setPongScoreLeft(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) {
            setPongWinner('Player 1 (W/S Keys)');
            setPongRunning(false);
          }
          return newScore;
        });
        triggerPongSound('score');
        resetBall(true);
      }
    };

    const drawLoop = () => {
      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dash center helper
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Paddles
      // Left human
      ctx.fillStyle = '#eab308'; // St.Amour Gold look
      ctx.beginPath();
      ctx.roundRect(10, leftPaddleY, paddleWidth, paddleHeight, 4);
      ctx.fill();

      // Right (AI / Player 2)
      ctx.fillStyle = '#06b6d4'; // Cyber Cyan
      ctx.beginPath();
      ctx.roundRect(canvas.width - paddleWidth - 10, rightPaddleY, paddleWidth, paddleHeight, 4);
      ctx.fill();

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballX + ballSize / 2, ballY + ballSize / 2, ballSize, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      updateLoop();
      drawLoop();
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeTab, pongRunning, pongMode]);

  const handleStartPong = () => {
    setPongScoreLeft(0);
    setPongScoreRight(0);
    setPongWinner(null);
    setPongRunning(true);
  };

  // ==========================================
  // 3. SNAKE GAME WITH SELECTABLE SKINS
  // ==========================================
  const snakeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<string>('Garden Blue');
  const [snakeScore, setSnakeScore] = useState<number>(0);
  const [snakeHighScore, setSnakeHighScore] = useState<number>(0);
  const [snakeRunning, setSnakeRunning] = useState<boolean>(false);
  const [snakeGameOver, setSnakeGameOver] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showScoreSavePrompt, setShowScoreSavePrompt] = useState<boolean>(false);
  const [snakeSaveName, setSnakeSaveName] = useState<string>(currentUser?.displayName || userNickname || 'IsaiahFan');

  // Broadcast & In-App Notification Toast state
  const [inAppToast, setInAppToast] = useState<{ title: string; body: string } | null>(null);

  // Custom Skin Builder states
  const [customSkinName, setCustomSkinName] = useState<string>('');
  const [customSkinStart, setCustomSkinStart] = useState<string>('#ec4899');
  const [customSkinEnd, setCustomSkinEnd] = useState<string>('#db2777');
  const [customSkinGlow, setCustomSkinGlow] = useState<string>('rgba(236, 72, 153, 0.4)');
  const [customSkinEmoji, setCustomSkinEmoji] = useState<string>('none');
  const [customSkins, setCustomSkins] = useState<any[]>([]);

  // Public games cloud state
  const [publicGames, setPublicGames] = useState<any[]>([]);
  const [showGameGenerator, setShowGameGenerator] = useState<boolean>(false);
  const [gamesSearchQuery, setGamesSearchQuery] = useState<string>('');

  const defaultSkins = [
    { name: 'Garden Blue', gradientStart: '#4671ec', gradientEnd: '#4671ec', glow: 'rgba(70, 113, 236, 0.2)' },
    { name: 'Classic Emerald', gradientStart: '#10b981', gradientEnd: '#047857', glow: 'rgba(16, 185, 129, 0.4)' },
    { name: 'Silicon Circuit', gradientStart: '#22d3ee', gradientEnd: '#0891b2', glow: 'rgba(34, 211, 238, 0.5)' },
    { name: 'St.Amour Gold', gradientStart: '#facc15', gradientEnd: '#ca8a04', glow: 'rgba(250, 204, 21, 0.6)' },
    { name: 'Neon Matrix', gradientStart: '#d946ef', gradientEnd: '#701a75', glow: 'rgba(217, 70, 239, 0.5)' },
    { name: 'A* Solver', gradientStart: '#cbd5e1', gradientEnd: '#475569', glow: 'rgba(203, 213, 225, 0.3)' },
    { name: 'Pixel Rainbow', gradientStart: 'rainbow', gradientEnd: 'rainbow', glow: 'rgba(255, 255, 255, 0.6)' },
  ];

  const snakeSkins = [...defaultSkins, ...customSkins];

  // Game Logic state using refs to avoid React re-render lagging canvas loop
  const snakeDirection = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const snakeBody = useRef<{ x: number; y: number }[]>([]);
  const applePosition = useRef<{ x: number; y: number }>({ x: 5, y: 5 });

  useEffect(() => {
    // 1. Initial Local load fallback
    const savedLeaderboard = localStorage.getItem('isaiah_snake_leaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    } else {
      const defaultLeaderboard: LeaderboardEntry[] = [
        { name: 'AlphaTech', score: 45, date: '2026-06-01', skin: 'St.Amour Gold' },
        { name: 'IsaiahAI_Bot', score: 38, date: '2026-06-03', skin: 'A* Solver' },
        { name: 'RetroCircuit', score: 24, date: '2026-06-05', skin: 'Silicon Circuit' },
        { name: 'StAmourFan', score: 15, date: '2026-06-07', skin: 'Classic Emerald' },
      ];
      localStorage.setItem('isaiah_snake_leaderboard', JSON.stringify(defaultLeaderboard));
      setLeaderboard(defaultLeaderboard);
    }

    const savedSnakeHighScore = localStorage.getItem('isaiah_snake_highscore');
    if (savedSnakeHighScore) {
      setSnakeHighScore(parseInt(savedSnakeHighScore, 10));
    }

    // Load local custom skins anyway
    const localSkinsRaw = localStorage.getItem('isaiah_custom_skins');
    if (localSkinsRaw) {
      try {
        setCustomSkins(JSON.parse(localSkinsRaw));
      } catch (err) {}
    }

    // 2. Fetch from Real Firestore Cloud if configured
    const syncCloudData = async () => {
      if (db) {
        // Load global leaderboard scores
        try {
          const scoreRef = collection(db, 'leaderboard_snake');
          const q = query(scoreRef, orderBy('score', 'desc'), limit(15));
          const querySnapshot = await getDocs(q);
          const list: any[] = [];
          querySnapshot.forEach((doc) => {
            const d = doc.data();
            list.push({
              name: d.name || 'Guest',
              score: d.score || 0,
              date: d.date || new Date().toISOString().split('T')[0],
              skin: d.skin || 'Garden Blue'
            });
          });
          if (list.length > 0) {
            setLeaderboard(list);
          }
        } catch (e) {
          console.warn("Firestore highscores offline, defaults maintained.", e);
        }

        // Load custom skins if user logged in
        if (currentUser) {
          try {
            const skinsRef = collection(db, 'user_snake_skins');
            const q = query(skinsRef, where('userId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
              list.push(doc.data());
            });
            if (list.length > 0) {
              setCustomSkins(prev => {
                const combined = [...prev];
                list.forEach(item => {
                  if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                    combined.push(item);
                  }
                });
                return combined;
              });
            }
          } catch (e) {
            console.warn("Firestore user skins offline.", e);
          }
        }

        // Load public games
        try {
          const gamesRef = collection(db, 'published_games');
          const q = query(gamesRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const list: any[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ ...doc.data(), id: doc.id });
          });
          if (list.length > 0) {
            setPublicGames(list);
          }
        } catch (e) {
          console.warn("Firestore public games directory offline.", e);
        }
      }
    };

    syncCloudData();
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (activeTab !== 'snake') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((key === 'arrowup' || key === 'w') && snakeDirection.current !== 'DOWN') {
        snakeDirection.current = 'UP';
        e.preventDefault();
      } else if ((key === 'arrowdown' || key === 's') && snakeDirection.current !== 'UP') {
        snakeDirection.current = 'DOWN';
        e.preventDefault();
      } else if ((key === 'arrowleft' || key === 'a') && snakeDirection.current !== 'RIGHT') {
        snakeDirection.current = 'LEFT';
        e.preventDefault();
      } else if ((key === 'arrowright' || key === 'd') && snakeDirection.current !== 'LEFT') {
        snakeDirection.current = 'RIGHT';
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'snake' || !snakeCanvasRef.current) return;

    const canvas = snakeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    let gameInterval: NodeJS.Timeout;

    const generateApple = () => {
      let valid = false;
      let newApple = { x: 0, y: 0 };
      while (!valid) {
        newApple = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount),
        };
        // Ensure not inside snake body
        valid = !snakeBody.current.some(segment => segment.x === newApple.x && segment.y === newApple.y);
      }
      applePosition.current = newApple;
    };

    const resetGame = () => {
      snakeBody.current = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ];
      snakeDirection.current = 'RIGHT';
      setSnakeScore(0);
      generateApple();
    };

    if (snakeBody.current.length === 0) {
      resetGame();
    }

    const drawGame = () => {
      // 1. Draw Alternating Checkered Grass Field (Google Snake Style)
      for (let r = 0; r < tileCount; r++) {
        for (let c = 0; c < tileCount; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#aad751' : '#a2d149';
          ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
        }
      }

      // 2. Draw Apple (Realistic with Stem and Green Leaf)
      const centerX = applePosition.current.x * gridSize + gridSize / 2;
      const centerY = applePosition.current.y * gridSize + gridSize / 2;

      // Drop shadow for apple
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 6, gridSize / 2.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red apple fruit body
      ctx.fillStyle = '#e13b29';
      ctx.beginPath();
      ctx.arc(centerX, centerY, gridSize / 2.2 - 1, 0, Math.PI * 2);
      ctx.fill();

      // Brown Stem
      ctx.strokeStyle = '#5a3d28';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 4);
      ctx.quadraticCurveTo(centerX - 1, centerY - 9, centerX - 3, centerY - 10);
      ctx.stroke();

      // Green Leaf
      ctx.fillStyle = '#4c9d2f';
      ctx.beginPath();
      ctx.ellipse(centerX + 2, centerY - 8, 4, 2, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Snake segments
      const skin = snakeSkins.find(s => s.name === selectedSkin) || snakeSkins[0];
      
      snakeBody.current.forEach((segment, idx) => {
        let isHead = idx === 0;

        // Compute skin fill style
        if (skin.name === 'Pixel Rainbow') {
          const hue = (idx * 15) % 360;
          ctx.fillStyle = `hsl(${hue}, 85%, 60%)`;
        } else {
          // If Garden Blue, use solid flat color with no linear gradients to respect flat vector style in image, else use gradient
          if (skin.name === 'Garden Blue') {
            ctx.fillStyle = '#4671ec';
          } else {
            const grad = ctx.createLinearGradient(
              segment.x * gridSize, segment.y * gridSize,
              (segment.x + 1) * gridSize, (segment.y + 1) * gridSize
            );
            grad.addColorStop(0, skin.gradientStart);
            grad.addColorStop(1, skin.gradientEnd);
            ctx.fillStyle = grad;
          }
        }

        ctx.shadowBlur = 0; // Disable shadow blur for exact flat layout in screenshot
        
        ctx.beginPath();
        if (isHead) {
          // Round head capsule
          ctx.roundRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2, 8);
        } else {
          // Round continuous body segment
          ctx.roundRect(segment.x * gridSize + 1.5, segment.y * gridSize + 1.5, gridSize - 3, gridSize - 3, 6);
        }
        ctx.fill();

        // Cartoon Googly Eyes or emoji Face on Head Segment
        if (isHead) {
          if (skin.emoji && skin.emoji !== 'none') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(skin.emoji, segment.x * gridSize + gridSize / 2, segment.y * gridSize + gridSize / 2);
          } else {
            // Sclera details (white part)
            let scleraRadius = 4;
            let pupilRadius = 1.8;
            let eyeX1 = 0, eyeY1 = 0, eyeX2 = 0, eyeY2 = 0;
            let pupOffsetX = 0, pupOffsetY = 0;

            if (snakeDirection.current === 'RIGHT') {
              eyeX1 = segment.x * gridSize + gridSize - 6; eyeY1 = segment.y * gridSize + 6;
              eyeX2 = segment.x * gridSize + gridSize - 6; eyeY2 = segment.y * gridSize + gridSize - 6;
              pupOffsetX = 1.2;
            } else if (snakeDirection.current === 'LEFT') {
              eyeX1 = segment.x * gridSize + 6; eyeY1 = segment.y * gridSize + 6;
              eyeX2 = segment.x * gridSize + 6; eyeY2 = segment.y * gridSize + gridSize - 6;
              pupOffsetX = -1.2;
            } else if (snakeDirection.current === 'UP') {
              eyeX1 = segment.x * gridSize + 6; eyeY1 = segment.y * gridSize + 6;
              eyeX2 = segment.x * gridSize + gridSize - 6; eyeY2 = segment.y * gridSize + 6;
              pupOffsetY = -1.2;
            } else if (snakeDirection.current === 'DOWN') {
              eyeX1 = segment.x * gridSize + 6; eyeY1 = segment.y * gridSize + gridSize - 6;
              eyeX2 = segment.x * gridSize + gridSize - 6; eyeY2 = segment.y * gridSize + gridSize - 6;
              pupOffsetY = 1.2;
            }

            // Draw white background circle for left eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eyeX1, eyeY1, scleraRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw white background circle for right eye
            ctx.beginPath();
            ctx.arc(eyeX2, eyeY2, scleraRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw black pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eyeX1 + pupOffsetX, eyeY1 + pupOffsetY, pupilRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeX2 + pupOffsetX, eyeY2 + pupOffsetY, pupilRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    };

    const updateGame = () => {
      if (!snakeRunning || snakeGameOver) return;

      // Compute head position
      const head = { ...snakeBody.current[0] };
      if (snakeDirection.current === 'UP') head.y -= 1;
      else if (snakeDirection.current === 'DOWN') head.y += 1;
      else if (snakeDirection.current === 'LEFT') head.x -= 1;
      else if (snakeDirection.current === 'RIGHT') head.x += 1;

      // Self collision
      const checkSelfCollision = snakeBody.current.some(segment => segment.x === head.x && segment.y === head.y);

      // Boundaries collision
      const checkWallCollision = head.x < 0 || head.y < 0 || head.x >= tileCount || head.y >= tileCount;

      if (checkSelfCollision || checkWallCollision) {
        setSnakeRunning(false);
        setSnakeGameOver(true);
        setShowScoreSavePrompt(true);
        // Buzz noise on loss
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, audioCtx.currentTime); 
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        } catch {}
        return;
      }

      // Move body forward (Unshift head)
      snakeBody.current.unshift(head);

      // Check if apple is collected
      if (head.x === applePosition.current.x && head.y === applePosition.current.y) {
        setSnakeScore(prev => {
          const newScore = prev + 1;
          if (newScore > snakeHighScore) {
            setSnakeHighScore(newScore);
            localStorage.setItem('isaiah_snake_highscore', newScore.toString());
          }
          return newScore;
        });

        // Blip noise on apple eat
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch {}

        generateApple();
      } else {
        // Remove tail
        snakeBody.current.pop();
      }

      drawGame();
    };

    // Draw initial state
    drawGame();

    // Start interval
    gameInterval = setInterval(updateGame, 110); // Standard readable snake speed

    return () => clearInterval(gameInterval);
  }, [activeTab, snakeRunning, snakeGameOver, selectedSkin]);

  const handleStartSnake = () => {
    snakeBody.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    snakeDirection.current = 'RIGHT';
    setSnakeScore(0);
    setSnakeGameOver(false);
    setShowScoreSavePrompt(false);
    setSnakeRunning(true);
  };

  const saveSnakeScore = async () => {
    const scoreVal = snakeScore;
    const nameStr = snakeSaveName.trim() || 'Guest';
    const newEntry: LeaderboardEntry = {
      name: nameStr,
      score: scoreVal,
      date: new Date().toISOString().split('T')[0],
      skin: selectedSkin
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // keep top 10

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('isaiah_snake_leaderboard', JSON.stringify(updatedLeaderboard));
    
    // Save live score to real Firestore global acceleration dashboard if DB ready
    if (db) {
      try {
        await addDoc(collection(db, 'leaderboard_snake'), {
          name: nameStr,
          score: scoreVal,
          date: new Date().toISOString().split('T')[0],
          skin: selectedSkin,
          createdAt: serverTimestamp()
        });
        alert(`🏆 Score of ${scoreVal} uploaded successfully to St.Amour global score board!`);
      } catch (err) {
        console.warn("Could not save score to cloud leaderboard, local index updated.", err);
      }
    } else {
      alert(`🏆 Saved locally! Log in with Google to publish score permanently to global leaderboard.`);
    }

    setShowScoreSavePrompt(false);
  };

  const handleSaveCustomSkin = async () => {
    if (!customSkinName.trim()) {
      alert("Please specify a custom label name for your skin design!");
      return;
    }

    const newSkin = {
      name: customSkinName.trim(),
      gradientStart: customSkinStart,
      gradientEnd: customSkinEnd,
      glow: customSkinGlow,
      emoji: customSkinEmoji
    };

    if (snakeSkins.some(s => s.name.toLowerCase() === newSkin.name.toLowerCase())) {
      alert("A snake design with this name already exists. Please choose a unique name!");
      return;
    }

    const updatedCustomSkins = [...customSkins, newSkin];
    setCustomSkins(updatedCustomSkins);
    localStorage.setItem('isaiah_custom_skins', JSON.stringify(updatedCustomSkins));

    if (db && currentUser) {
      try {
        await addDoc(collection(db, 'user_snake_skins'), {
          userId: currentUser.uid,
          name: newSkin.name,
          gradientStart: newSkin.gradientStart,
          gradientEnd: newSkin.gradientEnd,
          glow: newSkin.glow,
          emoji: newSkin.emoji,
          createdAt: serverTimestamp()
        });
        alert(`🎨 '${newSkin.name}' custom design saved securely to your Google Account cloud!`);
      } catch (err) {
        console.error("Firestore skin write failure:", err);
      }
    } else {
      alert(`🎨 Custom design '${newSkin.name}' saved to browser sandbox. Connect with Google to sync designs globally!`);
    }

    setCustomSkinName('');
  };

  // ==========================================
  // 3D VOYAGER VECTOR RUNNER
  // ==========================================
  const runnerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [runnerScore, setRunnerScore] = useState<number>(0);
  const [runnerHighScore, setRunnerHighScore] = useState<number>(0);
  const [runnerRunning, setRunnerRunning] = useState<boolean>(false);
  const [runnerGameOver, setRunnerGameOver] = useState<boolean>(false);

  const player3DX = useRef<number>(0); // Target X lane position
  const player3DCurrentX = useRef<number>(0); // Smooth visual center coordinate
  const obstacles3D = useRef<any[]>([]);
  const runnerSpeed = useRef<number>(3);
  const totalRunnerDistance = useRef<number>(0);

  // Load Highscore
  useEffect(() => {
    const savedRunnerHighScore = localStorage.getItem('stamour_runner3d_highscore');
    if (savedRunnerHighScore) {
      setRunnerHighScore(parseInt(savedRunnerHighScore, 10));
    }
  }, []);

  // Keyboard and Gameloop handles for 3D Game
  useEffect(() => {
    if (activeTab !== 'runner3d') {
      setRunnerRunning(false);
      return;
    }

    // Capture arrow keyboard actions
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        player3DX.current = Math.max(-95, player3DX.current - 24);
        e.preventDefault();
      } else if (key === 'arrowright' || key === 'd') {
        player3DX.current = Math.min(95, player3DX.current + 24);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initialize Canvas Context
    const canvas = runnerCanvasRef.current;
    if (!canvas) return () => window.removeEventListener('keydown', handleKeyDown);
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => window.removeEventListener('keydown', handleKeyDown);

    let animationFrameId: number;

    const parseHex = (hex: string) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };

    const darkenColor = (hex: string, factor: number) => {
      if (!hex.startsWith('#')) return hex;
      try {
        const { r, g, b } = parseHex(hex);
        return `rgb(${Math.max(0, Math.floor(r * factor))}, ${Math.max(0, Math.floor(g * factor))}, ${Math.max(0, Math.floor(b * factor))})`;
      } catch (e) {
        return hex;
      }
    };

    const spawnObstacles = () => {
      obstacles3D.current = [
        { x: -50, z: 300, size: 24, height: 35, color: '#22d3ee' },
        { x: 35, z: 440, size: 24, height: 35, color: '#facc15' },
        { x: -10, z: 580, size: 24, height: 35, color: '#ec4899' },
      ];
    };

    if (obstacles3D.current.length === 0) {
      spawnObstacles();
    }

    const playAudioFrequency = (freq: number, type: OscillatorType, length: number) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + length);
        osc.start();
        osc.stop(audioCtx.currentTime + length);
      } catch {}
    };

    const gameLoop = () => {
      if (runnerRunning && !runnerGameOver) {
        totalRunnerDistance.current += 0.22;
        runnerSpeed.current = 3.2 + Math.floor(totalRunnerDistance.current / 150) * 0.45;

        // Visual layout glide
        player3DCurrentX.current += (player3DX.current - player3DCurrentX.current) * 0.22;

        obstacles3D.current.forEach((obs) => {
          obs.z -= runnerSpeed.current;

          if (obs.z < 8) {
            const dx = player3DCurrentX.current - obs.x;
            const sizeMargin = obs.size / 2 + 10;
            if (Math.abs(dx) < sizeMargin) {
              setRunnerRunning(false);
              setRunnerGameOver(true);
              playAudioFrequency(80, 'sawtooth', 0.85);
              playAudioFrequency(55, 'sawtooth', 0.85);
            } else {
              setRunnerScore((prev) => {
                const nextScore = prev + 1;
                const savedHigh = localStorage.getItem('stamour_runner3d_highscore') || '0';
                if (nextScore > parseInt(savedHigh, 10)) {
                  setRunnerHighScore(nextScore);
                  localStorage.setItem('stamour_runner3d_highscore', nextScore.toString());
                }
                return nextScore;
              });
              playAudioFrequency(1200, 'sine', 0.12);

              obs.z = 240 + Math.random() * 45;
              obs.x = (Math.random() - 0.5) * 160;
              obs.color = ['#22d3ee', '#facc15', '#ec4899', '#10b981', '#3b82f6'][Math.floor(Math.random() * 5)];
              obs.size = 20 + Math.random() * 10;
              obs.height = 30 + Math.random() * 15;
            }
          }
        });
      }

      ctx.fillStyle = '#060a17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      const numStars = 45;
      for (let s = 0; s < numStars; s++) {
        const starX = (Math.sin(s * 8219) + 1.0) * canvas.width / 2;
        const starY = (Math.cos(s * 4921) + 1.0) * canvas.height * 0.18;
        const starPulsate = 0.5 + Math.sin(Date.now() / 320 + s) * 0.45;
        ctx.fillStyle = `rgba(255, 255, 255, ${starPulsate})`;
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      const horizonY = canvas.height * 0.35;
      const farX = canvas.width / 2;
      const farY = horizonY;

      // grid lanes vertical
      const currentScroll = (totalRunnerDistance.current * 10) % 35;
      for (let gridOffset = -currentScroll; gridOffset <= 240; gridOffset += 35) {
        const z = gridOffset;
        if (z <= 10) continue;
        const screenY = horizonY + (canvas.height - horizonY) * (30 / z);
        const relativeFarAlpha = Math.max(0, Math.min(0.55, 1 - z / 240));
        ctx.strokeStyle = `rgba(99, 102, 241, ${relativeFarAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
      }

      const numVerticalRails = 11;
      for (let i = 0; i < numVerticalRails; i++) {
        const t = (i / (numVerticalRails - 1)) - 0.5;
        const startingHorizontalOffset = t * 45;
        const lowerHorizontalOffset = t * 1500;
        ctx.strokeStyle = `rgba(99, 102, 241, 0.22)`;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + startingHorizontalOffset, horizonY);
        ctx.lineTo(canvas.width / 2 + lowerHorizontalOffset, canvas.height);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(7, 10, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, horizonY);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(canvas.width, horizonY);
      ctx.stroke();

      const radius = 34;
      const sunGradient = ctx.createRadialGradient(farX, farY - 10, 2, farX, farY - 10, radius);
      sunGradient.addColorStop(0, '#f472b6');
      sunGradient.addColorStop(0.3, '#db2777');
      sunGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(farX, farY - 10, radius, 0, Math.PI * 2);
      ctx.fill();

      // Receding sorting obstacles
      const sortedObstacles = [...obstacles3D.current].sort((a, b) => b.z - a.z);

      sortedObstacles.forEach((obs) => {
        if (obs.z <= 6 || obs.z > 240) return;

        const base_z = obs.z;
        const scale = 520;
        const vanishingX = canvas.width / 2;
        const vanishingY = horizonY;

        const floor_level_y = vanishingY + (canvas.height - vanishingY) * (30 / base_z);
        const proj_center_x = vanishingX + (obs.x - player3DCurrentX.current) * scale / base_z;
        const proj_top_y = vanishingY + (canvas.height - vanishingY - obs.height) * (30 / base_z);
        const proj_width = (obs.size * scale) / (base_z * 2);

        const tY = proj_top_y;
        const bY = floor_level_y;
        const lX = proj_center_x - proj_width/2;
        const rX = proj_center_x + proj_width/2;
        const current_height = bY - tY;

        ctx.globalAlpha = Math.max(0, Math.min(1.0, 1.25 - base_z / 235));

        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(lX, tY, proj_width, current_height);
        ctx.fill();
        ctx.stroke();

        const dx = obs.x - player3DCurrentX.current;
        const back_z = obs.z + 18;
        const bY_back = vanishingY + (canvas.height - vanishingY) * (30 / back_z);
        const pX_back = vanishingX + (obs.x - player3DCurrentX.current) * scale / back_z;
        const tY_back = vanishingY + (canvas.height - vanishingY - obs.height) * (30 / back_z);
        const w_back = (obs.size * scale) / (back_z * 2);

        const lX_back = pX_back - w_back/2;
        const rX_back = pX_back + w_back/2;

        ctx.fillStyle = darkenColor(obs.color, 0.45);
        ctx.beginPath();
        if (dx > 0) {
          ctx.moveTo(rX, tY);
          ctx.lineTo(rX_back, tY_back);
          ctx.lineTo(rX_back, bY_back);
          ctx.lineTo(rX, bY);
        } else {
          ctx.moveTo(lX, tY);
          ctx.lineTo(lX_back, tY_back);
          ctx.lineTo(lX_back, bY_back);
          ctx.lineTo(lX, bY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = darkenColor(obs.color, 0.72);
        ctx.beginPath();
        ctx.moveTo(lX, tY);
        ctx.lineTo(rX, tY);
        ctx.lineTo(rX_back, tY_back);
        ctx.lineTo(lX_back, tY_back);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1.0;
      });

      // Futuristic Delta spacejet
      const shipY = canvas.height - 35;
      const shipX = canvas.width / 2;
      const deltaWidth = 24;

      ctx.save();
      if (runnerRunning && !runnerGameOver && Math.random() > 0.4) {
        ctx.fillStyle = '#ff6b00';
        ctx.beginPath();
        ctx.moveTo(shipX - 4, shipY + 12);
        ctx.lineTo(shipX, shipY + 22 + Math.random() * 8);
        ctx.lineTo(shipX + 4, shipY + 12);
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowBlur = 8;
      ctx.shadowColor = '#6366f1';
      ctx.strokeStyle = '#818cf8';
      ctx.fillStyle = '#1e1b4b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 14);
      ctx.lineTo(shipX + deltaWidth, shipY + 12);
      ctx.lineTo(shipX + 6, shipY + 6);
      ctx.lineTo(shipX - 6, shipY + 6);
      ctx.lineTo(shipX - deltaWidth, shipY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 9);
      ctx.lineTo(shipX + 4, shipY + 2);
      ctx.lineTo(shipX - 4, shipY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, runnerRunning, runnerGameOver]);

  const handleStartRunner = () => {
    player3DX.current = 0;
    player3DCurrentX.current = 0;
    setRunnerScore(0);
    setRunnerGameOver(false);
    setRunnerRunning(true);
    runnerSpeed.current = 3;
    totalRunnerDistance.current = 0;
    obstacles3D.current = [
      { x: -50, z: 300, size: 24, height: 35, color: '#22d3ee' },
      { x: 35, z: 440, size: 24, height: 35, color: '#facc15' },
      { x: -10, z: 580, size: 24, height: 35, color: '#ec4899' },
    ];
  };

  // ==========================================
  // 4. CREATIVE WITH A* (AI GAME BUILDER)
  // ==========================================
  const [creativePrompt, setCreativePrompt] = useState<string>('Electronics Coordinate Maze with laser walls');
  const [creativeLoading, setCreativeLoading] = useState<boolean>(false);
  const [creativeGame, setCreativeGame] = useState<any | null>(null);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [isDeepThink, setIsDeepThink] = useState<boolean>(false);
  const [savedGamesEditingPrompt, setSavedGamesEditingPrompt] = useState<string>('');
  const [savedGamesEditingLoading, setSavedGamesEditingLoading] = useState<boolean>(false);
  
  const [savedGames, setSavedGames] = useState<any[]>([]);
  const [publishLoading, setPublishLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadSavedGamesData = async () => {
      if (currentUser && db) {
        try {
          const gamesRef = collection(db, 'user_saved_games');
          const q = query(gamesRef, where('userId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          const list: any[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              ...data,
              id: docSnap.id,
              isUserLocal: true // allows simple playback or edits
            });
          });
          setSavedGames(list);
        } catch (err) {
          console.error("Failed to load saved games from Firestore:", err);
        }
      } else {
        const rawGames = localStorage.getItem('isaiah_saved_games') || '[]';
        try {
          setSavedGames(JSON.parse(rawGames));
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadSavedGamesData();
  }, [currentUser]);

  const handleSaveToLibrary = async () => {
    if (!creativeGame) return;
    const isAlreadySaved = savedGames.some(g => g.title === creativeGame.title);
    if (isAlreadySaved) {
      alert(`"${creativeGame.title}" is already saved in your Games Library!`);
      return;
    }

    const updatedGame = {
      ...creativeGame,
      id: creativeGame.id || `game-${Date.now()}`,
      savedAt: new Date().toISOString(),
      isUserLocal: true
    };

    const updated = [updatedGame, ...savedGames];
    setSavedGames(updated);

    if (currentUser && db) {
      try {
        const gameId = `${currentUser.uid}_${creativeGame.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await setDoc(doc(db, 'user_saved_games', gameId), {
          userId: currentUser.uid,
          title: creativeGame.title,
          genre: creativeGame.genre || 'Arcade',
          tagline: creativeGame.tagline || 'Retro game',
          rules: creativeGame.rules || [],
          codeHtml: creativeGame.codeHtml,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to save game to Firestore:", err);
      }
    } else {
      localStorage.setItem('isaiah_saved_games', JSON.stringify(updated));
    }

    alert(`Successfully saved "${creativeGame.title}" to your St.Amour Games Library!`);
  };

  const handleDeleteFromLibrary = async (gameTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${gameTitle}" from your library?`)) {
      const updated = savedGames.filter(g => g.title !== gameTitle);
      setSavedGames(updated);

      if (currentUser && db) {
        try {
          const gameId = `${currentUser.uid}_${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
          await deleteDoc(doc(db, 'user_saved_games', gameId));
        } catch (err) {
          console.error("Failed to delete game from Firestore:", err);
        }
      } else {
        localStorage.setItem('isaiah_saved_games', JSON.stringify(updated));
      }
    }
  };

  const handlePublishGame = async (gameToPublish: any) => {
    if (!gameToPublish || !gameToPublish.codeHtml) {
      alert('Cannot publish empty code.');
      return;
    }
    setPublishLoading(true);
    try {
      if (db) {
        const gamesRef = collection(db, 'published_games');
        await addDoc(gamesRef, {
          title: gameToPublish.title,
          genre: gameToPublish.genre || 'A* Arcade',
          tagline: gameToPublish.tagline || 'Retro accelerated physics loop',
          rules: gameToPublish.rules || ['Use WASD keys', 'Avoid collisions'],
          codeHtml: gameToPublish.codeHtml,
          createdAt: serverTimestamp(),
          authorName: currentUser?.displayName || 'St.Amour Explorer'
        });

        // Sync local list 
        const q = query(gamesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const list: any[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ ...doc.data(), id: doc.id });
        });
        setPublicGames(list);
      }

      const response = await fetch('/api/publish-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gameToPublish.title,
          codeHtml: gameToPublish.codeHtml,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Publish service error');
      }

      const data = await response.json();
      alert(`🚀 Released Successfully! "${gameToPublish.title}" is now published globally to all users on the St.Amour workspace cloud!`);
    } catch (err: any) {
      alert(`Failed to publish: ${err.message || 'Server error'}`);
    } finally {
      setPublishLoading(false);
    }
  };

  const creativePresets = [
    'Electronics Pathfinding maze featuring real path trackers',
    'A* Circuit Node connector with coordinate grid calculations',
    'Logic Gate electricity path runner',
    'Laser Grid dodge puzzle themed on computer chips',
  ];

  const triggerSuccessNotification = (gameTitle: string) => {
    // 1. Desktop standard HTML5 Web Notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🎮 IsaiahAI Game Compiled!', {
          body: `"${gameTitle}" has been successfully synthesized and is ready inside the public catalog!`,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('🎮 IsaiahAI Game Compiled!', {
              body: `"${gameTitle}" has been successfully synthesized and is ready inside the public catalog!`,
            });
          }
        });
      }
    }

    // 2. Set beautiful dynamic in-app notification toast alert
    setInAppToast({
      title: '🚀 GEN-MATRIX ACCELERATION COMPLETE',
      body: `"${gameTitle}" has been compiled by IsaiahAI and published to the Cloud Lobby!`
    });

    // Auto-wipe toast in 9 seconds
    setTimeout(() => {
      setInAppToast(null);
    }, 9000);
  };

  const handleGenerateCreativeGame = async () => {
    setCreativeLoading(true);
    setCreativeError(null);
    setCreativeGame(null);
    try {
      const response = await fetch('/api/creative-ast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: creativePrompt, isDeepThink }),
      });
      if (!response.ok) throw new Error('AI Creative Server failed to output code.');
      const data = await response.json();
      setCreativeGame(data);

      // Trigger standard Web notification + in-app toast
      triggerSuccessNotification(data.title || "Newly Synthesized Game");

      // Auto publish to Public Games catalog if DB connected
      try {
        if (db) {
          const gamesRef = collection(db, 'published_games');
          await addDoc(gamesRef, {
            title: data.title || 'Genesis Coordinate Puzzle',
            genre: data.genre || 'IsaiahAI Arcade',
            tagline: data.tagline || 'Compiled via St.Amour intelligence network',
            rules: data.rules || ['Interactive canvas logic', 'Dodge node coordinates'],
            codeHtml: data.codeHtml,
            createdAt: serverTimestamp(),
            authorName: currentUser?.displayName || 'St.Amour Explorer'
          });

          // Reload catalog
          const q = query(gamesRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const list: any[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ ...doc.data(), id: doc.id });
          });
          setPublicGames(list);
        }
      } catch (err) {
        console.warn("Cloud publish background error:", err);
      }
    } catch (err: any) {
      setCreativeError(err.message || 'Could not compile creative dynamic code.');
    } finally {
      setCreativeLoading(false);
    }
  };

  const handleDownloadCreativeGame = () => {
    if (!creativeGame || !creativeGame.codeHtml) return;
    const blob = new Blob([creativeGame.codeHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${creativeGame.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stamour.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Combine public games with epic built-in default modules so there is rich content
  const defaultSampleGames = [
    {
      title: 'Cosmic Invaders Space',
      tagline: 'Defend the galaxy against alien fleets in this space shooter arcade simulator!',
      genre: 'Arcade',
      authorName: 'IsaiahAI Core',
      votes: 142,
      codeHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #020617; color: #fff; font-family: monospace; overflow: hidden; }
    canvas { display: block; background: #030712; border: 1px solid #1e293b; margin: auto; max-width: 100%; max-height: 100vh; }
    #hud { position: absolute; top: 10px; left: 10px; font-size: 14px; text-shadow: 0 0 5px #000; }
  </style>
</head>
<body>
  <div id="hud">SCORE: <span id="score">0</span></div>
  <canvas id="gameCanvas" width="600" height="400"></canvas>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('score');
    let score = 0;
    
    // Player
    const player = { x: 275, y: 350, w: 50, h: 20, speed: 7 };
    const lasers = [];
    const invaders = [];
    
    // Setup invaders
    for(let r = 0; r < 3; r++) {
      for(let c = 0; c < 8; c++) {
        invaders.push({ x: 50 + c * 60, y: 50 + r * 45, w: 30, h: 20 });
      }
    }
    
    // Controls
    let leftPressed = false;
    let rightPressed = false;
    window.addEventListener('keydown', (e) => {
      if(e.key === 'ArrowLeft') leftPressed = true;
      if(e.key === 'ArrowRight') rightPressed = true;
      if(e.key === ' ' || e.key === 'ArrowUp') {
        lasers.push({ x: player.x + player.w/2, y: player.y, speed: 8 });
      }
    });
    window.addEventListener('keyup', (e) => {
      if(e.key === 'ArrowLeft') leftPressed = false;
      if(e.key === 'ArrowRight') rightPressed = false;
    });
    
    function update() {
      if(leftPressed && player.x > 0) player.x -= player.speed;
      if(rightPressed && player.x < canvas.width - player.w) player.x += player.speed;
      
      // Update lasers
      for(let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].y -= lasers[i].speed;
        if(lasers[i].y < 0) lasers.splice(i, 1);
      }
      
      // Update invaders
      invaders.forEach(inv => {
        inv.x += Math.sin(Date.now() / 1000) * 0.8;
      });
      
      // Hit detection
      lasers.forEach((l, li) => {
        invaders.forEach((inv, invi) => {
          if(l.x > inv.x && l.x < inv.x + inv.w && l.y > inv.y && l.y < inv.y + inv.h) {
            invaders.splice(invi, 1);
            lasers.splice(li, 1);
            score += 10;
            scoreVal.innerText = score;
          }
        });
      });
    }
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Player
      ctx.fillStyle = '#10b981';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      
      // Lasers
      ctx.fillStyle = '#f43f5e';
      lasers.forEach(l => {
        ctx.fillRect(l.x - 2, l.y, 4, 10);
      });
      
      // Invaders
      ctx.fillStyle = '#06b6d4';
      invaders.forEach(inv => {
        ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
      });
    }
    
    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }
    gameLoop();
  </script>
</body>
</html>
`,
      rules: ['Use Arrow Keys (Left / Right) to move ship.', 'Press Spacebar / Arrow Up to trigger lasers.', 'Eliminate the invader fleet components to accumulate score points.']
    },
    {
      title: 'Flappy Phoenix Fly',
      tagline: 'Avoid columns of high-density solar shields in this physics bird simulator!',
      genre: 'Physics',
      authorName: 'IsaiahAI Core',
      votes: 98,
      codeHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #020617; color: #fff; font-family: monospace; overflow: hidden; text-align: center; }
    canvas { display: block; background: #0f172a; margin: 20px auto; max-width: 100%; border: 2px solid #334155; }
    #scoreDisp { font-size: 20px; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <div id="scoreDisp">SCORE: <span id="sVal">0</span></div>
  <canvas id="canvas" width="320" height="480"></canvas>
  <script>
    const cvs = document.getElementById("canvas");
    const ctx = cvs.getContext("2d");
    const sVal = document.getElementById("sVal");
    
    const bird = { x: 50, y: 150, r: 12, velocity: 0, gravity: 0.35, jump: -5.8 };
    let score = 0;
    const pipes = [];
    pipes[0] = { x: cvs.width, y: 100 };
    
    window.addEventListener("keydown", () => { bird.velocity = bird.jump; });
    window.addEventListener("touchstart", () => { bird.velocity = bird.jump; });
    
    function draw() {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0,0,cvs.width,cvs.height);
      
      bird.velocity += bird.gravity;
      bird.y += bird.velocity;
      
      // Draw bird
      ctx.beginPath();
      ctx.fillStyle = "#e11d48";
      ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI*2);
      ctx.fill();
      
      for(let i=0; i<pipes.length; i++) {
        const gap = 110;
        ctx.fillStyle = "#22c55e";
        
        // top pipe
        ctx.fillRect(pipes[i].x, 0, 40, pipes[i].y);
        // bottom pipe
        ctx.fillRect(pipes[i].x, pipes[i].y + gap, 40, cvs.height - (pipes[i].y + gap));
        
        pipes[i].x -= 1.8;
        
        if(pipes[i].x == 120) {
          pipes.push({ x: cvs.width, y: Math.floor(Math.random() * 200) + 50 });
        }
        
        if(pipes[i].x < -40) {
          pipes.splice(i, 1);
          score++;
          sVal.innerText = score;
        }
        
        // collision
        if(bird.y + bird.r > cvs.height || bird.y - bird.r < 0 || (bird.x + bird.r > pipes[i].x && bird.x - bird.r < pipes[i].x + 40 && (bird.y - bird.r < pipes[i].y || bird.y + bird.r > pipes[i].y + gap))) {
          bird.y = 150;
          bird.velocity = 0;
          score = 0;
          sVal.innerText = score;
          pipes.length = 0;
          pipes[0] = { x: cvs.width, y: 100 };
        }
      }
      
      requestAnimationFrame(draw);
    }
    draw();
  </script>
</body>
</html>
`,
      rules: ['Tap screen or press any keyboard key to jump.', 'Clear green shields horizontally without crashes to raise points.']
    }
  ];

  const allAvailableGames = [...defaultSampleGames, ...publicGames];
  const filteredGames = allAvailableGames.filter(game => 
    (game.title || '').toLowerCase().includes((gamesSearchQuery || '').toLowerCase()) ||
    (game.tagline || '').toLowerCase().includes((gamesSearchQuery || '').toLowerCase()) ||
    (game.genre || '').toLowerCase().includes((gamesSearchQuery || '').toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full text-slate-100 font-sans relative">
      {/* Floating St.Amour Dynamic Toast alerts */}
      {inAppToast && (
        <div id="toast-banner" className="fixed top-6 right-6 max-w-sm bg-slate-950/95 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl z-[9999] backdrop-blur-md animate-scale-up font-mono">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-sm shrink-0">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono text-emerald-400 block font-bold uppercase tracking-widest">{inAppToast.title}</span>
              <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">{inAppToast.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Tabs */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center font-display font-bold shadow-lg shadow-cyan-950/40 text-black">
            🎮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-lg tracking-tight text-white flex items-center gap-2">
                St.Amour Retro Acceleration Center
              </h3>
              {currentUser ? (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected: {currentUser.displayName || 'Developer'}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-full font-mono text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Offline Sandbox
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-2">
              ST.AMOUR ELECTRONICS CO. DEPT-86
              {currentUser ? (
                <button 
                  type="button"
                  onClick={onGoogleSignOut} 
                  className="text-red-400 hover:text-red-300 font-bold ml-1 uppercase text-[10px] underline cursor-pointer"
                >
                  [ SIGN OUT ]
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={onGoogleSignIn} 
                  className="text-amber-400 hover:text-amber-300 font-bold ml-1 uppercase text-[10px] underline cursor-pointer"
                >
                  [ CONNECT GOOGLE ACCOUNT ]
                </button>
              )}
            </span>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('trivia')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'trivia' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Trivia
          </button>
          <button 
            onClick={() => setActiveTab('pong')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'pong' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pong Arcades
          </button>
          <button 
            onClick={() => setActiveTab('snake')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'snake' ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Snake & Skins
          </button>
          <button 
            onClick={() => setActiveTab('creative')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'creative' ? 'bg-fuchsia-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Game Generation
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'saved' ? 'bg-rose-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Saved Games
          </button>
          <button 
            onClick={() => setActiveTab('runner3d')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all ${
              activeTab === 'runner3d' ? 'bg-indigo-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Voyager
          </button>
          <button 
            onClick={() => setActiveTab('doom')}
            className={`flex-1 sm:flex-none shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight font-sans transition-all ${
              activeTab === 'doom' ? 'bg-red-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Cyber-Doom 3D
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-900/60 electronic-grid">
        
        {/* ======================= TAB 1: AI TRIVIA ======================= */}
        {activeTab === 'trivia' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-950 p-6 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="text-amber-500 w-5 h-5 animate-pulse" />
                  <span className="font-display font-medium text-slate-200">Interactive Quiz Generation</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-400">Streak: <b className="text-amber-400">{triviaStreak}</b>🔥</span>
                  <span className="text-slate-400">Score: <b className="text-white">{triviaScore}</b></span>
                </div>
              </div>

              {/* Category picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-mono">SELECT TRIVIA TOPIC:</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['Random', 'Electronics', 'Physics', 'Gaming', 'History'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTriviaCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs tracking-tight transition-colors border ${
                        triviaCategory === cat 
                          ? 'bg-slate-800 border-amber-500 text-white' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Block */}
              {triviaLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-t-2 border-amber-500 animate-spin" />
                  <p className="text-xs font-mono text-slate-400">Connecting to St.Amour AI matrix...</p>
                </div>
              ) : triviaError ? (
                <div className="py-12 text-center space-y-3">
                  <AlertTriangle className="text-red-500 mx-auto w-10 h-10" />
                  <p className="text-sm text-red-300 font-mono">{triviaError}</p>
                  <button 
                    onClick={() => fetchTriviaQuestion(triviaCategory)}
                    className="px-4 py-2 bg-slate-800 rounded-lg text-xs"
                  >
                    Reinitialize AI Node
                  </button>
                </div>
              ) : triviaItem ? (
                <div className="space-y-6 pt-2">
                  <div className="text-white font-display text-base tracking-tight leading-relaxed">
                    {triviaItem.question}
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 gap-3">
                    {triviaItem.options.map((option, idx) => {
                      let buttonStyle = 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60';
                      
                      if (answeredTrivia) {
                        if (idx === triviaItem.answerIndex) {
                          buttonStyle = 'bg-emerald-950/50 border-emerald-500 text-emerald-300';
                        } else if (idx === selectedTriviaIndex) {
                          buttonStyle = 'bg-red-950/50 border-red-500 text-red-300';
                        } else {
                          buttonStyle = 'bg-slate-900/30 border-slate-800/40 text-slate-500 pointer-events-none';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={answeredTrivia}
                          onClick={() => handleSelectTriviaAnswer(idx)}
                          className={`w-full text-left p-4 rounded-xl border text-sm font-medium tracking-tight transition-all duration-200 flex items-center justify-between ${buttonStyle}`}
                        >
                          <span>{option}</span>
                          {answeredTrivia && idx === triviaItem.answerIndex && (
                            <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300">Correct</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {answeredTrivia && (
                    <div className="bg-slate-900/50 p-4 border border-slate-800/60 rounded-xl space-y-2 animate-fade-in text-xs text-slate-300 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-amber-400 font-display font-medium">
                        <Lightbulb className="w-4 h-4" />
                        <span>AI Explanation</span>
                      </div>
                      <p>{triviaItem.explanation}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Primary action controls */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => fetchTriviaQuestion(triviaCategory)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 rounded-xl font-medium text-xs tracking-tight shadow-lg shadow-amber-950/40 dynamic-note transition-all"
                >
                  Generate Next Question
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: PONG GAME ======================= */}
        {activeTab === 'pong' && (
          <div className="max-w-2xl mx-auto space-y-4 text-center">
            <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="text-cyan-400 w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                <div className="text-left">
                  <span className="text-xs text-slate-400 font-mono">BATTLE STATIONS</span>
                  <p className="text-sm font-display font-semibold text-white">Silicon Paddle Collision Arena</p>
                </div>
              </div>

              {/* Pong Mode Option */}
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => { setPongMode('ai'); setPongRunning(false); }}
                  className={`px-3 py-1 rounded text-xs transition-colors ${pongMode === 'ai' ? 'bg-cyan-500 text-black font-semibold' : 'text-slate-400'}`}
                >
                  VS IsaiahAI
                </button>
                <button
                  onClick={() => { setPongMode('local'); setPongRunning(false); }}
                  className={`px-3 py-1 rounded text-xs transition-colors ${pongMode === 'local' ? 'bg-cyan-500 text-black font-semibold' : 'text-slate-400'}`}
                >
                  2-Player (Local)
                </button>
              </div>
            </div>

            {/* Scoreboard and Canvas */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
              <div className="flex justify-around items-center font-display font-bold text-3xl py-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Player 1 (W/S)</span>
                  <span className="text-amber-500">{pongScoreLeft}</span>
                </div>
                <div className="text-sm text-slate-500 font-mono uppercase">First to 5</div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{pongMode === 'ai' ? 'IsaiahAI' : 'Player 2 (Arrows)'}</span>
                  <span className="text-cyan-400">{pongScoreRight}</span>
                </div>
              </div>

              {/* Canvas element */}
              <div className="relative border border-slate-800 rounded-xl overflow-hidden shadow-inner flex justify-center bg-slate-950">
                <canvas 
                  ref={pongCanvasRef} 
                  width={600} 
                  height={320}
                  className="w-full max-w-[600px] aspect-[600/320] block"
                />

                {/* Overlaid UI States */}
                {!pongRunning && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-4">
                    {pongWinner ? (
                      <div className="space-y-1 text-center">
                        <Trophy className="text-yellow-400 w-12 h-12 mx-auto animate-bounce" />
                        <h4 className="text-xl font-display font-bold text-white">{pongWinner} Wins!</h4>
                        <p className="text-xs text-slate-400">Match concluded cleanly via St.Amour controllers.</p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center max-w-sm">
                        <h4 className="text-base font-display font-semibold text-white">Ready to acceleration loop?</h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-mono">
                          P1 controllers: <b className="text-amber-400">W</b> (up), <b className="text-amber-400">S</b> (down). <br />
                          {pongMode === 'local' ? (
                            <span>P2 controllers: <b className="text-cyan-400">↑ Arrow</b> (up), <b className="text-cyan-400">↓ Arrow</b> (down).</span>
                          ) : (
                            <span className="text-cyan-400">Facing St.Amour Microchip logic AI.</span>
                          )}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleStartPong}
                      className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-display font-semibold text-xs tracking-tight rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/40"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>{pongWinner ? 'Restart Arena' : 'Initialize Match'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: SNAKE GAME ======================= */}
        {activeTab === 'snake' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Skin & Config Sidebar */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">Customization Logic</span>
                <h4 className="font-display font-semibold text-white text-sm">Select Snake Skins</h4>
                
                <div className="grid grid-cols-1 gap-2">
                  {snakeSkins.map(skin => (
                    <button
                      key={skin.name}
                      onClick={() => setSelectedSkin(skin.name)}
                      className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                        selectedSkin === skin.name 
                          ? 'bg-slate-800 border-emerald-500 text-white shadow-inner' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{skin.name}</span>
                      <div className="flex gap-1">
                        {skin.gradientStart === 'rainbow' ? (
                          <div className="w-5 h-3 rounded bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
                        ) : (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.gradientStart }} />
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.gradientEnd }} />
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM SKIN BUILDER SUB-CONTAINER */}
              <div id="custom-skin-builder" className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs text-amber-500 font-mono flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Design custom skins
                </span>
                <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                  Craft high-performance retro modules. Color matching rules apply automatically inside the snake's dynamic vector rendering thread.
                </p>

                <div className="space-y-2.5 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">LABEL NAME:</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      placeholder="e.g. Cyber Dragon"
                      value={customSkinName}
                      onChange={(e) => setCustomSkinName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono block mb-1 font-bold">START COLOR:</label>
                      <div className="flex gap-1.5 items-center bg-slate-900 border border-slate-800/80 p-1 rounded-lg">
                        <input 
                          type="color"
                          className="w-6 h-6 rounded bg-transparent border border-transparent cursor-pointer"
                          value={customSkinStart}
                          onChange={(e) => {
                            setCustomSkinStart(e.target.value);
                          }}
                        />
                        <span className="text-[10px] font-mono text-slate-300">{customSkinStart}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-mono block mb-1 font-bold">END COLOR:</label>
                      <div className="flex gap-1.5 items-center bg-slate-900 border border-slate-800/80 p-1 rounded-lg">
                        <input 
                          type="color"
                          className="w-6 h-6 rounded bg-transparent border border-transparent cursor-pointer"
                          value={customSkinEnd}
                          onChange={(e) => {
                            setCustomSkinEnd(e.target.value);
                          }}
                        />
                        <span className="text-[10px] font-mono text-slate-300">{customSkinEnd}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 font-bold font-mono">GLOW COLOR:</label>
                    <div className="flex gap-1.5 items-center bg-slate-900 border border-slate-800/80 p-1 rounded-lg">
                      <input 
                        type="color"
                        className="w-6 h-6 rounded bg-transparent border border-transparent cursor-pointer"
                        value={customSkinEnd}
                        onChange={(e) => {
                          setCustomSkinGlow(e.target.value + '66');
                        }}
                      />
                      <span className="text-[10px] font-mono text-slate-300">{customSkinGlow}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono block">FACE EMOTE OVERLAY:</label>
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {['none', '😎', '💀', '👽', '👾', '🔥', '👑', '⭐', '🤖', '👀'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCustomSkinEmoji(emoji)}
                          className={`p-1 rounded border text-[11px] flex items-center justify-center transition-all ${
                            customSkinEmoji === emoji 
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 pointer-events-none' 
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {emoji === 'none' ? 'None' : emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomSkin}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-slate-950 rounded-xl font-bold font-mono text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Design to Sync Engine
                  </button>
                </div>
              </div>

              {/* Quick stats panel */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400">PERSONAL RECORD:</span>
                  <div className="text-xl font-display font-bold text-white">{snakeHighScore} pts</div>
                </div>
                <Trophy className="text-amber-500 w-8 h-8 animate-bounce" />
              </div>
            </div>

            {/* Game Canvas Board */}
            <div className="space-y-4 md:col-span-2">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-4 flex flex-col items-center">
                <div className="w-full flex justify-between items-center px-2">
                  <div className="flex items-center gap-1.5 font-mono text-slate-400 text-xs">
                    <span>Active Skin: </span>
                    <b className="text-emerald-400">{selectedSkin}</b>
                  </div>
                  <div className="font-display font-bold text-lg">
                    Score: <span className="text-emerald-500">{snakeScore}</span>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex justify-center">
                  <canvas 
                    ref={snakeCanvasRef}
                    width={360}
                    height={360}
                    className="aspect-square bg-slate-950 max-w-[360px] w-full block"
                  />

                  {/* Overlaid Screens */}
                  {!snakeRunning && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                      {snakeGameOver ? (
                        <div className="space-y-4 w-full max-w-xs">
                          <div>
                            <AlertTriangle className="text-red-500 w-10 h-10 mx-auto animate-pulse" />
                            <h4 className="text-lg font-display font-semibold text-white">Circuit Break / Crash!</h4>
                            <p className="text-xs text-slate-400">You scored <span className="text-emerald-400 font-bold">{snakeScore}</span> collecting data packets.</p>
                          </div>

                          {/* Leaderboard saving box */}
                          {showScoreSavePrompt ? (
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-2">
                              <span className="text-[10px] font-mono text-slate-400 block">SUBMIT TO ACCELERATION LEADERBOARD:</span>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={snakeSaveName}
                                  onChange={(e) => setSnakeSaveName(e.target.value)}
                                  className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1 text-xs rounded text-white font-mono uppercase"
                                  maxLength={10}
                                  placeholder="NAME"
                                />
                                <button
                                  onClick={saveSnakeScore}
                                  className="px-3 py-1 bg-emerald-500 text-black font-semibold text-xs rounded"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] font-mono text-emerald-500">Score Saved successfully!</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 max-w-sm">
                          <h4 className="text-base font-display font-semibold text-white">Data Node Grid</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-mono">
                            Guide the circuit loop using <b className="text-emerald-400">W, A, S, D</b> or <b className="text-emerald-400">Arrow Controllers</b> to capture apples. Do not collision grids or self.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleStartSnake}
                        className="px-5 py-2 hover:bg-emerald-600 bg-emerald-500 text-slate-950 font-display font-semibold text-xs tracking-tight rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>{snakeGameOver ? 'Re-energize Grid' : 'Boot Snake Core'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Score list */}
                <div className="w-full space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase tracking-widest px-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Acceleration Grid High-Scores</span>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2 max-h-[140px] overflow-y-auto border border-slate-800/60 divide-y divide-slate-800/30">
                    {leaderboard.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-2 font-mono">No entries recorded yet.</p>
                    ) : (
                      leaderboard.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-xs font-mono px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold">{idx + 1}.</span>
                            <span className="text-slate-200 font-semibold">{entry.name}</span>
                            <span className="text-[10px] text-slate-500">({entry.skin})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold">{entry.score} pts</span>
                            <span className="text-[10px] text-slate-600">{entry.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 5: 3D VOYAGER VECTOR RUNNER ======================= */}
        {activeTab === 'runner3d' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-slate-950 p-6 border border-slate-800 rounded-2xl shadow-xl space-y-6">
              
              {/* Retro HUD Panel */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-indigo-950 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-display font-bold text-lg text-indigo-400">
                    🌌
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-white text-base">St.Amour 3D Vector Voyager</h4>
                    <p className="text-xs text-indigo-400 font-mono tracking-wider">PROJECT HYPERION-86 • FLIGHT SIMULATOR</p>
                  </div>
                </div>

                {/* Score Indicators */}
                <div className="flex items-center gap-6 font-mono text-sm">
                  <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">SCORE</span>
                    <span className="text-cyan-400 text-sm font-bold">{runnerScore} <span className="text-[10px] text-zinc-500">units</span></span>
                  </div>
                  <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-950/50">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">HIGH SCORE</span>
                    <span className="text-indigo-400 text-sm font-bold">{runnerHighScore} <span className="text-[10px] text-zinc-500">units</span></span>
                  </div>
                </div>
              </div>

              {/* Main Game Stage Wrapper */}
              <div className="relative flex flex-col items-center justify-center">
                <div className="relative border-4 border-indigo-950 rounded-2xl overflow-hidden bg-[#060a17] shadow-lg shadow-indigo-950/20 max-w-full">
                  <canvas 
                    ref={runnerCanvasRef}
                    width={600}
                    height={350}
                    className="block max-w-full bg-[#060a17]"
                  />

                  {/* Overlaid screens */}
                  {(!runnerRunning) && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in backdrop-blur-sm">
                      {runnerGameOver ? (
                        <div className="space-y-4 max-w-sm">
                          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto text-3xl animate-bounce">
                            💥
                          </div>
                          <div>
                            <h5 className="font-display font-bold text-white text-lg uppercase tracking-wider text-red-400">Voyager Collided!</h5>
                            <p className="text-xs text-slate-400 mt-1">Our A* proximity warnings failed to reconcile the hyper-dimensional obstructions in time.</p>
                          </div>
                          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                            SCORE: <span className="text-cyan-400 font-bold">{runnerScore}</span> APEX UNITS
                          </div>
                          <button
                            onClick={handleStartRunner}
                            className="w-full bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-lg py-2 text-xs font-bold font-mono tracking-widest uppercase shadow-md shadow-red-950/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>LAUNCH RE-TRY</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5 max-w-md">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto text-3xl">
                            🚀
                          </div>
                          <div>
                            <h5 className="font-display font-bold text-white text-lg uppercase tracking-wider">Initiate Vector Flight</h5>
                            <p className="text-xs text-slate-400 mt-1">Ride the 3D St.Amour light plane floor lane. Engage horizontal navigation coordinates to avoid modular neon structural pillars.</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-left font-mono max-w-xs mx-auto border border-indigo-950/50 bg-slate-900/50 p-3 rounded-xl text-[11px] text-slate-300 font-medium">
                            <div>
                              <span className="text-indigo-400 font-bold">A / ArrowLeft</span>
                              <span className="block text-slate-500">Maneuver Left</span>
                            </div>
                            <div>
                              <span className="text-indigo-400 font-bold">D / ArrowRight</span>
                              <span className="block text-slate-500">Maneuver Right</span>
                            </div>
                          </div>

                          <button
                            onClick={handleStartRunner}
                            className="bg-indigo-500 text-black rounded-lg px-8 py-2.5 text-xs font-bold font-mono tracking-widest uppercase shadow-lg shadow-indigo-950/40 hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>LAUNCH SIMULATOR</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Gameplay telemetry header */}
                  {runnerRunning && (
                    <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white/80 font-mono text-[9px] pointer-events-none select-none">
                      <div className="flex items-center gap-3 bg-slate-950/80 px-2 py-1.5 border border-indigo-500/20 rounded-md">
                        <span className="text-slate-500">SPEED:</span>
                        <span className="text-emerald-400 font-bold">{(runnerSpeed.current * 100).toFixed(0)} KM/H</span>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-950/80 px-2 py-1.5 border border-indigo-500/20 rounded-md">
                        <span className="text-slate-500">DISTANCE:</span>
                        <span className="text-cyan-400 font-bold">{totalRunnerDistance.current.toFixed(1)} LY</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile controls */}
                <div className="flex items-center justify-center gap-4 w-full max-w-[320px] mt-4 font-mono select-none">
                  <button 
                    onMouseDown={() => { player3DX.current = Math.max(-95, player3DX.current - 24); }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-900 active:scale-95 border border-slate-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer md:py-2"
                  >
                    ◀ LEFT
                  </button>
                  <button 
                    onMouseDown={() => { player3DX.current = Math.min(95, player3DX.current + 24); }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-900 active:scale-95 border border-slate-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer md:py-2"
                  >
                    RIGHT ▶
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= TAB 5B: CYBER-DOOM 3D MULTIPLAYER ======================= */}
        {activeTab === 'doom' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-100">
            <CyberDoom3D userNickname={userNickname || 'Slayer Guest'} currentUser={currentUser} />
          </div>
        )}

        {/* ======================= TAB 6: SAVED GAMES LIBRARY ======================= */}
        {activeTab === 'saved' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-100">
            {/* LIBRARY NOTICE AND UTILITY ACTION BAR */}
            <div className="bg-slate-950 p-6 border border-slate-800 rounded-2xl space-y-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💾</span>
                  <h4 className="font-display font-semibold text-white text-base">My Saved Games Library</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Manage and play all retro arcade games you have generated with IsaiahAI. These are persisted to your {currentUser ? 'secure Google Cloud profile' : 'local browser cache'}.
                </p>
              </div>

              {!currentUser && onGoogleSignIn && (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="px-4 py-2 shrink-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-305 rounded-xl text-xs font-bold transition-all border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Cloud Backup Login</span>
                </button>
              )}
            </div>

            {/* Catalog Grid of SAVED GAMES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedGames.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <AlertTriangle className="w-8 h-8 text-rose-500/50 mx-auto mb-2 animate-bounce" />
                  <h5 className="text-sm font-semibold text-slate-400 font-display">No Saved Games Found</h5>
                  <p className="text-xs font-mono text-slate-500 mt-1">Generate a game in the "Public Games" lobby, then click "Save to Library" to pin it here!</p>
                </div>
              ) : (
                savedGames.map((game, i) => (
                  <div 
                    key={i} 
                    className={`bg-slate-950 p-4 border rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-700 transition-all ${
                      creativeGame?.title === game.title ? 'border-rose-500/40 bg-slate-950/80 shadow-md' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 text-rose-400 rounded border border-slate-800 font-mono uppercase tracking-wider font-bold">
                          {game.genre || 'Arcade'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-slate-400 rounded border border-zinc-805 font-mono">
                          Saved
                        </span>
                      </div>
                      <h5 className="font-display font-semibold text-white text-sm tracking-tight leading-snug">
                        {game.title}
                      </h5>
                      <p className="text-xs text-slate-400 leading-normal line-clamp-2 font-sans">
                        {game.tagline}
                      </p>
                    </div>

                    <div className="flex gap-1.5 pt-1 border-t border-slate-850/30 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCreativeGame(game);
                          setTimeout(() => {
                            document.getElementById('creative-game-anchor')?.scrollIntoView({ behavior: 'smooth' });
                          }, 150);
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/25 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Game</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([game.codeHtml], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${game.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stamour.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-lg border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>HTML</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFromLibrary(game.title)}
                        className="p-1 px-[7px] bg-red-955/40 hover:bg-red-900/50 text-red-300 border border-red-900/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete game from library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ACTIVE SANDBOX COMPILER PREVIEW BOX */}
            {creativeGame && (
              <div id="creative-game-anchor" className="scroll-mt-4 pt-1">
                <div className="space-y-4 animate-fade-in bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-rose-950 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block mb-1">{creativeGame.genre}</span>
                      <h5 className="font-display font-semibold text-white text-base leading-tight">{creativeGame.title}</h5>
                      <p className="text-xs italic text-slate-400 mt-1">{creativeGame.tagline || 'Retro accelerated physics loop'}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap text-mono">
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([creativeGame.codeHtml], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${creativeGame.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stamour.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-rose-950/35 text-rose-200 hover:text-rose-300 rounded-xl text-xs font-bold border border-rose-900/25 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Download stand-alone game"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download HTML</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-rose-950/20 text-xs font-mono text-slate-350 space-y-2">
                    <span className="text-rose-400 font-bold block uppercase tracking-wider text-[9.5px]">ST.AMOUR SIMULATOR INSTRUCTIONS</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {creativeGame.rules && creativeGame.rules.map((rule: string, rIdx: number) => (
                        <li key={rIdx}>{rule}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Sandboxed Player IFrame */}
                  <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                    <iframe
                      srcDoc={creativeGame.codeHtml}
                      title={creativeGame.title}
                      className="w-full h-full border-0 select-none animate-fade-in"
                      sandbox="allow-scripts"
                    />
                  </div>

                  {/* EDIT INTERACTIVE NODE FOR PEOPLE WITH GOOGLE ACCOUNTS */}
                  {currentUser && (
                    <div className="border border-fuchsia-500/20 bg-fuchsia-950/5 p-4 rounded-xl space-y-3.5 mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-fuchsia-300 font-mono font-bold uppercase tracking-wide">
                        <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                        <span>Interactive AI Edit & Augmentation Shell</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        As an authenticated Google Cloud player, you can continue to add onto this game! Describe what you'd like to adjust, add levels/oscillators, purple neon styles, or faster controllers.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={savedGamesEditingPrompt}
                          onChange={(e) => setSavedGamesEditingPrompt(e.target.value)}
                          placeholder="E.g., add sound effects when score increases, or change background to purple neon"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-fuchsia-500 transition-colors font-mono"
                          disabled={savedGamesEditingLoading}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!savedGamesEditingPrompt.trim()) return;
                            setSavedGamesEditingLoading(true);
                            try {
                              const response = await fetch('/api/creative-ast', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  prompt: savedGamesEditingPrompt, 
                                  existingCodeDelta: creativeGame.codeHtml,
                                  isDeepThink: true
                                }),
                              });
                              if (!response.ok) throw new Error("AI Edit compilation failed.");
                              const updatedGame = await response.json();
                              
                              const updated = {
                                ...creativeGame,
                                title: updatedGame.title || creativeGame.title,
                                genre: updatedGame.genre || creativeGame.genre,
                                tagline: updatedGame.tagline || creativeGame.tagline,
                                rules: updatedGame.rules || creativeGame.rules,
                                codeHtml: updatedGame.codeHtml,
                                savedAt: new Date().toISOString()
                              };
                              
                              setCreativeGame(updated);
                              setSavedGames(prev => prev.map(g => g.title === creativeGame.title ? updated : g));
                              setSavedGamesEditingPrompt('');
                              
                              if (db && currentUser) {
                                const gameId = `${currentUser.uid}_${creativeGame.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                await setDoc(doc(db, 'user_saved_games', gameId), {
                                  userId: currentUser.uid,
                                  title: updated.title,
                                  genre: updated.genre,
                                  tagline: updated.tagline,
                                  rules: updated.rules,
                                  codeHtml: updated.codeHtml,
                                  createdAt: new Date().toISOString()
                                });
                              }
                              
                              alert(`Successfully synthesized and updated "${updated.title}"!`);
                            } catch (err: any) {
                              alert(`Edit failed: ${err.message || err}`);
                            } finally {
                              setSavedGamesEditingLoading(false);
                            }
                          }}
                          disabled={savedGamesEditingLoading || !savedGamesEditingPrompt.trim()}
                          className="px-4 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-slate-950 font-display font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                        >
                          {savedGamesEditingLoading ? (
                            <div className="w-3.5 h-3.5 border-t-2 border-t-slate-950 rounded-full animate-spin" />
                          ) : (
                            <Cpu className="w-3.5 h-3.5" />
                          )}
                          <span>Augment Game</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 4: PUBLIC GAMES CATALOG ======================= */}
        {activeTab === 'creative' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-100">
            {/* LOBBY NOTICE AND UTILITY ACTION BAR */}
            <div className="bg-slate-950 p-6 border border-slate-800 rounded-2xl space-y-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="text-fuchsia-500 w-5 h-5 animate-pulse" />
                  <h4 className="font-display font-semibold text-white text-base">St.Amour Game Generation Terminal</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Lobby terminal for modular standalone games. Explore public work, download compiled codebases, or prompt your own interactive generation experiment.
                </p>
              </div>

              {/* Make with IsaiahAI button launcher */}
              <button
                type="button"
                onClick={() => setShowGameGenerator(!showGameGenerator)}
                className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-fuchsia-500/20"
              >
                <Sparkles className="w-4 h-4 text-fuchsia-200 animate-pulse" />
                <span>{showGameGenerator ? 'Hide Generator' : 'Make with IsaiahAI'}</span>
              </button>
            </div>

            {/* COLLAPSIBLE CREATION DRAWER CARD */}
            {showGameGenerator && (
              <div className="bg-slate-950 p-5 border border-fuchsia-500/20 rounded-2xl space-y-4 animate-scale-up shadow-lg shadow-fuchsia-950/10">
                <div className="flex gap-2 items-center text-xs font-mono text-fuchsia-400 font-bold uppercase tracking-wide border-b border-slate-800 pb-3">
                  <Cpu className="w-4 h-4 text-fuchsia-500" />
                  <span>St.Amour compiler prompt interface</span>
                </div>

                {/* Presets suggestions */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest block uppercase">AI Preset Blueprints:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {creativePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCreativePrompt(preset)}
                        className={`p-2.5 rounded-lg border text-left text-xs text-slate-300 transition-colors ${
                          creativePrompt === preset 
                            ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-white' 
                            : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/80'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input prompt field */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <label className="text-[10px] text-slate-400 font-mono font-bold tracking-wider">SPECIFY COMPILER DIRECTIVES:</label>
                    <button
                      type="button"
                      onClick={() => setIsDeepThink(!isDeepThink)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono leading-none tracking-tight border transition-all flex items-center gap-1 cursor-pointer ${
                        isDeepThink 
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 font-bold shadow-sm shadow-fuchsia-950/20' 
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
                      }`}
                    >
                      <Lightbulb className={`w-3 h-3 ${isDeepThink ? 'text-fuchsia-400 animate-pulse' : 'text-slate-500'}`} />
                      <span>DeepThink {isDeepThink ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={creativePrompt}
                      onChange={(e) => setCreativePrompt(e.target.value)}
                      placeholder="E.g., Logic gate path finder with laser obstacles and coordinate trackers"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-fuchsia-500 transition-colors font-mono"
                    />
                    <button
                      onClick={handleGenerateCreativeGame}
                      disabled={creativeLoading || !creativePrompt.trim()}
                      className="px-5 py-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-slate-950 font-display font-bold text-xs tracking-tight rounded-xl disabled:opacity-55 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Synthesize Game</span>
                    </button>
                  </div>
                </div>

                {/* Status or error */}
                {creativeLoading && (
                  <div className="p-12 border border-dashed border-fuchsia-500/20 rounded-xl text-center space-y-4 bg-slate-900/30">
                    <div className="w-10 h-10 border-t-2 border-t-fuchsia-500 rounded-full animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-fuchsia-400 font-bold uppercase tracking-widest">Thinking...</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans max-w-sm mx-auto">
                        IsaiahAI is assembling structural HTML code blocks, writing dynamic responsive styles, creating Canvas animation modules, and compiling...
                      </p>
                    </div>
                  </div>
                )}

                {creativeError && (
                  <div className="p-4 border border-red-500/30 bg-red-950/20 text-red-300 rounded-xl text-xs font-mono">
                    Failed to compile: {creativeError}
                  </div>
                )}
              </div>
            )}

            {/* COLLABORATIVE PROJECTS WORKSPACE MODULES LIST */}
            {collabDrafts.length > 0 && (
              <div className="bg-slate-950 p-5 border border-indigo-500/20 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-3">
                  <span className="text-sm">👥</span>
                  <span>Real-time Collaborative drafts ({collabDrafts.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {collabDrafts.map((draft, i) => (
                    <div 
                      key={draft.id || i}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-slate-900/50 transition-all ${
                        activeCollabDraft?.id === draft.id ? 'border-indigo-500 bg-slate-900' : 'border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                          <span>Owner: {draft.ownerEmail}</span>
                          <span>{draft.allowedEmails?.length || 1} co-devs</span>
                        </div>
                        <h5 className="font-display font-semibold text-white text-xs tracking-tight">{draft.title}</h5>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{draft.tagline}</p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCollabDraft(draft);
                            setCreativeGame({
                              title: draft.title,
                              genre: draft.genre,
                              tagline: draft.tagline,
                              rules: draft.rules,
                              codeHtml: draft.codeHtml
                            });
                            setCollabStatus(`Workspace loaded: "${draft.title}"`);
                            setTimeout(() => {
                              document.getElementById('creative-game-anchor')?.scrollIntoView({ behavior: 'smooth' });
                            }, 150);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Open Workspace Frame
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEARCH AND GRID CATALOG DISPLAY ROW */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <input 
                  type="text"
                  placeholder="🔍 Search public catalog game modules..."
                  value={gamesSearchQuery}
                  onChange={(e) => setGamesSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-slate-700 min-w-[240px]"
                />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Showing {filteredGames.length} of {allAvailableGames.length} public modules
                </span>
              </div>

              {/* Catalog Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGames.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-mono">No matching game modules resolved.</p>
                  </div>
                ) : (
                  filteredGames.map((game, i) => (
                    <div 
                      key={i} 
                      className={`bg-slate-950 p-4 border rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-700 transition-all ${
                        creativeGame?.title === game.title ? 'border-fuchsia-500/40 bg-slate-950/80 shadow-md shadow-fuchsia-950/5 font-mono' : 'border-slate-800/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800 font-mono uppercase tracking-wider font-bold">
                            {game.genre || 'Arcade'}
                          </span>
                          {game.authorName && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              By: <b className="text-slate-400 font-semibold">{game.authorName}</b>
                            </span>
                          )}
                          {game.isUserLocal && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-950/30 text-indigo-300 rounded border border-indigo-900/40 font-mono uppercase tracking-wide">
                              My Library
                            </span>
                          )}
                        </div>
                        <h5 className="font-display font-semibold text-white text-sm tracking-tight leading-snug">
                          {game.title}
                        </h5>
                        <p className="text-xs text-slate-400 leading-normal line-clamp-2 font-sans">
                          {game.tagline}
                        </p>
                      </div>

                      <div className="flex gap-1.5 pt-1 border-t border-slate-850/30 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setCreativeGame(game);
                            setTimeout(() => {
                              document.getElementById('creative-game-anchor')?.scrollIntoView({ behavior: 'smooth' });
                            }, 150);
                          }}
                          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/25 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Play Game</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([game.codeHtml], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${game.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stamour.html`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-lg border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>HTML</span>
                        </button>

                        {game.isUserLocal && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFromLibrary(game.title)}
                            className="p-1 px-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ACTIVE SANDBOX COMPILER PREVIEW BOX */}
            <div id="creative-game-anchor" className="scroll-mt-4 pt-1">
              {creativeGame ? (
                <div className="space-y-4 animate-fade-in bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold block mb-1">{creativeGame.genre}</span>
                      <h5 className="font-display font-semibold text-white text-base leading-tight">{creativeGame.title}</h5>
                      <p className="text-xs italic text-slate-400 mt-1">{creativeGame.tagline || 'Retro accelerated physics loop'}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap text-mono">
                      <button
                        onClick={() => {
                          const blob = new Blob([creativeGame.codeHtml], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${creativeGame.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stamour.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Download game code as standalone HTML"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download HTML</span>
                      </button>

                      {!activeCollabDraft ? (
                        <button
                          onClick={handleSaveAsCollaborativeDraft}
                          className="px-3.5 py-2 bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-500/25 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Save this game as a shared cloud draft co-developers can edit together"
                        >
                          <span className="text-sm">👥</span>
                          <span>Start Collaboration</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-2 bg-indigo-950/30 text-indigo-400 border border-indigo-900/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Active Share Workroom</span>
                        </div>
                      )}

                      <button
                        onClick={handleSaveToLibrary}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Save to local library stash"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save to Library</span>
                      </button>

                      <button
                        onClick={() => handlePublishGame(creativeGame)}
                        disabled={publishLoading}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Publish code into our public database lobby"
                      >
                        {publishLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent animate-spin rounded-full block"></span>
                        ) : (
                          <Globe className="w-4 h-4 text-amber-500 animate-pulse animate-duration-[2000ms]" />
                        )}
                        <span>Publish Game to Cloud</span>
                      </button>
                    </div>
                  </div>

                  {/* Rules instructions */}
                  <div className="bg-slate-900/50 p-4 border border-slate-800/60 rounded-xl">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Gameplay instructions:</span>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1 font-mono">
                      {creativeGame.rules?.map((ruleCode: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{ruleCode}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Render inside secure sandboxed iframe */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-white shadow-xl h-[440px]">
                    <iframe
                      title={creativeGame.title}
                      id="creativeGameFrame"
                      srcDoc={creativeGame.codeHtml}
                      sandbox="allow-scripts allow-modals"
                      className="w-full h-full border-none block"
                    />
                  </div>

                  {/* CO-DEV COLLABORATIVE CONSOLE AND AI CO-PILOT PANEL */}
                  {activeCollabDraft && (
                    <div className="bg-slate-900 border border-indigo-500/20 p-5 rounded-xl space-y-4 animate-scale-up">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                        <div>
                          <h6 className="font-display font-medium text-white text-xs">👥 Collaborative Workroom Lobby</h6>
                          <p className="text-[10px] text-slate-400 font-mono">CODE: {activeCollabDraft.id}</p>
                        </div>
                        {collabStatus && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-1 rounded">
                            {collabStatus}
                          </span>
                        )}
                        <button 
                          onClick={() => {
                            setActiveCollabDraft(null);
                            setCollabStatus('');
                          }}
                          className="px-2.5 py-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-slate-800 rounded bg-slate-950 transition-colors"
                        >
                          Exit Workroom
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Allowed Co-Dev accounts */}
                        <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                          <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider font-bold block">Developer Access Control List:</span>
                          <div className="space-y-1 max-h-[88px] overflow-y-auto">
                            {activeCollabDraft.allowedEmails?.map((em: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                                <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                                <span>{em}</span>
                                {em === activeCollabDraft.ownerEmail && (
                                  <span className="text-[9px] text-cyan-400 px-1 border border-cyan-900/50 rounded scale-90">Host</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <input 
                              type="email"
                              value={collabInviteEmail}
                              onChange={(e) => setCollabInviteEmail(e.target.value)}
                              placeholder="co-dev@example.com"
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-left font-sans"
                            />
                            <button 
                              onClick={handleInviteCollaborator}
                              disabled={!collabInviteEmail.trim()}
                              className="px-3 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
                            >
                              Add Dev
                            </button>
                          </div>
                        </div>

                        {/* Co-Pilot Dialogue with IsaiahAI */}
                        <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider font-bold block mb-1">IsaiahAI Co-Pilot Comms:</span>
                            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                              {activeCollabDraft.copilotChat?.map((ch: any, idx: number) => (
                                <div key={idx} className="text-[11px] leading-relaxed font-sans text-slate-300">
                                  <b className={ch.role === 'ai' ? 'text-indigo-400' : 'text-fuchsia-400'}>
                                    {ch.sender || (ch.role === 'ai' ? 'IsaiahAI' : 'You')}:
                                  </b>{' '}
                                  <span>{ch.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <form onSubmit={handleCopilotEditPrompt} className="flex gap-1.5 pt-2 border-t border-slate-850/40">
                            <input 
                              type="text"
                              value={copilotText}
                              onChange={(e) => setCopilotText(e.target.value)}
                              placeholder={copilotLoading ? 'Re-compiling live HTML frames...' : 'Enter editing commands for IsaiahAI...'}
                              disabled={copilotLoading}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-left font-sans"
                            />
                            <button 
                              type="submit"
                              disabled={copilotLoading || !copilotText.trim()}
                              className="px-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-55 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0 flex items-center justify-center"
                            >
                              {copilotLoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span>Compile</span>
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 border border-dashed border-slate-800/80 rounded-2xl text-center bg-slate-950/40 text-slate-500">
                  <Play className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-mono">Select any public game above to play in the sandboxed viewport container.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
