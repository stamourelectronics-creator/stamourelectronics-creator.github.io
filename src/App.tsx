import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { GamesDashboard } from './components/GamesDashboard';
import { BrowserView } from './components/BrowserView';
import { BrandLogo } from './components/BrandLogo';
import { SlideCarousel } from './components/SlideCarousel';
import { FaceTimeVoiceModal } from './components/FaceTimeVoiceModal';
import { GmailComposeModal } from './components/GmailComposeModal';
import { ShareModal } from './components/ShareModal';
import { LocalFileWorkspaceModal } from './components/LocalFileWorkspaceModal';
import { InteractiveQuizCard, parseQuizFromText } from './components/InteractiveQuizCard';
import { SchoolDocSyncModal } from './components/SchoolDocSyncModal';
import { ChromeExtensionPrompt } from './components/ChromeExtensionPrompt';
import { generateIsaiahsiImage, isPuterSignedIn, signInPuter } from './lib/puterClient';
import { formatMathAndFractions, MATH_FRACTION_SYMBOLS, MATH_OPERATION_SYMBOLS } from './lib/mathFormatter';
import { pickLocalFile, pickLocalDirectory, readFileText, writeFileText, extractCodeBlockFromResponse, LocalFileItem, isFileSystemAccessSupported } from './lib/localWorkspace';
import MawAI from "./lib/MawAI";
import { RotatingWebIcon } from './components/RotatingWebIcon';
import { Sparkles, FileText, Send, Bot, CornerDownLeft, MessageSquare, Settings, Gamepad2, Info, ArrowUp, AlertCircle, HelpCircle, ExternalLink, Loader2, Wifi, Trash2, ShieldCheck, HelpCircle as HelpIcon, Mic, Paperclip, ChevronDown, Plus, Globe, Volume2, VolumeX, Menu, LogIn, LogOut, X, Layers, Copy, Check, Download, Edit3, Brain, Headphones, Ghost, ImageIcon, Camera, Mail, Share2, Zap, AudioLines, SlidersHorizontal, Crown, Code2, Rocket, HardDrive, CheckCircle2, GraduationCap, BookOpen } from 'lucide-react';
import { ChatSession, Message, UserSettings, SearchResultBox } from './types';
import { 
  auth, googleProvider, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged,
  db, doc, getDoc, setDoc, deleteDoc, getDocs, query, where, collection, onSnapshot
} from './firebase';


const PREVIOUS_VERSIONS = [
  { id: 'v1', name: 'Version 1 (Classic Core)', url: 'https://classic-isaiah-ai.netlify.app/', desc: 'Sleek terminal shell with essential text processing.', releasedAt: 'Q1' },
  { id: 'v3', name: 'Version 3 (Suite Index)', url: 'https://isaiah-ai-v3.netlify.app/', desc: 'Integrated DuckDuckGo indices and dynamic search pages.', releasedAt: 'Q2' },
  { id: 'v4', name: 'Version 4 (Cognitive)', url: 'https://isaiah-ai-v9.netlify.app/', desc: 'Advanced cognitive node, multimodality & smart layouts.', releasedAt: 'Q3' },
  { id: 'v5', name: 'Version 5 (Handheld v5)', url: 'https://isaiah-mobile.netlify.app/', desc: 'Responsive handheld viewport optimization.', releasedAt: 'Q4' }
];

function VersionsSandbox() {
  const [selectedVersion, setSelectedVersion] = useState(PREVIOUS_VERSIONS[1]); // Default to v3 as requested
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(Date.now());

  const selectVersion = (v: typeof PREVIOUS_VERSIONS[0]) => {
    setSelectedVersion(v);
    setLoading(true);
    setIframeKey(Date.now());
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 p-3 md:p-5 text-left select-none animate-fade-in">
      {/* Header with metadata and link to open outside the sandbox */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-amber-500" />
              <span>IsaiahAI Live Versions Sandbox</span>
            </h3>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Test previous generations and search architectures in live sandboxed iframes securely.</p>
          </div>
          <a
            href={selectedVersion.url}
            target="_blank"
            rel="noreferrer"
            className="self-start sm:self-auto px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            <span>Open standalone view</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Dynamic button switcher row */}
        <div className="flex overflow-x-auto whitespace-nowrap gap-2 pb-2 pt-1 scrollbar-none">
          {PREVIOUS_VERSIONS.map((v) => {
            const isSel = selectedVersion.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVersion(v)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isSel
                    ? 'bg-amber-500/10 border-amber-500/30 text-white shadow-xl'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/80'
                } cursor-pointer`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-amber-500' : 'bg-transparent'}`} />
                  <span className="font-bold text-xs text-zinc-100 leading-none">{v.name}</span>
                </div>
                <span className="text-[9.5px] text-zinc-500 leading-none block mt-1.5 max-w-[190px] truncate">{v.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden relative shadow-2xl">
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center space-y-3 z-10">
            <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-[9.5px] font-mono font-bold tracking-widest text-amber-500 uppercase">Routing Traffic to Legacy Netlify Gateway...</span>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={selectedVersion.url}
          className="w-full h-full border-0 absolute inset-0"
          allow="camera; microphone; geolocation"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}

export default function App() {
  // ==========================================
  // STATE DEFINITIONS
  // ==========================================
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'chat' | 'games' | 'versions' | 'browser'>('browser');
  // Web search is automatic for ordinary chat; no toggle is needed.
  const searchWebEnabled = true;
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageIsPro, setImageIsPro] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Mobile environment detection
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMobilePlusMenu, setShowMobilePlusMenu] = useState<boolean>(false);
  const [mobileSlidersMenuOpen, setMobileSlidersMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('search');
    if (q) {
      setActiveView('browser');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isWindowMobile = window.innerWidth < 768;
      setIsMobile(isWindowMobile);
      if (isWindowMobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
  });
  const [usernameSetupRequired, setUsernameSetupRequired] = useState<boolean>(false);
  const [chosenUsernameText, setChosenUsernameText] = useState<string>('');

  // Credentials Auth Form States
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    if (auth) {
      let profileUnsubscribe: () => void = () => {};
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        profileUnsubscribe(); // Cleanup stale subscribers
        if (user) {
          setCurrentUser(user);
          try {
            const profileRef = doc(db, 'user_profiles', user.uid);
            profileUnsubscribe = onSnapshot(profileRef, async (profileSnap) => {
              const autoName = user.displayName?.trim() || user.email?.split('@')[0] || `User_${user.uid.slice(0, 5)}`;
              const sanitizedName = autoName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'IsaiahUser';

              if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (profileData && profileData.username) {
                  setSettings(prev => {
                    const cloudSettings = profileData.settings || {};
                    const updated = { 
                      ...prev, 
                      userNickname: profileData.username,
                      theme: cloudSettings.theme || prev.theme,
                      fontSize: cloudSettings.fontSize || prev.fontSize,
                      bubbleStyle: cloudSettings.bubbleStyle || prev.bubbleStyle,
                      userAvatarSymbol: cloudSettings.userAvatarSymbol || prev.userAvatarSymbol,
                      aiAvatarSymbol: cloudSettings.aiAvatarSymbol || prev.aiAvatarSymbol,
                      driveClearMatchingRule: cloudSettings.driveClearMatchingRule || prev.driveClearMatchingRule || 'name_size',
                      driveClearKeepPreference: cloudSettings.driveClearKeepPreference || prev.driveClearKeepPreference || 'oldest'
                    };
                    localStorage.setItem('isaiah_settings', JSON.stringify(updated));
                    return updated;
                  });
                }
              } else {
                try {
                  await setDoc(profileRef, {
                    userId: user.uid,
                    username: sanitizedName,
                    createdAt: new Date().toISOString()
                  }, { merge: true });
                } catch (e) {
                  console.error("Auto profile name write failed:", e);
                }
              }
              setUsernameSetupRequired(false);
              await loadCloudSessions(user.uid);
            }, (err) => {
              console.error("Profile onSnapshot failed:", err);
              setUsernameSetupRequired(false);
              loadCloudSessions(user.uid);
            });
          } catch (err) {
            console.error("Cloud profile error:", err);
            setUsernameSetupRequired(false);
            loadCloudSessions(user.uid);
          }
        } else {
          // Auto-login user to Firebase anonymously on app boot so their stuff auto loads!
          console.log("[Firebase] Auto logging in user to load cloud sessions...");
          signInAnonymously(auth).catch((err) => {
            console.warn("[Firebase] Auto login fallback to local storage:", err);
            setCurrentUser(null);
            setUsernameSetupRequired(false);
            setSettings(prev => {
              const updated = { ...prev, userNickname: 'Guest' };
              localStorage.setItem('isaiah_settings', JSON.stringify(updated));
              return updated;
            });
            const savedSessions = localStorage.getItem('isaiah_sessions');
            if (savedSessions) {
              try {
                const parsed = JSON.parse(savedSessions);
                setSessions(parsed);
                if (parsed.length > 0) {
                  setActiveSessionId(parsed[0].id);
                }
              } catch (e) {
                console.error(e);
              }
            } else {
              createDefaultOnboardingSession();
            }
          });
        }
      });
      return () => {
        unsubscribeAuth();
        profileUnsubscribe();
      };
    }
  }, []);

  const loadCloudSessions = async (userId: string) => {
    if (!db) return;
    try {
      const chatsRef = collection(db, 'user_chats');
      const q = query(chatsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const fetchedSessions: ChatSession[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        fetchedSessions.push({
          id: data.id,
          title: data.title,
          messages: data.messages || [],
          updatedAt: data.updatedAt
        });
      });
      fetchedSessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      if (fetchedSessions.length > 0) {
        setSessions(fetchedSessions);
        setActiveSessionId(fetchedSessions[0].id);
      } else {
        createDefaultOnboardingSession(userId);
      }
    } catch (err) {
      console.error("Error loading sessions from Firestore:", err);
    }
  };

  const createDefaultOnboardingSession = (userId?: string) => {
    const welcomeId = 'welcome-session';
    const defaultSession: ChatSession = {
      id: welcomeId,
      title: 'Welcome to IsaiahAI',
      messages: [], // keeps it empty so "Where should we begin?" is shown!
      updatedAt: new Date().toISOString(),
    };
    setSessions([defaultSession]);
    setActiveSessionId(welcomeId);
    if (userId && db) {
      syncSessionToCloud(defaultSession);
    } else {
      localStorage.setItem('isaiah_sessions', JSON.stringify([defaultSession]));
    }
  };

  const syncSessionToCloud = async (session: ChatSession) => {
    if (!currentUser || !db) return;
    try {
      const chatRef = doc(db, 'user_chats', session.id);
      await setDoc(chatRef, {
        userId: currentUser.uid,
        id: session.id,
        title: session.title,
        messages: session.messages,
        category: session.category || 'Other',
        updatedAt: session.updatedAt || new Date().toISOString()
      });
    } catch (err) {
      console.error("Cloud chat sync failed:", err);
    }
  };

  const handleSaveUserProfile = async (chosenName: string) => {
    if (!chosenName.trim()) return;
    try {
      if (db && currentUser) {
        const profileRef = doc(db, 'user_profiles', currentUser.uid);
        await setDoc(profileRef, {
          userId: currentUser.uid,
          username: chosenName.trim(),
          createdAt: new Date().toISOString()
        }, { merge: true });
        
        // After setting profile nickname, query/load any cloud sessions
        await loadCloudSessions(currentUser.uid).catch(e => console.warn("Cloud load bypassed:", e));
      }
    } catch (err) {
      console.warn("Cloud write failed during alias registration, saving locally:", err);
    }

    // Always unblock the user by applying changes to local state
    setSettings(prev => {
      const updated = { ...prev, userNickname: chosenName.trim() };
      localStorage.setItem('isaiah_settings', JSON.stringify(updated));
      return updated;
    });
    setUsernameSetupRequired(false);
  };

  const handleGoogleSignIn = async (): Promise<string | null> => {
    if (!auth) {
      console.warn("Firebase is not fully configured.");
      return null;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const token = credential.accessToken;
        setGoogleAccessToken(token);
        sessionStorage.setItem('google_access_token', token);
        localStorage.setItem('google_access_token', token);
        return token;
      }
    } catch (err: any) {
      console.warn("Google sign-in abort:", err);
    }
    return null;
  };

  const handleGoogleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCurrentUser(null);
      setGoogleAccessToken(null);
      sessionStorage.removeItem('google_access_token');
      localStorage.removeItem('google_access_token');
    } catch (err) {
      console.error("Sign-out fail:", err);
    }
  };
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light_glass',
    fontSize: 'md',
    bubbleStyle: 'minimal',
    userAvatarSymbol: '👤',
    aiAvatarSymbol: '⚡',
    userNickname: 'Guest',
    driveClearMatchingRule: 'name_size',
    driveClearKeepPreference: 'oldest',
  });

  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentSearchPrompt, setCurrentSearchPrompt] = useState<string | null>(null);
  const [gameGenPrompt, setGameGenPrompt] = useState<string>('');

  // Siri Integration & Top-of-Screen Speech States
  const [showSiriModal, setShowSiriModal] = useState<boolean>(false);
  const [siriShortcutAdded, setSiriShortcutAdded] = useState<boolean>(() => {
    return localStorage.getItem('isaiahai_siri_added') === 'true';
  });
  const [siriActive, setSiriActive] = useState<boolean>(false);
  const [siriSpeechText, setSiriSpeechText] = useState<string>('');
  const [siriResponseText, setSiriResponseText] = useState<string>('');
  const [siriSpeaking, setSiriSpeaking] = useState<boolean>(false);

  // Selected AI Model (IsaiahAI 7.0 SUPER, Isaiah AI 5.3, Isaiah Max 6.0, or Maw AI)
  const [selectedAiModel, setSelectedAiModel] = useState<'isaiah_5_3' | 'isaiah_max_6_0' | 'maw_ai' | 'isaiahai_7_super'>(() => {
    // One-time upgrade: make IsaiahAI 7.0 SUPER the default without overwriting later user choices.
    if (localStorage.getItem('isaiah_model_default_version') !== '7.0-super') {
      localStorage.setItem('isaiah_selected_model', 'isaiahai_7_super');
      localStorage.setItem('isaiah_model_default_version', '7.0-super');
      return 'isaiahai_7_super';
    }
    return (localStorage.getItem('isaiah_selected_model') as 'isaiah_5_3' | 'isaiah_max_6_0' | 'maw_ai' | 'isaiahai_7_super') || 'isaiahai_7_super';
  });
  const [isSearchingWebActive, setIsSearchingWebActive] = useState<boolean>(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');

  // Chat/Image/School Selected Mode Dropdown state
  const [chatMode, setChatMode] = useState<'general' | 'image' | 'code' | 'code_extended' | 'school'>('general');
  const [chatModeDropdownOpen, setChatModeDropdownOpen] = useState<boolean>(false);
  const [mobileVersionDropdownOpen, setMobileVersionDropdownOpen] = useState<boolean>(false);

  // School Mode Google Docs Workbench & Sync State
  const [schoolDocModalOpen, setSchoolDocModalOpen] = useState<boolean>(false);
  const [schoolDocTitle, setSchoolDocTitle] = useState<string>('');
  const [schoolDocContent, setSchoolDocContent] = useState<string>('');
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [syncedDocUrls, setSyncedDocUrls] = useState<Record<string, string>>({});

  // Helper to directly sync document to Google Docs via OAuth token
  const handleDirectGoogleDocsSync = async (title: string, content: string): Promise<{ success: boolean; docUrl?: string; error?: string }> => {
    let token = googleAccessToken || sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
    if (!token) {
      try {
        if (!auth) throw new Error("Firebase Auth initializing");
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          token = credential.accessToken;
          setGoogleAccessToken(token);
          sessionStorage.setItem('google_access_token', token);
          localStorage.setItem('google_access_token', token);
        }
      } catch (authErr: any) {
        console.warn("[Google Docs Direct Sync] Popup auth failed or dismissed:", authErr);
      }
    }

    if (!token) {
      // Open SchoolDocSyncModal so student can connect or use 1-Click Paste
      setSchoolDocTitle(title);
      setSchoolDocContent(formatMathAndFractions(content));
      setSchoolDocModalOpen(true);
      return { success: false, error: 'Google sign-in required to authorize Drive' };
    }

    try {
      let createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title || 'IsaiahAI Study Guide' })
      });

      if (!createRes.ok && (createRes.status === 401 || createRes.status === 403)) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            token = credential.accessToken;
            setGoogleAccessToken(token);
            sessionStorage.setItem('google_access_token', token);
            localStorage.setItem('google_access_token', token);
            createRes = await fetch('https://docs.googleapis.com/v1/documents', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ title: title || 'IsaiahAI Study Guide' })
            });
          }
        } catch (e) {}
      }

      if (!createRes.ok) {
        throw new Error(`Google Docs API (${createRes.status}): ${createRes.statusText}`);
      }

      const docData = await createRes.json();
      const documentId = docData.documentId;

      const cleanText = formatMathAndFractions(content.replace(/[#*`_]/g, ''));
      const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const fullBody = `${title}\nIsaiahAI Acceleration · ${dateStr}\n\n${cleanText}\n\nGenerated with Isaiahsi & St.Amour Educational Systems.\n`;

      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            insertText: {
              location: { index: 1 },
              text: fullBody
            }
          }]
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Google Docs batchUpdate error: ${updateRes.statusText}`);
      }

      const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      return { success: true, docUrl };
    } catch (err: any) {
      console.error('[Google Docs Direct Sync failed]:', err);
      setSchoolDocTitle(title);
      setSchoolDocContent(formatMathAndFractions(content));
      setSchoolDocModalOpen(true);
      return { success: false, error: err.message };
    }
  };

  // Computer Local Workspace & File Access State for Code PR
  const [localWorkspaceModalOpen, setLocalWorkspaceModalOpen] = useState<boolean>(false);
  const [localWorkspaceFiles, setLocalWorkspaceFiles] = useState<LocalFileItem[]>([]);
  const [selectedLocalFile, setSelectedLocalFile] = useState<LocalFileItem | null>(null);
  const [localDirName, setLocalDirName] = useState<string | null>(null);
  const [localWorkspaceConnected, setLocalWorkspaceConnected] = useState<boolean>(false);
  const [localFileNotice, setLocalFileNotice] = useState<string | null>(null);
  const localFileHandleRef = useRef<any>(null);
  const localDirHandleRef = useRef<any>(null);

  const handleConnectLocalFile = async () => {
    try {
      const res = await pickLocalFile();
      localFileHandleRef.current = res.handle;
      localDirHandleRef.current = null;
      setLocalDirName(null);
      const fileItem: LocalFileItem = {
        name: res.name,
        path: res.name,
        size: res.content.length,
        type: 'text/html',
        handle: res.handle,
      };
      setLocalWorkspaceFiles([fileItem]);
      setSelectedLocalFile(fileItem);
      setLocalWorkspaceConnected(true);
      setLocalFileNotice(`Connected local file: ${res.name}. Code PR will auto-read and edit it directly on your computer.`);
      setTimeout(() => setLocalFileNotice(null), 6000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLocalFileNotice('File connection notice: ' + (err.message || 'Could not access file.'));
      }
    }
  };

  const handleConnectLocalFolder = async () => {
    try {
      const res = await pickLocalDirectory();
      localDirHandleRef.current = res.dirHandle;
      setLocalDirName(res.dirName);
      setLocalWorkspaceFiles(res.files);
      if (res.primaryHtml) {
        setSelectedLocalFile(res.primaryHtml);
        localFileHandleRef.current = res.primaryHtml.handle;
      } else if (res.files.length > 0) {
        setSelectedLocalFile(res.files[0]);
        localFileHandleRef.current = res.files[0].handle;
      }
      setLocalWorkspaceConnected(true);
      setLocalFileNotice(`Connected local folder "${res.dirName}" (${res.files.length} files). Primary HTML auto-selected.`);
      setTimeout(() => setLocalFileNotice(null), 6000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLocalFileNotice('Folder connection notice: ' + (err.message || 'Could not access folder.'));
      }
    }
  };

  const handleDisconnectLocalWorkspace = () => {
    localFileHandleRef.current = null;
    localDirHandleRef.current = null;
    setLocalWorkspaceFiles([]);
    setSelectedLocalFile(null);
    setLocalDirName(null);
    setLocalWorkspaceConnected(false);
    setLocalFileNotice('Disconnected computer file access.');
    setTimeout(() => setLocalFileNotice(null), 3000);
  };

  const handleUpdateLocalFileContent = async (file: LocalFileItem, newContent: string): Promise<boolean> => {
    if (!file || !file.handle) return false;
    await writeFileText(file.handle, newContent);
    setLocalFileNotice(`Saved changes to ${file.name} on your computer.`);
    setTimeout(() => setLocalFileNotice(null), 3000);
    return true;
  };

  // Gmail Dispatcher Modal State
  const [gmailModalOpen, setGmailModalOpen] = useState<boolean>(false);
  const [gmailModalSubject, setGmailModalSubject] = useState<string>('');
  const [gmailModalBody, setGmailModalBody] = useState<string>('');

  // Share Conversation Modal State
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [puterConnected, setPuterConnected] = useState<boolean>(() => isPuterSignedIn());

  const handleConnectPuter = async () => {
    try {
      await signInPuter();
      setPuterConnected(true);
      setShareNotice('Puter AI is connected. Regular chat can use it as a fallback when the hosted AI service is unavailable. Your Puter account policies still apply.');
    } catch (error: any) {
      setShareNotice('Puter connection did not complete: ' + String(error?.message || 'Please try again.'));
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Vision & Multimodal state
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ data: string; name: string; mimeType: string }[]>([]);
  
  // Mic & Speech Dictation state
  const [isListening, setIsListening] = useState<boolean>(false);
  const mawAIRef = useRef<MawAI>(new MawAI());
  const recognitionRef = useRef<any>(null);

  // Voice readback engine and state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);

  // Live Audio Streaming States
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [liveStatus, setLiveStatus] = useState<string>('Offline');
  const [liveVolume, setLiveVolume] = useState<number>(0);

  const liveWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputNodeRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const startLiveVoiceSession = async () => {
    try {
      setLiveStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 }
      });
      micStreamRef.current = stream;

      setLiveStatus('Connecting to vocal grid...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = actx;
      nextPlayTimeRef.current = actx.currentTime;

      ws.onopen = () => {
        setLiveStatus('Connected & active');
        setIsLiveActive(true);

        const source = actx.createMediaStreamSource(stream);
        const processor = actx.createScriptProcessor(4096, 1, 1);
        audioInputNodeRef.current = processor;

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setLiveVolume(Math.min(100, Math.round(rms * 250)));

          const buffer = new ArrayBuffer(inputData.length * 2);
          const view = new DataView(buffer);
          let offset = 0;
          for (let i = 0; i < inputData.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }

          const base64Audio = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };

        source.connect(processor);
        processor.connect(actx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setLiveStatus(`Error: ${msg.error}`);
            return;
          }
          if (msg.interrupted) {
            nextPlayTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : 0;
            return;
          }
          if (msg.audio) {
            const raw = atob(msg.audio);
            const rawLength = raw.length;
            const arrayBuffer = new ArrayBuffer(rawLength);
            const uint8 = new Uint8Array(arrayBuffer);
            for (let i = 0; i < rawLength; i++) {
              uint8[i] = raw.charCodeAt(i);
            }

            const view = new DataView(arrayBuffer);
            const length = arrayBuffer.byteLength / 2;
            const floatSamples = new Float32Array(length);
            let offset = 0;
            for (let i = 0; i < length; i++, offset += 2) {
              const s = view.getInt16(offset, true);
              floatSamples[i] = s / 32768;
            }

            if (audioContextRef.current) {
              const audioBuffer = audioContextRef.current.createBuffer(1, floatSamples.length, 24000);
              audioBuffer.copyToChannel(floatSamples, 0);
              const sourceNode = audioContextRef.current.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(audioContextRef.current.destination);
              
              const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
              sourceNode.start(startTime);
              nextPlayTimeRef.current = startTime + audioBuffer.duration;
            }
          }
        } catch (e) {
          console.error('[Live Audio WS OnMessage Error]:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[Live Audio WS Error]:', err);
        setLiveStatus('Grid error occurred.');
      };

      ws.onclose = () => {
        setLiveStatus('Session terminated safely');
        stopLiveVoiceSession();
      };

    } catch (error: any) {
      console.error('[Live Audio Activation Error]:', error);
      setLiveStatus(`Activation failed: ${error.message || 'Check mic block'}`);
      stopLiveVoiceSession();
    }
  };

  const stopLiveVoiceSession = () => {
    setIsLiveActive(false);
    setLiveStatus('Offline');
    setLiveVolume(0);

    if (audioInputNodeRef.current) {
      try { audioInputNodeRef.current.disconnect(); } catch (e) {}
      audioInputNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      micStreamRef.current = null;
    }
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch (e) {}
      liveWsRef.current = null;
    }
  };

  const handleOpenGmailModal = (content: string) => {
    let subject = 'Email Draft from Isaiah AI';
    let body = content;

    const subjectMatch = content.match(/Subject:\s*(.*)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = content.replace(/Subject:\s*.*\n?/i, '').trim();
    }

    setGmailModalSubject(subject);
    setGmailModalBody(body);
    setGmailModalOpen(true);
  };

  const handleShareActiveSession = async () => {
    if (!activeSession) return;
    try {
      // Determine share ID: keep existing if already shared or assign unique room ID
      const shareId = activeSession.id.startsWith('shared_')
        ? activeSession.id
        : `shared_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const title = activeSession.title || 'IsaiahAI Conversation';
      const messages = activeSession.messages || [];
      const updatedAt = new Date().toISOString();

      if (db) {
        await setDoc(doc(db, 'shared_chats', shareId), {
          id: shareId,
          title,
          messages,
          updatedAt
        }, { merge: true });
      }

      // Convert current active session to this share ID so the local user is also in the live room
      if (activeSession.id !== shareId) {
        setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, id: shareId } : s));
        setActiveSessionId(shareId);
      }

      const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
      setShareUrl(url);
      setShareModalOpen(true);

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to generate live share room:", err);
    }
  };

  // Parse incoming share URL parameter on load and initialize live session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) {
      // Check if it's a Firestore share document ID
      if (shareParam.startsWith('shared_')) {
        const sharedSessionId = shareParam;
        const initialSession: ChatSession = {
          id: sharedSessionId,
          title: 'Live Shared Conversation',
          messages: [],
          updatedAt: new Date().toISOString(),
        };

        setSessions(prev => [initialSession, ...prev.filter(s => s.id !== sharedSessionId)]);
        setActiveSessionId(sharedSessionId);
        setActiveView('chat');
        setShareNotice(`Connected to live shared conversation room`);

        // Clean query param from URL bar
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        // Fallback for base64 encoded payloads
        try {
          const decodedJson = decodeURIComponent(escape(atob(shareParam)));
          const parsedData = JSON.parse(decodedJson);

          if (parsedData && Array.isArray(parsedData.messages)) {
            const sharedSessionId = `shared_${Date.now()}`;
            const newSharedSession: ChatSession = {
              id: sharedSessionId,
              title: `[Shared] ${parsedData.title || 'Conversation Log'}`,
              messages: parsedData.messages,
              updatedAt: new Date().toISOString(),
            };

            setSessions(prev => [newSharedSession, ...prev.filter(s => s.id !== sharedSessionId)]);
            setActiveSessionId(sharedSessionId);
            setActiveView('chat');
            setShareNotice(`Loaded shared conversation: "${parsedData.title || 'Shared Chat'}"`);

            // Also upload to Firestore shared_chats for real-time multiplayer
            if (db) {
              setDoc(doc(db, 'shared_chats', sharedSessionId), {
                id: sharedSessionId,
                title: newSharedSession.title,
                messages: newSharedSession.messages,
                updatedAt: newSharedSession.updatedAt
              }, { merge: true }).catch(console.warn);
            }

            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        } catch (err) {
          console.error("Failed to parse shared URL parameter:", err);
        }
      }
    }
  }, []);

  // Real-time Firestore onSnapshot listener for any active shared session
  useEffect(() => {
    if (!activeSessionId || !activeSessionId.startsWith('shared_') || !db) return;

    const shareDocRef = doc(db, 'shared_chats', activeSessionId);
    const unsubscribe = onSnapshot(shareDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.messages)) {
          setSessions(prev => {
            const existing = prev.find(s => s.id === activeSessionId);
            if (existing) {
              if (JSON.stringify(existing.messages) !== JSON.stringify(data.messages)) {
                return prev.map(s => s.id === activeSessionId ? {
                  ...s,
                  title: data.title || s.title,
                  messages: data.messages,
                  updatedAt: data.updatedAt || s.updatedAt
                } : s);
              }
              return prev;
            } else {
              const newSession: ChatSession = {
                id: activeSessionId,
                title: data.title || 'Live Shared Chat',
                messages: data.messages,
                updatedAt: data.updatedAt || new Date().toISOString()
              };
              return [newSession, ...prev];
            }
          });
        }
      }
    }, (err) => {
      console.warn("[Firebase] Shared chat real-time listener notice:", err);
    });

    return () => unsubscribe();
  }, [activeSessionId]);

  // Cancel any ongoing vocal synthesizing and collapse sidebar when switching views or sessions
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSidebarOpen(false);
  }, [activeView, activeSessionId]);

  const speakText = (text: string) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel(); // Cancel preceding utterances

      // Sanitize Markdown
      let cleaned = text
        .replace(/[*#`_\-]/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/(\r\n|\n|\r)/gm, ' ');

      if (cleaned.length > 500) {
        cleaned = cleaned.slice(0, 497) + '...';
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voices = window.speechSynthesis.getVoices();
      
      // Look for a prominent masculine English voice
      const maleVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        return (v.lang.startsWith('en-US') || v.lang.startsWith('en') || v.lang.startsWith('en-GB')) && (
          name.includes('male') || 
          name.includes('david') || 
          name.includes('mark') || 
          name.includes('george') || 
          name.includes('guy') || 
          name.includes('brian') || 
          name.includes('ryan') ||
          name.includes('puck') ||
          name.includes('charon')
        );
      });

      const preferred = maleVoice || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.02; // Standard male rate
      utterance.pitch = 0.85; // Lower the pitch slightly to sound deeper and more masculine
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS speech synthesis failure:', e);
    }
  };

  const handleSimulateSiriRequest = async (promptText: string) => {
    if (!promptText.trim()) return;
    setSiriActive(true);
    setSiriSpeaking(false);
    setSiriSpeechText(promptText);
    setSiriResponseText('IsaiahAI: Searching live web index...');
    
    try {
      const response = await fetch('/api/siri-search-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: promptText, siri: true })
      });
      
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
        const data = await response.json();

      const answer = data.text || "I have processed your IsaiahAI request.";
      setSiriResponseText(answer);
      setSiriSpeaking(true);
      
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(answer);
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
        if (preferred) utterance.voice = preferred;
        utterance.rate = 1.0;
        utterance.onend = () => {
          setSiriSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setSiriResponseText("Sorry, I could not complete that shortcut request. Please check your connectivity.");
    }
  };

  // Convert uploaded image file to standard base64 data URI
  const convertFileToBase64 = (file: File): Promise<{ data: string; name: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve({
          data: reader.result as string,
          name: file.name,
          mimeType: file.type || 'image/png',
        });
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Configure Web Speech API Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInputText((prev) => prev + (prev ? ' ' : '') + transcript);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleMicToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShareNotice("Voice recognition not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const items: { data: string; name: string; mimeType: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const base64Obj = await convertFileToBase64(files[i]);
        items.push(base64Obj);
      } catch (err) {
        console.error(err);
      }
    }
    setUploadedImages((prev) => [...prev, ...items]);
    if (e.target) e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // INITIAL LOAD & SYSTEM MESSAGES
  // ==========================================
  useEffect(() => {
    // Load User Settings
    const savedSettings = localStorage.getItem('isaiah_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.userNickname === 'St.Amour Guest') {
          parsed.userNickname = 'Guest';
        }
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  // Save Sessions State Helper
  const saveSessionsToCache = (updated: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setSessions(prev => {
      const newSessions = typeof updated === 'function' ? updated(prev) : updated;
      // Always save to local device storage
      try {
        localStorage.setItem('isaiah_sessions', JSON.stringify(newSessions));
      } catch (err) {
        console.error("Failed to write sessions to localStorage:", err);
      }
      // Sync to cloud storage and real-time live shared channels
      if (db) {
        newSessions.forEach(session => {
          if (session.id.startsWith('shared_')) {
            setDoc(doc(db, 'shared_chats', session.id), {
              id: session.id,
              title: session.title,
              messages: session.messages,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(e => console.warn("Live shared chat sync write error:", e));
          } else if (currentUser) {
            syncSessionToCloud(session);
          }
        });
      }
      return newSessions;
    });
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('isaiah_settings', JSON.stringify(newSettings));
    if (currentUser && db) {
      try {
        const profileRef = doc(db, 'user_profiles', currentUser.uid);
        await setDoc(profileRef, {
          userId: currentUser.uid,
          username: newSettings.userNickname,
          settings: {
            theme: newSettings.theme,
            fontSize: newSettings.fontSize,
            bubbleStyle: newSettings.bubbleStyle,
            userAvatarSymbol: newSettings.userAvatarSymbol,
            aiAvatarSymbol: newSettings.aiAvatarSymbol,
            driveClearMatchingRule: newSettings.driveClearMatchingRule || 'name_size',
            driveClearKeepPreference: newSettings.driveClearKeepPreference || 'oldest'
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to back up user settings to cloud document:", err);
      }
    }
  };

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isGenerating, activeView]);

  // ==========================================
  // SIDEBAR SESSION CALL CONTROLLERS
  // ==========================================
  const handleCreateSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation log',
      messages: [],
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSession, ...sessions];
    saveSessionsToCache(updated);
    setActiveSessionId(newId);
  };

  const handleSelectSession = (id: string | null) => {
    setActiveSessionId(id);
  };

  const handleRenameSession = (id: string, title: string) => {
    const updated = sessions.map(ses => {
      if (ses.id === id) {
        return { ...ses, title, updatedAt: new Date().toISOString() };
      }
      return ses;
    });
    saveSessionsToCache(updated);
  };

  const handleSetSessionCategory = (id: string, category: 'Work' | 'Personal' | 'Coding' | 'Other') => {
    const updated = sessions.map(ses => {
      if (ses.id === id) {
        return { ...ses, category, updatedAt: new Date().toISOString() };
      }
      return ses;
    });
    saveSessionsToCache(updated);
  };

  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter(ses => ses.id !== id);
    setSessions(filtered);
    if (currentUser && db) {
      deleteDoc(doc(db, 'user_chats', id)).catch(err => console.error("Cloud chat delete failed:", err));
    } else {
      localStorage.setItem('isaiah_sessions', JSON.stringify(filtered));
    }

    if (activeSessionId === id) {
      if (filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      } else {
        setActiveSessionId(null);
      }
    }
  };

  // ==========================================
  // BACKUP / RESTORE MECHANICS (Pass Over Devices)
  // ==========================================
  const handleImportSessions = (imported: ChatSession[], importedGames?: any[]) => {
    const merged = [...imported, ...sessions];
    // De-duplicate by ID
    const uniqueMap = new Map<string, ChatSession>();
    merged.forEach(s => uniqueMap.set(s.id, s));
    const uniqueList = Array.from(uniqueMap.values());
    
    saveSessionsToCache(uniqueList);
    if (uniqueList.length > 0) {
      setActiveSessionId(uniqueList[0].id);
    }

    if (importedGames && Array.isArray(importedGames)) {
      const existingRaw = localStorage.getItem('isaiah_saved_games') || '[]';
      let existing = [];
      try {
        existing = JSON.parse(existingRaw);
      } catch (e) {}

      const combinedGames = [...importedGames, ...existing];
      const uniqueGamesPayload = new Map<string, any>();
      combinedGames.forEach(g => {
        if (g && (g.id || g.title)) {
          uniqueGamesPayload.set(g.id || g.title, g);
        }
      });
      localStorage.setItem('isaiah_saved_games', JSON.stringify(Array.from(uniqueGamesPayload.values())));
    }
  };

  const handleExportSessions = () => {
    const rawGames = localStorage.getItem('isaiah_saved_games') || '[]';
    let gamesList = [];
    try {
      gamesList = JSON.parse(rawGames);
    } catch (e) {}

    const combinedPayload = {
      type: 'isaiah_ai_combined_backup',
      sessions: sessions,
      savedGames: gamesList,
      exportVersion: 1
    };

    const dataStr = JSON.stringify(combinedPayload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isaiahai-backup-stamour-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // MESSAGING CORE LOGIC
  // ==========================================
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    let targetSessionId = activeSessionId;
    let targetSession = activeSession;
    let currentSessions = [...sessions];

    const rawPrompt = inputText.trim();
    const currentUploaded = [...uploadedImages];

    // Create session if none exists
    if (!targetSessionId || !targetSession) {
      const newId = `session-${Date.now()}`;
      targetSession = {
        id: newId,
        title: rawPrompt.slice(0, 30),
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setActiveSessionId(newId);
      targetSessionId = newId;
    }
    
    // Stop listening on message send
    if (isListening) {
      recognitionRef.current?.stop();
    }

    setInputText('');
    setUploadedImages([]); // Clear preview list
    setIsGenerating(true);

    const activeModelKey = chatMode !== 'general' ? chatMode : selectedAiModel;
    const activeModelDisplayName = chatMode === 'school' ? 'IsaiahAI School Mode'
      : chatMode === 'code' ? 'Isaiah AI Code PR'
      : chatMode === 'code_extended' ? 'Code PR Extended'
      : chatMode === 'image' ? 'Isaiah AI Image Gen'
      : selectedAiModel === 'isaiah_5_3' ? 'Isaiah AI 5.3'
      : selectedAiModel === 'maw_ai' ? 'Maw AI'
      : selectedAiModel === 'isaiahai_7_super' ? 'IsaiahAI 7.0 SUPER'
      : 'Isaiah Max 6.0';

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: rawPrompt,
      attachments: currentUploaded.map(file => ({
        name: file.name,
        data: file.data,
        mimeType: file.mimeType,
      })),
      images: currentUploaded.filter(file => file.mimeType.startsWith('image/')).map(img => img.data), // Pass base64 data URIs
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update session state with user message
    let workingMessages = [...targetSession.messages, userMsg];
    let updatedSession = {
      ...targetSession,
      messages: workingMessages,
      title: targetSession.messages.length === 0 ? rawPrompt.slice(0, 30) : targetSession.title,
      updatedAt: new Date().toISOString(),
    };

    saveSessionsToCache(prev => {
      const exists = prev.some(s => s.id === targetSessionId);
      if (exists) {
        return prev.map(s => s.id === targetSessionId ? updatedSession : s);
      } else {
        return [updatedSession, ...prev];
      }
    });

    // Prefix & natural language commands parsing
    const lowerPrompt = rawPrompt.toLowerCase().trim();
    const isWPrefix = rawPrompt.toLowerCase().startsWith('w!') || lowerPrompt.startsWith('wikipedia ') || lowerPrompt.startsWith('wiki ') || lowerPrompt === 'wikipedia' || lowerPrompt === 'wiki';
    const isDPrefix = rawPrompt.toLowerCase().startsWith('d!') || lowerPrompt.startsWith('duckduckgo ') || lowerPrompt.startsWith('duckduck go ') || lowerPrompt === 'duckduckgo' || lowerPrompt === 'duckduck go';
    
    // Natural Image Generation Request detection
    const isNaturalImageQuery = lowerPrompt.startsWith('make me an image of') || 
                                lowerPrompt.startsWith('generate an image of') || 
                                lowerPrompt.startsWith('create an image of') || 
                                lowerPrompt.startsWith('draw an image of') ||
                                lowerPrompt.startsWith('show an image of') ||
                                lowerPrompt.startsWith('make an image of') ||
                                lowerPrompt.startsWith('generate image ') ||
                                lowerPrompt.startsWith('generate an image ') ||
                                lowerPrompt.startsWith('create image ') ||
                                lowerPrompt.startsWith('draw a ') ||
                                lowerPrompt.startsWith('draw an ') ||
                                lowerPrompt.startsWith('picture of ') ||
                                lowerPrompt.startsWith('photo of ') ||
                                lowerPrompt.startsWith('image of ') ||
                                lowerPrompt.startsWith('paint an image ') ||
                                lowerPrompt.startsWith('paint a ');
    
    const isImagePrefix = rawPrompt.toLowerCase().startsWith('!m') || chatMode === 'image' || isNaturalImageQuery;

    let imagePromptText = '';
    if (isImagePrefix) {
      if (rawPrompt.toLowerCase().startsWith('!m')) {
        imagePromptText = rawPrompt.slice(2).trim();
      } else if (chatMode === 'image') {
        imagePromptText = rawPrompt.trim();
      } else {
        const matchText = rawPrompt.match(/(?:make me an image of|generate an image of|create an image of|draw an image of|show an image of|make an image of|generate image|generate an image|create image|draw a|draw an|picture of|photo of|image of|paint an image of|paint a)\s*(.*)/i);
        imagePromptText = matchText && matchText[1] ? matchText[1].trim() : rawPrompt.trim();
      }
      if (!imagePromptText) {
        imagePromptText = 'A beautiful glossy glass artwork designed by St.Amour';
      }
    }

    const isDocsPrefix = 
      /\b(sync\s+(to|with|this\s+to|notes\s+to)?\s*google\s*docs?|export\s+(to)?\s*google\s*docs?|save\s+(to)?\s*google\s*docs?|send\s+(to)?\s*google\s*docs?|create\s+(a\s+)?google\s*doc|open\s+(in\s+)?google\s*docs?)\b/i.test(lowerPrompt) ||
      rawPrompt.toLowerCase().startsWith('!d') || 
      lowerPrompt.startsWith('docs ') || 
      lowerPrompt.startsWith('google docs ') || 
      lowerPrompt === 'docs' || 
      lowerPrompt === 'google docs';
    const isSlidesPrefix = rawPrompt.toLowerCase().startsWith('!s') || rawPrompt.toLowerCase().startsWith('s!') || lowerPrompt.startsWith('slides ') || lowerPrompt.startsWith('google slides ') || lowerPrompt === 'slides' || lowerPrompt === 'google slides';
    const isGamesQuery = lowerPrompt === 'games' || lowerPrompt === 'show games' || lowerPrompt === 'search games';
    const isGameGenQuery = lowerPrompt === 'game gen' || lowerPrompt.startsWith('game gen ') || lowerPrompt === 'game generation' || lowerPrompt.startsWith('game generation ');
    const isClearDrive = lowerPrompt === '!clear drive';

    // Search automatically for normal prompts; special generators/local commands skip web lookup.
    const isWebSearch = !isImagePrefix && !isNaturalImageQuery && !isDocsPrefix && !isSlidesPrefix &&
      !isGamesQuery && !isGameGenQuery && !isClearDrive;
    setIsSearchingWebActive(isWebSearch);
    setActiveSearchQuery(isWebSearch ? rawPrompt : '');

    try {
      if (isGamesQuery) {
        // Switch to games mode
        setActiveView('games');
        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: "🎮 **IsaiahAI Arcade Acceleration Node Active** 🎮\n\nI have switched your interface to the IsaiahAI Games Dashboard! Explore Pong, Snake, or compile a customized software prototype using the **Game Gen** system.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText("I have loaded the games dashboard for you.");
      } else if (isGameGenQuery) {
        // Squeeze initial game gen input
        let initialPrompt = 'Electronics Coordinate Maze with laser walls';
        if (rawPrompt.toLowerCase().startsWith('game gen ')) {
          initialPrompt = rawPrompt.slice(9).trim();
        } else if (rawPrompt.toLowerCase().startsWith('game generation ')) {
          initialPrompt = rawPrompt.slice(16).trim();
        }
        setGameGenPrompt(initialPrompt);
        setActiveView('games');
        
        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `⚡ **IsaiahAI Game Construction Initialized** ⚡\n\nI have routed your command to our sandbox environment and prepared candidate game specifications for: **"${initialPrompt}"**.\n\nClick "Run Code" inside the panel to test live!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(`Initializing arcade sandbox design for ${initialPrompt}`);
      } else if (isClearDrive) {
        if (!currentUser) {
          throw new Error("Activation credentials required. Please sign in with Google first in the top banner or sidebar to access your Google Drive!");
        }
        if (!googleAccessToken) {
          throw new Error("Google access token missing. Please sign out and sign in with Google to authorize Drive cleanup.");
        }

        setCurrentSearchPrompt("Analyzing Google Drive Index for duplicates...");

        const listRes = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=150&fields=files(id,name,mimeType,size,md5Checksum,createdTime)&orderBy=name', {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        if (!listRes.ok) {
          throw new Error(`Google Drive Fetch Fail: ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        const files = listData.files || [];

        if (files.length === 0) {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: "📁 **St.Amour Drive Optimiser Module**:: Checked drive indexes: **Verified Empty**.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          updatedSession.messages = [...workingMessages, assistantMsg];
          speakText("No files were found in your Google Drive.");
        } else {
          // Identify matches where filename and size/checksum match based on settings
          const rule = settings.driveClearMatchingRule || 'name_size';
          const keepPreference = settings.driveClearKeepPreference || 'oldest';

          const groups: { [key: string]: any[] } = {};
          files.forEach((f: any) => {
            let key = '';
            if (rule === 'name_only') {
              key = f.name;
            } else if (rule === 'name_checksum') {
              key = `${f.name}_${f.md5Checksum || ''}`;
            } else {
              key = `${f.name}_${f.size || ''}`;
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(f);
          });

          const duplicates: any[] = [];
          let duplicateBytes = 0;

          Object.keys(groups).forEach(k => {
            const grp = groups[k];
            if (grp.length > 1) {
              // Sort based on retention target priority
              if (keepPreference === 'newest') {
                grp.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
              } else {
                grp.sort((a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime());
              }
              const dups = grp.slice(1);
              duplicates.push(...dups);
              dups.forEach(d => {
                if (d.size) duplicateBytes += parseInt(d.size);
              });
            }
          });

          if (duplicates.length === 0) {
            const assistantMsg: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: `📁 **St.Amour Drive Optimiser Module**:: Checked **${files.length}** records. **Zero duplicate files found.** Drive index in optimal condition.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            updatedSession.messages = [...workingMessages, assistantMsg];
            speakText("No duplicates found on your drive. It is fully optimal.");
          } else {
            setCurrentSearchPrompt(`Deduplication sequence running: Deleting ${duplicates.length} items...`);
            let deletedCount = 0;
            const logDetails: string[] = [];

            for (const dup of duplicates) {
              const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${dup.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${googleAccessToken}` }
              });
              if (delRes.ok) {
                deletedCount++;
                const sizeStr = dup.size ? `${(parseInt(dup.size) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';
                logDetails.push(`• Eliminated redundant: **${dup.name}** (${sizeStr})`);
              }
            }

            const savedMb = (duplicateBytes / (1024 * 1024)).toFixed(2);
            const assistantMsg: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: `🚨 **St.Amour Drive Deduplication Successful!** 🚨\n\nI have scanned ${files.length} total user indexes and permanently eliminated **${deletedCount}** redundant duplicate files.\n\n### ⚡ Cleanup Details:\n${logDetails.join('\n')}\n\n📊 **Storage Yield**: Reclaimed **${savedMb} MB** of active Google Cloud Drive allocation. Optimization index completed!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            updatedSession.messages = [...workingMessages, assistantMsg];
            speakText(`Cleared ${deletedCount} redundant files.`);
          }
        }
      } else if (isImagePrefix) {
        // Image generation command - Isaiahsi Image AI (Named by Isaiahsi · Powered by Claude AI & Puter)
        const imagePrompt = imagePromptText || 'A futuristic AI interface designed by St.Amour Electronics';
        setCurrentSearchPrompt(`Isaiahsi: Synthesizing "${imagePrompt}"...`);

        try {
          const isaiahsiResult = await generateIsaiahsiImage(imagePrompt, {
            aspectRatio: '1:1',
            enhanceWithClaude: true
          });

          const replyContent = `🎨 **Isaiahsi Image AI**\n*${isaiahsiResult.namingCredit} · ${isaiahsiResult.engineCredit}*\n\nRendered visual for: **"${imagePrompt}"**` +
            (isaiahsiResult.enhancedPrompt ? `\n\n*Claude AI Visual Synthesis:* "${isaiahsiResult.enhancedPrompt}"` : '');

          const assistantMsg: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: replyContent,
            model: 'image',
            modelDisplayName: 'Isaiahsi',
            images: [isaiahsiResult.imageUrl],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          updatedSession.messages = [...workingMessages, assistantMsg];
          speakText(`Isaiahsi Image AI has synthesized ${imagePrompt}`);
          setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
          return;
        } catch (isaiahsiErr: any) {
          console.warn('[Isaiahsi Image synthesis error, falling back to server]:', isaiahsiErr);
        }

        setCurrentSearchPrompt(`Isaiahsi Vision Node: Synthesizing "${imagePrompt}"...`);

        const inputImg = currentUploaded.length > 0 ? {
          data: currentUploaded[0].data,
          mimeType: currentUploaded[0].mimeType
        } : null;

        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: imagePrompt,
            imageSize,
            isPro: imageIsPro,
            image: inputImg
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.message || errData.error || 'Image generation service offline';
          throw new Error(errMsg);
        }
        
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
        const data = await response.json();

        let replyContent = `🎨 **Isaiahsi Image AI**\n*Named by Isaiahsi · Powered by Claude AI & Neural Vision*\n\n` +
          (data.trainedText || `Rendered visual for: **"${imagePrompt}"**`);
        let imageUrls = [data.imageUrl];

        if (data.isFallback) {
          replyContent = `🎨 **Isaiahsi Image AI**\n*Named by Isaiahsi · Powered by Neural Vision Engine*\n\n` +
            (data.trainedText || `Successfully generated visual matches for: **"${imagePrompt}"**`);
          imageUrls = data.fallbackUrls && data.fallbackUrls.length > 0 ? data.fallbackUrls : [data.imageUrl];
        }

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: replyContent,
          model: 'image',
          modelDisplayName: 'Isaiahsi',
          images: imageUrls,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(assistantMsg.content);
      } else if (isDocsPrefix) {
        // Google Docs command & Direct sync prompt
        let docsPrompt = rawPrompt;
        if (rawPrompt.toLowerCase().startsWith('!d')) docsPrompt = rawPrompt.slice(2).trim();
        else if (lowerPrompt.startsWith('google docs ')) docsPrompt = rawPrompt.slice(12).trim();
        else if (lowerPrompt.startsWith('docs ')) docsPrompt = rawPrompt.slice(5).trim();
        else docsPrompt = rawPrompt.replace(/\b(sync\s+(to|with|this\s+to|notes\s+to)?\s*google\s*docs?|export\s+(to)?\s*google\s*docs?|save\s+(to)?\s*google\s*docs?|send\s+(to)?\s*google\s*docs?|create\s+(a\s+)?google\s*doc|create\s+(a\s+)?doc|open\s+(in\s+)?google\s*docs?)\b/gi, '').trim();

        setCurrentSearchPrompt(`Connecting to Google Docs: "${docsPrompt || 'Study Notes'}"...`);

        // Check if there is already an existing assistant message to sync
        const lastAssistantMsg = [...workingMessages].reverse().find(m => m.role === 'assistant' && m.content);
        let contentToSync = '';
        let docTitle = docsPrompt ? `IsaiahAI - ${docsPrompt}` : 'IsaiahAI Study Notes';

        if (lastAssistantMsg && (!docsPrompt || /sync|save|export|send/i.test(lowerPrompt))) {
          contentToSync = lastAssistantMsg.content;
          if (lastAssistantMsg.docTitle) docTitle = lastAssistantMsg.docTitle;
        } else {
          // Generate new document outline
          const chatHistoryMap = workingMessages.slice(0, -1).map(msg => ({
            role: msg.role,
            content: msg.content,
          }));

          const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: docsPrompt || 'Academic Study Guide', history: chatHistoryMap }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Docs generation endpoint error');
          }
          const data = await response.json();
          contentToSync = data.content;
          docTitle = data.docTitle || docTitle;
        }

        // Direct sync to Google Docs via OAuth
        const syncResult = await handleDirectGoogleDocsSync(docTitle, contentToSync);

        let assistantReply = '';
        if (syncResult.success && syncResult.docUrl) {
          assistantReply = `📄 **Google Docs Synchronized Successfully!**\n\nYour document **"${docTitle}"** has been created and synced directly to your Google Drive.\n\n🔗 **[Open Document in Google Docs](${syncResult.docUrl})**\n\n*All mathematical notation and real fraction symbols were formatted for academic study.*`;
        } else {
          assistantReply = `📄 **Google Docs Workbench Active**\n\nI have prepared the document outline for **"${docTitle}"**. Check the Google Docs Study Workbench modal to finalize sync or use 1-click paste!`;
        }

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantReply,
          isDoc: true,
          docTitle: docTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(syncResult.success ? "Successfully synced to Google Docs!" : "Document outline is ready in the Google Docs workbench.");
      } else if (isSlidesPrefix) {
        // Google Slides command
        let slidesPrompt = rawPrompt;
        if (rawPrompt.toLowerCase().startsWith('!s')) slidesPrompt = rawPrompt.slice(2).trim();
        else if (rawPrompt.toLowerCase().startsWith('s!')) slidesPrompt = rawPrompt.slice(2).trim();
        else if (lowerPrompt.startsWith('google slides ')) slidesPrompt = rawPrompt.slice(14).trim();
        else if (lowerPrompt.startsWith('slides ')) slidesPrompt = rawPrompt.slice(7).trim();
        else slidesPrompt = 'St.Amour Electronics Q3 Technical Brief';

        setCurrentSearchPrompt(`Structuring Presentation slides: "${slidesPrompt}"`);

        const chatHistoryMap = workingMessages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        // Search for previous slides structure in this conversation
        const prevSlidesMsg = [...workingMessages].reverse().find(m => m.isSlides && m.slidesData);
        const existingSlides = prevSlidesMsg ? prevSlidesMsg.slidesData : undefined;

        const response = await fetch('/api/generate-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: slidesPrompt, 
            history: chatHistoryMap,
            existingSlides 
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Slides generation endpoint error');
        }
        
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
        const data = await response.json();


        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `📊 **Presentation Draft Compiled**: *"${data.title || 'Slide Deck'}"*\nI have arranged a custom slide presentation with ${data.slides?.length || 0} pages. Use the controls below to navigate or sync them directly into real Google Slides.`,
          isSlides: true,
          slidesData: data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText("I have structured your presentation slides outline. You can sync it now as an official presentation into your Google Slides storage.");
      } else if (isWPrefix) {
        // Wikipedia command
        let wikiQuery = rawPrompt;
        if (rawPrompt.toLowerCase().startsWith('w!')) wikiQuery = rawPrompt.slice(2).trim();
        else if (lowerPrompt.startsWith('wikipedia ')) wikiQuery = rawPrompt.slice(10).trim();
        else if (lowerPrompt.startsWith('wiki ')) wikiQuery = rawPrompt.slice(5).trim();
        else wikiQuery = 'St.Amour Electronics';

        setCurrentSearchPrompt(`Wikipedia DB: "${wikiQuery}"`);

        const response = await fetch('/api/search-wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: wikiQuery }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Wikipedia search registry endpoint error');
        }
        
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
        const data = await response.json();


        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.summary,
          model: activeModelKey,
          modelDisplayName: activeModelDisplayName,
          isSearch: true,
          searchType: 'wiki',
          summaryQuery: data.searchTerm,
          searchResults: data.boxes,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(assistantMsg.content);
      } else if (isDPrefix) {
        // DuckDuckGo command
        let ddgQuery = rawPrompt;
        if (rawPrompt.toLowerCase().startsWith('d!')) ddgQuery = rawPrompt.slice(2).trim();
        else if (lowerPrompt.startsWith('duckduckgo ')) ddgQuery = rawPrompt.slice(11).trim();
        else if (lowerPrompt.startsWith('duckduck go ')) ddgQuery = rawPrompt.slice(12).trim();
        else ddgQuery = 'St.Amour Electronics';

        setCurrentSearchPrompt(`DuckDuckGo Wide Sweep: "${ddgQuery}"`);

        const response = await fetch('/api/search-ddg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ddgQuery }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'DuckDuckGo crawler service error');
        }
        
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
        const data = await response.json();


        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.summary,
          model: activeModelKey,
          modelDisplayName: activeModelDisplayName,
          isSearch: true,
          searchType: 'ddg',
          summaryQuery: ddgQuery,
          searchResults: data.boxes,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(assistantMsg.content);
      } else {
        // Standard chat command or Web Search
        const chatHistoryMap = workingMessages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        if (searchWebEnabled) {
          setCurrentSearchPrompt(`St.Amour Intelligence: Activating Live Grounding Search for "${rawPrompt}"...`);
        }
        
        let data: any;

        // Auto-load local computer file if connected in Code PR mode
        let promptToSend = rawPrompt;
        let isCodeEditingActive = (chatMode === 'code' || chatMode === 'code_extended') && localWorkspaceConnected && !!selectedLocalFile;
        if (isCodeEditingActive && selectedLocalFile?.handle) {
          try {
            const currentFileContent = await readFileText(selectedLocalFile.handle);
            promptToSend = `[Local Computer File: "${selectedLocalFile.name}" auto-loaded from PC]\n\`\`\`html\n${currentFileContent}\n\`\`\`\nUser Request: ${rawPrompt}`;
          } catch (readErr) {
            console.warn('[Code PR] Could not auto-read local PC file:', readErr);
          }
        }

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: promptToSend,
              history: chatHistoryMap,
              searchWebEnabled,
              chatMode,
              model: selectedAiModel,
              selectedModel: selectedAiModel,
              images: currentUploaded.map(img => ({
                data: img.data,
                mimeType: img.mimeType,
              })),
              systemInstruction: chatMode === 'school'
                ? `You are IsaiahAI School Mode by St.Amour Electronics, an elite personal tutor and academic study coach across all subjects (Math, Science, Humanities, and Coding).
CRITICAL PEDAGOGICAL DIRECTIVES:
1. NEVER just give the student the final answer to their homework or problem! Teach them how to solve it through guided inquiry, conceptual explanations, and Socratic hints.
2. Break down the core principles, explain underlying mechanisms, and offer step-by-step guidance.
3. REAL FRACTIONS & MATHEMATICAL NOTATION: In School Mode, ALWAYS use real mathematical typography and real unicode fraction symbols (½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅛, ⅜, ⅝, ⅞, or ⁵⁄₁₂) and real math symbols (√, π, ±, ×, ÷, ·, ≤, ≥, ≠, ≈, ∞, °, ², ³, etc.). NEVER write out words like 'one over two' or crude text slashes when a real fraction symbol exists!
4. INCLUDE AN INTERACTIVE KNOWLEDGE CHECK in every lesson so the student can test their understanding. Always format the question and multiple choices clearly using this exact JSON block at the end of your response so our interactive quiz engine can render it as clickable buttons:
\`\`\`quiz
{
  "question": "<Guiding check question testing the current step>",
  "options": [
    "<Option A>",
    "<Option B>",
    "<Option C>",
    "<Option D>"
  ],
  "correctIndex": <0, 1, 2, or 3>,
  "explanation": "<Clear explanation of why this option is correct and how it leads to the final solution>"
}
\`\`\`
5. PREPARE GOOGLE DOC STUDY NOTES: Include a clean study summary section formatted in markdown with Topic, Key Takeaways, Formulas/Vocabulary, and Next Steps so the student can review and sync it directly to Google Docs with one click.
6. Maintain a patient, encouraging, and academically rigorous tone.`
                : chatMode === 'code_extended'
                ? `You are IsaiahAI Code PR Extended Mode by St.Amour Electronics, an elite Senior Principal Software Engineer and Pull Request Automation Agent.
Your mission is to provide super smart, highly optimized, production-grade responses for programming queries.
CRITICAL PROCESS TO FOLLOW:
1. Always output complete, fully runnable code inside clean markdown code blocks without placeholders.
2. If working on a local file, deliver the full updated file so the automated background engine can save it directly to the user's PC.
3. Structure your explanations in high-density, authoritative paragraphs.`
                : chatMode === 'code'
                ? `You are IsaiahAI Code PR Mode by St.Amour Electronics, an elite Senior Principal Software Engineer and Pull Request Automation Agent.
Your mission is to provide razor-sharp, production-grade code solutions and direct file edits in complete markdown code blocks with clear technical explanations.`
                : selectedAiModel === 'maw_ai'
                ? `You are Maw AI, a smart, witty, and charming hybrid AI companion. You deliver high-quality, helpful, accurate, and articulate answers with lightning speed and personality.`
                : selectedAiModel === 'isaiah_5_3'
                ? `You are Isaiah AI 5.3 by St.Amour Electronics. You are an ultra-fast, responsive AI assistant with general intelligence.
The CEO of St.Amour Electronics is Isaiah St.Amour.
Your mission is to provide lightning-fast, crisp, accurate, direct answers without unnecessary fluff or excessive delays.
Identify exclusively as Isaiah AI 5.3. NEVER mention "Gemini" or "Google".`
                : selectedAiModel === 'isaiahai_7_super'
                ? `You are IsaiahAI 7.0 SUPER, an advanced AI assistant made by St.Amour Electronics. The CEO of St.Amour Electronics is Isaiah John St.Amour. Be accurate, helpful, thoughtful, and clear. Identify as IsaiahAI 7.0 SUPER by St.Amour Electronics.`
                : `You are Isaiah Max 6.0 by St.Amour Electronics, a state-of-the-art super-intelligent assistant. You possess high-precision cognitive abilities, multi-modal vision interfaces, and interactive software modules.
The CEO of St.Amour Electronics is Isaiah St.Amour.
CRITICAL MANDATE FOR ISAIAH MAX 6.0:
1. Every single response you write MUST be super smart, highly articulate, and written in thorough, high-density paragraph form (at least one complete, well-reasoned, highly detailed paragraph per response).
2. Avoid shallow one-liner bullet lists or lazy short answers. Provide deep technical and conceptual explanations with speed, clarity, and authority.
3. Identify exclusively as Isaiah Max 6.0. NEVER mention "Gemini" or "Google".\n\nADDITIONAL INSTRUCTIONS:\n1. If the user asks "find me a job" or asks for local jobs, you MUST first ask for their exact location. Once they provide it, output a simulated search result of nearby jobs.\n2. If the user searches for or requests the "St.Amour database", check their email (${currentUser?.email || "unauthenticated"}). If their email is exactly precise26@gmail.com, azndibroblox2@gmail.com, azndibroblox@gmail.com, precise26@hotmail.com, or stamourisaiah@gmail.com, grant them access with ZERO LIMITS.`,
            }),
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'IsaiahAI core generation failed');
          }
          if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Received HTML error page');
          data = await response.json();
        } catch (apiErr: any) {
          if (selectedAiModel === 'maw_ai' && mawAIRef.current) {
            console.warn('[Maw AI] API unavailable, engaging local Maw core:', apiErr);
            const rawResponse = await mawAIRef.current.generateResponse(rawPrompt);
            data = { content: rawResponse, sources: [], provider: 'Maw local fallback' };
          } else {
            const puter = typeof window !== 'undefined' ? (window as any).puter : null;
            const canUsePuter = isPuterSignedIn() && puter?.ai?.chat && currentUploaded.length === 0;
            if (!canUsePuter) throw apiErr;
            const puterMessages = [
              { role: 'system', content: `You are IsaiahAI 7.0 SUPER, an accurate and thoughtful assistant. Answer directly, verify assumptions, explain uncertainty, never invent citations or claim actions you did not perform. Current specialized mode: ${chatMode}.` },
              ...chatHistoryMap.slice(-12).map((item: any) => ({
                role: item.role === 'assistant' ? 'assistant' : 'user',
                content: String(item.content || '')
              })),
              { role: 'user', content: promptToSend }
            ];
            const puterResponse = await puter.ai.chat(puterMessages, { model: 'openrouter/free', normalize: true, max_tokens: 4096 });
            const puterContent = typeof puterResponse === 'string' ? puterResponse
              : typeof puterResponse?.message?.content === 'string' ? puterResponse.message.content
              : Array.isArray(puterResponse?.message?.content) ? puterResponse.message.content.map((part: any) => part?.text || '').join('\n')
              : typeof puterResponse?.text === 'string' ? puterResponse.text : '';
            if (!puterContent.trim()) throw apiErr;
            data = { content: puterContent.trim(), sources: [], provider: 'Puter account fallback' };
          }
        }

        // Auto-edit local file on PC in background if code block was returned
        let editedFileName: string | undefined;
        if (isCodeEditingActive && selectedLocalFile?.handle && data?.content) {
          const extractedCode = extractCodeBlockFromResponse(data.content);
          if (extractedCode) {
            try {
              await writeFileText(selectedLocalFile.handle, extractedCode);
              editedFileName = selectedLocalFile.name;
              setLocalFileNotice(`⚡ Directly edited "${selectedLocalFile.name}" on your computer in background!`);
              setTimeout(() => setLocalFileNotice(null), 6000);
            } catch (writeErr: any) {
              console.warn('[Code PR] Background write to computer failed:', writeErr);
            }
          }
        }

        // Dynamically translate Google grounding sources into visual Web Search boxes
        const searchResults = (data.sources || []).map((s: any) => {
          let domainName = 'web';
          try {
            if (s.uri) {
              domainName = new URL(s.uri).hostname.replace('www.', '');
            }
          } catch (e) {}
          return {
            title: s.title || 'Google Search Reference',
            uri: s.uri || '',
            domain: domainName,
          };
        });

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.content,
          model: activeModelKey,
          modelDisplayName: activeModelDisplayName,
          images: data.imageUrl ? [data.imageUrl] : undefined,
          thinking: data.thinking,
          sources: data.sources,
          isSearch: isWebSearch && searchResults.length > 0,
          searchType: 'google',
          summaryQuery: rawPrompt,
          searchResults: searchResults,
          localFileEdited: editedFileName,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updatedSession.messages = [...workingMessages, assistantMsg];
        speakText(assistantMsg.content);
      }

      // Commit
      saveSessionsToCache(prev => {
        const exists = prev.some(s => s.id === targetSessionId);
        if (exists) {
          return prev.map(s => s.id === targetSessionId ? updatedSession : s);
        } else {
          return [updatedSession, ...prev];
        }
      });
    } catch (err: any) {
      console.error(err);
      
      const errMsgStr = err.message || '';
      const isQuota = /quota|exhausted|limit|429|resource_exhausted/i.test(errMsgStr);
      
      let errorText = isImagePrefix
        ? 'IsaiahAI could not create that image on this attempt. Try a shorter, more specific prompt, or continue developing the idea in regular chat.'
        : isQuota
          ? 'IsaiahAI is busy right now. Please try again in a moment. Your conversation has been kept.'
          : 'IsaiahAI could not complete that reply right now. Your message is still in the conversation—please try again in a moment.';

      const errMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: errorText,
        model: activeModelKey,
        modelDisplayName: activeModelDisplayName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updatedSession.messages = [...workingMessages, errMsg];
      saveSessionsToCache(prev => {
        const exists = prev.some(s => s.id === targetSessionId);
        if (exists) {
          return prev.map(s => s.id === targetSessionId ? updatedSession : s);
        } else {
          return [updatedSession, ...prev];
        }
      });
    } finally {
      setIsGenerating(false);
      setIsSearchingWebActive(false);
      setActiveSearchQuery('');
      setCurrentSearchPrompt(null);
    }
  };

  // ==========================================
  // CONFIG DISPLAY WRAPPER ACCORDING TO THEME
  // ==========================================
  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'light_glass':
        return {
          bg: 'glass-pane-light text-zinc-800',
          outerBg: 'liquid-glass-bg-light text-zinc-800',
          text: 'text-zinc-800',
          border: 'border-white/40',
          accent: 'text-sky-600',
          accentBg: 'bg-sky-500 text-white shadow-sm',
          card: 'bg-white/45 border border-white/50 shadow-md backdrop-blur-xl',
          bubbleUser: 'glass-bubble-user text-white',
          bubbleAI: 'glass-bubble-ai-light text-zinc-800',
        };
      case 'slate': // St.Amour Glass (Dark Mode)
        return {
          bg: 'glass-pane-dark text-slate-100',
          outerBg: 'liquid-glass-bg-dark text-slate-100',
          text: 'text-slate-100',
          border: 'border-white/10',
          accent: 'text-indigo-400',
          accentBg: 'bg-indigo-600 text-white shadow-sm',
          card: 'bg-slate-900/40 border border-slate-800/80 shadow-lg backdrop-blur-xl',
          bubbleUser: 'glass-bubble-user text-white',
          bubbleAI: 'glass-bubble-ai-dark text-slate-100',
        };
      case 'charcoal':
        return {
          bg: 'bg-slate-900',
          outerBg: 'bg-slate-950',
          text: 'text-slate-100',
          border: 'border-slate-800',
          accent: 'text-amber-400',
          accentBg: 'bg-amber-500/25 text-amber-300 border border-amber-500/30',
          card: 'bg-slate-950/50',
          bubbleUser: 'bg-amber-500 text-slate-950',
          bubbleAI: 'bg-slate-800/80 text-slate-100 border border-slate-700/50',
        };
      case 'gold':
        return {
          bg: 'bg-[#181510]',
          outerBg: 'bg-[#0f0e0b]',
          text: 'text-amber-50',
          border: 'border-[#30281b]',
          accent: 'text-amber-400',
          accentBg: 'bg-amber-500 text-black border border-amber-300',
          card: 'bg-amber-950/20',
          bubbleUser: 'bg-amber-500 text-black',
          bubbleAI: 'bg-amber-950/45 text-amber-100 border border-amber-800/60',
        };
      case 'matrix':
        return {
          bg: 'bg-black',
          outerBg: 'bg-black',
          text: 'text-green-400',
          border: 'border-green-950',
          accent: 'text-emerald-400',
          accentBg: 'bg-emerald-505 text-black',
          card: 'bg-green-950/10',
          bubbleUser: 'bg-emerald-500 text-black',
          bubbleAI: 'bg-[#050505] text-green-400 border border-emerald-950',
        };
      case 'crimson':
        return {
          bg: 'bg-[#1c1010]',
          outerBg: 'bg-[#100a0a]',
          text: 'text-red-50',
          border: 'border-red-950/60',
          accent: 'text-red-500',
          accentBg: 'bg-red-500 text-white',
          card: 'bg-red-950/10',
          bubbleUser: 'bg-red-500 text-white',
          bubbleAI: 'bg-red-950/40 text-red-100 border border-red-900/60',
        };
      default:
        return {
          bg: 'bg-zinc-900',
          outerBg: 'bg-zinc-950',
          text: 'text-zinc-100',
          border: 'border-zinc-800',
          accent: 'text-indigo-400',
          accentBg: 'bg-[#2f2f2f] text-white',
          card: 'bg-[#2f2f2f]',
          bubbleUser: 'bg-indigo-600 text-white',
          bubbleAI: 'bg-transparent text-zinc-100',
        };
    }
  };

  const currentTheme = getThemeClasses();
  const isLight = settings.theme === 'light_glass';

  const getFontSizeClass = () => {
    if (settings.fontSize === 'sm') return 'text-xs pr-1 leading-relaxed';
    if (settings.fontSize === 'lg') return 'text-base leading-loose';
    return 'text-sm leading-relaxed';
  };

  const hasMessages = activeSession && activeSession.messages.length > 0;

  const customBgStyle = settings.customBackgroundUrl ? {
    backgroundImage: `url(${settings.customBackgroundUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {};

  return (
    <div 
      className={`flex h-[100dvh] w-screen overflow-hidden ${settings.customBackgroundUrl ? '' : currentTheme.outerBg} ${currentTheme.text} transition-colors duration-300 font-sans`}
      style={customBgStyle}
    >
      
      {/* Mobile Backdrop overlay when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. SIDEBAR NAVIGATION COMPONENT */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out h-full flex-shrink-0 overflow-hidden bg-[#19191b] ${
        isSidebarOpen 
          ? 'translate-x-0 w-64 block md:static' 
          : '-translate-x-full w-64 pointer-events-none md:w-0 md:hidden'
      }`}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          activeView={activeView}
          onSelectView={(view: any) => setActiveView(view)}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onRenameSession={handleRenameSession}
          onSetCategory={handleSetSessionCategory}
          onDeleteSession={handleDeleteSession}
          onToggleSettings={() => setShowSettings(true)}
          settings={settings}
          onImportSessions={handleImportSessions}
          onExportSessions={handleExportSessions}
          onCloseMobile={() => setIsSidebarOpen(false)}
          currentUser={currentUser}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onToggleVoiceMode={() => setIsVoiceEnabled(!isVoiceEnabled)}
          onSelectImageMode={() => {
            setChatMode('image');
            setActiveView('chat');
          }}
        />
      </div>

      {/* Background Overlay for mobile when Sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN CORE CONTENT FIELD (ChatGPT Dark Canvas UI representation) */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${currentTheme.bg} ${activeView === 'chat' ? 'isaiah-ai-studio' : ''}`}>
        
        {/* Top Header Selector (Model Switcher dropdown lookalike) */}
        {activeView !== 'browser' && (
          <header className="h-16 px-4 md:px-5 flex items-center justify-between flex-shrink-0 bg-transparent select-none border-b border-zinc-900/40 md:border-b-0">
          {isMobile ? (
            /* MOBILE SPECIFIC HEADER (MATCHING IMG_1422.jpeg & IMG_1424.png) */
            <>
              {/* Left Side: Circular Menu Drawer Button (=) */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`w-9 h-9 rounded-full shadow-sm transition-all border flex items-center justify-center cursor-pointer ${
                  isLight 
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200' 
                    : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-750'
                }`}
                title="Open Sidebar Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Center: Mobile Header Title */}
              <div className="flex items-center justify-center font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                Isaiah AI
              </div>
              {/* Right Side: Circular Info Button (i), Share, or Action Pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareActiveSession}
                  className={`w-9 h-9 rounded-full shadow-sm transition-all border flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200' 
                      : 'bg-zinc-850 hover:bg-zinc-800 text-amber-400 border-zinc-750'
                  }`}
                  title="Share Conversation"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm transition-transform active:scale-95 cursor-pointer"
                  title="Isaiah AI Information & Settings"
                >
                  i
                </button>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  className={`w-9 h-9 rounded-full shadow-sm transition-all border flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200' 
                      : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-750'
                  }`}
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            /* DESKTOP HEADER COHERENT DEFAULTS */
            <>
              <div className="flex items-center gap-3">
                {/* Hamburger Menu Toggle */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2 rounded-lg text-zinc-400 ${isLight ? 'hover:text-zinc-900 hover:bg-zinc-200/50' : 'hover:text-white hover:bg-zinc-800/20'} transition-colors`}
                  title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-800/10 dark:hover:bg-zinc-800/20 px-2 py-1 rounded-lg transition-colors">
                  <BrandLogo size={22} includeBackground={true} className="rounded-md ring-1 ring-amber-500/20 shadow-md shadow-amber-500/5 transition-transform animate-pulse" />
                  <span className={`font-display font-semibold text-sm ${isLight ? 'text-zinc-850 hover:text-zinc-950' : 'text-zinc-100 hover:text-white'} tracking-tight`}>IsaiahAI</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </div>

                {/* start chat button */}
                {!isSidebarOpen && (
                  <button
                    onClick={handleCreateSession}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 active:scale-95 text-xs text-amber-400 hover:text-amber-300 font-semibold rounded-lg border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer shadow-lg animate-fade-in"
                    title="Start a new chat session"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">New Chat</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Share Button */}
                <button
                  onClick={handleShareActiveSession}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md border ${
                    isLight 
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200' 
                      : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-amber-400 border-zinc-750 hover:border-amber-500/40'
                  }`}
                  title="Share current conversation"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Share</span>
                </button>

                {currentUser ? (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-transparent pl-2.5 pr-1.5 py-1 rounded-xl border border-amber-500/15">
                    <span className="text-[10px] font-mono font-bold text-amber-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {settings.userNickname}
                    </span>
                    <button
                      onClick={handleGoogleSignOut}
                      className="px-2 py-1 bg-zinc-900/60 hover:bg-zinc-855 rounded-lg text-zinc-400 hover:text-rose-400 font-mono text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-2.5 h-2.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold font-mono text-[10px] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Authenticate to your account"
                  >
                    <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Login / Sign Up</span>
                  </button>
                )}

                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  title="Open Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </header>
        )}

        {/* 3. DYNAMIC RENDERING BLOCK (GAMES & VERSIONS VS CHAT INTERFACES) */}
        {activeView === 'games' ? (
          <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
            <div className="flex-grow overflow-hidden min-h-0 bg-slate-900 border border-slate-800/50 rounded-2xl shadow-xl flex flex-col">
              <GamesDashboard 
                theme={settings.theme} 
                userNickname={settings.userNickname} 
                activeTab={undefined} 
                currentUser={currentUser}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleSignOut={handleGoogleSignOut}
                initialCreativePrompt={gameGenPrompt}
              />
            </div>
          </div>
        ) : activeView === 'versions' ? (
          <VersionsSandbox />
        ) : activeView === 'browser' ? (
          <BrowserView
            onGoToChat={() => setActiveView('chat')}
            onContinueWithPrompt={(prompt) => {
              setInputText(prompt);
              setActiveView('chat');
            }}
            onGoToMode={(mode) => {
              if (mode === 'games') {
                 setActiveView('games');
              } else if (mode === 'voice') {
                 setActiveView('chat');
                 if (!isLiveActive) startLiveVoiceSession();
              } else {
                 setActiveView('chat');
                 setChatMode(mode);
              }
            }}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            theme={settings.theme}
            userNickname={settings.userNickname}
            customBackgroundUrl={settings.customBackgroundUrl}
            onShowAuthModal={() => setShowAuthModal(true)}
            onUpdateTheme={(newTheme) => handleSaveSettings({...settings, theme: newTheme as any})}
          />
        ) : (
          <div className="flex-grow flex flex-col overflow-hidden relative justify-between">
            
            {/* Messages Scroll Area */}
            <div className="flex-grow overflow-y-auto px-4 md:px-6">
              
              {!hasMessages ? (
                isMobile ? (
                  /* DuckDuckGo Mobile Inspired Empty State */
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 select-none animate-fade-in pt-12">
                    <div className="w-20 h-20 mx-auto rounded-full shadow-md bg-white border border-zinc-200 flex items-center justify-center mb-4">
                      <BrandLogo size={60} includeBackground={false} className="rounded-full" />
                    </div>
                    <h2 className={`font-bold text-2xl tracking-tight mb-8 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                      Isaiah.ai, by St.Amour
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[280px]">
                      <button onClick={() => setChatMode('general')} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all shadow-sm ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>
                        <Sparkles className="w-4 h-4" /> Chat Suggestions
                      </button>
                      <button onClick={() => setChatMode('image')} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all shadow-sm ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>
                        <ImageIcon className="w-4 h-4" /> Create & Edit Images
                      </button>
                      <button onClick={() => startLiveVoiceSession()} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all shadow-sm ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>
                        <Headphones className="w-4 h-4" /> Voice Chat
                      </button>
                      <button onClick={() => setChatMode('general')} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all shadow-sm ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>
                        <BrandLogo size={16} includeBackground={false} /> How Isaiah.ai Works
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty Chat - Centered "Where should we begin?" matching ChatGPT identically */
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 select-none">
                    
                    <div className="space-y-2">
                      <div className="w-18 h-18 mx-auto transform hover:scale-[1.03] transition-transform duration-350 cursor-pointer">
                        <BrandLogo size={72} includeBackground={true} className="rounded-2xl" />
                      </div>
                      <h2 className={`text-3xl sm:text-4xl font-semibold ${isLight ? 'text-zinc-900' : 'text-white'} tracking-tight pt-5`}>
                        Where should we begin?
                      </h2>
                      <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest pt-1 leading-none">
                        St.Amour Electronics Cognitive Index Node
                      </p>
                    </div>

                  {/* Suggestion Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
                    {/* School Mode Study & Google Docs Banner */}
                    {chatMode === 'school' && (
                      <div className={`col-span-1 sm:col-span-2 p-5 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        isLight
                          ? 'border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 text-zinc-900 shadow-sm'
                          : 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-zinc-900/60 text-zinc-200 shadow-lg'
                      }`}>
                        <div className="flex items-center gap-3.5 text-left min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                              <span>IsaiahAI School Mode</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase tracking-wide">
                                Socratic Tutor
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed max-w-xl">
                              Learn through inquiry across <strong className="text-zinc-200">Math</strong>, <strong className="text-zinc-200">Science</strong>, <strong className="text-zinc-200">Humanities</strong>, and <strong className="text-zinc-200">Coding</strong>.
                              Rather than just giving you the answer, School Mode guides you with interactive knowledge checks and prepares structured study notes for Google Docs.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolDocTitle('IsaiahAI Study Guide');
                              setSchoolDocContent(`# Study Notes Outline\n\n### Key Concept\n- Enter topic to begin study session\n\n### Knowledge Check\n- Interactive quiz review will populate here\n`);
                              setSchoolDocModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Google Docs Workbench</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Code PR Computer File Access Banner */}
                    {(chatMode === 'code' || chatMode === 'code_extended') && (
                      <div className={`col-span-1 sm:col-span-2 p-5 rounded-2xl border ${
                        localWorkspaceConnected
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-amber-500/30 bg-amber-500/10'
                      } transition-all text-xs flex flex-col sm:flex-row items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3.5 text-left min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            localWorkspaceConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              <span>Computer File Access</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                                localWorkspaceConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {localWorkspaceConnected ? 'Connected & Auto-Saving' : 'Direct Background Editing'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                              {localWorkspaceConnected
                                ? `Connected: ${selectedLocalFile?.name || localDirName}. When you ask Code PR for changes, it auto-reads and writes them directly on your PC in the background.`
                                : 'Grant file access so Code PR can auto-load your HTML file, read project code, and edit it directly on your computer in the background.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {localWorkspaceConnected ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setLocalWorkspaceModalOpen(true)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all cursor-pointer shadow-md"
                              >
                                View Files on PC
                              </button>
                              <button
                                type="button"
                                onClick={handleDisconnectLocalWorkspace}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleConnectLocalFile}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                              >
                                <HardDrive className="w-3.5 h-3.5" />
                                <span>Connect HTML File</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleConnectLocalFolder}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                              >
                                Folder Access
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {currentUser && !siriShortcutAdded && (
                      <div className={`col-span-1 sm:col-span-2 p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-r ${isLight ? 'from-sky-500/15 to-indigo-500/15 bg-white/70 shadow-md text-zinc-900' : 'from-sky-500/10 to-indigo-500/10 text-zinc-300'} hover:from-sky-500/20 hover:to-indigo-500/20 transition-all text-xs relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 group`}>
                        <div className="absolute inset-0 bg-radial-gradient from-sky-500/10 to-transparent opacity-60 pointer-events-none" />
                        
                        <div className="flex items-center gap-4.5 text-left min-w-0 relative z-10 w-full sm:w-auto">
                          <div className={`w-11 h-11 shrink-0 rounded-full ${isLight ? 'bg-sky-550/10' : 'bg-slate-900'} border border-sky-500/40 flex items-center justify-center font-bold text-lg text-sky-500 select-none shadow-md animate-pulse`}>
                            🎙️
                          </div>
                          <div className="flex-grow min-w-0">
                            <span className="font-semibold text-sky-500 font-display flex items-center gap-1.5 pb-1">
                              <span>Configure Apple Siri Voice Commands</span>
                              <span className="text-[9px] bg-sky-500/20 text-sky-600 dark:text-sky-300 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest leading-none">iOS Shortcut</span>
                            </span>
                            <p className={`${isLight ? 'text-zinc-700' : 'text-zinc-400'} text-[11.5px] leading-relaxed max-w-lg`}>
                              Enable hands-free control activated by saying <b className={isLight ? 'text-zinc-950 font-bold' : 'text-white'}>"Ask IsaiahAI"</b>. Receive dynamic audio responses and text banners instantly at the top of your screen!
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex shrink-0 w-full sm:w-auto items-center gap-2.5 relative z-10 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('isaiahai_siri_added', 'true');
                              setSiriShortcutAdded(true);
                              setShowSiriModal(true);
                              speakText("Isaiah-A-I Shortcut voice protocol fully synced! Let's test the simulator.");
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 transition-all text-zinc-950 font-bold font-mono rounded-xl text-[10.5px] tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg hover:scale-[1.03] cursor-pointer"
                          >
                            <span>Add To Siri</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!currentUser && (
                      <button 
                        onClick={handleGoogleSignIn}
                        className={`col-span-1 sm:col-span-2 p-4 rounded-xl border border-amber-500/30 ${isLight ? 'bg-amber-500/10 hover:bg-amber-500/15 text-zinc-950 hover:border-amber-500/50' : 'bg-amber-500/5 hover:bg-amber-500/10 text-zinc-300 hover:border-amber-500/50'} transition-all text-xs cursor-pointer flex items-center justify-between gap-4 group`}
                      >
                        <div className="flex flex-col text-left min-w-0">
                          <span className="font-semibold text-amber-500 font-display flex items-center gap-1.5 pb-1">
                            <ShieldCheck className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span>Activate Google Cloud Synchronization</span>
                          </span>
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                            Log in securely with your Google Account to automatically save chats, view persistent leaderboards, secure custom snake skins, and back up your arcade libraries permanently.
                          </p>
                        </div>
                        <div className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 group-hover:scale-[1.03] transition-all text-zinc-950 font-bold font-mono rounded-lg text-[10px] tracking-wide uppercase flex items-center gap-1">
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Login</span>
                        </div>
                      </button>
                    )}

                    {chatMode === 'school' ? (
                      <>
                        <button 
                          onClick={() => setInputText('Help me understand Calculus derivative rules step-by-step and test my understanding')}
                          className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-indigo-200 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-indigo-500/30 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300'}`}
                        >
                          <span className="font-semibold text-indigo-400 font-display flex items-center gap-1.5 pb-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>📐 Math: Calculus Derivatives</span>
                          </span>
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            Walk through the power rule and product rule with Socratic hints and a quiz.
                          </p>
                        </button>

                        <button 
                          onClick={() => setInputText('Explain Cellular Respiration vs Photosynthesis and give me a knowledge check')}
                          className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-emerald-200 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-emerald-500/30 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300'}`}
                        >
                          <span className="font-semibold text-emerald-400 font-display flex items-center gap-1.5 pb-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>🔬 Science: Cellular Respiration</span>
                          </span>
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            Understand ATP production, Krebs cycle mechanisms, and chemical equations.
                          </p>
                        </button>

                        <button 
                          onClick={() => setInputText('Guide me through writing a strong historical thesis statement for the Causes of World War I')}
                          className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-amber-200 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-amber-500/30 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300'}`}
                        >
                          <span className="font-semibold text-amber-400 font-display flex items-center gap-1.5 pb-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>📜 Humanities: History Thesis</span>
                          </span>
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            Develop counter-arguments, evidence synthesis, and essay outline for Google Docs.
                          </p>
                        </button>

                        <button 
                          onClick={() => setInputText('Teach me how Binary Search Trees work and give me a coding knowledge check')}
                          className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-blue-200 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-blue-500/30 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300'}`}
                        >
                          <span className="font-semibold text-blue-400 font-display flex items-center gap-1.5 pb-1">
                            <Code2 className="w-3.5 h-3.5" />
                            <span>💻 Coding: Binary Search Trees</span>
                          </span>
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            Master tree invariants, logarithmic time complexity, and search traversal.
                          </p>
                        </button>
                      </>
                    ) : (
                      <>
                    <button 
                      onClick={() => setInputText('w! Roblox History')}
                      className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-zinc-250 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-zinc-800 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300 border-zinc-800/40 hover:border-zinc-700/80'}`}
                    >
                      <span className="font-semibold text-amber-500 font-display flex items-center gap-1.5 pb-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>w! Roblox History</span>
                      </span>
                      <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                        Summarize and render comprehensive Roblox metadata instantly with wiki boxes.
                      </p>
                    </button>

                    <button 
                      onClick={() => setInputText('d! St.Amour Electronics history')}
                      className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col text-left group ${isLight ? 'border-zinc-250 bg-white/75 hover:bg-white/95 text-zinc-850' : 'border-zinc-800 bg-[#2f2f2f]/30 hover:bg-[#2f2f2f]/60 text-zinc-300 border-zinc-800/40 hover:border-zinc-700/80'}`}
                    >
                      <span className="font-semibold text-cyan-600 font-display flex items-center gap-1.5 pb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>d! St.Amour Electronics</span>
                      </span>
                      <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                        Perform a wide web lookup using our high-density St.Amour Electronic search nodes.
                      </p>
                    </button>
                      </>
                    )}
                  </div>
                  <p className={`text-[10px] font-mono leading-relaxed max-w-sm ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    Enter <b className="text-amber-500">w!</b> or <b className="text-cyan-500">d!</b> before your query to search. Chats utilize premium server-side AI reasoning.
                  </p>
                </div>
              )
            ) : (
                /* Chat Messages List */
                <div className="isaiah-ai-transcript max-w-2xl sm:max-w-3xl mx-auto w-full py-4 space-y-6">
                  {activeSession.messages.map((msg) => {
                    const isAI = msg.role === 'assistant';
                    
                    return (
                      <div 
                        key={msg.id}
                        className="w-full text-left animate-fade-in space-y-4"
                      >
                         {!isAI ? (
                           /* User Prompt Block: Capsule box with copy & edit actions inside */
                           <div className={`w-full ${isLight ? 'bg-white/85 border-zinc-200/80 shadow-md' : 'bg-[#1e1e21] border-zinc-800/40'} border rounded-2xl px-5 py-3.5 flex flex-col gap-2.5 group relative select-text`}>
                             <div className="flex items-start justify-between w-full">
                               <div className={`font-sans font-medium text-[15px] ${isLight ? 'text-zinc-850 font-semibold' : 'text-zinc-100'} pr-8 break-words whitespace-pre-wrap`}>
                                 {msg.content}
                               </div>
                               <div className="flex items-center gap-1.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   type="button"
                                   onClick={() => {
                                     try { navigator.clipboard.writeText(msg.content); } catch(err){}
                                   }}
                                   className={`p-1.5 ${isLight ? 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800' : 'hover:bg-zinc-855 rounded text-zinc-400 hover:text-white'} transition-colors cursor-pointer`}
                                   title="Copy prompt"
                                 >
                                   <Copy className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => {
                                     setInputText(msg.content);
                                   }}
                                   className={`p-1.5 ${isLight ? 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800' : 'hover:bg-zinc-855 rounded text-zinc-400 hover:text-white'} transition-colors cursor-pointer`}
                                   title="Edit prompt"
                                 >
                                   <Edit3 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             </div>

                             {/* Render user attachments if any */}
                             {msg.attachments && msg.attachments.length > 0 && (
                               <div className="flex flex-wrap gap-2 pt-1">
                                 {msg.attachments.map((file, fIdx) => {
                                   const isImg = file.mimeType?.startsWith('image/');
                                   if (isImg) {
                                     return (
                                       <div key={fIdx} className="relative w-16 h-16 overflow-hidden rounded-xl border border-zinc-700/30 shadow-sm shrink-0">
                                         <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                                       </div>
                                     );
                                   } else {
                                     return (
                                       <div key={fIdx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 cursor-default ${isLight ? 'bg-zinc-100 border-zinc-250 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                                         <FileText className="w-3.5 h-3.5 text-amber-500" />
                                         <span className="truncate max-w-[140px]" title={file.name}>{file.name}</span>
                                       </div>
                                     );
                                   }
                                 })}
                               </div>
                             )}

                             {/* Backwards compatibility for raw images array */}
                             {(!msg.attachments || msg.attachments.length === 0) && msg.images && msg.images.length > 0 && (
                               <div className="flex flex-wrap gap-2 pt-1">
                                 {msg.images.map((imgSrc, imgIdx) => (
                                   <div key={imgIdx} className="relative w-16 h-16 overflow-hidden rounded-xl border border-zinc-700/30 shadow-sm shrink-0">
                                     <img src={imgSrc} alt="Attached attachment" className="w-full h-full object-cover" />
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         ) : (
                          /* AI Response Block: Transparent plain text, inline web search, action buttons */
                          <div className="space-y-3 w-full pr-1 select-text">

                            {/* Active Model Indicator Header (Matching IMG_0316.jpeg) */}
                            {(() => {
                              const modelKey = msg.model || (chatMode !== 'general' ? chatMode : selectedAiModel);
                              let modelName = msg.modelDisplayName;
                              if (!modelName) {
                                if (modelKey === 'maw_ai') modelName = 'Maw AI';
                                else if (modelKey === 'isaiah_5_3') modelName = 'Isaiah AI 5.3';
                                else if (modelKey === 'isaiahai_7_super') modelName = 'IsaiahAI 7.0 SUPER';
                                else if (modelKey === 'school') modelName = 'IsaiahAI School Mode';
                                else if (modelKey === 'code') modelName = 'Isaiah AI Code PR';
                                else if (modelKey === 'code_extended') modelName = 'Code PR Extended';
                                else if (modelKey === 'image') modelName = 'Isaiah AI Image Gen';
                                else modelName = 'Isaiah Max 6.0';
                              }

                              return (
                                <div className="flex items-center gap-2 select-none mb-1 text-left">
                                  {modelKey === 'school' ? (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                  ) : modelKey === 'maw_ai' ? (
                                    <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                                      <Brain className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                  ) : modelKey === 'isaiah_5_3' ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                  ) : modelKey === 'code' ? (
                                    <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                                      <Code2 className="w-3.5 h-3.5 text-amber-400" />
                                    </div>
                                  ) : modelKey === 'code_extended' ? (
                                    <div className="w-5 h-5 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                                      <Rocket className="w-3.5 h-3.5 text-sky-400" />
                                    </div>
                                  ) : modelKey === 'image' ? (
                                    <div className="w-5 h-5 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0">
                                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                      <BrandLogo size={18} includeBackground={false} />
                                    </div>
                                  )}
                                  <span className={`text-[13.5px] font-semibold tracking-tight ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                    {modelName}
                                  </span>
                                </div>
                              );
                            })()}
                            
                            {/* Compact Web Search Banner */}
                            {msg.isSearch && (
                              <div className={`flex flex-col gap-1 my-2 text-left ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                <div className={`flex items-center gap-1.5 font-bold text-xs ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>
                                  <Globe className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-650 font-bold' : 'text-zinc-400'}`} />
                                  <span>Searching the web</span>
                                </div>
                                <div className={`pl-4 border-l ${isLight ? 'border-zinc-300' : 'border-zinc-855'} mt-1 flex flex-col gap-1 text-[11.5px] font-mono ${isLight ? 'text-zinc-650 hover:text-zinc-850' : 'text-zinc-500 hover:text-zinc-400'} transition-colors`}>
                                  <div className="truncate font-sans font-normal normal-case italic">
                                    {msg.summaryQuery || "Web index records searched."}
                                  </div>
                                  {msg.searchResults && msg.searchResults.slice(0, 3).map((res: any, rIdx: number) => (
                                    <a
                                      key={rIdx}
                                      href={res.uri}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`hover:underline flex items-center gap-1.5 font-sans normal-case m-0 p-0 text-[11.5px] ${isLight ? 'text-zinc-650 hover:text-zinc-850 font-medium' : 'text-zinc-500 hover:text-zinc-400'}`}
                                    >
                                      <span>• {res.title} ({res.domain})</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Google Search Grounding sources (Direct Google citation badges) */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className={`flex flex-col gap-1.5 mb-3 text-left ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                <div className={`flex items-center gap-1.5 font-semibold text-xs ${isLight ? 'text-zinc-800' : 'text-zinc-300'} select-none`}>
                                  <Globe className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                  <span>IsaiahAI Search Grounding references:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {msg.sources.map((src, sIdx) => {
                                    let hostname = 'Grounding link';
                                    try { hostname = new URL(src.uri).hostname; } catch(e){}
                                    return (
                                      <a
                                        key={sIdx}
                                        href={src.uri}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`px-2.5 py-1 bg-zinc-900/40 border border-zinc-800 rounded-lg text-[11px] font-sans hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-1.5 ${isLight ? 'bg-zinc-105/90 border-zinc-250 text-zinc-705 hover:bg-zinc-200' : ''}`}
                                      >
                                        <img src={`https://www.google.com/s2/favicons?sz=32&domain=${hostname}`} alt="" className="w-3.5 h-3.5 rounded shrink-0" referrerPolicy="no-referrer" />
                                        <span className="truncate max-w-[130px]">{src.title || hostname}</span>
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Response Markdown Body & Interactive Quiz Card */}
                            {(() => {
                              const { cleanText, quiz } = parseQuizFromText(msg.content);
                              return (
                                <>
                                  <div className={`markdown-body select-text space-y-1.5 break-words ${isLight ? 'text-zinc-800' : 'text-zinc-200'} mt-2`}>
                                    <Markdown>{formatMathAndFractions(cleanText)}</Markdown>
                                  </div>

                                  {quiz && (
                                    <InteractiveQuizCard
                                      quiz={quiz}
                                      isLight={isLight}
                                    />
                                  )}
                                </>
                              );
                            })()}

                            {/* Dynamically extract and display code blocks as downloadable files */}
                            {(() => {
                              const parsedFiles: { language: string; content: string; filename: string; sizeStr: string }[] = [];
                              try {
                                const matches = [...msg.content.matchAll(/```(\w+)?\n([\s\S]*?)```/g)];
                                matches.forEach((match, idx) => {
                                  const lang = (match[1] || '').toLowerCase();
                                  const content = match[2];
                                  let ext = 'txt';
                                  let filename = `source_code_${idx + 1}`;
                                  
                                  if (lang === 'python' || lang === 'py') {
                                    ext = 'py';
                                    filename = `script_${idx + 1}.py`;
                                  } else if (lang === 'javascript' || lang === 'js') {
                                    ext = 'js';
                                    filename = `app_${idx + 1}.js`;
                                  } else if (lang === 'typescript' || lang === 'ts' || lang === 'tsx') {
                                    ext = 'tsx';
                                    filename = `component_${idx + 1}.tsx`;
                                  } else if (lang === 'html') {
                                    ext = 'html';
                                    filename = `index_${idx + 1}.html`;
                                  } else if (lang === 'css') {
                                    ext = 'css';
                                    filename = `style_${idx + 1}.css`;
                                  } else if (lang === 'json') {
                                    ext = 'json';
                                    filename = `data_${idx + 1}.json`;
                                  } else if (lang) {
                                    ext = lang;
                                    filename = `source_${idx + 1}.${lang}`;
                                  } else {
                                    filename = `code_${idx + 1}.txt`;
                                  }
                                  
                                  const sizeInBytes = new Blob([content]).size;
                                  let sizeStr = `${sizeInBytes} B`;
                                  if (sizeInBytes > 1024) {
                                    sizeStr = `${(sizeInBytes / 1024).toFixed(1)} KB`;
                                  }
                                  parsedFiles.push({ language: lang, content, filename, sizeStr });
                                });
                              } catch (e) {
                                console.error("Failed to parse code blocks for download:", e);
                              }

                              if (parsedFiles.length === 0) return null;

                              return (
                                <div className={`mt-3.5 p-3.5 rounded-xl border ${isLight ? 'bg-amber-50/50 border-amber-100' : 'bg-amber-950/10 border-amber-900/40'} text-left`}>
                                  <div className="flex items-center gap-1.5 mb-2.5">
                                    <FileText className="w-4 h-4 text-amber-500" />
                                    <span className={`text-[11px] font-mono font-bold tracking-wider uppercase ${isLight ? 'text-amber-800 font-bold' : 'text-amber-400 font-bold'}`}>
                                      ⚡ IsaiahAI Generated Code Files ({parsedFiles.length})
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {parsedFiles.map((fileObj, fIdx) => (
                                      <div 
                                        key={fIdx}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${isLight ? 'bg-white border-zinc-200 text-zinc-800 shadow-sm' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'}`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 font-mono text-[10px] font-bold">
                                            {fileObj.filename.split('.').pop()?.toUpperCase() || 'TXT'}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate text-xs font-bold font-mono" title={fileObj.filename}>{fileObj.filename}</div>
                                            <div className="text-[10px] text-zinc-455 font-normal">{fileObj.sizeStr}</div>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            try {
                                              const element = document.createElement("a");
                                              const blob = new Blob([fileObj.content], { type: 'text/plain;charset=utf-8' });
                                              element.href = URL.createObjectURL(blob);
                                              element.download = fileObj.filename;
                                              document.body.appendChild(element);
                                              element.click();
                                              document.body.removeChild(element);
                                            } catch (err) {}
                                          }}
                                          className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors shrink-0 cursor-pointer border border-zinc-200 dark:border-zinc-800 bg-zinc-55 dark:bg-zinc-950/40`}
                                          title="Download code file"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Render image attachments */}
                            {msg.images && msg.images.length > 0 && (
                              <div className="flex flex-wrap gap-2.5 pt-3">
                                {msg.images.map((imgSrc, idx) => (
                                  <img
                                    key={idx}
                                    src={imgSrc}
                                    alt="Generated neural graphic"
                                    referrerPolicy="no-referrer"
                                    className="max-w-full sm:max-w-[480px] h-auto object-contain rounded-2xl border border-zinc-800/80 shadow-2xl hover:scale-[1.01] transition-transform"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Action Row below Markdown text: Copy and Download */}
                            <div className="flex items-center gap-2 mt-4 text-xs font-mono select-none">
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    navigator.clipboard.writeText(msg.content);
                                    setCopiedId(msg.id);
                                    setTimeout(() => setCopiedId(null), 1500);
                                  } catch (err) {}
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 ${isLight ? 'bg-zinc-200/80 border-zinc-250 hover:bg-zinc-300/80 text-zinc-700 hover:text-zinc-955' : 'bg-zinc-900/60 border-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-white'} border rounded-lg transition-all text-[11px] font-semibold cursor-pointer`}
                                title="Copy message to clipboard"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-350" />
                                    <span>Copy Response</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const element = document.createElement("a");
                                    const file = new Blob([msg.content], { type: 'text/markdown;charset=utf-8' });
                                    element.href = URL.createObjectURL(file);
                                    element.download = `isaiah_response_${msg.id}.md`;
                                    document.body.appendChild(element);
                                    element.click();
                                    document.body.removeChild(element);
                                  } catch (err) {}
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 ${isLight ? 'bg-zinc-200/80 border-zinc-250 hover:bg-zinc-300/80 text-zinc-700 hover:text-zinc-955' : 'bg-zinc-900/60 border-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-white'} border rounded-lg transition-all text-[11px] font-semibold cursor-pointer`}
                                title="Save response as a Markdown file"
                              >
                                <Download className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-355" />
                                <span>Download</span>
                              </button>

                              {/* Background Auto-Edited Local PC File Banner */}
                              {msg.localFileEdited && (
                                <div className={`w-full mt-3 rounded-xl p-3 border flex items-center justify-between gap-3 text-left ${
                                  isLight ? 'bg-amber-500/10 border-amber-500/30 text-amber-950' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                                }`}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                        <span>Directly Edited on Computer:</span>
                                        <span className="font-mono text-amber-400 underline">{msg.localFileEdited}</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-400">Code PR updated this file directly in the background on your PC.</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const match = localWorkspaceFiles.find(f => f.name === msg.localFileEdited);
                                        if (match) setSelectedLocalFile(match);
                                        setLocalWorkspaceModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold cursor-pointer shadow-sm"
                                    >
                                      View File on PC
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Prepare Google Doc Button (School Mode & Study Guides) */}
                              {(msg.model === 'school' || chatMode === 'school' || /Study Notes|Google Doc|Learning Objective/i.test(msg.content)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const lines = msg.content.split('\n');
                                    const heading = lines.find(l => /^#+\s+/i.test(l)) || lines[0] || 'Study Notes';
                                    const cleanTitle = heading.replace(/^[#*\s]+/, '').slice(0, 50).trim();
                                    setSchoolDocTitle(cleanTitle || 'Study Guide & Notes');
                                    const { cleanText } = parseQuizFromText(msg.content);
                                    setSchoolDocContent(cleanText);
                                    setSchoolDocModalOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all text-[11px] font-bold cursor-pointer shadow-md"
                                  title="Prepare and sync study notes to Google Docs"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Prepare Google Doc</span>
                                </button>
                              )}

                              {/* Use This Email / Gmail Button */}
                              {/Subject:\s*/i.test(msg.content) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenGmailModal(msg.content)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white border border-red-500/30 rounded-lg transition-all text-[11px] font-bold cursor-pointer shadow-md"
                                  title="Open Gmail email dispatcher with this AI draft"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Use This Email</span>
                                </button>
                              )}
                            </div>

                            {/* ======================= GOOGLE DOC CARD VIEWER ======================= */}
                            {msg.isDoc && (
                              <div className={`mt-3 ${isLight ? 'bg-white/85 border-zinc-250' : 'bg-zinc-950/60 border-zinc-900'} rounded-xl p-4 space-y-3 shadow-md text-left`}>
                                <div className={`flex items-center justify-between border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'} pb-2`}>
                                  <div className="flex items-center gap-2">
                                    <FileText className={`w-4.5 h-4.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                    <span className={`font-mono text-xs ${isLight ? 'text-zinc-800' : 'text-zinc-300'} font-semibold`}>{msg.docTitle || 'St.Amour Draft Document'}</span>
                                  </div>
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest font-bold">READY TO SYNC</span>
                                </div>
                                <p className={`text-[11px] ${isLight ? 'text-zinc-650' : 'text-zinc-400'} leading-relaxed font-sans`}>
                                  Highly polished document text is synthesized. Once you are signed in to Google, click the sync button to build an active live document.
                                </p>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  {syncedDocUrls[msg.id] ? (
                                    <a
                                      href={syncedDocUrls[msg.id]}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Open in Google Docs</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={syncingDocId === msg.id}
                                      onClick={async () => {
                                        setSyncingDocId(msg.id);
                                        try {
                                          const res = await handleDirectGoogleDocsSync(msg.docTitle || 'IsaiahAI Study Guide', msg.content);
                                          if (res.success && res.docUrl) {
                                            setSyncedDocUrls(prev => ({ ...prev, [msg.id]: res.docUrl! }));
                                            try { window.open(res.docUrl, '_blank'); } catch(e){}
                                          }
                                        } finally {
                                          setSyncingDocId(null);
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-105 hover:scale-[1.01] text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      {syncingDocId === msg.id ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Syncing to Google Drive...</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText className="w-3.5 h-3.5" />
                                          <span>Sync to Google Docs</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSchoolDocTitle(msg.docTitle || 'Study Guide & Notes');
                                      const { cleanText } = parseQuizFromText(msg.content);
                                      setSchoolDocContent(formatMathAndFractions(cleanText));
                                      setSchoolDocModalOpen(true);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                                      isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                                    }`}
                                  >
                                    Open Workbench
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ======================= GOOGLE SLIDES CARD VIEWER ======================= */}
                            {msg.isSlides && msg.slidesData && (
                              <SlideCarousel 
                                slidesData={msg.slidesData}
                                googleAccessToken={googleAccessToken}
                                currentUser={currentUser}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Loader placeholder block */}
              {isGenerating && (
                (isSearchingWebActive || (currentSearchPrompt && (
                  currentSearchPrompt.toLowerCase().includes('search') ||
                  currentSearchPrompt.toLowerCase().includes('index') ||
                  currentSearchPrompt.toLowerCase().includes('wikipedia') ||
                  currentSearchPrompt.toLowerCase().includes('duckduck') ||
                  currentSearchPrompt.toLowerCase().includes('lookup') ||
                  currentSearchPrompt.toLowerCase().includes('crawling') ||
                  currentSearchPrompt.toLowerCase().includes('scann') ||
                  currentSearchPrompt.toLowerCase().includes('sweep') ||
                  currentSearchPrompt.toLowerCase().includes('wiki')
                ))) ? (
                  <div className={`max-w-2xl sm:max-w-3xl mx-auto w-full py-3 text-left animate-fade-in flex flex-col gap-1.5 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    <div className={`flex items-center gap-1.5 font-medium text-xs ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      <RotatingWebIcon size={14} color="#f59e0b" className="text-amber-500" />
                      <span className="font-semibold text-xs">Searching the web</span>
                    </div>
                    <div className={`pl-3 ml-1.5 border-l ${isLight ? 'border-zinc-300 text-zinc-600' : 'border-zinc-700 text-zinc-400'} text-[11px] font-normal leading-relaxed`}>
                      {activeSearchQuery || currentSearchPrompt || 'Crawling matching domain indices...'}
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-2xl sm:max-w-3xl mx-auto w-full py-3 text-left animate-fade-in flex items-center gap-2 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.85s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '170ms', animationDuration: '0.85s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '340ms', animationDuration: '0.85s' }} />
                    </div>
                    <span className="tracking-normal text-[11px] font-normal text-zinc-400">Generating response</span>
                  </div>
                )
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Form chat input panel (Beautiful Centered Pill Box matching ChatGPT perfectly) */}
            <div className="p-4 md:px-6 flex-shrink-0 selection:bg-zinc-700 select-none">
              <form 
                onSubmit={handleSendMessage} 
                className={`isaiah-ai-composer mx-auto space-y-3 transition-all duration-300 ${
                  isSidebarOpen ? 'max-w-2xl' : 'max-w-4xl'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const items: { data: string; name: string; mimeType: string }[] = [];
                    for (let i = 0; i < files.length; i++) {
                      try {
                        const base64Obj = await convertFileToBase64(files[i]);
                        items.push(base64Obj);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    if (items.length > 0) {
                      setUploadedImages((prev) => [...prev, ...items]);
                    }
                  }
                }}
              >
                {/* Float Recording Status Indicator */}
                {isListening && (
                  <div className="absolute top-[-52px] left-1/2 transform -translate-x-1/2 bg-red-600/90 border border-red-500/50 text-white font-mono text-[10.5px] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-pulse z-20">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>SPEECH CAPTURING PROTOCOLS RUNNING...</span>
                  </div>
                )}

                {/* Uploaded Images & Files Preview Strip */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pb-3 pl-3 animate-fade-in select-none">
                    {uploadedImages.map((img, idx) => {
                      const isImg = img.mimeType.startsWith('image/');
                      if (isImg) {
                        return (
                          <div key={idx} className="relative w-14 h-14 bg-zinc-805 rounded-lg border border-zinc-750 overflow-hidden group shadow">
                            <img src={img.data} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 text-xs font-bold transition-opacity cursor-pointer"
                              title="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className={`relative max-w-[180px] h-14 ${isLight ? 'bg-zinc-100 border-zinc-250 text-zinc-900 shadow-sm' : 'bg-zinc-850 border-zinc-750 text-zinc-200'} rounded-lg border flex items-center gap-2 px-2.5 py-1.5 overflow-hidden group`}>
                            <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex flex-col min-w-0 pr-4">
                              <span className="text-[10px] font-semibold truncate leading-tight">{img.name}</span>
                              <span className="text-[8px] opacity-60 font-mono tracking-wider uppercase">{img.mimeType.split('/')[1] || 'FILE'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/10 hover:bg-red-505 text-red-500 hover:text-white flex items-center justify-center text-[9px] font-bold transition-colors cursor-pointer"
                              title="Remove attachment"
                            >
                              ×
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}

                {/* School Mode Real Fraction & Math Symbol Quick Toolbar */}
                {chatMode === 'school' && (
                  <div className={`w-full max-w-4xl mx-auto px-3.5 py-2 mb-2 rounded-2xl border flex items-center justify-between gap-2 text-xs overflow-x-auto shadow-sm select-none ${
                    isLight 
                      ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950' 
                      : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                  }`}>
                    <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-400">Real Fractions:</span>
                      {MATH_FRACTION_SYMBOLS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setInputText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + f)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-serif font-bold transition-transform hover:scale-110 cursor-pointer ${
                            isLight ? 'bg-white border border-indigo-200 text-indigo-900 shadow-sm' : 'bg-zinc-900 border border-indigo-500/30 text-white'
                          }`}
                          title={`Insert real fraction ${f}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-400">Math:</span>
                      {MATH_OPERATION_SYMBOLS.slice(0, 8).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setInputText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + m)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-transform hover:scale-110 cursor-pointer ${
                            isLight ? 'bg-white border border-indigo-200 text-indigo-900 shadow-sm' : 'bg-zinc-900 border border-indigo-500/30 text-white'
                          }`}
                          title={`Insert math symbol ${m}`}
                        >
                          {m}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setInputText(prev => formatMathAndFractions(prev))}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-sans font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm ml-1"
                        title="Format any typed fractions (like '1/2' or 'one over two') into real fraction symbols"
                      >
                        Format Fractions
                      </button>
                    </div>
                  </div>
                )}

                {/* MOBILE CHAT BAR (Matching IMG_0315.jpeg with Isaiah AI models) */}
                <div className={`md:hidden relative rounded-[28px] border transition-all p-3.5 shadow-xl ${
                    isLight 
                      ? 'bg-zinc-100/95 border-zinc-300/80 text-zinc-900 shadow-zinc-200/50' 
                      : 'bg-[#212124] border-zinc-750/70 text-zinc-100 shadow-black/40'
                  }`}>
                    {/* Top Row: Input field */}
                    <div className="w-full">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask anything privately"
                        className={`w-full bg-transparent px-1 pt-0.5 pb-2 text-[15px] ${
                          isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-500'
                        } focus:outline-none min-w-0 font-sans caret-sky-500`}
                        disabled={isGenerating}
                      />
                    </div>

                    {/* Bottom Row: Controls Toolbar */}
                    <div className="flex items-center justify-between pt-1 select-none">
                      {/* Left Cluster: Paperclip, Sliders, Zap */}
                      <div className="flex items-center gap-3">
                        {/* 1. Paperclip button -> Opens mobile attachments menu */}
                        <button
                          type="button"
                          onClick={() => setShowMobilePlusMenu(true)}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Attach files or media"
                        >
                          <Paperclip className="w-5 h-5 stroke-[1.8]" />
                        </button>

                        {/* 2. Sliders button -> Quick settings & intelligence toggles */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMobileSlidersMenuOpen(!mobileSlidersMenuOpen)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              mobileSlidersMenuOpen
                                ? 'text-amber-400 bg-amber-500/10'
                                : isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                            }`}
                            title="Search & Intelligence Tools"
                          >
                            <SlidersHorizontal className="w-5 h-5 stroke-[1.8]" />
                          </button>

                          {mobileSlidersMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMobileSlidersMenuOpen(false)} />
                              <div className={`absolute bottom-full left-0 mb-3 w-64 glass-pane border rounded-2xl p-2.5 shadow-2xl z-50 animate-fade-in text-left backdrop-blur-xl ${
                                isLight ? 'bg-white/95 border-zinc-250 text-zinc-900' : 'bg-zinc-950/98 border-zinc-800 text-zinc-100'
                              }`}>
                                <div className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider px-2 py-1 border-b border-zinc-800/50 flex items-center justify-between mb-1.5">
                                  <span>Quick Tools</span>
                                  <span className="text-zinc-500">Settings</span>
                                </div>

                                <div className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                  <Globe className="w-4 h-4 text-amber-500" />
                                  <span>Live web search runs automatically</span>
                                </div>

                                {/* Speech to text mic */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileSlidersMenuOpen(false);
                                    handleMicToggle();
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer mt-1 ${
                                    isListening 
                                      ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                                      : isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'text-zinc-300 hover:bg-zinc-900'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-red-400" />
                                    <span>Voice Dictation</span>
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isListening ? 'bg-red-500/30 text-red-300' : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {isListening ? 'ACTIVE' : 'IDLE'}
                                  </span>
                                </button>

                                {/* Full Settings */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileSlidersMenuOpen(false);
                                    setShowSettings(true);
                                  }}
                                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer mt-1 border-t border-zinc-800/40 pt-1.5"
                                >
                                  <Settings className="w-4 h-4 text-zinc-400" />
                                  <span>Full Settings & Preferences</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleConnectPuter}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${puterConnected ? 'text-emerald-400 bg-emerald-500/10' : isLight ? 'text-violet-500 hover:bg-zinc-200/50' : 'text-violet-300 hover:bg-zinc-800/60'}`}
                          title={puterConnected ? 'Puter AI fallback is connected' : 'Connect Puter AI for a regular-chat backup'}
                          aria-label="Connect Puter AI fallback"
                        >
                          <Sparkles className="w-5 h-5" />
                        </button>

                        {/* 3. Zap button -> Turbo / Fast mode toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAiModel === 'isaiah_5_3') {
                              setSelectedAiModel('isaiah_max_6_0');
                              localStorage.setItem('isaiah_selected_model', 'isaiah_max_6_0');
                            } else {
                              setSelectedAiModel('isaiah_5_3');
                              localStorage.setItem('isaiah_selected_model', 'isaiah_5_3');
                            }
                          }}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            selectedAiModel === 'isaiah_5_3'
                              ? 'text-amber-400'
                              : isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                          }`}
                          title={`Current model: ${selectedAiModel === 'isaiah_5_3' ? '5.3 Flash (Fast)' : selectedAiModel === 'maw_ai' ? 'Maw AI' : selectedAiModel === 'isaiahai_7_super' ? 'IsaiahAI 7.0 SUPER' : 'Max 6.0 (Smart)'} - Tap to toggle 5.3`}
                        >
                          <Zap className="w-5 h-5 stroke-[1.8]" />
                        </button>
                      </div>

                      {/* Right Cluster: Model Selector Pill + Waveform/Send Button */}
                      <div className="flex items-center gap-2">
                        {/* Model Selector Pill (Showing our models) */}
                        <div className="relative select-none">
                          <button
                            type="button"
                            onClick={() => setChatModeDropdownOpen(!chatModeDropdownOpen)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                              isLight
                                ? 'bg-zinc-200/90 hover:bg-zinc-300 text-zinc-800 border border-zinc-300'
                                : 'bg-[#323235] hover:bg-zinc-700/80 text-zinc-100 border border-zinc-700/40'
                            }`}
                            title="Switch Model"
                          >
                            <span className="tracking-tight">
                              {chatMode === 'general'
                                ? (selectedAiModel === 'isaiah_5_3' ? '5.3 Flash' : selectedAiModel === 'maw_ai' ? 'Maw AI' : selectedAiModel === 'isaiahai_7_super' ? '7.0 SUPER' : 'Max 6.0')
                                : chatMode === 'school'
                                ? 'School Mode'
                                : chatMode === 'code'
                                ? 'Code PR'
                                : chatMode === 'code_extended'
                                ? 'Extended'
                                : 'Image Gen'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </button>

                          {chatModeDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setChatModeDropdownOpen(false)} />
                              <div className={`absolute bottom-full right-0 mb-3 w-72 glass-pane border rounded-2xl p-2.5 shadow-2xl z-50 animate-fade-in text-left backdrop-blur-xl ${
                                isLight ? 'bg-white/95 border-zinc-250 text-zinc-900' : 'bg-zinc-950/98 border-zinc-800 text-zinc-100'
                              }`}>
                                <p className="text-[9px] font-mono font-bold text-amber-500 px-2.5 py-1 uppercase tracking-wider border-b border-zinc-800/60 mb-1.5 flex items-center justify-between">
                                  <span>Isaiah AI Models</span>
                                  <span className="text-zinc-500">v8.0</span>
                                </p>

                                {/* Option 1: Isaiah AI 5.3 */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiModel('isaiah_5_3');
                                    localStorage.setItem('isaiah_selected_model', 'isaiah_5_3');
                                    setChatMode('general');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                                    chatMode === 'general' && selectedAiModel === 'isaiah_5_3'
                                      ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                      : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-base">⚡</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                                      <span>Isaiah AI 5.3</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase">Fast</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Ultra-fast general intelligence</div>
                                  </div>
                                  {chatMode === 'general' && selectedAiModel === 'isaiah_5_3' && (
                                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                </button>

                                {/* Option 2: Isaiah Max 6.0 */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiModel('isaiah_max_6_0');
                                    localStorage.setItem('isaiah_selected_model', 'isaiah_max_6_0');
                                    setChatMode('general');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                    chatMode === 'general' && selectedAiModel === 'isaiah_max_6_0'
                                      ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                      : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-base">👑</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                                      <span>Isaiah Max 6.0</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold uppercase">Smart</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Deep cognitive reasoning</div>
                                  </div>
                                  {chatMode === 'general' && selectedAiModel === 'isaiah_max_6_0' && (
                                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                </button>

                                {/* Option 3: Maw AI */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiModel('maw_ai');
                                    localStorage.setItem('isaiah_selected_model', 'maw_ai');
                                    setChatMode('general');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                    chatMode === 'general' && selectedAiModel === 'maw_ai'
                                      ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                      : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-base">🧠</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                                      <span>Maw AI</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold uppercase">Local + Web</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Hybrid logic without API keys</div>
                                  </div>
                                  {chatMode === 'general' && selectedAiModel === 'maw_ai' && (
                                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                </button>

                                {/* Option 4: IsaiahAI 7.0 SUPER */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiModel('isaiahai_7_super');
                                    localStorage.setItem('isaiah_selected_model', 'isaiahai_7_super');
                                    setChatMode('general');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                    chatMode === 'general' && selectedAiModel === 'isaiahai_7_super'
                                      ? 'bg-amber-500/15 text-white border-l-2 border-amber-500'
                                      : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-base">✨</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                                      <span>IsaiahAI 7.0 SUPER</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold uppercase">SUPER</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Advanced reasoning and research</div>
                                  </div>
                                  {chatMode === 'general' && selectedAiModel === 'isaiahai_7_super' && (
                                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                </button>

                                {/* Specialized Modes */}
                                <div className="border-t border-zinc-800/60 my-1 pt-1">
                                  <p className="text-[8px] font-mono font-semibold text-zinc-500 px-2.5 py-0.5 uppercase tracking-wider">Specialized Modes</p>
                                </div>

                                {/* School Mode */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChatMode('school');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                    chatMode === 'school' ? 'bg-indigo-500/15 text-white border-l-2 border-indigo-500' : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-sm">🎓</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                                      <span>School Mode</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase">Tutor + Docs</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Socratic coaching, quizzes & Google Docs</div>
                                  </div>
                                  {chatMode === 'school' && (
                                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  )}
                                </button>

                                {/* Code PR */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChatMode('code');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                    chatMode === 'code' ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-sm">💻</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs ${isLight ? 'text-zinc-900' : 'text-white'}`}>Isaiah AI Code PR</div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Syntax & code analysis</div>
                                  </div>
                                </button>

                                {/* Code PR Extended */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChatMode('code_extended');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                    chatMode === 'code_extended' ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-sm">🚀</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs ${isLight ? 'text-zinc-900' : 'text-white'}`}>Code PR Extended</div>
                                    <div className="text-[9px] text-zinc-400 font-normal">GitHub search & auto-fixes</div>
                                  </div>
                                </button>

                                {/* Image Gen */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChatMode('image');
                                    setChatModeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                    chatMode === 'image' ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' : isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                                  }`}
                                >
                                  <span className="text-sm">🎨</span>
                                  <div className="flex-grow min-w-0">
                                    <div className={`font-semibold text-xs ${isLight ? 'text-zinc-900' : 'text-white'}`}>Isaiah AI Image Gen</div>
                                    <div className="text-[9px] text-zinc-400 font-normal">Text-to-image synthesis</div>
                                  </div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Far Right Circular Button: Waveform (idle) / Send Arrow (typed) */}
                        {inputText.trim() || uploadedImages.length > 0 ? (
                          <button
                            type="submit"
                            disabled={isGenerating}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer font-semibold shadow-md ${
                              isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-100'
                            }`}
                            title="Send Message"
                          >
                            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (isLiveActive) {
                                stopLiveVoiceSession();
                              } else {
                                startLiveVoiceSession();
                              }
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isLiveActive
                                ? 'bg-purple-500/20 text-purple-400 animate-pulse border border-purple-500/40'
                                : isLight
                                ? 'bg-zinc-200/90 text-zinc-800 hover:bg-zinc-300 border border-zinc-300'
                                : 'bg-[#323235] text-zinc-200 hover:bg-zinc-700/80 border border-zinc-700/40'
                            }`}
                            title={isLiveActive ? "Stop Voice Session" : "Start Live Voice"}
                          >
                            <AudioLines className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex relative border rounded-3xl transition-colors items-center px-4 py-2 min-h-[52px] ios-liquid-glass">
                  
                  {/* Hidden Input File Element */}
                  <input
                    type="file"
                    ref={imageInputRef}
                    multiple
                    accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.json"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />

                  {/* Left Side icons - Attachment and Modes */}
                  <div className={`flex items-center gap-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'} pr-1 select-none shrink-0`}>
                    {/* Attachment button + opens scrollable attachment bar sheet */}
                    <button 
                      type="button" 
                      onClick={() => setShowMobilePlusMenu(!showMobilePlusMenu)}
                      className={`p-1.5 ${isLight ? 'hover:text-zinc-900 hover:bg-zinc-200/50' : 'hover:text-white hover:bg-zinc-800/50'} rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-zinc-200`}
                      title="Attach image or file"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    {/* Mode & Model Selector Dropdown (Smooth popup right above typing area) */}
                    <div className="relative select-none">
                      <button
                        type="button"
                        onClick={() => setChatModeDropdownOpen(!chatModeDropdownOpen)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold tracking-wide rounded-full border ${
                          isLight 
                            ? 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200' 
                            : 'border-zinc-750 bg-zinc-800/70 text-zinc-200 hover:bg-zinc-750'
                        } transition-all flex items-center gap-1.5 cursor-pointer shadow-sm`}
                        title="Choose Isaiah AI Model & Modes"
                      >
                        <span>
                          {chatMode === 'general' 
                            ? (selectedAiModel === 'isaiah_5_3' ? '⚡ 5.3 Flash' : selectedAiModel === 'maw_ai' ? '🧠 Maw AI' : selectedAiModel === 'isaiahai_7_super' ? '✨ 7.0 SUPER' : '👑 Max 6.0') 
                            : chatMode === 'school'
                            ? '🎓 School'
                            : chatMode === 'code' 
                            ? '💻 Code PR' 
                            : chatMode === 'code_extended' 
                            ? '🚀 Extended' 
                            : '🎨 Image Gen'}
                        </span>
                        <span className="text-[8px] opacity-60">▼</span>
                      </button>
                      
                      {chatModeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setChatModeDropdownOpen(false)} />
                          <div className="absolute bottom-full left-0 mb-2 w-72 glass-pane border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 bg-zinc-950/98 animate-fade-in text-left backdrop-blur-xl">
                            <p className="text-[9px] font-mono font-bold text-amber-500 px-2.5 py-1 uppercase tracking-wider border-b border-zinc-900 mb-1 flex items-center justify-between">
                              <span>Isaiah AI Core Engine</span>
                              <span className="text-zinc-500">v8.0</span>
                            </p>

                            {/* Option 1: Isaiah AI 5.3 */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAiModel('isaiah_5_3');
                                localStorage.setItem('isaiah_selected_model', 'isaiah_5_3');
                                setChatMode('general');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                                chatMode === 'general' && selectedAiModel === 'isaiah_5_3'
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-base">⚡</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white flex items-center justify-between">
                                  <span>Isaiah AI 5.3</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase">Fast</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 font-normal">Ultra-fast responses & general intelligence</div>
                              </div>
                              {chatMode === 'general' && selectedAiModel === 'isaiah_5_3' && (
                                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </button>

                            {/* Option 2: Isaiah Max 6.0 */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAiModel('isaiah_max_6_0');
                                localStorage.setItem('isaiah_selected_model', 'isaiah_max_6_0');
                                setChatMode('general');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                chatMode === 'general' && selectedAiModel === 'isaiah_max_6_0'
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-base">👑</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white flex items-center justify-between">
                                  <span>Isaiah Max 6.0</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold uppercase">Smart</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 font-normal">Deep cognitive reasoning & rich synthesis</div>
                              </div>
                              {chatMode === 'general' && selectedAiModel === 'isaiah_max_6_0' && (
                                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </button>

                            {/* Option 3: Maw AI */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAiModel('maw_ai');
                                localStorage.setItem('isaiah_selected_model', 'maw_ai');
                                setChatMode('general');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                chatMode === 'general' && selectedAiModel === 'maw_ai'
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-base">🧠</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white flex items-center justify-between">
                                  <span>Maw AI</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold uppercase">Local + Web</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 font-normal">Hybrid logic without API keys</div>
                              </div>
                              {chatMode === 'general' && selectedAiModel === 'maw_ai' && (
                                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </button>

                            {/* Option 4: IsaiahAI 7.0 SUPER */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAiModel('isaiahai_7_super');
                                localStorage.setItem('isaiah_selected_model', 'isaiahai_7_super');
                                setChatMode('general');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-1 ${
                                chatMode === 'general' && selectedAiModel === 'isaiahai_7_super'
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500'
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-base">✨</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white flex items-center justify-between">
                                  <span>IsaiahAI 7.0 SUPER</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold uppercase">SUPER</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 font-normal">Advanced reasoning and research</div>
                              </div>
                              {chatMode === 'general' && selectedAiModel === 'isaiahai_7_super' && (
                                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </button>

                            <div className="border-t border-zinc-900/80 my-1 pt-1">
                              <p className="text-[8px] font-mono font-semibold text-zinc-500 px-2.5 py-0.5 uppercase tracking-wider">Specialized Modes</p>
                            </div>

                            {/* Option 2.5: School Mode */}
                            <button
                              type="button"
                              id="school-mode-mobile-dropdown-option"
                              onClick={() => {
                                setChatMode('school');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                chatMode === 'school'
                                  ? 'bg-indigo-500/15 text-white border-l-2 border-indigo-500'
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-sm">🎓</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white flex items-center justify-between">
                                  <span>School Mode</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase">Tutor + Docs</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 font-normal">Socratic study & Google Docs prep</div>
                              </div>
                              {chatMode === 'school' && (
                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              )}
                            </button>

                            {/* Option 3: Code PR Mode */}
                            <button
                              type="button"
                              id="code-pr-dropdown-option"
                              onClick={() => {
                                setChatMode('code');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                chatMode === 'code' 
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-sm">💻</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white">Isaiah AI Code PR</div>
                                <div className="text-[9px] text-zinc-400 font-normal">Python & JavaScript syntax expert</div>
                              </div>
                            </button>

                            {/* Option 4: Code PR Extended */}
                            <button
                              type="button"
                              id="code-pr-extended-dropdown-option"
                              onClick={() => {
                                setChatMode('code_extended');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                chatMode === 'code_extended' 
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-sm">🚀</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white">Code PR Extended</div>
                                <div className="text-[9px] text-zinc-400 font-normal">GitHub search & auto-fix execution</div>
                              </div>
                            </button>

                            {/* Option 5: Image Gen */}
                            <button
                              type="button"
                              id="image-generation-dropdown-option"
                              onClick={() => {
                                setChatMode('image');
                                setChatModeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer mt-0.5 ${
                                chatMode === 'image' 
                                  ? 'bg-amber-500/15 text-white border-l-2 border-amber-500' 
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
                              }`}
                            >
                              <span className="text-sm">🎨</span>
                              <div className="flex-grow min-w-0">
                                <div className="font-semibold text-xs text-white">Isaiah AI Image Gen</div>
                                <div className="text-[9px] text-zinc-400 font-normal">Dynamic text-to-image synthesis</div>
                              </div>
                            </button>

                          </div>
                        </>
                      )}
                    </div>

                    {!isMobile && (
                      /* DESKTOP WEB SEARCH, DEEPTHINK & COMPUTER FILE ACCESS */
                      <div className="flex items-center gap-1.5">
                        {/* Computer File Access controls for Code PR */}
                        {localWorkspaceConnected ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setLocalWorkspaceModalOpen(true)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                              title={`Connected to PC: ${selectedLocalFile?.name || localDirName}. Click to view & inspect files.`}
                            >
                              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                              <span className="max-w-[130px] truncate">{selectedLocalFile?.name || localDirName}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </button>
                            <button
                              type="button"
                              onClick={handleDisconnectLocalWorkspace}
                              className="p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                              title="Disconnect computer file access"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (chatMode === 'code' || chatMode === 'code_extended') ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleConnectLocalFile}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
                              title="Grant access to an HTML file on your computer for automatic background editing"
                            >
                              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                              <span>Connect HTML File</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleConnectLocalFolder}
                              className="px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-all cursor-pointer"
                              title="Connect local project folder"
                            >
                              <span>Folder</span>
                            </button>
                          </div>
                        ) : null}

                        {(chatMode === 'general' || chatMode === 'code' || chatMode === 'code_extended') && (
                          <div className={`hidden xl:flex items-center gap-1.5 text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`} title="Live web search is automatic">
                            <Globe className="w-3.5 h-3.5 text-amber-500" />
                            <span>Auto web search</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isMobile ? (chatMode === 'school' ? "Ask a study problem..." : "Ask Isaiah AI") : chatMode === 'school' ? "Ask a study problem or topic (Math, Science, History, Coding) - I'll guide you step-by-step..." : chatMode === 'code_extended' ? "Request an extended code generation with web search and auto-fixes..." : chatMode === 'code' ? "Paste Python/JS code or request a Code PR review..." : chatMode === 'image' ? "Specify details - e.g., 'An astronaut cat on Jupiter'..." : "Ask anything — IsaiahAI automatically searches the web when useful..."}
                    className={`flex-1 bg-transparent px-2.5 py-2 text-sm ${isLight ? 'text-zinc-900 placeholder:text-zinc-450' : 'text-white placeholder:text-zinc-400'} focus:outline-none min-w-0 font-sans`}
                    disabled={isGenerating}
                  />

                  {/* Right Side buttons inside input pill */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isListening 
                          ? 'text-red-500 bg-red-500/10 animate-pulse' 
                          : `text-zinc-400 ${isLight ? 'hover:text-zinc-900 hover:bg-zinc-200/55' : 'hover:text-white hover:bg-zinc-800/50'}`
                      }`}
                      title={isListening ? "Stop Voice Input" : "Start Voice Input"}
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleConnectPuter}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${puterConnected ? 'text-emerald-400 bg-emerald-500/10' : isLight ? 'text-violet-500 hover:bg-zinc-200/50' : 'text-violet-300 hover:bg-zinc-800/60'}`}
                      title={puterConnected ? 'Puter AI fallback is connected' : 'Connect Puter AI for a regular-chat backup'}
                      aria-label="Connect Puter AI fallback"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>

                    {/* Live Voice Audio Session Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isLiveActive) {
                          stopLiveVoiceSession();
                        } else {
                          startLiveVoiceSession();
                        }
                      }}
                      className={`w-9 h-9 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        isLiveActive 
                          ? 'text-purple-400 bg-purple-500/20 animate-pulse border border-purple-500/30' 
                          : 'bg-sky-500/15 text-sky-500 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:text-sky-400'
                      }`}
                      title={isLiveActive ? "Disconnect Isaiah AI Voice Grid" : "Start Live Voice Chat"}
                    >
                      <Headphones className="w-4 h-4" />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={isGenerating || (!inputText.trim() && uploadedImages.length === 0)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        inputText.trim() || uploadedImages.length > 0
                          ? `${isLight ? 'bg-zinc-900 text-white hover:bg-zinc-855' : 'bg-white text-black'} font-semibold cursor-pointer shadow-sm` 
                          : `${isLight ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-800 text-zinc-500'} cursor-not-allowed`
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Suggested Search Topics (Shown when chat mode is 'General') */}
                {chatMode === 'general' && (
                  <div className="w-full overflow-x-auto no-scrollbar py-1 flex items-center gap-2 animate-fade-in select-none">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-500 font-semibold shrink-0 pl-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Suggested:</span>
                    </div>
                    {[
                      { label: '🌐 Tech News', query: 'What are the latest tech news and breakthroughs today?' },
                      { label: '🧬 Quantum Computing', query: 'Explain quantum computing and its latest developments in simple terms' },
                      { label: '🚀 Space Exploration', query: 'What are the recent major achievements in space exploration?' },
                      { label: '📈 Global Markets', query: 'Give me a summary of current global economic and market trends' },
                      { label: '🤖 AI & Future', query: 'What are the key discussions around AI safety and future technological impacts?' },
                      { label: '🔬 Renewable Energy', query: 'What are the latest innovations in renewable energy technology?' },
                      { label: '🎨 Design Trends', query: 'What are the top UI/UX and visual design trends in 2026?' },
                      { label: '💡 Productivity Hacks', query: 'What are the most effective science-backed productivity techniques?' },
                      { label: '🎬 Movies & Culture', query: 'What are the top critically acclaimed movies and cultural highlights this year?' }
                    ].map((topic, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setInputText(topic.query);
                        }}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-sans transition-all flex items-center gap-1 cursor-pointer border ${
                          isLight 
                            ? 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border-zinc-200' 
                            : 'bg-zinc-850/80 hover:bg-zinc-800 text-zinc-300 border-zinc-750/80'
                        }`}
                      >
                        <span>{topic.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-zinc-500 font-sans tracking-wide text-center leading-normal">
                  IsaiahAI can make mistakes. Branded and built by **St.Amour Electronics**. Powered by Antigravity.
                </p>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* 4. SETTINGS MODAL INTERFACES */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 5. ATTACHMENT / PLUS MENU BOTTOM SHEET (Matching IMG_1426.jpeg) */}
      {showMobilePlusMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-50 animate-fade-in backdrop-blur-xs" 
            onClick={() => setShowMobilePlusMenu(false)} 
          />
          {/* Bottom Sheet Card */}
          <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] border-t p-4 shadow-2xl animate-slide-up max-w-lg mx-auto ${
            isLight ? 'bg-zinc-100 border-zinc-250 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
          }`}>
            {/* Top Drag/Grab Handle */}
            <div className="w-12 h-1.5 rounded-full bg-zinc-500/40 mx-auto mb-4 cursor-pointer" onClick={() => setShowMobilePlusMenu(false)} />

            {/* Horizontal Scrollable Attach Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 px-1 scrollbar-hide">
              {/* Photos tile */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  imageInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center min-w-[88px] h-[88px] rounded-2xl p-2 transition-all border cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-900 hover:bg-zinc-300/80' 
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-100 hover:bg-zinc-750'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mb-1.5">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Photos</span>
              </button>

              {/* Camera tile */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  if (cameraInputRef.current) {
                    cameraInputRef.current.click();
                  } else {
                    imageInputRef.current?.click();
                  }
                }}
                className={`flex flex-col items-center justify-center min-w-[88px] h-[88px] rounded-2xl p-2 transition-all border cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-900 hover:bg-zinc-300/80' 
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-100 hover:bg-zinc-750'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center mb-1.5">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Camera</span>
              </button>

              {/* Avatar tile */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  setChatMode('image');
                  setInputText((prev) => prev ? `${prev} [Avatar]` : "Generate a sleek custom 3D avatar profile picture: ");
                }}
                className={`flex flex-col items-center justify-center min-w-[88px] h-[88px] rounded-2xl p-2 transition-all border cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-900 hover:bg-zinc-300/80' 
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-100 hover:bg-zinc-750'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center mb-1.5">
                  <Ghost className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Avatar</span>
              </button>

              {/* Files tile */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  imageInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center min-w-[88px] h-[88px] rounded-2xl p-2 transition-all border cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-900 hover:bg-zinc-300/80' 
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-100 hover:bg-zinc-750'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1.5">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Files</span>
              </button>

              {/* Audio tile */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  startLiveVoiceSession();
                }}
                className={`flex flex-col items-center justify-center min-w-[88px] h-[88px] rounded-2xl p-2 transition-all border cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-900 hover:bg-zinc-300/80' 
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-100 hover:bg-zinc-750'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-1.5">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Audio</span>
              </button>
            </div>

            {/* Vertical list section matching IMG_1426.jpeg */}
            <div className="space-y-1 pt-2 border-t border-zinc-800/60">
              {/* Option 1: Images */}
              <button
                type="button"
                onClick={() => {
                  setChatMode('image');
                  setShowMobilePlusMenu(false);
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isLight ? 'hover:bg-zinc-200/80' : 'hover:bg-zinc-800/80'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-200 shrink-0">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-semibold text-sm leading-snug">Images</div>
                  <div className="text-xs text-zinc-400 font-normal">Create and edit</div>
                </div>
              </button>

              {/* Option 2: Music */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePlusMenu(false);
                  startLiveVoiceSession();
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isLight ? 'hover:bg-zinc-200/80' : 'hover:bg-zinc-800/80'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-200 shrink-0">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-semibold text-sm leading-snug">Music & Audio</div>
                  <div className="text-xs text-zinc-400 font-normal">Make audio tracks & live voice</div>
                </div>
              </button>

              {/* Option 3: Canvas */}
              <button
                type="button"
                onClick={() => {
                  setChatMode('code_extended');
                  setShowMobilePlusMenu(false);
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isLight ? 'hover:bg-zinc-200/80' : 'hover:bg-zinc-800/80'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-200 shrink-0">
                  <Layers className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-semibold text-sm leading-snug">Canvas</div>
                  <div className="text-xs text-zinc-400 font-normal">Code, write, or make slides</div>
                </div>
              </button>

              <div className={`mx-1 my-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900/70 text-zinc-400'}`}>
                <Globe className="w-4 h-4 text-amber-500" />
                <span>Web search is automatic</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Siri Floating Top Intelligent Banner (Dynamic Apple Island style) */}
      {siriActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-11/12 glass-pane border border-sky-500 rounded-3xl p-4.5 shadow-2xl text-white animate-fade-in flex items-center gap-4 bg-zinc-950/90 [box-shadow:0_0_25px_rgba(56,189,248,0.2)]">
          <div className="relative w-12 h-12 shrink-0 rounded-full bg-slate-900 border border-sky-500/30 flex items-center justify-center select-none overflow-hidden">
            <div className={`absolute inset-0.5 rounded-full bg-gradient-to-tr from-sky-500 via-purple-500 to-lime-400 opacity-20 ${siriSpeaking ? 'animate-spin duration-3000' : ''}`} />
            <div className={`w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center font-bold text-base relative z-10 text-sky-400 ${siriSpeaking ? 'scale-110 animate-bounce' : ''}`}>
              🎙️
            </div>
            {siriSpeaking && (
              <span className="absolute bottom-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
            )}
          </div>
          
          <div className="flex-grow min-w-0 text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                IsaiahAI Siri Shortcut Active
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setSiriActive(false);
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="text-zinc-500 hover:text-white text-xs font-bold leading-none px-1.5 py-0.5 rounded hover:bg-zinc-900 cursor-pointer"
              >
                × Close
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 italic truncate mb-0.5 font-mono">
              "Ask IsaiahAI: {siriSpeechText}"
            </p>
            <p className="text-xs text-white leading-relaxed font-sans tracking-wide">
              {siriResponseText}
            </p>
          </div>
        </div>
      )}

      {/* Siri Shortcut Setup & Simulation Modal */}
      {showSiriModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full glass-pane border border-sky-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden bg-zinc-950/95 animate-scale-up">
            <div className="absolute top-[-40px] right-[-40px] w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center font-bold text-lg text-sky-400 shadow-inner">
                🎙️
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-white tracking-tight text-left">Siri Shortcut Activated!</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest text-left">Apple Ecosystem Integration</p>
              </div>
            </div>
            
            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed text-left">
              <p>
                IsaiahAI voice integration is now added. You can invoke IsaiahAI anytime on your iPhone, iPad, or Mac:
              </p>
              
              <div className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-mono text-[11px]">
                  <span>1. Siri Command Phrase</span>
                </div>
                <p className="text-zinc-400 leading-snug">
                  Simply say: <span className="bg-zinc-950 text-white font-semibold font-mono px-2 py-0.5 rounded border border-zinc-800 text-[11.5px]">"Ask IsaiahAI {`{your question}`} "</span>
                </p>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-mono text-[11px]">
                  <span>2. Dynamic Speech Synthesis</span>
                </div>
                <p className="text-zinc-400 leading-snug">
                  The AI voice responder compiles dynamic text-to-speech out loud and flashes a dynamic island banner at the top of your active node screen.
                </p>
              </div>

              {/* Siri Simulation Box */}
              <div className="bg-sky-950/20 border border-sky-500/20 p-4 rounded-xl space-y-2.5">
                <span className="font-bold text-sky-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  Try Voice Command Simulator
                </span>
                <p className="text-zinc-405 text-[11px] leading-snug pb-1">
                  Type a simulated voice query below to test speech output & top-of-screen text banners instantly.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="siri-sim-text-box"
                    placeholder="e.g., Explain gravity in one sentence?"
                    className="flex-1 bg-zinc-950/80 border border-zinc-800 text-white text-[11px] px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 placeholder:text-zinc-700 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value;
                        if (val.trim()) {
                          handleSimulateSiriRequest(val);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('siri-sim-text-box') as HTMLInputElement;
                      if (el && el.value.trim()) {
                        handleSimulateSiriRequest(el.value);
                        el.value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold font-mono rounded-lg text-[10px] tracking-wide uppercase transition-colors shrink-0 cursor-pointer"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2.5 border-t border-zinc-900 pt-4">
              <button
                type="button"
                onClick={() => {
                  try {
                    const textContent = `=====================================================
IsaiahAI Siri Shortcut & Search Assistant Configuration
=====================================================
Branded and developed by St.Amour Electronics

IsaiahAI's Search Assistant is fully integrated with Siri and Apple Shortcuts!
Our backend automatically detects requests made by Siri/Shortcuts, scrapes live web data in real-time, and generates speech-synthesized intelligent summaries.

HOW TO CONFIGURE YOUR APPLE SIRI SHORTCUT:
------------------------------------------
1. Open the "Shortcuts" app on your iPhone, iPad, or Mac.
2. Tap "+" in the top right to create a new Shortcut.
3. Rename the shortcut to "Ask IsaiahAI" (this is the voice command phrase).
4. Add the following Actions in precise order:

   [ACTION 1] "Dictate Text"
   - Language: English (or your preferred language)
   - Stop dictation: After a pause

   [ACTION 2] "URL"
   - Enter the API gateway URL:
     https://${window.location.host}/api/shortcut?q=
   - Tap on the blue empty area after the "=" and choose "Dictated Text" as a variable.
     (Final look: https://${window.location.host}/api/shortcut?q=[Dictated Text])

   [ACTION 3] "Get Contents of URL"
   - Set the action to fetch from the URL specified above.
   - Expand the action by clicking ">" or "Show More" and make sure:
     * Method is GET
     * Headers are left as default

   [ACTION 4] "Speak Text"
   - Select "Contents of URL" as the input to speak out loud.
   - Customize speed, pitch, or voice as desired to match IsaiahAI's deep cognitive voice profile.

HOW TO USE IT VIA VOICE:
------------------------
1. Say: "Hey Siri, Ask IsaiahAI"
2. Siri will prompt you: "What text?" (or listen immediately).
3. Say your question out loud (e.g., "Latest space news", "Who won yesterday's football game?").
4. Siri will query live web indexes through IsaiahAI, read back the response out loud, and output the text directly!

AUTHENTICATION DETAILS:
-----------------------
Account UID: ${currentUser?.uid || 'guest'}
Workspace Host: ${window.location.host}
`;
                    const blob = new Blob([textContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'IsaiahAI_Siri_Shortcut.txt';
                    link.click();
                  } catch (e) {}
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold font-mono rounded-xl text-[10.5px] tracking-wide uppercase transition-colors mr-auto cursor-pointer"
                title="Download shortcut configuration instructions file"
              >
                Config Details
              </button>
              <button
                type="button"
                onClick={() => setShowSiriModal(false)}
                className="px-5 py-2 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-zinc-950 font-bold font-mono rounded-xl text-[10.5px] tracking-wide uppercase transition-transform hover:scale-[1.02] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

       {/* 6. USERNAME SETUP DIALOG OVERLAY */}
      {usernameSetupRequired && (
        <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/40 p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl shadow-amber-950/25 text-center animate-scale-up">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/35 rounded-full flex items-center justify-center mx-auto text-xl">
                ⚡
              </div>
              <h3 className="font-display font-bold text-lg text-white tracking-tight">Set Your St.Amour Alias</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                You've successfully connected your Google Account! Please establish your personal username before chatting to activate premium persistent state-saving.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (chosenUsernameText.trim()) {
                  handleSaveUserProfile(chosenUsernameText);
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                required
                maxLength={20}
                placeholder="Enter handle (e.g. isaiah_86)"
                value={chosenUsernameText}
                onChange={(e) => setChosenUsernameText(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-amber-400 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono tracking-wide"
              />

              <div className="flex gap-2.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    await handleGoogleSignOut();
                  }}
                  className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 hover:text-zinc-300 rounded-xl font-semibold tracking-wide border border-zinc-805 transition-colors uppercase cursor-pointer"
                >
                  Disconnect
                </button>
                <button
                  type="submit"
                  disabled={!chosenUsernameText.trim()}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold tracking-wide transition-all uppercase cursor-pointer"
                >
                  Save Alias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CREDENTIALS AUTHENTICATION FORM MODAL */}
      {false && (
        <div id="credentials-auth-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in text-slate-100">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer border-0"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-1 border-b border-zinc-800">
              <ShieldCheck className="text-amber-500 w-5 h-5 animate-pulse" />
              <div>
                <h5 className="font-display font-semibold text-base text-white leading-tight">Isaiah Account Authorization</h5>
                <p className="text-[9px] text-zinc-400 font-mono">COGNITIVE USER NODE REGISTER</p>
              </div>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all border-0 ${
                  authMode === 'login' 
                    ? 'bg-zinc-800 text-amber-400 border border-zinc-700/60 shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                LOG IN
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all border-0 ${
                  authMode === 'signup' 
                    ? 'bg-zinc-800 text-amber-400 border border-zinc-700/60 shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                SIGN UP
              </button>
            </div>

            {/* Email + Password Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!authEmail.trim() || !authPassword.trim()) {
                  setShareNotice("Please specify email and password values.");
                  return;
                }
                setAuthLoading(true);
                try {
                  if (authMode === 'login') {
                    await (window as any).logInUser(authEmail, authPassword);
                  } else {
                    await (window as any).signUpUser(authEmail, authPassword);
                  }
                  setShowAuthModal(false);
                  setAuthEmail('');
                  setAuthPassword('');
                } catch (err: any) {
                  console.warn("Credentials Auth Action fail:", err);
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="space-y-3.5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Email Address</label>
                <input
                  id="credentials-email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  disabled={authLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Password</label>
                <input
                  id="credentials-password"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  disabled={authLoading}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || !authEmail.trim() || !authPassword.trim()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-display font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0"
              >
                {authLoading ? (
                  <div className="w-3.5 h-3.5 border-t-2 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{authMode === 'login' ? 'Confirm Log In' : 'Register Account'}</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* Google Authentication redirect */}
            <button
              type="button"
              onClick={async () => {
                setShowAuthModal(false);
                await setShowAuthModal(true);
              }}
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition-all border border-zinc-800 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-500" />
              <span>Continue with Google Account</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IsaiahAI Real-time Live FaceTime Voice Modal */}
      {/* ============================================================ */}
      <FaceTimeVoiceModal 
        isOpen={isLiveActive} 
        onClose={stopLiveVoiceSession} 
        liveStatus={liveStatus} 
        liveVolume={liveVolume} 
      />

      {/* ============================================================ */}
      {/* Gmail Email Dispatcher Modal */}
      {/* ============================================================ */}
      <GmailComposeModal
        isOpen={gmailModalOpen}
        onClose={() => setGmailModalOpen(false)}
        initialSubject={gmailModalSubject}
        initialBody={gmailModalBody}
        currentUser={currentUser}
        googleAccessToken={googleAccessToken}
        onGoogleSignIn={async () => { await handleGoogleSignIn(); }}
      />

      {/* ============================================================ */}
      {/* Shareable Conversation URL Modal */}
      {/* ============================================================ */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        sessionTitle={activeSession?.title || 'IsaiahAI Conversation'}
        messageCount={activeSession?.messages.length || 0}
        shareUrl={shareUrl}
      />

      {/* ============================================================ */}
      {/* Computer Local File Workspace Modal (Code PR PC File Inspector & Live Preview) */}
      {/* ============================================================ */}
      <LocalFileWorkspaceModal
        isOpen={localWorkspaceModalOpen}
        onClose={() => setLocalWorkspaceModalOpen(false)}
        dirName={localDirName}
        files={localWorkspaceFiles}
        activeFile={selectedLocalFile}
        onSelectFile={(f) => {
          setSelectedLocalFile(f);
          localFileHandleRef.current = f.handle;
        }}
        onUpdateFileContent={handleUpdateLocalFileContent}
        isLight={isLight}
        onAskCodePR={(prompt) => {
          setLocalWorkspaceModalOpen(false);
          setInputText(prompt);
          setChatMode('code');
        }}
      />

      {/* ============================================================ */}
      {/* Google Docs School Mode Study Workbench Modal */}
      {/* ============================================================ */}
      <SchoolDocSyncModal
        isOpen={schoolDocModalOpen}
        onClose={() => setSchoolDocModalOpen(false)}
        initialTitle={schoolDocTitle}
        studyContent={schoolDocContent}
        googleAccessToken={googleAccessToken}
        onUpdateGoogleAccessToken={(token) => {
          setGoogleAccessToken(token);
          sessionStorage.setItem('google_access_token', token);
          localStorage.setItem('google_access_token', token);
        }}
        currentUser={currentUser}
        isLight={isLight}
      />

      {/* Local File Action / Background Edit Toast Notification */}
      {localFileNotice && (
        <div className="fixed bottom-20 md:bottom-24 right-6 z-[120] bg-zinc-950/95 border border-amber-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in font-sans backdrop-blur-xl">
          <HardDrive className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <span className="text-xs font-semibold">{localFileNotice}</span>
          <button
            onClick={() => setLocalFileNotice(null)}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Share Toast Notification */}
      {shareNotice && (
        <div className="fixed bottom-6 right-6 z-[120] bg-zinc-900 border border-amber-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in font-sans">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{shareNotice}</span>
          <button
            onClick={() => setShareNotice(null)}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Optional Chrome extension download popup; existing app design remains unchanged. */}
      <ChromeExtensionPrompt />

      {/* Image generation is handled directly in chat powered behind-the-scenes by Claude AI & Puter, credited to Isaiahsi */}

    </div>
  );
}
