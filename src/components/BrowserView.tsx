import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, Globe, Settings, Shield, ChevronDown, ChevronUp, X, 
  ArrowLeft, ArrowRight, Home, RotateCw, ExternalLink, Loader2, HelpCircle, 
  MessageSquare, Play, Clock, Eye, Calendar, User, Gamepad2, Check,
  MoreVertical, Bookmark, History, Lock, Key, LogIn, LogOut, EyeOff, Trash2, Plus, RefreshCw,
  Flame, Menu, Star, Share, ZoomIn, Monitor, Download, Headphones, Printer, AlertTriangle,
  Bot, ImageIcon, Copy, Info, LayoutGrid, MoreHorizontal
} from 'lucide-react';
import Markdown from 'react-markdown';
import { BrandLogo } from './BrandLogo';
import { GamesDashboard } from './GamesDashboard';
import { RotatingWebIcon } from './RotatingWebIcon';
import { LiveWebProxyViewer } from './LiveWebProxyViewer';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, getDoc, setDoc, addDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, where, deleteDoc, isFirebaseConfigured
} from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';

interface BrowserViewProps {
  customBackgroundUrl?: string;
  onGoToChat: () => void;
  onContinueWithPrompt?: (prompt: string) => void;
  onGoToMode?: (mode: 'general'|'code'|'image'|'games'|'voice') => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  theme?: string;
  userNickname?: string;
  onShowAuthModal: () => void;
  onUpdateTheme?: (theme: string) => void;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  subLinks?: { title: string; url: string }[];
}

interface ImageResult {
  title: string;
  url: string;
  imageUrl: string;
  siteName: string;
}

interface VideoResult {
  title: string;
  url: string;
  duration: string;
  views: string;
  uploaded: string;
  thumbnail: string;
  siteName: string;
}

interface NewsResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  time: string;
  imageUrl?: string;
}

const normalizeSearchResultUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const parsed = new URL(value.trim());
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.href;
  } catch {
    return value.trim();
  }
};

const getFaviconUrl = (urlStr: string) => {
  try {
    const urlObj = new URL(urlStr);
    return `https://www.google.com/s2/favicons?sz=64&domain=${urlObj.hostname}`;
  } catch (e) {
    return null;
  }
};

export function BrowserView({ 
  onGoToChat,
  onContinueWithPrompt,
  onGoToMode,
  isSidebarOpen, 
  onToggleSidebar,
  theme = 'light_glass',
  userNickname = 'Guest',
  onShowAuthModal
, customBackgroundUrl, onUpdateTheme}: BrowserViewProps) {
  const isLight = theme === 'light_glass';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ 
    assistantSummary: string; 
    assistantDetailedSummary: string;
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
    news: NewsResult[];
  } | null>(null);

  const searchRequestIdRef = useRef(0);
  const briefRequestIdRef = useRef(0);
  const moreRequestIdRef = useRef(0);
  const moreLinksOffsetRef = useRef(0);
  const [continueChatText, setContinueChatText] = useState('');
  const [savedSources, setSavedSources] = useState<{ title: string; url: string; snippet: string; siteName: string; savedAt: string }[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('isaiah_search_reading_list') || '[]');
      return Array.isArray(stored) ? stored.filter((item: any) => item && typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) : [];
    } catch {
      return [];
    }
  });
  const [showSavedSources, setShowSavedSources] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [localPlacesData, setLocalPlacesData] = useState<{
    city: string;
    lat: number;
    lng: number;
    places: any[];
  } | null>(null);
  const [localPlacesLoading, setLocalPlacesLoading] = useState(false);
  const mapIframeRef = useRef<HTMLIFrameElement>(null);

  // Expanded state for longer description
  const [assistExpanded, setAssistExpanded] = useState(false);

  // Search Assist state: 'never' | 'on_demand' | 'sometimes' | 'often'
  const [assistSetting, setAssistSetting] = useState<'never' | 'on_demand' | 'sometimes' | 'often'>('sometimes');
  // Search Settings State
  const [appearanceLayout, setAppearanceLayout] = useState<'standard' | 'dense'>('dense');
  const [urlPlacement, setUrlPlacement] = useState<'Above Title' | 'Below Title'>('Above Title');
  const [showSiteNames, setShowSiteNames] = useState(true);
  const [showSiteIcons, setShowSiteIcons] = useState(true);
  const [searchFontSize, setSearchFontSize] = useState<'Small' | 'Medium' | 'Large'>('Large');
  const [searchFont, setSearchFont] = useState('Isaiah Sans (default)');
  const [compactResults, setCompactResults] = useState(false);
  const [infiniteScroll, setInfiniteScroll] = useState(true);
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(true);
  const [settingsDropdown, setSettingsDropdown] = useState<'none' | 'url' | 'font_size' | 'font' | 'search_engine' | 'safe_search'>('none');

  const [settingsActiveTab, setSettingsActiveTab] = useState<'search' | 'appearance' | 'general' | 'privacy'>('search');
  const [quickDotsMenuOpen, setQuickDotsMenuOpen] = useState<boolean>(false);

  // Search Engine & Safe Search Global Preferences
  const [preferredSearchEngine, setPreferredSearchEngine] = useState<string>(() => {
    return localStorage.getItem('isaiah_preferred_search_engine') || 'Isaiah Engine (Default)';
  });
  const [safeSearchFilter, setSafeSearchFilter] = useState<'Strict' | 'Moderate' | 'Off'>(() => {
    const saved = localStorage.getItem('isaiah_safe_search_filter');
    if (saved === 'Strict' || saved === 'Moderate' || saved === 'Off') return saved;
    return 'Moderate';
  });
  const [searchEngineDropdownOpen, setSearchEngineDropdownOpen] = useState<boolean>(false);
  const [safeSearchDropdownOpen, setSafeSearchDropdownOpen] = useState<boolean>(false);

  const handleSelectSearchEngine = (engine: string) => {
    setPreferredSearchEngine(engine);
    localStorage.setItem('isaiah_preferred_search_engine', engine);
    showToast(`Preferred Search Engine set to ${engine}`);
  };

  const handleSelectSafeSearch = (level: 'Strict' | 'Moderate' | 'Off') => {
    setSafeSearchFilter(level);
    localStorage.setItem('isaiah_safe_search_filter', level);
    showToast(`Safe Search filter set to ${level}`);
  };

  const handleResetSettings = () => {
    setPreferredSearchEngine('Isaiah Engine (Default)');
    localStorage.setItem('isaiah_preferred_search_engine', 'Isaiah Engine (Default)');
    setSafeSearchFilter('Moderate');
    localStorage.setItem('isaiah_safe_search_filter', 'Moderate');
    setAppearanceLayout('dense');
    setUrlPlacement('Above Title');
    setShowSiteNames(true);
    setShowSiteIcons(true);
    setSearchFontSize('Large');
    setSearchFont('Duck Sans (default)');
    setCompactResults(false);
    setInfiniteScroll(true);
    setOpenLinksInNewTab(true);
    showToast("Settings reset to defaults!");
  };

  const [showRainbowRing, setShowRainbowRing] = useState(true);
  const [assistOpen, setAssistOpen] = useState(true);

  useEffect(() => {
    if (assistOpen) {
      setShowRainbowRing(true);
      const timer = setTimeout(() => setShowRainbowRing(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [assistOpen, activeSearch]);

  // BotPenguin Support Bot: Only present on the search main page (!activeSearch)
  useEffect(() => {
    const scriptId = 'messenger-widget-b';
    const cleanupBot = () => {
      const scriptElem = document.getElementById(scriptId);
      if (scriptElem) scriptElem.remove();
      const botElements = document.querySelectorAll(
        '#messenger-widget-b, [id*="botpenguin"], [class*="botpenguin"], iframe[src*="botpenguin"], div[id*="bp-"], div[class*="bp-"]'
      );
      botElements.forEach(el => el.remove());
      // Clear global botpenguin instances if any
      try {
        if ((window as any).botpenguin) {
          delete (window as any).botpenguin;
        }
      } catch (e) {}
    };

    if (activeSearch) {
      cleanupBot();
      return;
    }

    cleanupBot();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.botpenguin.com/website-bot.js';
    script.defer = true;
    script.textContent = '6a8bd67bef3c88df50eec2e4,6a8bcd386a9fef532d2e720a';
    document.body.appendChild(script);

    return () => {
      cleanupBot();
    };
  }, [activeSearch]);

  // Filter dropdown state toggles (for realistic UX)
  const [regionOpen, setRegionOpen] = useState(false);
  const [safeSearchOpen, setSafeSearchOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Images' | 'Videos' | 'News' | 'More'>('All');

  // --- BROWSER FEATURES & LOGIN SYSTEM STATE ---
  const [incognito, setIncognito] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; loggedIn: boolean } | null>(() => {
    const saved = localStorage.getItem('isaiah_browser_profile');
    return saved ? JSON.parse(saved) : { username: 'Guest', loggedIn: false };
  });

  const [historyList, setHistoryList] = useState<{ query: string; title?: string; timestamp: string; incognito: boolean; type?: 'search' | 'website' }[]>(() => {
    const saved = localStorage.getItem('isaiah_browser_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [bookmarksList, setBookmarksList] = useState<{ title: string; query: string }[]>(() => {
    const saved = localStorage.getItem('isaiah_browser_bookmarks');
    return saved ? JSON.parse(saved) : [
      { title: 'IsaiahSearch', query: 'IsaiahSearch' },
      { title: 'YouTube Trending', query: 'youtube trending' },
      { title: 'Wikipedia Tech News', query: 'wikipedia tech news' }
    ];
  });

  const [savedPasswords, setSavedPasswords] = useState<{ site: string; user: string; pass: string }[]>(() => {
    const saved = localStorage.getItem('isaiah_browser_passwords');
    return saved ? JSON.parse(saved) : [];
  });

  const [restoredSession, setRestoredSession] = useState<string | null>(() => {
    return localStorage.getItem('isaiah_browser_last_session') || null;
  });

  // Recent 5 web search queries state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('isaiah_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveRecentSearch = (queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('isaiah_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const removeRecentSearch = (queryToRemove: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s.toLowerCase() !== queryToRemove.toLowerCase());
      try {
        localStorage.setItem('isaiah_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'history' | 'bookmarks' | 'passwords' | 'login'>('none');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPasswordState, setLoginPasswordState] = useState('');
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});

  const [newSite, setNewSite] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isAddingPass, setIsAddingPass] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkQuery, setNewBookmarkQuery] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);

  // Summaries
  const [briefSummary, setBriefSummary] = useState('');
  const [addonSummary, setAddonSummary] = useState('');
  const [typedSummary, setTypedSummary] = useState('');
  const [typedDetailed, setTypedDetailed] = useState('');
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTypingBrief, setIsTypingBrief] = useState(false);
  const [isTypingMore, setIsTypingMore] = useState(false);

  // --- SET AS MAIN BROWSER & LOAD MORE LINKS ---
  const [showMainBrowserModal, setShowMainBrowserModal] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [showTabsModal, setShowTabsModal] = useState(false);
  const [tabs, setTabs] = useState<Array<{ id: string; title: string; url?: string; searchQuery?: string; activeSearch?: string }>>(() => {
    try {
      const saved = localStorage.getItem('isaiah_browser_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[Browser] Error loading saved tabs from storage:', e);
    }
    return [{ id: '1', title: 'New Tab', url: '', searchQuery: '', activeSearch: '' }];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return localStorage.getItem('isaiah_browser_active_tab_id') || '1';
  });
  const [isLoadingMoreLinks, setIsLoadingMoreLinks] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // --- NEW FEATURE AND BROWSER STATE EXTENSIONS ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [desktopMode, setDesktopMode] = useState<boolean>(false);
  const [findInPageOpen, setFindInPageOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [findMatches, setFindMatches] = useState<number>(0);
  const [findCurrentIndex, setFindCurrentIndex] = useState<number>(0);
  const [privacyProtectionEnabled, setPrivacyProtectionEnabled] = useState<boolean>(true);
  const [vpnConnected, setVpnConnected] = useState<boolean>(true);
  const [showDownloadsPanel, setShowDownloadsPanel] = useState<boolean>(false);
  const [showAddPasswordModal, setShowAddPasswordModal] = useState<boolean>(false);
  const [newPassTitle, setNewPassTitle] = useState<string>('');
  const [newPassNotes, setNewPassNotes] = useState<string>('');
  const [showExpandedResultsPage, setShowExpandedResultsPage] = useState<boolean>(false);
  const [expandedResultsPage, setExpandedResultsPage] = useState<number>(1);
  const expandedPageSize = 10;
  const expandedResultCount = searchResults?.results?.length || 0;
  const expandedPageCount = Math.max(1, Math.ceil(expandedResultCount / expandedPageSize));
  const expandedPageResults = (searchResults?.results || []).slice(
    (expandedResultsPage - 1) * expandedPageSize,
    expandedResultsPage * expandedPageSize
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  const handleSaveNewPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const site = newSite.trim() || newPassTitle.trim() || 'example.com';
    const user = newUser.trim() || 'user@example.com';
    const pass = newPass.trim() || 'password';
    if (!site || !user || !pass) return;

    const entry = { site, user, pass, title: newPassTitle, notes: newPassNotes };
    const updated = [...savedPasswords, entry];
    setSavedPasswords(updated);

    if (auth?.currentUser && db) {
      try {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'passwords'), entry);
      } catch (err) {
        console.error('[Firebase] Error syncing password:', err);
      }
    }

    setNewSite('');
    setNewUser('');
    setNewPass('');
    setNewPassTitle('');
    setNewPassNotes('');
    setIsAddingPass(false);
    setShowAddPasswordModal(false);
    showToast("Saved password to Isaiah Search Google Account!");
  };

  const handleZoomCycle = () => {
    let nextZoom = 100;
    if (zoomLevel === 100) nextZoom = 115;
    else if (zoomLevel === 115) nextZoom = 130;
    else if (zoomLevel === 130) nextZoom = 85;
    else nextZoom = 100;
    setZoomLevel(nextZoom);
    showToast(`Page Zoom: ${nextZoom}%`);
  };

  const handleAddBookmarkDirect = () => {
    const title = activeSearch ? `Search: ${activeSearch}` : 'Isaiah Search Home';
    const queryStr = activeSearch || '';
    if (bookmarksList.some(b => b.query.toLowerCase() === queryStr.toLowerCase() && b.title === title)) {
      showToast("Already in Bookmarks");
      return;
    }
    const updated = [...bookmarksList, { title, query: queryStr }];
    setBookmarksList(updated);
    if (isFirebaseConfigured && auth?.currentUser && db) {
      setDoc(doc(db, 'user_bookmarks', auth.currentUser.uid), {
        bookmarks: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.error('[Firebase] Bookmarks sync error:', err));
    }
    localStorage.setItem('isaiah_browser_bookmarks', JSON.stringify(updated));
    showToast("Added to Bookmarks!");
  };

  const handleAddFavoriteDirect = () => {
    const title = activeSearch ? `Search: ${activeSearch}` : 'Isaiah Search Home';
    const queryStr = activeSearch || '';
    if (bookmarksList.some(b => b.query.toLowerCase() === queryStr.toLowerCase() && b.title.includes(title))) {
      showToast("Already in Favorites");
      return;
    }
    const updated = [...bookmarksList, { title: `⭐ ${title}`, query: queryStr }];
    setBookmarksList(updated);
    if (isFirebaseConfigured && auth?.currentUser && db) {
      setDoc(doc(db, 'user_bookmarks', auth.currentUser.uid), {
        bookmarks: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.error('[Firebase] Favorites sync error:', err));
    }
    localStorage.setItem('isaiah_browser_bookmarks', JSON.stringify(updated));
    showToast("Added to Favorites!");
  };

  const handleShareDirect = () => {
    const shareUrl = activeSearch ? `${window.location.origin}/?q=${encodeURIComponent(activeSearch)}` : window.location.origin;
    if (navigator.share) {
      navigator.share({
        title: activeSearch ? `Isaiah Search - ${activeSearch}` : 'Isaiah Search',
        url: shareUrl
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl)
          .then(() => showToast("Link copied to clipboard!"))
          .catch(() => showToast("Failed to copy link"));
      });
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => showToast("Link copied to clipboard!"))
        .catch(() => showToast("Failed to copy link"));
    }
  };

  useEffect(() => {
    if (!findQuery.trim() || !searchResults) {
      setFindMatches(0);
      setFindCurrentIndex(0);
      return;
    }
    const textToSearch = JSON.stringify(searchResults.results) + " " + briefSummary;
    const regex = new RegExp(findQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const matches = textToSearch.match(regex);
    const count = matches ? matches.length : 0;
    setFindMatches(count);
    setFindCurrentIndex(count > 0 ? 1 : 0);
  }, [findQuery, searchResults, briefSummary]);

  const [activeSetupTab, setActiveSetupTab] = useState<'chrome' | 'firefox' | 'safari' | 'edge'>('chrome');

  // --- DEVELOPER BETA & ACCESS PORTAL STATES ---
  const [betaRequestName, setBetaRequestName] = useState('');
  const [betaRequestEmail, setBetaRequestEmail] = useState('');
  const [betaRequestComments, setBetaRequestComments] = useState('');
  const [betaRequestStatus, setBetaRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [betaRequestError, setBetaRequestError] = useState('');

  const [devBetaLoginEmail, setDevBetaLoginEmail] = useState('');
  const [devBetaLoginPassword, setDevBetaLoginPassword] = useState('');
  const [devBetaLoginError, setDevBetaLoginError] = useState('');
  const [devBetaLoginLoading, setDevBetaLoginLoading] = useState(false);

  const [hasDevBetaAccess, setHasDevBetaAccess] = useState(false);
  const [adminBetaRequests, setAdminBetaRequests] = useState<any[]>([]);
  const [adminAuthorizedEmails, setAdminAuthorizedEmails] = useState<any[]>([]);
  const [newAuthorizeEmailInput, setNewAuthorizeEmailInput] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
    }
  };

  const handleCopyQueryUrl = () => {
    const queryUrl = `${window.location.origin}/?q=%s`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(queryUrl)
          .then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
          })
          .catch(() => {
            fallbackCopy(queryUrl);
          });
      } else {
        fallbackCopy(queryUrl);
      }
    } catch (e) {
      fallbackCopy(queryUrl);
    }
  };

  // Store the latest handleSearchSubmit in a ref to use in the popstate listener
  const handleSearchSubmitRef = useRef<((e?: React.FormEvent, forcedQuery?: string, skipPushState?: boolean) => Promise<void>) | null>(null);

  // Assign the ref during render so it's always up-to-date and never null in effects
  // We'll define the function later but we can assign it if we just hoist the function definition or handle it later.
  // Actually, wait. I can't assign it here if handleSearchSubmit is not yet defined.
  // I will leave it as is and assign it below the function definition.

  // Auto-search if q or search parameter is present in URL, or path-based query
  useEffect(() => {
    const handleUrlState = (skipPushState = false) => {
      const params = new URLSearchParams(window.location.search);
      let q = params.get('q') || params.get('search');
      
      if (!q) {
        const path = window.location.pathname;
        if (path && path !== '/' && path !== '/index.html' && !path.startsWith('/api') && !path.includes('.')) {
          try {
            // Decode path component and replace '+' or '%20' with spaces
            q = decodeURIComponent(path.slice(1)).replace(/\+/g, ' ');
          } catch (e) {
            console.error('[Routing] Error decoding pathname:', e);
          }
        }
      }
      
      if (q) {
        setSearchQuery(q);
        if (handleSearchSubmitRef.current) {
          handleSearchSubmitRef.current(undefined, q, skipPushState);
        }
      } else {
        setActiveSearch('');
        setSearchQuery('');
        setSearchResults(null);
      }
    };

    // Initial check on mount
    handleUrlState(true);

    const onPopState = () => {
      handleUrlState(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // --- FIREBASE AND LOCAL PERSISTENCE SYNCHRONIZERS ---
  useEffect(() => {
    localStorage.setItem('isaiah_browser_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Handle Firebase Auth subscription and cloud database syncing
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        setUserProfile({
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Firebase User',
          loggedIn: true
        });

        // 1. Fetch History from Cloud Firestore
        if (db) {
          try {
            const histSnap = await getDocs(query(collection(db, 'users', uid, 'history'), orderBy('createdAt', 'desc')));
            if (!histSnap.empty) {
              const histData = histSnap.docs.map(d => ({
                query: d.data().query,
                title: d.data().title || d.data().query,
                timestamp: d.data().timestamp,
                incognito: d.data().incognito || false,
                type: d.data().type || (d.data().query?.startsWith('http') ? 'website' : 'search')
              }));
              setHistoryList(histData);
            }
          } catch (e) {
            console.warn('[Firebase] History fetch bypassed/failed:', e);
            const savedLocal = localStorage.getItem(`isaiah_history_${uid}`);
            if (savedLocal) setHistoryList(JSON.parse(savedLocal));
          }

          // 2. Fetch Bookmarks from Cloud Firestore (Google Account sync)
          try {
            const userBookmarkDoc = await getDoc(doc(db, 'user_bookmarks', uid));
            if (userBookmarkDoc.exists() && userBookmarkDoc.data()?.bookmarks) {
              const cloudBookmarks = userBookmarkDoc.data().bookmarks;
              setBookmarksList(cloudBookmarks);
              localStorage.setItem(`isaiah_bookmarks_${uid}`, JSON.stringify(cloudBookmarks));
            } else {
              const bookSnap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
              if (!bookSnap.empty) {
                const bookData = bookSnap.docs.map(d => ({
                  title: d.data().title,
                  query: d.data().query
                }));
                setBookmarksList(bookData);
                await setDoc(doc(db, 'user_bookmarks', uid), { bookmarks: bookData, updatedAt: new Date().toISOString() }, { merge: true });
                localStorage.setItem(`isaiah_bookmarks_${uid}`, JSON.stringify(bookData));
              } else {
                const savedLocal = localStorage.getItem(`isaiah_bookmarks_${uid}`);
                if (savedLocal) setBookmarksList(JSON.parse(savedLocal));
              }
            }
          } catch (e) {
            console.warn('[Firebase] Bookmarks fetch error, using local fallback:', e);
            const savedLocal = localStorage.getItem(`isaiah_bookmarks_${uid}`);
            if (savedLocal) setBookmarksList(JSON.parse(savedLocal));
          }

          // 3. Fetch Passwords from Cloud Firestore
          try {
            const passSnap = await getDocs(collection(db, 'users', uid, 'passwords'));
            if (!passSnap.empty) {
              const passData = passSnap.docs.map(d => ({
                site: d.data().site,
                user: d.data().user,
                pass: d.data().pass
              }));
              setSavedPasswords(passData);
            }
          } catch (e) {
            console.warn('[Firebase] Passwords fetch bypassed/failed:', e);
            const savedLocal = localStorage.getItem(`isaiah_passwords_${uid}`);
            if (savedLocal) setSavedPasswords(JSON.parse(savedLocal));
          }
        }
      } else {
        // Logged out / Guest Mode
        setUserProfile({ username: 'Guest', loggedIn: false });
        const savedHist = localStorage.getItem('isaiah_browser_history');
        setHistoryList(savedHist ? JSON.parse(savedHist) : []);
        const savedBook = localStorage.getItem('isaiah_browser_bookmarks');
        setBookmarksList(savedBook ? JSON.parse(savedBook) : [
          { title: 'DuckDuckGo AI Chat', query: 'duckduckgo ai chat' },
          { title: 'YouTube Trending', query: 'youtube trending' },
          { title: 'Wikipedia Tech News', query: 'wikipedia tech news' }
        ]);
        const savedPass = localStorage.getItem('isaiah_browser_passwords');
        setSavedPasswords(savedPass ? JSON.parse(savedPass) : []);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- DEVELOPER BETA ACCESS CHECK & ADMIN SYNC ---
  useEffect(() => {
    if (!auth || !db) return;
    
    let reqsUnsub: (() => void) | null = null;
    let authUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up existing admin subscriptions if any
      if (reqsUnsub) { reqsUnsub(); reqsUnsub = null; }
      if (authUnsub) { authUnsub(); authUnsub = null; }

      if (firebaseUser && firebaseUser.email) {
        const email = firebaseUser.email.toLowerCase();
        
        // Check if admin or allowlisted in authorized_emails
        if (email === 'azndibroblox2@gmail.com') {
          setHasDevBetaAccess(true);
          
          // Load developer lists and beta requests for admin view
          setAdminLoading(true);
          try {
            // Subscribe to real-time updates for beta requests
            reqsUnsub = onSnapshot(
              query(collection(db, 'beta_requests'), orderBy('createdAt', 'desc')),
              (snapshot) => {
                const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAdminBetaRequests(reqs);
              },
              (err) => console.error('[Admin] Error subscribing to beta requests:', err)
            );
            
            // Subscribe to real-time updates for authorized emails
            authUnsub = onSnapshot(
              collection(db, 'authorized_emails'),
              (snapshot) => {
                const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAdminAuthorizedEmails(emails);
              },
              (err) => console.error('[Admin] Error subscribing to authorized emails:', err)
            );
            
            setAdminLoading(false);
          } catch (e) {
            console.error('[Admin] Failed to initialize admin feeds:', e);
            setAdminLoading(false);
          }
        } else {
          // Normal user: check if they are authorized
          try {
            const docRef = doc(db, 'authorized_emails', email);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setHasDevBetaAccess(true);
            } else {
              setHasDevBetaAccess(false);
            }
          } catch (e) {
            console.warn('[Beta] Error checking beta authorization status:', e);
            setHasDevBetaAccess(false);
          }
        }
      } else {
        setHasDevBetaAccess(false);
        setAdminBetaRequests([]);
        setAdminAuthorizedEmails([]);
      }
    });
    
    return () => {
      unsubscribe();
      if (reqsUnsub) reqsUnsub();
      if (authUnsub) authUnsub();
    };
  }, [db, auth]);

  // Save changes locally
  useEffect(() => {
    if (userProfile && userProfile.loggedIn) {
      const key = auth?.currentUser?.uid || userProfile.username;
      localStorage.setItem(`isaiah_history_${key}`, JSON.stringify(historyList));
    } else {
      localStorage.setItem('isaiah_browser_history', JSON.stringify(historyList));
    }
  }, [historyList, userProfile]);

  useEffect(() => {
    if (userProfile && userProfile.loggedIn) {
      const key = auth?.currentUser?.uid || userProfile.username;
      localStorage.setItem(`isaiah_bookmarks_${key}`, JSON.stringify(bookmarksList));
    } else {
      localStorage.setItem('isaiah_browser_bookmarks', JSON.stringify(bookmarksList));
    }
  }, [bookmarksList, userProfile]);

  useEffect(() => {
    if (userProfile && userProfile.loggedIn) {
      const key = auth?.currentUser?.uid || userProfile.username;
      localStorage.setItem(`isaiah_passwords_${key}`, JSON.stringify(savedPasswords));
    } else {
      localStorage.setItem('isaiah_browser_passwords', JSON.stringify(savedPasswords));
    }
  }, [savedPasswords, userProfile]);

  // Sync tabs and active tab to local device storage
  useEffect(() => {
    try {
      localStorage.setItem('isaiah_browser_tabs', JSON.stringify(tabs));
    } catch (e) {
      console.warn('[Browser] Failed to save tabs to local storage:', e);
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem('isaiah_browser_active_tab_id', activeTabId);
    } catch (e) {
      console.warn('[Browser] Failed to save active tab id to local storage:', e);
    }
  }, [activeTabId]);

  // Typewriter effect for Brief Summary
  useEffect(() => {
    if (!briefSummary) {
      setTypedSummary('');
      return;
    }
    setIsTypingBrief(true);
    setTypedSummary('');
    const words = briefSummary.split(' ');
    let index = 0;
    let current = '';
    const timer = setInterval(() => {
      if (index < words.length) {
        current += (index === 0 ? '' : ' ') + words[index];
        setTypedSummary(current);
        index++;
      } else {
        clearInterval(timer);
        setIsTypingBrief(false);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [briefSummary]);

  // typedDetailed is populated during the stream smoothly, no need to auto-copy it.

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) return;
    const username = loginUsername.trim();
    setUserProfile({ username, loggedIn: true });

    const savedUserHistory = localStorage.getItem(`isaiah_history_${username}`);
    setHistoryList(savedUserHistory ? JSON.parse(savedUserHistory) : []);

    const savedUserBookmarks = localStorage.getItem(`isaiah_bookmarks_${username}`);
    setBookmarksList(savedUserBookmarks ? JSON.parse(savedUserBookmarks) : [
      { title: 'DuckDuckGo AI Chat', query: 'duckduckgo ai chat' },
      { title: 'YouTube Trending', query: 'youtube trending' },
      { title: 'Wikipedia Tech News', query: 'wikipedia tech news' }
    ]);

    const savedUserPasswords = localStorage.getItem(`isaiah_passwords_${username}`);
    setSavedPasswords(savedUserPasswords ? JSON.parse(savedUserPasswords) : []);

    setActivePanel('none');
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setUserProfile({ username: 'Guest', loggedIn: false });
    setHistoryList([]);
    setBookmarksList([
      { title: 'DuckDuckGo AI Chat', query: 'duckduckgo ai chat' },
      { title: 'YouTube Trending', query: 'youtube trending' },
      { title: 'Wikipedia Tech News', query: 'wikipedia tech news' }
    ]);
    setSavedPasswords([]);
    setMenuOpen(false);
    setActivePanel('none');
  };

  const renderFeatureModals = () => {
    if (activePanel === 'none') return null;

    const handleClose = () => {
      setActivePanel('none');
      setLoginError('');
      setNewSite('');
      setNewUser('');
      setNewPass('');
      setIsAddingPass(false);
      setNewBookmarkTitle('');
      setNewBookmarkQuery('');
      setIsAddingBookmark(false);
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      if (!loginUsername || !loginPasswordState) {
        setLoginError('Email and Password are required.');
        return;
      }
      if (loginPasswordState.length < 6) {
        setLoginError('Password must be at least 6 characters.');
        return;
      }
      try {
        await createUserWithEmailAndPassword(auth, loginUsername, loginPasswordState);
        handleClose();
      } catch (err: any) {
        setLoginError(err.message || 'Registration failed.');
      }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      if (!loginUsername || !loginPasswordState) {
        setLoginError('Email and Password are required.');
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, loginUsername, loginPasswordState);
        handleClose();
      } catch (err: any) {
        setLoginError(err.message || 'Invalid email or password.');
      }
    };

    const handleGoogleLogin = async () => {
      setLoginError('');
      try {
        await signInWithPopup(auth, googleProvider);
        handleClose();
      } catch (err: any) {
        setLoginError(err.message || 'Google authentication failed.');
      }
    };

    const handleAddBookmarkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const title = newBookmarkTitle.trim();
      const queryStr = newBookmarkQuery.trim();
      if (!title || !queryStr) return;

      const updated = [...bookmarksList, { title, query: queryStr }];
      setBookmarksList(updated);

      if (auth?.currentUser && db) {
        try {
          await setDoc(doc(db, 'user_bookmarks', auth.currentUser.uid), {
            bookmarks: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          localStorage.setItem(`isaiah_bookmarks_${auth.currentUser.uid}`, JSON.stringify(updated));
        } catch (err) {
          console.error('[Firebase] Error syncing bookmark to Google account:', err);
        }
      } else {
        localStorage.setItem('isaiah_browser_bookmarks', JSON.stringify(updated));
      }

      setNewBookmarkTitle('');
      setNewBookmarkQuery('');
      setIsAddingBookmark(false);
      showToast("Saved bookmark to your account!");
    };

    const handleDeleteBookmark = async (bookmarkToDelete: { title: string; query: string }) => {
      const updated = bookmarksList.filter(b => !(b.title === bookmarkToDelete.title && b.query === bookmarkToDelete.query));
      setBookmarksList(updated);

      if (auth?.currentUser && db) {
        try {
          await setDoc(doc(db, 'user_bookmarks', auth.currentUser.uid), {
            bookmarks: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          localStorage.setItem(`isaiah_bookmarks_${auth.currentUser.uid}`, JSON.stringify(updated));
        } catch (err) {
          console.error('[Firebase] Error updating bookmark in Google account:', err);
        }
      } else {
        localStorage.setItem('isaiah_browser_bookmarks', JSON.stringify(updated));
      }
      showToast("Removed bookmark");
    };

    const handleAddPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const site = newSite.trim() || newPassTitle.trim() || 'example.com';
      const user = newUser.trim() || 'user@example.com';
      const pass = newPass.trim() || 'password';
      if (!site || !user || !pass) return;

      const entry = { site, user, pass, title: newPassTitle, notes: newPassNotes };
      const updated = [...savedPasswords, entry];
      setSavedPasswords(updated);

      if (auth?.currentUser && db) {
        try {
          await addDoc(collection(db, 'users', auth.currentUser.uid, 'passwords'), entry);
        } catch (err) {
          console.error('[Firebase] Error syncing password:', err);
        }
      }

      setNewSite('');
      setNewUser('');
      setNewPass('');
      setNewPassTitle('');
      setNewPassNotes('');
      setIsAddingPass(false);
      setShowAddPasswordModal(false);
      showToast("Saved password to Isaiah Search Google Account!");
    };

    const handleDeletePassword = async (passToDelete: { site: string; user: string; pass: string }) => {
      const updated = savedPasswords.filter(p => !(p.site === passToDelete.site && p.user === passToDelete.user && p.pass === passToDelete.pass));
      setSavedPasswords(updated);

      if (auth?.currentUser && db) {
        try {
          const q = query(collection(db, 'users', auth.currentUser.uid, 'passwords'), where('site', '==', passToDelete.site), where('user', '==', passToDelete.user));
          const snap = await getDocs(q);
          for (const docRef of snap.docs) {
            await deleteDoc(docRef.ref);
          }
        } catch (err) {
          console.error('[Firebase] Error deleting password:', err);
        }
      }
    };

    const handleClearHistory = async () => {
      setHistoryList([]);
      if (auth?.currentUser && db) {
        try {
          const snap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'history'));
          for (const docRef of snap.docs) {
            await deleteDoc(docRef.ref);
          }
        } catch (err) {
          console.error('[Firebase] Error clearing history:', err);
        }
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
        <div 
          onClick={(e) => e.stopPropagation()} 
          className={`w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[85vh] transition-all transform animate-scale-up ${
            incognito 
              ? 'bg-zinc-900 border-zinc-800 text-white shadow-purple-950/20' 
              : 'bg-white border-zinc-200 text-zinc-800 shadow-zinc-300/30'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${incognito ? 'border-zinc-800 bg-zinc-850' : 'border-zinc-150 bg-zinc-50'}`}>
            <div className="flex items-center gap-2.5">
              {activePanel === 'history' && <History className="w-5 h-5 text-indigo-500" />}
              {activePanel === 'bookmarks' && <Bookmark className="w-5 h-5 text-indigo-500" />}
              {activePanel === 'passwords' && <Key className="w-5 h-5 text-indigo-500" />}
              {activePanel === 'login' && <User className="w-5 h-5 text-indigo-500" />}
              <span className="font-bold text-sm tracking-wide uppercase font-sans">
                {activePanel === 'history' && 'Browsing History'}
                {activePanel === 'bookmarks' && 'Bookmarks Manager'}
                {activePanel === 'passwords' && 'Saved Passwords Vault'}
                {activePanel === 'login' && (isRegistering ? 'Create Firebase Account' : 'Connect Firebase Account')}
              </span>
            </div>
            <button 
              onClick={handleClose}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                incognito ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-650'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Scroll Area */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
            {/* 1. LOGIN SYSTEM */}
            {activePanel === 'login' && (
              <div className="space-y-4">
                <p className={`text-xs ${incognito ? 'text-zinc-400' : 'text-zinc-550'} leading-relaxed`}>
                  Authorize secure Cloud Sync for your bookmarks, query records, and passwords. All records are shielded inside Firestore cloud protection.
                </p>

                {loginError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={isRegistering ? handleEmailRegister : handleEmailLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className={`w-full text-xs h-10 px-3 rounded-xl border focus:outline-none ${
                        incognito 
                          ? 'bg-zinc-800 border-zinc-700 text-white focus:border-zinc-600' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-300'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPasswordState}
                      onChange={(e) => setLoginPasswordState(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full text-xs h-10 px-3 rounded-xl border focus:outline-none ${
                        incognito 
                          ? 'bg-zinc-800 border-zinc-700 text-white focus:border-zinc-600' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-300'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    {isRegistering ? 'Create Account & Enable Cloud Sync' : 'Sign In'}
                  </button>
                </form>

                <div className="relative py-2 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${incognito ? 'border-zinc-800' : 'border-zinc-200'}`} />
                  </div>
                  <span className={`relative px-3 text-[10px] font-bold uppercase tracking-widest ${incognito ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'}`}>
                    or connect via provider
                  </span>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className={`w-full h-11 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-50/5 transition-colors cursor-pointer ${
                    incognito ? 'border-zinc-800 bg-zinc-850 hover:bg-zinc-800 text-white' : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.147 4.114-3.41 0-6.173-2.762-6.173-6.17s2.763-6.171 6.173-6.171c1.558 0 2.978.579 4.075 1.53l3.056-3.057C19.143 2.802 15.914 1.5 12.24 1.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c5.36 0 9.76-3.878 9.76-9.75 0-.648-.057-1.296-.171-1.965H12.24z" />
                  </svg>
                  <span>Connect with Google Single Sign-On</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-xs text-indigo-500 hover:underline font-bold"
                  >
                    {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                  </button>
                </div>
              </div>
            )}

            {/* 2. BROWSING HISTORY */}
            {activePanel === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${incognito ? 'text-zinc-400' : 'text-zinc-500'} font-semibold`}>
                    Showing {historyList.length} indexed visits & searches
                  </span>
                  {historyList.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {historyList.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 space-y-1">
                    <History className="w-8 h-8 text-zinc-350 mx-auto opacity-50 mb-1" />
                    <p className="text-xs font-semibold">Your browsing history is empty</p>
                    <p className="text-[10px] text-zinc-500 leading-normal">Websites opened and searches performed will be saved here automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {historyList.map((hist, idx) => {
                      const isWebpage = hist.type === 'website' || /^https?:\/\//i.test(hist.query) || (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(hist.query) && !hist.query.includes(' '));
                      const displayTitle = hist.title || hist.query;
                      let displayDomain = '';
                      if (isWebpage) {
                        try {
                          const urlObj = new URL(hist.query.startsWith('http') ? hist.query : `https://${hist.query}`);
                          displayDomain = urlObj.hostname;
                        } catch (e) {
                          displayDomain = hist.query;
                        }
                      }

                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between group transition-colors ${
                            incognito ? 'bg-zinc-850/50 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200/60'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (isWebpage) {
                                openWebpage(hist.query, hist.title);
                              } else {
                                handleSearchSubmit(undefined, hist.query);
                                setActiveSearch(hist.query);
                              }
                              handleClose();
                            }}
                            className="flex-1 text-left flex items-start gap-2.5 min-w-0 cursor-pointer"
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isWebpage 
                                ? (incognito ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600')
                                : (incognito ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600')
                            }`}>
                              {isWebpage ? <Globe className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="block font-semibold text-xs text-zinc-800 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                                  {displayTitle}
                                </span>
                                {isWebpage && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                                    Website
                                  </span>
                                )}
                              </div>
                              {isWebpage && displayDomain && (
                                <span className="text-[10px] text-zinc-400 block truncate font-mono mt-0.5">
                                  {hist.query}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-450 font-mono flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {hist.timestamp}
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const updated = historyList.filter((_, i) => i !== idx);
                              setHistoryList(updated);
                              if (auth?.currentUser && db) {
                                try {
                                  const q = query(collection(db, 'users', auth.currentUser.uid, 'history'), where('query', '==', hist.query));
                                  const snap = await getDocs(q);
                                  for (const docRef of snap.docs) {
                                    await deleteDoc(docRef.ref);
                                  }
                                } catch (e) {
                                  console.error('[Firebase] History delete fail:', e);
                                }
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0 ml-2"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. BOOKMARKS MANAGER */}
            {activePanel === 'bookmarks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${incognito ? 'text-zinc-400' : 'text-zinc-550'} font-semibold`}>
                    Total Bookmarks: {bookmarksList.length}
                  </span>
                  <button
                    onClick={() => setIsAddingBookmark(!isAddingBookmark)}
                    className="text-xs text-indigo-500 hover:text-indigo-600 font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingBookmark ? 'Close Form' : 'Add Bookmark'}</span>
                  </button>
                </div>

                {isAddingBookmark && (
                  <form onSubmit={handleAddBookmarkSubmit} className={`p-4 rounded-xl border space-y-3.5 animate-scale-up ${
                    incognito ? 'bg-zinc-850 border-zinc-750' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <h5 className="font-bold text-xs">Add New Bookmark</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Bookmark Name</label>
                        <input
                          type="text"
                          required
                          value={newBookmarkTitle}
                          onChange={(e) => setNewBookmarkTitle(e.target.value)}
                          placeholder="e.g. Google Maps"
                          className={`w-full text-xs h-9 px-3 rounded-lg border focus:outline-none ${
                            incognito ? 'bg-zinc-800 border-zinc-750 text-white focus:border-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-300'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Search Query / Keyword</label>
                        <input
                          type="text"
                          required
                          value={newBookmarkQuery}
                          onChange={(e) => setNewBookmarkQuery(e.target.value)}
                          placeholder="e.g. google maps new york"
                          className={`w-full text-xs h-9 px-3 rounded-lg border focus:outline-none ${
                            incognito ? 'bg-zinc-800 border-zinc-750 text-white focus:border-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-300'
                          }`}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Save Bookmark
                    </button>
                  </form>
                )}

                {bookmarksList.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 space-y-1">
                    <Bookmark className="w-8 h-8 text-zinc-350 mx-auto opacity-50 mb-1" />
                    <p className="text-xs font-semibold">Bookmarks vault is empty</p>
                    <p className="text-[10px] text-zinc-500 leading-normal">Add bookmarks to easily run search routines with one click.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {bookmarksList.map((book, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between group transition-colors ${
                          incognito ? 'bg-zinc-850/50 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200/60'
                        }`}
                      >
                        <button
                          onClick={() => {
                            handleSearchSubmit(undefined, book.query);
                            setActiveSearch(book.query);
                            handleClose();
                          }}
                          className="flex-1 text-left"
                        >
                          <span className="block font-bold text-xs text-zinc-800 hover:text-indigo-600 transition-colors truncate">
                            {book.title}
                          </span>
                          <span className="text-[10px] text-zinc-455 truncate block mt-0.5">
                            Query: {book.query}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteBookmark(book)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. SAVED PASSWORDS VAULT (Image 3 Style) */}
            {activePanel === 'passwords' && (
              <div className="space-y-6 text-center py-2">
                <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                  <button 
                    onClick={() => setActivePanel('none')} 
                    className="px-3.5 py-1 rounded-full bg-zinc-150 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                  >
                    Close
                  </button>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Passwords</span>
                  <button 
                    onClick={() => setShowAddPasswordModal(true)} 
                    className="w-8 h-8 rounded-full bg-zinc-150 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-200 cursor-pointer shadow-2xs"
                    title="Add Password"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {savedPasswords.length === 0 ? (
                  <div className="py-8 space-y-4 max-w-sm mx-auto">
                    {/* Yellow Key Icon with + Badge */}
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center relative shadow-sm">
                      <Key className="w-10 h-10 text-amber-500 fill-amber-400" />
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-black border-2 border-white">
                        +
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No passwords saved yet</h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed px-4">
                        You can import saved passwords from another browser into Isaiah Search.
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 px-2">
                      <button 
                        onClick={() => setShowAddPasswordModal(true)}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-full transition-all cursor-pointer shadow-md"
                      >
                        Import Passwords
                      </button>
                      <button 
                        onClick={() => showToast("Desktop Sync enabled for Isaiah Search Google Account!")}
                        className="w-full py-3.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold text-sm rounded-full transition-all cursor-pointer"
                      >
                        Sync Desktop Passwords
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-left">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-zinc-500">
                        Saved Passwords: {savedPasswords.length}
                      </span>
                      <button
                        onClick={() => setShowAddPasswordModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    </div>

                    {savedPasswords.map((passEntry, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                          incognito ? 'bg-zinc-850/50 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="block font-bold text-sm text-zinc-900 dark:text-white truncate mb-1">
                            {passEntry.site}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-zinc-500 font-medium">
                              {passEntry.user}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                {showPassword[idx] ? passEntry.pass : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPassword(p => ({ ...p, [idx]: !p[idx] }))}
                                className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                              >
                                {showPassword[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePassword(passEntry)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                          title="Delete credential"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBrowserSettingsModal = () => {
    if (!menuOpen) return null;

    return (
      <div 
        id="browser-settings-overlay"
        className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in text-left select-none font-sans"
        onClick={() => {
          setMenuOpen(false);
          setSettingsDropdown('none');
        }}
      >
        <div 
          id="browser-settings-modal-card"
          className="bg-[#1c1c1e] border border-zinc-750 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 animate-scale-up select-text max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#232326]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-wide text-zinc-100 flex items-center gap-2">
                  <span>Browser & Search Settings</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono uppercase font-bold tracking-wider">
                    Preferences
                  </span>
                </h3>
                <p className="text-[11.5px] text-zinc-400">Configure search engines, Safe Search filters, appearance, and browsing behavior</p>
              </div>
            </div>
            <button 
              id="browser-settings-close-btn"
              onClick={() => {
                setMenuOpen(false);
                setSettingsDropdown('none');
              }}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#171719] border-b border-zinc-800/80 overflow-x-auto scrollbar-hide text-xs font-semibold">
            {[
              { id: 'search', label: 'Search & Safe Filter', icon: Globe },
              { id: 'appearance', label: 'Appearance & Layout', icon: Sparkles },
              { id: 'general', label: 'General & Behavior', icon: Monitor },
              { id: 'privacy', label: 'Privacy & Storage', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              const active = settingsActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`browser-settings-tab-${tab.id}`}
                  onClick={() => {
                    setSettingsActiveTab(tab.id as any);
                    setSettingsDropdown('none');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    active 
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm shadow-amber-500/20' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-zinc-950' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar flex-1 bg-[#19191b]">
            
            {/* TAB 1: Search Engine & Safe Search Filter */}
            {settingsActiveTab === 'search' && (
              <div className="space-y-6 animate-fade-in">
                {/* Search Engine Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-amber-400" />
                        <span>Preferred Search Engine</span>
                      </h4>
                      <p className="text-[11.5px] text-zinc-400 mt-0.5">Choose your default engine for all browser queries and instant lookups</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-400">
                      Active: {preferredSearchEngine}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      { id: 'Isaiah Engine (Default)', title: 'Isaiah Engine (Default)', desc: 'AI-grounded live search with multi-engine aggregation & citations', tag: 'Fastest' },
                      { id: 'Google', title: 'Google', desc: 'Global index with Google web ranking algorithms and links', tag: 'Global' },
                      { id: 'DuckDuckGo', title: 'DuckDuckGo', desc: 'Privacy-focused zero tracker engine with direct instant answers', tag: 'Private' },
                      { id: 'Bing', title: 'Bing', desc: 'Microsoft web search with deep multimedia integration', tag: 'Microsoft' },
                      { id: 'Brave', title: 'Brave', desc: 'Independent web index focused on speed and privacy', tag: 'Shield' }
                    ].map(engine => {
                      const isSelected = preferredSearchEngine === engine.id;
                      return (
                        <div
                          key={engine.id}
                          id={`engine-option-${engine.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => handleSelectSearchEngine(engine.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/10' 
                              : 'border-zinc-800 bg-[#222225] hover:border-zinc-700 hover:bg-[#28282b]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>{engine.title}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-400 font-mono">
                                {engine.tag}
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-[10.5px] text-zinc-400 leading-tight">{engine.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2"><Globe className="w-4 h-4 text-amber-400" />Add Isaiah Search as a search engine</h4>
                      <p className="mt-1 text-[11.5px] leading-5 text-zinc-400">Use Isaiah Search directly from Chrome or Edge’s address bar. This uses the current website’s address, so it also works on your own Netlify deployment.</p>
                    </div>
                    <button onClick={handleCopyQueryUrl} className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-amber-300">{copySuccess ? 'Copied!' : 'Copy URL'}</button>
                  </div>
                  <div onClick={handleCopyQueryUrl} className="cursor-pointer break-all rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-[11px] text-amber-300 select-all">{window.location.origin}/?q=%s</div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-5 text-zinc-300">
                    <li>Open Chrome and go to <strong>Settings → Search engine → Manage search engines and site search</strong>.</li>
                    <li>Under <strong>Site search</strong>, choose <strong>Add</strong>. Set the name to <strong>Isaiah Search</strong>, shortcut to <strong>@isaiah</strong>, and paste the URL above.</li>
                    <li>Click <strong>Save</strong>. Type <strong>@isaiah</strong> in the address bar, press Space, then enter a query. To make it the default, use the three-dot menu next to Isaiah Search and choose <strong>Make default</strong>.</li>
                  </ol>
                  <p className="text-[10px] leading-4 text-zinc-500">The site also advertises an OpenSearch descriptor at <code>/api/opensearch.xml</code> for browsers that support search-provider discovery. Browser menus vary by version.</p>
                </div>

                <div className="w-full h-px bg-zinc-800"></div>

                {/* Safe Search Filter Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span>Safe Search Filter</span>
                      </h4>
                      <p className="text-[11.5px] text-zinc-400 mt-0.5">Control explicit adult text, image, and media filtering across all browser results</p>
                    </div>
                    {/* Quick switch */}
                    <div 
                      onClick={() => {
                        const next = safeSearchFilter === 'Off' ? 'Moderate' : 'Off';
                        handleSelectSafeSearch(next);
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        safeSearchFilter !== 'Off' ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      title={safeSearchFilter !== 'Off' ? 'Safe Search is ON' : 'Safe Search is OFF'}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                        safeSearchFilter !== 'Off' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {[
                      { level: 'Strict', title: 'Strict Filter', desc: 'Block explicit text, links, images, and adult video thumbnails', badge: 'Maximum' },
                      { level: 'Moderate', title: 'Moderate Filter', desc: 'Filter explicit images & videos while keeping web text results', badge: 'Recommended' },
                      { level: 'Off', title: 'Filter Off', desc: 'No automatic content filtering applied to browser queries', badge: 'Unrestricted' }
                    ].map(item => {
                      const isSelected = safeSearchFilter === item.level;
                      const badgeColor = item.level === 'Strict' ? 'text-emerald-400 border-emerald-500/30' : item.level === 'Moderate' ? 'text-blue-400 border-blue-500/30' : 'text-rose-400 border-rose-500/30';
                      return (
                        <div
                          key={item.level}
                          id={`safesearch-card-${item.level.toLowerCase()}`}
                          onClick={() => handleSelectSafeSearch(item.level as any)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-sm' 
                              : 'border-zinc-800 bg-[#222225] hover:border-zinc-700 hover:bg-[#28282b]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-zinc-200'}`}>{item.title}</span>
                              {isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              ) : (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-850 border font-mono ${badgeColor}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-zinc-400 leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-zinc-850/80 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <span>Global Query Parameters: <span className="font-mono text-amber-400">{preferredSearchEngine.split(' ')[0].toLowerCase()}</span> + <span className="font-mono text-emerald-400">safe={safeSearchFilter.toLowerCase()}</span></span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Live active</span>
                </div>
              </div>
            )}

            {/* TAB 2: Appearance & Layout */}
            {settingsActiveTab === 'appearance' && (
              <div className="space-y-5 animate-fade-in">
                {/* Result Card Layout */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">Results Layout Style</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      id="layout-style-standard"
                      onClick={() => {
                        setAppearanceLayout('standard');
                        showToast("Switched to Standard Result Layout");
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center gap-2 ${
                        appearanceLayout === 'standard' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-[#222225] hover:bg-[#28282b]'
                      }`}
                    >
                      <div className="w-full h-12 bg-zinc-900 rounded-lg p-2 flex flex-col justify-center gap-1.5 border border-zinc-800">
                        <div className="w-16 h-2 rounded bg-blue-400"></div>
                        <div className="w-28 h-1.5 rounded bg-zinc-700"></div>
                        <div className="w-20 h-1.5 rounded bg-zinc-700"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200">Standard View</span>
                        {appearanceLayout === 'standard' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                    </div>

                    <div 
                      id="layout-style-dense"
                      onClick={() => {
                        setAppearanceLayout('dense');
                        showToast("Switched to Compact Result Layout");
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center gap-2 ${
                        appearanceLayout === 'dense' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-[#222225] hover:bg-[#28282b]'
                      }`}
                    >
                      <div className="w-full h-12 bg-zinc-900 rounded-lg p-2 flex flex-col justify-center gap-1 border border-zinc-800">
                        <div className="w-14 h-1.5 rounded bg-blue-400"></div>
                        <div className="w-24 h-1 rounded bg-zinc-700"></div>
                        <div className="w-18 h-1 rounded bg-zinc-700"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200">Compact View</span>
                        {appearanceLayout === 'dense' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800"></div>

                {/* Toggles & Options */}
                <div className="space-y-3 text-xs">
                  {/* Dark Mode */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800">
                    <div>
                      <span className="font-semibold text-zinc-200 block">Dark Mode</span>
                      <span className="text-[11px] text-zinc-400">Toggle between slate dark and light theme</span>
                    </div>
                    <div 
                      id="setting-toggle-dark-mode"
                      onClick={() => {
                        if (onUpdateTheme) {
                          onUpdateTheme(isLight ? 'slate' : 'light_glass');
                        }
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${!isLight ? 'bg-blue-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${!isLight ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* URL Placement */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800 relative">
                    <div>
                      <span className="font-semibold text-zinc-200 block">URL Placement</span>
                      <span className="text-[11px] text-zinc-400">Display link address above or below headline</span>
                    </div>
                    <button 
                      id="setting-url-placement-btn"
                      onClick={() => setSettingsDropdown(settingsDropdown === 'url' ? 'none' : 'url')}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg border border-zinc-700 flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                      <span>{urlPlacement}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    {settingsDropdown === 'url' && (
                      <div className="absolute top-full right-2 mt-1 bg-[#262629] border border-zinc-700 rounded-xl shadow-2xl z-30 py-1 w-44">
                        <div onClick={() => { setUrlPlacement('Above Title'); setSettingsDropdown('none'); showToast("URL placed above title"); }} className="px-3.5 py-2 text-xs hover:bg-zinc-700 cursor-pointer text-white">Above Title</div>
                        <div onClick={() => { setUrlPlacement('Below Title'); setSettingsDropdown('none'); showToast("URL placed below title"); }} className="px-3.5 py-2 text-xs hover:bg-zinc-700 cursor-pointer text-white">Below Title</div>
                      </div>
                    )}
                  </div>

                  {/* Site Names & Site Icons */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800">
                      <div>
                        <span className="font-semibold text-zinc-200 block">Site Names</span>
                        <span className="text-[10.5px] text-zinc-400">Show publisher name</span>
                      </div>
                      <div 
                        id="setting-toggle-site-names"
                        onClick={() => setShowSiteNames(!showSiteNames)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${showSiteNames ? 'bg-blue-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${showSiteNames ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800">
                      <div>
                        <span className="font-semibold text-zinc-200 block">Site Icons</span>
                        <span className="text-[10.5px] text-zinc-400">Show favicons</span>
                      </div>
                      <div 
                        id="setting-toggle-site-icons"
                        onClick={() => setShowSiteIcons(!showSiteIcons)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${showSiteIcons ? 'bg-blue-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${showSiteIcons ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Font Size & Family */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800 relative">
                    <div>
                      <span className="font-semibold text-zinc-200 block">Search Typography</span>
                      <span className="text-[11px] text-zinc-400">{searchFont} • {searchFontSize} size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        id="setting-font-size-btn"
                        onClick={() => setSettingsDropdown(settingsDropdown === 'font_size' ? 'none' : 'font_size')}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg border border-zinc-700 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span>{searchFontSize}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                    {settingsDropdown === 'font_size' && (
                      <div className="absolute top-full right-2 mt-1 bg-[#262629] border border-zinc-700 rounded-xl shadow-2xl z-30 py-1 w-32">
                        {['Small', 'Medium', 'Large'].map(size => (
                          <div 
                            key={size}
                            onClick={() => { setSearchFontSize(size as any); setSettingsDropdown('none'); showToast(`Font size set to ${size}`); }} 
                            className="px-3.5 py-2 text-xs hover:bg-zinc-700 cursor-pointer text-white flex items-center justify-between"
                          >
                            <span>{size}</span>
                            {searchFontSize === size && <Check className="w-3 h-3 text-blue-400" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: General & Behavior */}
            {settingsActiveTab === 'general' && (
              <div className="space-y-4 animate-fade-in text-xs">
                {/* Infinite Scroll */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-850/60 border border-zinc-800">
                  <div>
                    <span className="font-semibold text-sm text-zinc-200 block">Infinite Scroll</span>
                    <span className="text-[11.5px] text-zinc-400">Automatically load more search results as you scroll down</span>
                  </div>
                  <div 
                    id="setting-toggle-infinite-scroll"
                    onClick={() => {
                      setInfiniteScroll(!infiniteScroll);
                      showToast(infiniteScroll ? "Infinite scroll disabled" : "Infinite scroll enabled");
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${infiniteScroll ? 'bg-blue-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${infiniteScroll ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Open Links in New Tab */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-850/60 border border-zinc-800">
                  <div>
                    <span className="font-semibold text-sm text-zinc-200 block">Open Links in New Tab</span>
                    <span className="text-[11.5px] text-zinc-400">Launch external webpage links in background tabs</span>
                  </div>
                  <div 
                    id="setting-toggle-new-tab"
                    onClick={() => {
                      setOpenLinksInNewTab(!openLinksInNewTab);
                      showToast(openLinksInNewTab ? "Links open in same tab" : "Links open in new tab");
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${openLinksInNewTab ? 'bg-blue-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${openLinksInNewTab ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* AI Search Assist Setting */}
                <div className="p-3 rounded-2xl bg-zinc-850/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-zinc-200 block">AI Search Assist Frequency</span>
                    <span className="text-amber-400 font-mono text-[11px] capitalize">{assistSetting.replace('_', ' ')}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      { id: 'often', label: 'Often' },
                      { id: 'sometimes', label: 'Balanced' },
                      { id: 'on_demand', label: 'Manual' },
                      { id: 'never', label: 'Never' }
                    ].map(item => (
                      <button
                        key={item.id}
                        id={`assist-freq-${item.id}`}
                        onClick={() => {
                          setAssistSetting(item.id as any);
                          showToast(`Search Assist set to ${item.label}`);
                        }}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          assistSetting === item.id 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Language */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-850/60 border border-zinc-800">
                  <div>
                    <span className="font-semibold text-sm text-zinc-200 block">Display Language</span>
                    <span className="text-[11.5px] text-zinc-400">Interface and regional query localization</span>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                    English (US)
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: Privacy & Storage */}
            {settingsActiveTab === 'privacy' && (
              <div className="space-y-4 animate-fade-in text-xs">
                {/* Incognito Window Mode */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-850/60 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Shield className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">Incognito Shield</span>
                      <span className="text-[11.5px] text-zinc-400">Block history logging, cookies, and local session trackers</span>
                    </div>
                  </div>
                  <div 
                    id="setting-toggle-incognito"
                    onClick={() => {
                      setIncognito(!incognito);
                      showToast(incognito ? "Incognito disabled" : "Incognito enabled");
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${incognito ? 'bg-purple-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${incognito ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Clear Search History */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-850/60 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Trash2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">Clear Search History</span>
                      <span className="text-[11.5px] text-zinc-400">{historyList.length} past queries stored locally</span>
                    </div>
                  </div>
                  <button
                    id="clear-search-history-btn"
                    onClick={() => {
                      setHistoryList([]);
                      setRecentSearches([]);
                      localStorage.removeItem('isaiah_browser_history');
                      localStorage.removeItem('isaiah_recent_searches');
                      showToast("All search history cleared!");
                    }}
                    className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl border border-rose-500/30 font-semibold transition-colors cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                {/* Vault & Bookmarks shortcuts */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    id="open-passwords-vault-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      setActivePanel('passwords');
                    }}
                    className="p-3 bg-zinc-850 hover:bg-zinc-800 rounded-2xl border border-zinc-750 flex items-center gap-3 text-left transition-colors cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold text-zinc-200 block text-xs">Passwords Vault</span>
                      <span className="text-[10.5px] text-zinc-400">{savedPasswords.length} credentials saved</span>
                    </div>
                  </button>

                  <button
                    id="open-bookmarks-panel-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      setActivePanel('bookmarks');
                    }}
                    className="p-3 bg-zinc-850 hover:bg-zinc-800 rounded-2xl border border-zinc-750 flex items-center gap-3 text-left transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-bold text-zinc-200 block text-xs">Bookmarks Manager</span>
                      <span className="text-[10.5px] text-zinc-400">{bookmarksList.length} sites saved</span>
                    </div>
                  </button>
                </div>

                {/* Firebase Account status */}
                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-zinc-300">
                      Cloud Sync: <strong className="text-zinc-100">{userProfile?.loggedIn ? userProfile.username : 'Guest Mode (Local Only)'}</strong>
                    </span>
                  </div>
                  <button
                    id="manage-sync-account-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      setActivePanel('login');
                    }}
                    className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-[11.5px]"
                  >
                    {userProfile?.loggedIn ? 'Account' : 'Sign In to Sync'}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-[#222225]">
            <button
              id="reset-settings-default-btn"
              onClick={handleResetSettings}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              id="save-close-settings-btn"
              onClick={() => {
                setMenuOpen(false);
                setSettingsDropdown('none');
                showToast("Preferences saved!");
              }}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    );
  };

  const toggleSavedSource = (item: SearchResult) => {
    const key = normalizeSearchResultUrl(item.url);
    const exists = savedSources.some(saved => normalizeSearchResultUrl(saved.url) === key);
    const updated = exists
      ? savedSources.filter(saved => normalizeSearchResultUrl(saved.url) !== key)
      : [{ title: item.title, url: item.url, snippet: item.snippet, siteName: item.siteName, savedAt: new Date().toISOString() }, ...savedSources].slice(0, 100);
    setSavedSources(updated);
    try { localStorage.setItem('isaiah_search_reading_list', JSON.stringify(updated)); } catch (error) { console.warn('[Reading List] Could not save local copy:', error); }
    showToast(exists ? 'Removed from Read later' : 'Saved to Read later');
  };

  const removeSavedSource = (url: string) => {
    const updated = savedSources.filter(item => normalizeSearchResultUrl(item.url) !== normalizeSearchResultUrl(url));
    setSavedSources(updated);
    try { localStorage.setItem('isaiah_search_reading_list', JSON.stringify(updated)); } catch (error) { console.warn('[Reading List] Could not update local copy:', error); }
  };

  const copyAssistantSummary = async () => {
    const textToCopy = briefSummary || typedSummary;
    if (!textToCopy.trim()) { showToast('Search Assist has no answer to copy yet'); return; }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setSummaryCopied(true);
      showToast('Search Assist answer copied');
      window.setTimeout(() => setSummaryCopied(false), 1800);
    } catch {
      showToast('Clipboard access was blocked by the browser');
    }
  };

  const fetchBriefSummary = async (queryStr: string, resultsList: any[]) => {
    if (!queryStr) return;
    const requestId = ++briefRequestIdRef.current;
    setIsLoadingBrief(true);
    setBriefSummary('');
    try {
      const response = await fetch('/api/search-summary-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, results: resultsList })
      });
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Brief summary request failed');
      const data = await response.json();
      if (requestId !== briefRequestIdRef.current) return;
      const summary = String(data.summary || '').trim();
      if (!summary) throw new Error('Search Assist returned an empty summary');
      setBriefSummary(summary);
    } catch (err) {
      if (requestId !== briefRequestIdRef.current) return;
      const sourceList = (Array.isArray(resultsList) ? resultsList : []).slice(0, 6)
        .filter((item: any) => item && /^https?:\/\//i.test(String(item.url || '')))
        .map((item: any, index: number) => `${index + 1}. [${String(item.title || 'Search result').replace(/[\[\]]/g, '')}](${item.url}) — ${String(item.snippet || '').slice(0, 260)}`)
        .join('\n');
      setBriefSummary(sourceList
        ? `### Search Assist for ${queryStr}\n\nThe AI summary could not load, so here are the matching sources that were returned:\n\n${sourceList}`
        : `### Search Assist for ${queryStr}\n\nThe search assistant could not retrieve a live summary or direct source pages. Try another query or use the search links below.`);
    } finally {
      if (requestId === briefRequestIdRef.current) setIsLoadingBrief(false);
    }
  };

  const fetchMoreSummary = async (queryStr: string, resultsList: any[], currentBrief: string) => {
    if (!queryStr) return;
    const requestId = ++moreRequestIdRef.current;
    setIsLoadingMore(true); setAddonSummary(''); setTypedDetailed(''); setIsTypingMore(true);
    const body = { query: queryStr, results: resultsList, previousSummary: currentBrief };
    try {
      const response = await fetch('/api/search-summary-more-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Deep report request failed');
      const reader = response.body?.getReader(), decoder = new TextDecoder();
      let complete = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (requestId !== moreRequestIdRef.current) return;
          if (done) break;
          complete += decoder.decode(value, { stream: true });
          setTypedDetailed(complete); setAddonSummary(complete);
        }
        complete += decoder.decode();
      }
      if (complete.trim()) {
        if (requestId === moreRequestIdRef.current) { setTypedDetailed(complete); setAddonSummary(complete); }
        return;
      }
      throw new Error('Empty deep report');
    } catch {
      if (requestId !== moreRequestIdRef.current) return;
      try {
        const retry = await fetch('/api/search-summary-more', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (retry.ok && !retry.headers.get('content-type')?.includes('text/html')) {
          const data = await retry.json(), report = String(data.moreSummary || data.assistantDetailedSummary || '').trim();
          if (report && requestId === moreRequestIdRef.current) { setAddonSummary(report); setTypedDetailed(report); return; }
        }
      } catch { /* fall back to real source links */ }
      const links = (Array.isArray(resultsList) ? resultsList : []).slice(0, 12)
        .filter((item: any) => item && /^https?:\/\//i.test(String(item.url || '')))
        .map((item: any, i: number) => `${i + 1}. **[${String(item.title || 'Search result').replace(/[\\[\\]]/g, '')}](${item.url})** — ${String(item.snippet || '').slice(0, 360)}`).join('\\n');
      const fallback = links
        ? `## More research on ${queryStr}\\n\\nThe deeper AI report could not load this time, so here are the actual source pages returned for your search.\\n\\n${links}`
        : `## More research on ${queryStr}\\n\\nIsaiahAI could not load a deeper report just now. Try again or continue in full chat.`;
      if (requestId === moreRequestIdRef.current) { setAddonSummary(fallback); setTypedDetailed(fallback); }
    } finally { if (requestId === moreRequestIdRef.current) { setIsLoadingMore(false); setIsTypingMore(false); } }
  };

  const loadMoreLinks = async (): Promise<boolean> => {
    if (!activeSearch || !searchResults || isLoadingMoreLinks) return false;
    const requestId = searchRequestIdRef.current;
    setIsLoadingMoreLinks(true);
    const existingUrls = new Set((searchResults.results || []).map(item => normalizeSearchResultUrl(item.url)).filter(Boolean));
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const offset = Math.max(searchResults.results?.length || 0, moreLinksOffsetRef.current);
        const response = await fetch('/api/more-search-links', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: activeSearch, engine: preferredSearchEngine, safeSearch: safeSearchFilter, offset }),
        });
        moreLinksOffsetRef.current = offset + 20;
        if (requestId !== searchRequestIdRef.current) return false;
        if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Could not load the next result page');
        const incoming = enrichSearchResults(await response.json());
        if (!incoming) continue;
        const freshResults = (incoming.results || []).filter((item: SearchResult) => {
          const key = normalizeSearchResultUrl(item.url);
          if (!key || existingUrls.has(key)) return false;
          existingUrls.add(key); return true;
        });
        const freshImages = incoming.images || [], freshVideos = incoming.videos || [], freshNews = incoming.news || [];
        if (!freshResults.length && !freshImages.length && !freshVideos.length && !freshNews.length) continue;
        setSearchResults(prev => {
          if (!prev) return null;
          const mergeUnique = (current: any[] = [], next: any[] = [], identity: (item: any) => string) => {
            const seen = new Set(current.map(identity).filter(Boolean));
            return [...current, ...next.filter(item => { const key = identity(item); if (!key || seen.has(key)) return false; seen.add(key); return true; })];
          };
          return {
            ...prev,
            results: mergeUnique(prev.results || [], freshResults, item => normalizeSearchResultUrl(String(item?.url || item?.uri || ''))),
            images: mergeUnique(prev.images || [], freshImages, item => String(item?.imageUrl || item?.url || '')),
            videos: mergeUnique(prev.videos || [], freshVideos, item => String(item?.url || item?.title || '')),
            news: mergeUnique(prev.news || [], freshNews, item => String(item?.url || item?.title || '')),
          };
        });
        return true;
      }
      return false;
    } catch (error) { console.error('[IsaiahAI Search] Additional links failed:', error); return false; }
    finally { setIsLoadingMoreLinks(false); }
  };

    // Client-side visual media enrichments (prevents gray or black boxes, adds platform diversity)
  const enrichSearchResults = (data: any) => {
    if (!data) return null;
    const query = searchQuery.trim() || 'tech';

    const videoSites = ['YouTube', 'Vimeo', 'Twitch', 'TikTok', 'DailyMotion', 'Bloomberg Video', 'TED Talks', 'Wired Tech'];
    const videoThumbnails = [
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop'
    ];

    const newsThumbnails = [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504151932400-72d425550d2d?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495020689067-958852a6565c?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600&auto=format&fit=crop'
    ];

    const processedVideos = (data.videos || []).map((v: any, idx: number) => {
      const needsFallback = !v.thumbnail || v.thumbnail.includes('placeholder') || v.thumbnail.includes('img.youtube.com') || v.thumbnail.includes('example.com');
      const thumbnail = needsFallback ? videoThumbnails[idx % videoThumbnails.length] : v.thumbnail;
      const siteName = v.siteName && v.siteName !== 'YouTube' ? v.siteName : videoSites[idx % videoSites.length];

      let url = v.url;
      if (siteName === 'Vimeo') {
        url = `https://vimeo.com/search?q=${encodeURIComponent(query)}`;
      } else if (siteName === 'Twitch') {
        url = `https://www.twitch.tv/search?term=${encodeURIComponent(query)}`;
      } else if (siteName === 'TikTok') {
        url = `https://www.tiktok.com/tag/${encodeURIComponent(query.replace(/\s+/g, ''))}`;
      } else if (siteName === 'DailyMotion') {
        url = `https://www.dailymotion.com/search/${encodeURIComponent(query)}`;
      } else if (!url || url.includes('example.com') || url.includes('results')) {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      }

      return { ...v, thumbnail, siteName, url };
    });

    const processedNews = (data.news || []).map((n: any, idx: number) => {
      const needsFallback = !n.imageUrl || n.imageUrl.includes('placeholder') || n.imageUrl.includes('black') || n.imageUrl.includes('example.com');
      const imageUrl = needsFallback ? newsThumbnails[idx % newsThumbnails.length] : n.imageUrl;
      return { ...n, imageUrl };
    });

    const processedResults = (data.results || data.boxes || []).map((r: any) => ({
      ...r,
      // Never invent extra result links or label the same URL as unrelated destinations.
      subLinks: Array.isArray(r.subLinks) ? r.subLinks.filter((item: any) => item?.url && item?.title) : []
    }));

    return {
      ...data,
      results: processedResults,
      videos: processedVideos,
      news: processedNews
    };
  };

  const handleToggleAssist = () => {
    const nextState = !assistOpen;
    setAssistOpen(nextState);
    if (nextState && activeSearch && searchResults) {
      fetchBriefSummary(activeSearch, searchResults.results);
    }
  };

  const handleToggleExpand = () => {
    const nextState = !assistExpanded;
    setAssistExpanded(nextState);
    if (nextState && activeSearch && searchResults) {
      fetchMoreSummary(activeSearch, searchResults.results, briefSummary);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!infiniteScroll) return;
    const target = e.currentTarget;
    // Check if scrolled within 180px of the bottom
    const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 180;
    if (isNearBottom && activeSearch && !isLoadingMoreLinks) {
      loadMoreLinks();
    }
  };

  // Handle browser search request
  const handleSearchSubmit = async (e?: React.FormEvent, forcedQuery?: string, skipPushState?: boolean) => {
    if (e) e.preventDefault();
    const query = (forcedQuery !== undefined ? forcedQuery : searchQuery).trim();
    if (!query) return;
    const requestId = ++searchRequestIdRef.current;
    briefRequestIdRef.current += 1;
    moreRequestIdRef.current += 1;
    moreLinksOffsetRef.current = 0;
    setContinueChatText('');
    setIsLoadingBrief(false);
    setIsTypingBrief(false);

    if (forcedQuery !== undefined) {
      setSearchQuery(forcedQuery);
    }

    saveRecentSearch(query);

    setBriefSummary('');
    setAddonSummary('');
    setTypedSummary('');
    setTypedDetailed('');
    setAssistExpanded(false);
    setShowSavedSources(false);

    // Direct URL detector to launch webpages directly
    const isDirectUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i.test(query) && !query.includes(' ');
    if (isDirectUrl) {
      let formattedUrl = query;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      openWebpage(formattedUrl);
      return;
    }

    // Save browser history if not in incognito mode
    if (!incognito) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistoryList(prev => [{ query, timestamp, incognito: false }, ...prev]);
      localStorage.setItem('isaiah_browser_last_session', query);
      setRestoredSession(query);

      if (auth?.currentUser && db) {
        addDoc(collection(db, 'users', auth.currentUser.uid, 'history'), {
          query,
          timestamp,
          incognito: false,
          createdAt: serverTimestamp()
        }).catch(err => console.error('[Firebase] Error syncing history to DB:', err));
      }

      // Update the browser URL pathname to match /query
      if (!skipPushState) {
        try {
          const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
          window.history.pushState(null, '', `/${encodedQuery}`);
        } catch (err) {
          console.error('[Routing] Failed to update history state:', err);
        }
      }
    }

    setActiveSearch(query);
    setShowExpandedResultsPage(false);
    setExpandedResultsPage(1);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: query } : t));
    setIsSearching(true);
    setSearchResults(null);
    const initialAssistOpen = true;
    setAssistOpen(true);

    // Concurrently trigger local places fetch for mapping
    setLocalPlacesLoading(true);
    fetch('/api/local-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then(async res => {
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
           const text = await res.text();
           throw new Error('API Error: ' + text.slice(0, 100));
        }
        return res.json();
      })
      .then(data => {
        setLocalPlacesData(data);
        setLocalPlacesLoading(false);
      })
      .catch(err => {
        console.error('[Maps API] Failed to fetch local places:', err);
        setLocalPlacesLoading(false);
      });

    try {
      // Step 1: Fetch quick search results extremely quickly!
      const quickResponse = await fetch('/api/quick-search-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, engine: preferredSearchEngine, safeSearch: safeSearchFilter }),
      });
      const contentType = quickResponse.headers.get("content-type");
      if (!quickResponse.ok) {
        const errorText = await quickResponse.text().catch(() => '');
        throw new Error(`Search API returned ${quickResponse.status}: ${errorText.slice(0, 160)}`);
      }
      if (contentType && contentType.includes("text/html")) {
        const text = await quickResponse.text();
        console.error("HTML Error received:", text.slice(0, 200));
        throw new Error("Received HTML instead of JSON");
      }
      const quickData = await quickResponse.json();
      if (requestId !== searchRequestIdRef.current) return;
      if (!quickData || !Array.isArray(quickData.results)) throw new Error('Search service returned no result list.');

      // Enrich video/news thumbnails and site domains immediately
      const enrichedData = enrichSearchResults(quickData);

      // Immediately render the search results so links show up instantly with no lag!
      setSearchResults({
        assistantSummary: '',
        assistantDetailedSummary: '',
        results: enrichedData.results || [],
        images: enrichedData.images || [],
        videos: enrichedData.videos || [],
        news: enrichedData.news || []
      });
      setIsSearching(false);

      // If search assist is active/open, fetch brief summary on demand
      if (initialAssistOpen) {
        fetchBriefSummary(query, enrichedData.results || []);
      }
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error('[Search Engine] Error querying fast results:', err);
      // Fallback search results with zero lag
      const encodedQuery = encodeURIComponent(query);
      const fallbackPortals = [
        { title: `Google results for ${query}`, url: `https://www.google.com/search?q=${encodedQuery}`, snippet: `Search Google for pages matching ${query}.`, siteName: 'Google' },
        { title: `Bing results for ${query}`, url: `https://www.bing.com/search?q=${encodedQuery}`, snippet: `Search Bing for pages matching ${query}.`, siteName: 'Bing' },
        { title: `Wikipedia results for ${query}`, url: `https://en.wikipedia.org/w/index.php?search=${encodedQuery}`, snippet: `Search Wikipedia articles related to ${query}.`, siteName: 'Wikipedia' },
        { title: `GitHub projects for ${query}`, url: `https://github.com/search?q=${encodedQuery}`, snippet: `Search GitHub repositories and source code related to ${query}.`, siteName: 'GitHub' },
        { title: `Reddit discussions about ${query}`, url: `https://www.reddit.com/search/?q=${encodedQuery}`, snippet: `Search Reddit posts and discussions about ${query}.`, siteName: 'Reddit' },
        { title: `Stack Overflow questions about ${query}`, url: `https://stackoverflow.com/search?q=${encodedQuery}`, snippet: `Search programming questions related to ${query}.`, siteName: 'Stack Overflow' },
        { title: `News about ${query}`, url: `https://news.google.com/search?q=${encodedQuery}`, snippet: `Search Google News for reporting about ${query}.`, siteName: 'Google News' },
        { title: `Videos about ${query}`, url: `https://www.youtube.com/results?search_query=${encodedQuery}`, snippet: `Search YouTube for videos related to ${query}.`, siteName: 'YouTube' }
      ];
      const fallbackData = {
        assistantSummary: '',
        assistantDetailedSummary: '',
        results: fallbackPortals,
        images: [],
        videos: [],
        news: []
      };
      setSearchResults(fallbackData);
      if (initialAssistOpen) {
        fetchBriefSummary(query, fallbackData.results);
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false);
        setIsGeneratingSummary(false);
      }
    }
  };

  // IsaiahSearch is the website's search surface, not an embedded browser.
  // Opening a result launches the destination in a normal browser tab and leaves search results available.
  const openWebpage = (url: string, title?: string, _forceNewTab = false) => {
    if (!url) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'https://' + formattedUrl;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(formattedUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        showToast('Only HTTP and HTTPS webpages can be opened.');
        return;
      }
      formattedUrl = parsedUrl.href;
    } catch {
      showToast('That web address is not valid. Check it and try again.');
      return;
    }
    const websiteTitle = title || parsedUrl.hostname || formattedUrl;
    if (!incognito) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistoryList(prev => {
        const updated = [{ query: formattedUrl, title: websiteTitle, timestamp, incognito: false, type: 'website' as const },
          ...prev.filter(item => item.query !== formattedUrl)].slice(0, 500);
        try { localStorage.setItem('isaiah_browser_history', JSON.stringify(updated)); } catch { /* browser storage may be full */ }
        return updated;
      });
      if (auth?.currentUser && db) {
        addDoc(collection(db, 'users', auth.currentUser.uid, 'history'), {
          query: formattedUrl, title: websiteTitle, timestamp, incognito: false,
          type: 'website', createdAt: serverTimestamp()
        }).catch(err => console.error('[IsaiahSearch] History sync failed:', err));
      }
    }
    const opened = window.open(formattedUrl, '_blank', 'noopener,noreferrer');
    if (!opened) showToast('Your browser blocked the new tab. Allow pop-ups for IsaiahSearch and try again.');
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const targetTab = tabs.find(t => t.id === tabId);
    if (targetTab) {
      if (targetTab.searchQuery !== undefined) {
        setSearchQuery(targetTab.searchQuery);
      }
      if (targetTab.activeSearch !== undefined) {
        setActiveSearch(targetTab.activeSearch);
      }
    }
  };

  const handleCreateNewTab = () => {
    const newId = Date.now().toString();
    const newTab = { id: newId, title: 'New Tab', url: '', searchQuery: '', activeSearch: '' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setSearchQuery('');
    setActiveSearch('');
    setSearchResults(null);
    setBriefSummary('');
    setAddonSummary('');
    setTypedSummary('');
    setTypedDetailed('');
    setAssistExpanded(false);
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length <= 1) {
      const resetTab = { id: Date.now().toString(), title: 'New Tab', url: '', searchQuery: '', activeSearch: '' };
      setTabs([resetTab]);
      setActiveTabId(resetTab.id);
      setSearchQuery('');
      setActiveSearch('');
      setSearchResults(null);
      setBriefSummary('');
      setAddonSummary('');
      setTypedSummary('');
      setTypedDetailed('');
      setAssistExpanded(false);
      return;
    }

    const updatedTabs = tabs.filter(t => t.id !== tabId);
    setTabs(updatedTabs);
    if (activeTabId === tabId) {
      const nextTab = updatedTabs[updatedTabs.length - 1];
      setActiveTabId(nextTab.id);
      setSearchQuery(nextTab.searchQuery || '');
      setActiveSearch(nextTab.activeSearch || '');
    }
  };

  handleSearchSubmitRef.current = handleSearchSubmit;

  const isGamesSearch = activeSearch.toLowerCase().trim() === 'games' || 
                        activeSearch.toLowerCase().trim() === 'isaiah games' ||
                        activeSearch.toLowerCase().includes('isaiah games') ||
                        activeSearch.toLowerCase().includes('play games') ||
                        activeSearch.toLowerCase().includes('isaiah game');

  const currentActiveTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isViewingLiveWebpage = false; // The website is search-only; real pages open in browser tabs.
  const relatedSearchSuggestions = activeSearch ? [
    `${activeSearch} explained`,
    `${activeSearch} examples`,
    `${activeSearch} latest updates`,
    `${activeSearch} comparison`
  ].filter((item, index, all) => item.toLowerCase() !== activeSearch.toLowerCase() && all.findIndex(x => x.toLowerCase() === item.toLowerCase()) === index).slice(0, 4) : [];

  return (
    <div className={`flex-1 flex flex-col h-full max-h-full overflow-hidden relative w-full min-h-0 ${customBackgroundUrl ? (isLight ? "bg-white/30 backdrop-blur-3xl text-zinc-900" : "bg-black/40 backdrop-blur-3xl text-zinc-100") : "bg-[#f8f9fa] text-zinc-800"}`}>
      {isViewingLiveWebpage ? (
        <LiveWebProxyViewer
          initialUrl={currentActiveTab.url}
          initialTitle={currentActiveTab.title}
          isLight={isLight}
          incognito={incognito}
          tabCount={tabs.length}
          onOpenTabs={() => setShowTabsModal(true)}
          onNavigate={(newUrl, newTitle) => {
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: newUrl, title: newTitle || t.title } : t));
          }}
          onOpenWebTab={(newUrl, newTitle) => openWebpage(newUrl, newTitle, true)}
          onClose={() => {
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: '' } : t));
          }}
          onSearch={(searchQueryText) => {
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: '', title: searchQueryText, searchQuery: searchQueryText, activeSearch: searchQueryText } : t));
            setSearchQuery(searchQueryText);
            handleSearchSubmit(undefined, searchQueryText);
          }}
          onOpenExternal={(extUrl) => {
            window.open(extUrl, '_blank', 'noopener,noreferrer');
          }}
        />
      ) : (
        <>
          <div 
            onScroll={handleScroll} 
            className={`flex-1 flex flex-col overflow-y-auto ${desktopMode ? 'overflow-x-auto' : 'overflow-x-hidden'} animate-fade-in font-sans pb-16 md:pb-0`}
            style={{ fontSize: `${zoomLevel}%` }}
          >
      
      {/* 1. TOP HEADER ROW (Only shown after a search is made) */}
      {activeSearch ? (
        <div className={`border-b py-3.5 px-4 md:px-10 flex-shrink-0 z-20 ${incognito ? "bg-zinc-900/70 border-zinc-800/50 text-zinc-300 backdrop-blur-2xl" : customBackgroundUrl ? "bg-white/20 border-white/40 text-zinc-900 backdrop-blur-2xl shadow-sm" : "border-zinc-200/80 bg-white text-zinc-800"}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              {/* Logo Container */}
              <div 
                onClick={() => {
                  setActiveSearch('');
                  setSearchQuery('');
                  setSearchResults(null);
                  setBriefSummary('');
                  setAddonSummary('');
                  setTypedSummary('');
                  setTypedDetailed('');
                  setAssistExpanded(false);
                }}
                className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
              >
                <BrandLogo size={22} includeBackground={false} />
              </div>

              {/* Form for searches with Quick-Access Recent Chips */}
              <div className="flex-1 max-w-xl flex flex-col justify-center">
                {recentSearches.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs mb-1 animate-fade-in">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-amber-500" /> Recent:
                    </span>
                    {recentSearches.map((q, idx) => (
                      <div
                        key={idx}
                        className={`group flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 transition-all ${
                          incognito
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-500/50'
                            : 'bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200 text-zinc-800 hover:border-amber-400/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(q);
                            handleSearchSubmit(undefined, q);
                          }}
                          className="flex items-center gap-1 text-left cursor-pointer"
                        >
                          <span className="truncate max-w-[110px]">{q}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(q);
                          }}
                          className="text-zinc-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-zinc-300/50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                          title="Remove search"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSearchSubmit} className="w-full relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search the web securely..."
                    className={`w-full ${incognito ? 'bg-zinc-800 border-zinc-700 focus:border-zinc-650 focus:bg-zinc-850 text-white' : 'bg-zinc-100 hover:bg-zinc-150/60 focus:bg-white text-zinc-900 border-zinc-200 focus:border-zinc-300'} text-sm h-11 pl-4 pr-11 rounded-full border focus:outline-none placeholder-zinc-400 shadow-inner font-sans font-medium`}
                  />
                  <button
                    type="submit"
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    title="Execute Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right actions with Browser Settings and Three Dots */}
            <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-medium text-zinc-400 justify-end md:justify-start">
              {incognito ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/40 text-purple-400 border border-purple-900/30 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Incognito Active</span>
                </div>
              ) : null}

              {/* Browser Settings Toggle Button */}
              <button
                onClick={() => { setMenuOpen(true); setActivePanel('none'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs border ${
                  incognito 
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-amber-400 border-zinc-700' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-250'
                }`}
                title="Configure Search Engine and Safe Search Settings"
              >
                <Settings className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Browser Settings</span>
              </button>

              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

              {/* User profile identifier */}
              <div className={`hidden md:flex items-center gap-1.5 ${incognito ? 'text-zinc-400' : 'text-zinc-500'} font-bold`}>
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>{userProfile?.loggedIn ? userProfile.username : 'Guest'}</span>
              </div>

              {/* Three Dots Quick Menu */}
              <div className="relative">
                <button 
                  id="browser-header-dots-btn"
                  onClick={() => setQuickDotsMenuOpen(!quickDotsMenuOpen)}
                  className={`w-9 h-9 rounded-full ${incognito ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-white' : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-655'} border flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-all`}
                  title="Browser Options & Features"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {quickDotsMenuOpen && (
                  <div 
                    id="browser-header-quick-dropdown"
                    className="absolute right-0 top-11 w-56 rounded-2xl bg-zinc-900 border border-zinc-750 z-50 shadow-2xl text-left animate-fade-in text-zinc-200 py-1.5 font-sans overflow-hidden"
                  >
                    <button
                      id="quick-open-settings-btn"
                      onClick={() => {
                        setMenuOpen(true);
                        setActivePanel('none');
                        setQuickDotsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 flex items-center gap-2.5 text-amber-400 cursor-pointer transition-colors"
                    >
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Browser Settings</span>
                    </button>
                    <div className="h-px bg-zinc-800 my-1" />
                    <button
                      id="quick-open-bookmarks-btn"
                      onClick={() => {
                        setActivePanel('bookmarks');
                        setQuickDotsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-xs font-medium hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 cursor-pointer transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-blue-400" />
                      <span>Bookmarks</span>
                    </button>
                    <button
                      id="quick-open-history-btn"
                      onClick={() => {
                        setActivePanel('history');
                        setQuickDotsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-xs font-medium hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 cursor-pointer transition-colors"
                    >
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>Search History</span>
                    </button>
                    <button
                      id="quick-open-passwords-btn"
                      onClick={() => {
                        setActivePanel('passwords');
                        setQuickDotsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-xs font-medium hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 cursor-pointer transition-colors"
                    >
                      <Key className="w-4 h-4 text-purple-400" />
                      <span>Passwords Vault</span>
                    </button>
                    <button
                      id="quick-toggle-incognito-btn"
                      onClick={() => {
                        setIncognito(!incognito);
                        setQuickDotsMenuOpen(false);
                        showToast(incognito ? "Exited Incognito Mode" : "Entered Incognito Mode");
                      }}
                      className="w-full px-4 py-2 text-xs font-medium hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 cursor-pointer transition-colors"
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>{incognito ? 'Exit Incognito' : 'New Incognito Tab'}</span>
                    </button>
                    <div className="h-px bg-zinc-800 my-1" />
                    <button
                      id="quick-open-account-btn"
                      onClick={() => {
                        setActivePanel('login');
                        setQuickDotsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-xs font-medium hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4 text-cyan-400" />
                      <span>{userProfile?.loggedIn ? `Account (${userProfile.username})` : 'Sign In / Sync'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Sleek top row for start page - shows options, profile, incognito badge, and Browser Settings toggle! */
        <div className="py-4 px-4 md:px-10 bg-transparent flex justify-between items-center z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            {incognito && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-wider animate-pulse shadow-sm animate-scale-up">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Incognito Active</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              id="start-page-browser-settings-btn"
              onClick={() => { setMenuOpen(true); setActivePanel('none'); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs border ${
                isLight
                  ? 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-250'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-750'
              }`}
              title="Configure Browser & Search Settings"
            >
              <Settings className="w-3.5 h-3.5 text-amber-500" />
              <span>Browser Settings</span>
            </button>
            <button
              id="start-page-bookmarks-btn"
              onClick={() => { setActivePanel('bookmarks'); setMenuOpen(false); }}
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
              }`}
              title="View Bookmarks"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-400" />
              <span>Bookmarks</span>
            </button>
            <button
              id="start-page-history-btn"
              onClick={() => { setActivePanel('history'); setMenuOpen(false); }}
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
              }`}
              title="View Search History"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-grow px-4 md:px-10 pb-20 ${incognito ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'} relative transition-colors ${desktopMode ? 'min-w-[1200px]' : ''}`}>
        
        {/* 3. CENTER SEARCH BOX (Only if no active search) */}
        {!activeSearch && (
          <div className="flex-grow flex flex-col items-center justify-center py-24 text-center max-w-[44rem] mx-auto animate-fade-in">
            
            {/* Logo & Title */}
            <div className="mb-8 flex flex-col items-center">
              <div className="w-24 h-24 mb-4 hover:scale-105 transition-transform duration-350 cursor-pointer">
                <BrandLogo size={96} includeBackground={true} />
              </div>
              <h2 className={`text-4xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-zinc-100'} font-sans flex items-center justify-center gap-1.5`}>
                <span>Isaiah</span>
                <span className="text-orange-500">Search</span>
              </h2>
            </div>

            {/* Toggle Buttons (Search / Isaiah.ai) */}
            <div className={`flex items-center gap-1 p-1 rounded-full mb-6 ${isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-600' : 'bg-zinc-800 border border-zinc-700 text-zinc-300'}`}>
              <div className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-sm cursor-pointer ${isLight ? 'bg-white shadow-sm text-zinc-900' : 'bg-zinc-700 text-zinc-100 shadow-sm'}`}>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </div>
              <div onClick={onGoToChat} className="flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity">
                <Sparkles className="w-4 h-4" />
                <span>Isaiah.ai</span>
              </div>
            </div>

            {/* Quick Access Chips for Recent 5 Web Search Queries */}
            {recentSearches.length > 0 && (
              <div className="w-full mb-3 flex items-center justify-center gap-1.5 flex-wrap animate-fade-in">
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Recent:
                </span>
                {recentSearches.map((q, idx) => (
                  <div
                    key={idx}
                    className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 ${
                      isLight 
                        ? 'bg-white hover:bg-zinc-50 border-zinc-250 text-zinc-800 hover:border-amber-400' 
                        : 'bg-zinc-800/90 hover:bg-zinc-750 border-zinc-700 text-zinc-200 hover:border-amber-500/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(q);
                        handleSearchSubmit(undefined, q);
                      }}
                      className="flex items-center gap-1.5 text-left font-medium cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{q}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(q);
                      }}
                      className="text-zinc-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      title="Remove search from history"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="w-full relative shadow-lg rounded-full mb-8">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search privately..."
                className={`w-full text-base h-14 pl-6 pr-14 rounded-full border focus:outline-none shadow-sm transition-all font-sans font-medium ${
                  isLight 
                    ? 'bg-white hover:bg-zinc-50 border-zinc-300 focus:border-zinc-400 placeholder-zinc-500 text-zinc-900' 
                    : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 focus:border-zinc-500 placeholder-zinc-400 text-zinc-100'
                }`}
                autoFocus
              />
              <button
                type="submit"
                className={`absolute right-4 top-4 transition-all cursor-pointer ${isLight ? 'text-zinc-500 hover:text-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Tagline */}
            <p className={`text-sm font-semibold ${isLight ? 'text-zinc-700' : 'text-zinc-300'} font-sans`}>
              Protection. Privacy. Peace of mind.
            </p>
          </div>
        )}
        
        {/* 4B. POPULATED SEARCH RESULTS VIEW */}
        {activeSearch && searchResults && (
          <div className="space-y-6 text-left animate-fade-in">
            {/* SEARCH TABS */}
            <div className="flex flex-col gap-3 -mt-2">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-0 scrollbar-hide border-b border-zinc-200">
                <button onClick={() => setActiveTab('All')} className={`whitespace-nowrap px-1 pb-3 border-b-2 text-sm cursor-pointer ${activeTab === 'All' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-700 font-medium transition-colors'}`}>All</button>
                <button onClick={() => setActiveTab('Images')} className={`whitespace-nowrap px-1 pb-3 border-b-2 text-sm cursor-pointer ${activeTab === 'Images' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-700 font-medium transition-colors'}`}>Images</button>
                <button onClick={() => setActiveTab('Videos')} className={`whitespace-nowrap px-1 pb-3 border-b-2 text-sm cursor-pointer ${activeTab === 'Videos' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-700 font-medium transition-colors'}`}>Videos</button>
                <button onClick={() => setActiveTab('News')} className={`whitespace-nowrap px-1 pb-3 border-b-2 text-sm cursor-pointer ${activeTab === 'News' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-700 font-medium transition-colors'}`}>News</button>
                <button onClick={() => setActiveTab('More')} className={`whitespace-nowrap px-1 pb-3 border-b-2 text-sm cursor-pointer ${activeTab === 'More' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-700 font-medium transition-colors'}`}>More</button>
                <button onClick={() => setAssistOpen(!assistOpen)} className={`cursor-pointer whitespace-nowrap px-2 sm:px-3 py-1.5 flex items-center gap-1.5 rounded-full ${assistOpen ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100'} font-semibold text-xs sm:text-sm ml-auto transition-all mb-1.5`}>
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Search Assist</span>
                  <span className="sm:hidden">Assist</span>
                </button>
                <button className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-100 text-zinc-500 mb-1 cursor-pointer transition-colors" onClick={() => { setMenuOpen(true); setActivePanel('none'); }}>
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500 whitespace-nowrap overflow-x-auto scrollbar-hide pb-2 relative">
                <button className="flex items-center gap-1.5 text-emerald-600 hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  Protected
                </button>

                {/* Preferred Search Engine Selector Button */}
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  <button
                    onClick={() => {
                      setSearchEngineDropdownOpen(!searchEngineDropdownOpen);
                      setSafeSearchDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
                    title="Change Search Engine"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                    <span>Engine: <strong className="text-amber-600 dark:text-amber-400">{preferredSearchEngine}</strong></span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  {searchEngineDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 rounded-xl shadow-xl z-30 py-1.5 w-56 animate-fade-in font-sans">
                      <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preferred Search Engine</div>
                      {['Isaiah Engine (Default)', 'Google', 'DuckDuckGo', 'Bing', 'Brave'].map((engine) => (
                        <button
                          key={engine}
                          onClick={() => {
                            handleSelectSearchEngine(engine);
                            setSearchEngineDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                            preferredSearchEngine === engine ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10' : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <span>{engine}</span>
                          {preferredSearchEngine === engine && <Check className="w-3.5 h-3.5 text-amber-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Safe Search Filter Selector Button */}
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  <button
                    onClick={() => {
                      setSafeSearchDropdownOpen(!safeSearchDropdownOpen);
                      setSearchEngineDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                      safeSearchFilter === 'Off' 
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                    title="Global Safe Search Filter"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Safe search: <strong>{safeSearchFilter}</strong></span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  {safeSearchDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 rounded-xl shadow-xl z-30 py-1.5 w-52 animate-fade-in font-sans">
                      <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Global Safe Search Filter</div>
                      {[
                        { level: 'Strict', desc: 'Block explicit text & media' },
                        { level: 'Moderate', desc: 'Filter explicit images & media' },
                        { level: 'Off', desc: 'No content filtering' }
                      ].map(({ level, desc }) => (
                        <button
                          key={level}
                          onClick={() => {
                            handleSelectSafeSearch(level as 'Strict' | 'Moderate' | 'Off');
                            setSafeSearchDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                            safeSearchFilter === level ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{level}</span>
                            {safeSearchFilter === level && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <span className="text-[10px] text-zinc-400 block font-normal">{desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Browser Settings Toggle Button */}
                <button
                  onClick={() => { setMenuOpen(true); setActivePanel('none'); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                  title="Open Browser Settings"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-500" />
                  <span>Browser Settings</span>
                </button>
              </div>
            </div>

            {/* SEARCH ASSIST BOX (Shows all the time on any tab) */}
            {assistOpen && (
              <div className={`p-5 bg-white shadow-md rounded-[1.5rem] border border-zinc-100 space-y-4 relative animate-slide-up select-text animate-fade-in ${assistExpanded ? '' : 'rainbow-ring-active'}`}>
                {/* Header of assist box */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-zinc-500 font-semibold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Search Assist</span>
                  </div>

                  {/* Top Right Icons */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => void copyAssistantSummary()} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer" title={summaryCopied ? "Copied" : "Copy answer"} aria-label="Copy Search Assist answer">
                      {summaryCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setShowSavedSources(value => !value)} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer relative" title="Read later" aria-label="Open Read later list">
                      <Bookmark className={`w-4 h-4 ${showSavedSources ? 'text-indigo-600' : ''}`} />
                      {savedSources.length > 0 && <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-indigo-600 text-white text-[9px] leading-[15px] text-center font-bold">{savedSources.length > 99 ? '99+' : savedSources.length}</span>}
                    </button>
                    <button className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer" title="Share" onClick={handleShareDirect}>
                      <Share className="w-4 h-4" />
                    </button>
                    <button onClick={() => showToast('Search Assist uses the current result links. Open sources to verify details and publication dates.')} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer" title="About this answer" aria-label="About this answer">
                      <Info className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer" title="Settings" onClick={() => { setMenuOpen(true); setActivePanel('none'); }}>
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showSavedSources && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-indigo-900">Read later ({savedSources.length})</span>
                      {savedSources.length > 0 && <button type="button" onClick={() => { setSavedSources([]); try { localStorage.removeItem('isaiah_search_reading_list'); } catch {} showToast('Read later list cleared'); }} className="text-[10px] text-zinc-500 hover:text-red-600 underline">Clear list</button>}
                    </div>
                    {savedSources.length === 0 ? (
                      <p className="text-xs text-zinc-600">Save a result with “Read later” to keep it here on this device.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {savedSources.map((saved) => (
                          <div key={normalizeSearchResultUrl(saved.url)} className="flex items-start gap-2 rounded-xl bg-white border border-indigo-100 p-2">
                            <button type="button" onClick={() => openWebpage(saved.url)} className="flex-1 min-w-0 text-left">
                              <span className="block text-xs font-semibold text-indigo-700 hover:underline">{saved.title}</span>
                              <span className="block text-[10px] text-zinc-500 truncate">{saved.siteName} · {saved.url}</span>
                            </button>
                            <button type="button" onClick={() => removeSavedSource(saved.url)} className="p-1 text-zinc-400 hover:text-red-600" aria-label="Remove saved result" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Body paragraph summary with typewriter streaming animation */}
                <div className="text-zinc-800 text-sm leading-relaxed space-y-3 font-sans font-medium text-left">
                  {isLoadingBrief && !typedSummary ? (
                    <div className="flex items-center gap-2 py-1.5 text-xs font-semibold text-indigo-600">
                      <RotatingWebIcon size={16} color="#4f46e5" className="text-indigo-600" />
                      <span>IsaiahAI Search Assistant is compiling web indices & typing response...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="text-zinc-800 leading-relaxed text-sm [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                        <Markdown components={{
                          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" className="text-indigo-600 underline underline-offset-2 break-words" />
                        }}>
                          {typedSummary || briefSummary || "Click the 'Search Assist' button above to generate an AI summary."}
                        </Markdown>
                      </div>
                      {isTypingBrief && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                  
                  {/* Source Pill */}
                  {!isLoadingBrief && searchResults.results && searchResults.results[0] && briefSummary && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => openWebpage(searchResults.results[0].url)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 text-[11px] rounded-full font-semibold border border-zinc-200 transition-all cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-zinc-200 text-[8px] font-bold text-zinc-700 select-none">
                          {searchResults.results[0].siteName.slice(0, 1)}
                        </span>
                        <span>{searchResults.results[0].siteName}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
                      </button>
                    </div>
                  )}
                </div>

                {activeSearch && relatedSearchSuggestions.length > 0 && (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3 text-left">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Explore next
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {relatedSearchSuggestions.map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => void handleSearchSubmit(undefined, suggestion)} className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors">
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider with central controls */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-zinc-100" />
                  </div>
                  <div className="relative flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={handleToggleExpand}
                      className="px-4 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs text-zinc-650 hover:text-zinc-900 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-extrabold shadow-sm"
                    >
                      <span>{assistExpanded ? 'Less' : 'More'}</span>
                      {assistExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={onGoToChat}
                      className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer shadow-sm"
                      title="Go to Chat Workspace"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded longer description view */}
                {assistExpanded && (
                  <div className="pt-2 text-left select-text animate-fade-in border-t border-zinc-100 space-y-4">
                    {isLoadingMore && !typedDetailed ? (
                      <div className="space-y-3.5 py-2 animate-pulse">
                        <div className="h-4 bg-zinc-150 rounded-full w-1/3" />
                        <div className="h-3.5 bg-zinc-100 rounded-full w-full" />
                        <div className="h-3.5 bg-zinc-100 rounded-full w-[96%]" />
                      </div>
                    ) : (
                      <div className="prose max-w-none text-zinc-750 leading-relaxed text-sm space-y-4 font-sans font-medium">
                        <div className="markdown-body text-zinc-800 relative">
                          <Markdown>{typedDetailed || addonSummary || "Deeper indices are being analyzed..."}</Markdown>
                          {isTypingMore && (
                            <div className="flex items-center gap-2 mt-3 text-xs text-indigo-600 font-bold font-mono animate-pulse select-none">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                              <span>IsaiahAI is typing deep report...</span>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2.5">
                          <label htmlFor="search-assist-follow-up" className="block text-xs font-bold text-indigo-950">Keep chatting about this search</label>
                          <textarea id="search-assist-follow-up" value={continueChatText} onChange={(event) => setContinueChatText(event.target.value)} placeholder={`Ask a follow-up about “${activeSearch || 'these results'}”…`} rows={2} className="w-full resize-y rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                          <button type="button" onClick={() => {
                            const followUp = continueChatText.trim();
                            if (!followUp) { showToast('Type a follow-up question first'); return; }
                            const context = (typedDetailed || addonSummary || briefSummary || '').trim().slice(0, 9000);
                            const prompt = `Continue our IsaiahAI Search Assist conversation about: ${activeSearch}.\\n\\nSearch summary and research so far:\\n${context || '(No summary was available yet.)'}\\n\\nMy follow-up question: ${followUp}\\n\\nContinue with this context and answer the follow-up directly.`;
                            if (onContinueWithPrompt) onContinueWithPrompt(prompt);
                            else { try { sessionStorage.setItem('isaiah_search_assist_handoff', prompt); } catch {} onGoToChat(); }
                          }} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 active:scale-[0.99]">
                            <MessageSquare className="w-4 h-4" /> Continue in full IsaiahAI chat
                          </button>
                        </div>

                        {/* RAINBOW BORDERED CONTINUE BUTTON AT THE BOTTOM OF THE MORE EXPANDED SECTION */}
                        <div className="pt-5 pb-1 flex justify-center">
                          <button
                            onClick={() => {
                              const context = (typedDetailed || addonSummary || briefSummary || '').trim().slice(0, 9000);
                              const prompt = `Continue our IsaiahAI Search Assist conversation about: ${activeSearch}.\\n\\nResearch so far:\\n${context}\\n\\nPlease continue with the conclusion and help me explore this topic further.`;
                              if (onContinueWithPrompt) onContinueWithPrompt(prompt);
                              else { try { sessionStorage.setItem('isaiah_search_assist_handoff', prompt); } catch {} onGoToChat(); }
                            }}
                            className="w-full text-center py-4 bg-zinc-950 hover:bg-zinc-900 border-2 border-transparent rounded-2xl font-black text-xs tracking-wide text-white transition-all cursor-pointer uppercase flex items-center justify-center gap-2.5 rainbow-ring-active hover:scale-[1.01] duration-500 shadow-xl"
                          >
                            <MessageSquare className="w-4 h-4 text-amber-300 animate-pulse" />
                            <span>Continue to Full AI Chat Workspace</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer labels */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-zinc-100 text-[10px] text-zinc-400 font-mono">
                  <span>AI overview based on the listed sources.</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-zinc-450">Was this helpful?</span>
                    <div className="flex items-center gap-2">
                      <button className="hover:text-zinc-900 transition-colors cursor-pointer">👍</button>
                      <button className="hover:text-zinc-900 transition-colors cursor-pointer">👎</button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* INTEGRATED GAMES SECTION FOR "ISAIAH GAMES" SEARCH */}
            {isGamesSearch ? (
              <div className="w-full py-4 space-y-6">
                <div className="p-6 bg-white border border-zinc-200 rounded-3xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shadow-md">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900 font-sans tracking-tight">IsaiahAI Arcade Integration</h3>
                        <p className="text-xs text-zinc-500 font-sans mt-0.5">Play Retro Pong, Trivia, Snake, Doom, and Game Gen directly!</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-orange-500 text-white font-mono font-bold px-3 py-1 rounded-full shadow-sm">
                      ARCADE ONLINE
                    </span>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-zinc-100 shadow-lg bg-zinc-950">
                    <GamesDashboard 
                      theme="light_glass" 
                      userNickname={userNickname} 
                      currentUser={null}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* TABS-SPECIFIC RESULTS VIEW */}
                
                {/* 1. All TAB (General Web Search Results) */}
                {activeTab === 'All' && (
                  <div className={`${compactResults ? 'space-y-3.5' : 'space-y-6'} pt-1`}>
                    {searchResults.results.map((resItem, idx) => {
                      const fontClass = searchFont.includes('Serif') || searchFont === 'Georgia' ? 'font-serif' : (searchFont.includes('Mono') || searchFont === 'Courier' ? 'font-mono' : 'font-sans');
                      const titleSizeClass = searchFontSize === 'Small' ? 'text-base sm:text-lg' : searchFontSize === 'Medium' ? 'text-lg sm:text-xl' : 'text-xl sm:text-[22px]';
                      const snippetSizeClass = searchFontSize === 'Small' ? 'text-xs sm:text-[13px]' : searchFontSize === 'Medium' ? 'text-[13px] sm:text-[14px]' : 'text-[14px] sm:text-[15px]';
                      const metaSizeClass = searchFontSize === 'Small' ? 'text-[11px]' : searchFontSize === 'Medium' ? 'text-[11.5px]' : 'text-[12.5px]';
                      const isSourceSaved = savedSources.some(saved => normalizeSearchResultUrl(saved.url) === normalizeSearchResultUrl(resItem.url));

                      return (
                        <div 
                          key={idx} 
                          className={`select-text cursor-default text-left ${compactResults ? 'mb-2.5 space-y-0.5' : 'mb-6 space-y-1.5'}`}
                        >
                          {/* Header: Favicon + Domain URL (Above Title Placement) */}
                          {urlPlacement === 'Above Title' && (
                            <div className="flex items-center gap-3 mb-1.5 shrink-0">
                              {showSiteIcons && (() => {
                                const fav = getFaviconUrl(resItem.url);
                                const fallbackId = `fav-fallback-${idx}`;
                                return (
                                  <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0 select-none border border-zinc-200">
                                    {fav ? (
                                      <img 
                                        src={fav} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        className="w-4 h-4 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = "none";
                                          const fallbackEl = document.getElementById(fallbackId);
                                          if (fallbackEl) fallbackEl.style.display = "flex";
                                        }}
                                      />
                                    ) : null}
                                    <span 
                                      id={fallbackId}
                                      className="text-[10px] text-zinc-600 font-mono font-bold uppercase"
                                      style={{ display: fav ? "none" : "flex" }}
                                    >
                                      {resItem.siteName.slice(0, 1)}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex flex-col text-left leading-tight">
                                {showSiteNames && <span className={`font-medium text-[13px] ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>{resItem.siteName}</span>}
                                <span className={`text-[11px] opacity-60 truncate max-w-[200px] sm:max-w-xs md:max-w-md ${isLight ? "text-zinc-800" : "text-zinc-300"}`}>{resItem.url}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Clickable title that opens in new tab */}
                          <button
                            onClick={() => openWebpage(resItem.url)}
                            className={`text-left ${fontClass} text-[18px] sm:text-[20px] font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug block w-full mb-2`}
                          >
                            {resItem.title}
                          </button>

                          {/* Header: Favicon + Domain URL (Below Title Placement) */}
                          {urlPlacement === 'Below Title' && (
                            <div className={`flex items-center gap-2.5 text-[13px] ${customBackgroundUrl && !isLight ? "text-zinc-300" : "text-zinc-550"}`}>
                              {showSiteIcons && (() => {
                                const fav = getFaviconUrl(resItem.url);
                                const fallbackId = `fav-fallback-below-${idx}`;
                                return (
                                  <div className="w-5 h-5 rounded-full bg-zinc-200/50 flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
                                    {fav ? (
                                      <img 
                                        src={fav} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        className="w-3 h-3 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = "none";
                                          const fallbackEl = document.getElementById(fallbackId);
                                          if (fallbackEl) fallbackEl.style.display = "flex";
                                        }}
                                      />
                                    ) : null}
                                    <span 
                                      id={fallbackId}
                                      className="text-[8px] text-zinc-600 font-mono font-bold uppercase"
                                      style={{ display: fav ? "none" : "flex" }}
                                    >
                                      {resItem.siteName.slice(0, 1)}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex flex-row items-center gap-1.5 text-left leading-snug">
                                {showSiteNames && <span className={`font-medium ${metaSizeClass} ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>{resItem.siteName}</span>}
                                {showSiteNames && <span className="text-[10px] opacity-40">•</span>}
                                <span className={`opacity-75 truncate max-w-[200px] sm:max-w-xs md:max-w-md ${metaSizeClass}`}>{resItem.url}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Snippet summary */}
                          <p className={`text-[14px] ${isLight ? "text-zinc-800" : "text-zinc-300"} font-sans leading-normal ${snippetSizeClass}`}>
                            {resItem.snippet}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button type="button" onClick={() => toggleSavedSource(resItem)} className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${isSourceSaved ? 'text-indigo-700' : 'text-zinc-500 hover:text-indigo-700'}`}>
                              <Bookmark className={`w-3.5 h-3.5 ${isSourceSaved ? 'fill-indigo-200' : ''}`} />
                              {isSourceSaved ? 'Saved to Read later' : 'Read later'}
                            </button>
                            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(resItem.url); showToast('Result link copied'); } catch { showToast('Clipboard access was blocked by the browser'); } }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-indigo-700 transition-colors cursor-pointer">
                              <Copy className="w-3.5 h-3.5" /> Copy link
                            </button>
                          </div>
                          
                          {/* Sublinks Action Pills Row (Image 4 Style) */}
                          {resItem.subLinks && resItem.subLinks.length > 0 && (
                            <div className="flex items-center gap-2 pt-2.5 overflow-x-auto scrollbar-hide">
                              {resItem.subLinks.map((sub, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => openWebpage(sub.url || resItem.url)}
                                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1a0dab] dark:text-[#8ab4f8] font-bold text-xs rounded-xl border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                                >
                                  {sub.title}
                                </button>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })}

                    {/* Show More Results Button (Opens Full Expanded Page) */}
                    {isLoadingMoreLinks ? (
                      <div className="pt-6 pb-8 flex justify-center items-center gap-2 text-xs font-semibold text-indigo-650">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Crawling deep results from Isaiah Search Index...</span>
                      </div>
                    ) : searchResults.results.length > 0 ? (
                      <div className="pt-8 pb-12 flex flex-col items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setExpandedResultsPage(1);
                            setShowExpandedResultsPage(true);
                            void loadMoreLinks();
                          }} 
                          className="px-8 py-3.5 bg-[#1a0dab] hover:bg-[#150a8a] text-white font-bold text-sm rounded-full transition-all shadow-md cursor-pointer flex items-center gap-2 hover:scale-105 duration-200"
                        >
                          <Search className="w-4 h-4" />
                          <span>Show More Results</span>
                        </button>
                        <span className="text-xs text-zinc-400 font-sans">Opens full expanded search page for "{activeSearch}"</span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* 2. Images TAB */}
                {activeTab === 'Images' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                    {searchResults.images && searchResults.images.map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => openWebpage(img.url)}
                        className="group overflow-hidden rounded-xl bg-white border border-zinc-200 hover:border-zinc-350 transition-all shadow-sm cursor-pointer text-left flex flex-col h-full"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-zinc-50 relative border-b border-zinc-100">
                          <img 
                            src={img.imageUrl} 
                            alt={img.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop`;
                            }}
                          />
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-[11px] font-semibold text-indigo-600 truncate">{img.title}</p>
                          <span className="text-[9.5px] text-zinc-400 font-mono uppercase block">{img.siteName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Videos TAB */}
                {activeTab === 'Videos' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                    {searchResults.videos && searchResults.videos.map((vid, idx) => (
                      <div 
                        key={idx}
                        onClick={() => openWebpage(vid.url)}
                        className="group overflow-hidden rounded-xl bg-white border border-zinc-200 hover:border-zinc-350 transition-all hover:-translate-y-0.5 duration-300 shadow-sm cursor-pointer text-left flex flex-col h-full"
                      >
                        {/* Thumbnail Section */}
                        <div className="aspect-video w-full overflow-hidden bg-zinc-100 relative border-b border-zinc-150">
                          <img 
                            src={vid.thumbnail} 
                            alt={vid.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                          {/* Duration Badge */}
                          <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-[9.5px] font-mono px-1.5 py-0.5 rounded text-white font-bold tracking-wider">
                            {vid.duration}
                          </span>
                        </div>
                        {/* Meta info */}
                        <div className="p-4 flex-grow flex flex-col justify-between space-y-2 bg-white">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-500 font-sans font-semibold pb-1.5 mb-1.5 border-b border-zinc-100">
                              {getFaviconUrl(vid.url) ? (
                                <img 
                                  src={getFaviconUrl(vid.url)!} 
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-3.5 h-3.5 rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span>{vid.siteName}</span>
                            </div>
                            <h5 className="font-bold text-xs text-zinc-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                              {vid.title}
                            </h5>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-450 font-mono font-bold pt-1">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-zinc-400" />
                              {vid.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {vid.uploaded}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. News TAB */}
                {activeTab === 'News' && (
                  <div className="space-y-4 pt-1">
                    {searchResults.news && searchResults.news.map((nws, idx) => (
                      <div 
                        key={idx}
                        onClick={() => openWebpage(nws.url)}
                        className="group p-4 bg-white hover:bg-zinc-50/50 border border-zinc-200 hover:border-zinc-350 rounded-2xl transition-all shadow-sm cursor-pointer flex flex-col sm:flex-row gap-4 items-start text-left"
                      >
                        {/* News Thumbnail */}
                        {nws.imageUrl && (
                          <div className="w-full sm:w-28 h-20 overflow-hidden rounded-lg bg-zinc-100 flex-shrink-0 border border-zinc-150">
                            <img 
                              src={nws.imageUrl} 
                              alt="" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 text-[10.5px] font-bold text-zinc-450 font-mono">
                            <span className="flex items-center gap-1.5 text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                              {getFaviconUrl(nws.url) ? (
                                <img 
                                  src={getFaviconUrl(nws.url)!} 
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-3.5 h-3.5 rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span>{nws.source}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {nws.time}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-zinc-900 group-hover:text-indigo-600 hover:underline leading-snug">
                            {nws.title}
                          </h5>
                          <p className="text-xs text-zinc-550 leading-relaxed">
                            {nws.snippet}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. More TAB */}
                {activeTab === 'More' && (
                  <div className="space-y-6 pt-1 text-left max-w-7xl">
                    
                    {/* KEYLESS GOOGLE MAPS EMBED */}
                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-bold text-sm text-zinc-900 font-sans uppercase tracking-wider">Google Maps & Local Places</h4>
                        </div>
                        <span className="text-[10px] bg-indigo-50/80 text-indigo-600 font-mono font-bold px-3 py-0.5 rounded-full border border-indigo-100">
                          LIVE MAP
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Left side: local place entries */}
                        <div className="md:col-span-1 max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {localPlacesData && localPlacesData.places && localPlacesData.places.length > 0 ? (
                            localPlacesData.places.map((place, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => {
                                  if (mapIframeRef.current) {
                                    // Change iframe URL to center on this specific place!
                                    mapIframeRef.current.src = `https://maps.google.com/maps?q=${encodeURIComponent(place.name + ', ' + place.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                                  }
                                }}
                                className="w-full text-left p-3 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-indigo-500 hover:bg-zinc-100/50 transition-all group cursor-pointer flex flex-col space-y-1"
                              >
                                <span className="font-bold text-xs text-zinc-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                  {place.name}
                                </span>
                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                                  <span>{place.category}</span>
                                  <span className="text-amber-500 font-bold">★ {place.rating} ({place.reviews})</span>
                                </div>
                                <span className="text-[10px] text-zinc-450 line-clamp-1">{place.address}</span>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-zinc-500 text-xs">
                              Showing direct search map projection.
                            </div>
                          )}
                        </div>

                        {/* Right side: Keyless official Google Map iframe! */}
                        <div className="md:col-span-2 h-72 rounded-xl overflow-hidden border border-zinc-200 relative bg-zinc-100">
                          <iframe
                            ref={mapIframeRef}
                            title="Google Maps"
                            className="w-full h-full border-none"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(activeSearch || localPlacesData?.city || "New York")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* FULL AI CHAT PROMOTIONAL DIRECT LINK CARD */}
                    <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-indigo-950 font-sans">Need interactive brainstorming?</h4>
                        <p className="text-xs text-indigo-750">Unlock full workspace capability, code generation, voice chats, and image studios inside the AI chat.</p>
                      </div>
                      <button
                        onClick={onGoToChat}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Open Full AI Chat</span>
                      </button>
                    </div>

                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-bold text-sm text-zinc-900 font-sans uppercase tracking-wider">IsaiahAI Privacy & Safety Controls</h4>
                      </div>
                      <p className="text-xs.5 text-zinc-600 leading-relaxed">
                        IsaiahAI runs your searches through an anonymous, server-side gateway to shield your IP address and user-agent from tracker scripts and fingerprinting engines.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-zinc-800 block">Tracker Stripping</span>
                            <p className="text-[10px] text-zinc-500 leading-normal">URL parameters containing tracking IDs are automatically removed before routing.</p>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-zinc-800 block">Encrypted Transport</span>
                            <p className="text-[10px] text-zinc-500 leading-normal">All outbound queries are enveloped in end-to-end TLS 1.3 encryption layers.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
                        <Globe className="w-5 h-5 text-amber-600" />
                        <h4 className="font-bold text-sm text-zinc-900 font-sans uppercase tracking-wider">Index Sync Directory</h4>
                      </div>
                      <p className="text-xs.5 text-zinc-600 leading-relaxed">
                        Direct-search external engines safely and anonymously with one click:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { name: 'Wikipedia', url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(activeSearch)}` },
                          { name: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${encodeURIComponent(activeSearch)}` },
                          { name: 'Google Search', url: `https://www.google.com/search?q=${encodeURIComponent(activeSearch)}` },
                          { name: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(activeSearch)}` },
                        ].map((ext, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => openWebpage(ext.url)}
                            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-xs text-zinc-700 hover:text-zinc-950 rounded-lg border border-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
                          >
                            <span>{ext.name}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
        )}

          </div>
        )}

      </div>

      {/* Browser Settings Modal Overlay */}
      {renderBrowserSettingsModal()}

      {renderFeatureModals()}

      {showMainBrowserModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full shadow-2xl p-6 md:p-8 space-y-5 relative select-text animate-scale-up text-left">
            <button 
              onClick={() => {
                setShowMainBrowserModal(false);
                setCopySuccess(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Globe className="w-5.5 h-5.5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Integrate with Your Browser</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-mono font-bold tracking-wider select-none uppercase w-fit">
                    Beta Edition - May Not Work
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Search with Isaiah Search directly inside Google Chrome, Firefox, Edge or Safari</p>
              </div>
            </div>

            {/* Iframe detection banner */}
            {window.self !== window.top && (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm select-none">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-amber-850 dark:text-amber-450 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Iframe Sandbox Detected</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal max-w-md">
                    Browsers block OpenSearch auto-discovery and clipboard copy inside preview containers. Open Isaiah Search in a new tab for seamless one-click browser integration!
                  </p>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 text-center flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
              </div>
            )}

            <div className="space-y-4">
              {/* Browser tab selection */}
              <div className="flex border-b border-zinc-100 dark:border-zinc-800 select-none">
                {(['chrome', 'firefox', 'edge', 'safari'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSetupTab(tab)}
                    className={`flex-1 pb-2.5 text-xs font-bold capitalize border-b-2 transition-all cursor-pointer text-center ${
                      activeSetupTab === tab
                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab === 'chrome' ? 'Google Chrome' : tab === 'firefox' ? 'Firefox' : tab === 'edge' ? 'MS Edge' : 'Safari'}
                  </button>
                ))}
              </div>

              {/* Dynamic steps content */}
              <div className="space-y-3 min-h-[140px] text-xs leading-relaxed text-zinc-650 dark:text-zinc-300">
                {activeSetupTab === 'chrome' && (
                  <div className="space-y-2">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">Option 1: Quick @isaiah Shortcut</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li>Open Chrome Settings &gt; <strong className="text-zinc-700 dark:text-zinc-300">Search engine</strong> &gt; <strong className="text-zinc-700 dark:text-zinc-300">Manage search engines and site search</strong>.</li>
                      <li>Scroll down to the <strong className="text-zinc-700 dark:text-zinc-300">Site search</strong> list and click <strong className="text-zinc-800 dark:text-zinc-200">Add</strong>.</li>
                      <li>Set Name to <strong className="text-zinc-700 dark:text-zinc-300">Isaiah Search</strong> and Shortcut/Keyword to <strong className="text-zinc-700 dark:text-zinc-300">@isaiah</strong>.</li>
                      <li>Paste the <strong>Query URL</strong> (copied below) and click <strong>Add</strong>.</li>
                      <li>Now, type <span className="font-bold text-orange-600 dark:text-orange-400">@isaiah</span> followed by space in Chrome's address bar to search!</li>
                    </ol>
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 pt-1">Option 2: Make It Your Default Search Engine</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-4">
                      Under <strong className="text-zinc-700 dark:text-zinc-300">Site search</strong>, click the three dots next to Isaiah Search and choose <strong className="text-zinc-800 dark:text-zinc-100">"Make default"</strong>. Any search from your address bar will now load in Isaiah!
                    </p>
                  </div>
                )}

                {activeSetupTab === 'firefox' && (
                  <div className="space-y-2">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">How to add in Mozilla Firefox:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li>Open this application in a <strong>New Tab</strong> (using the button above).</li>
                      <li>Click the search bar or right-click the Firefox URL address bar.</li>
                      <li>Select <strong className="text-zinc-800 dark:text-zinc-100">"Add Isaiah Search"</strong> from the dropdown menu.</li>
                      <li>Open Firefox Settings &gt; <strong className="text-zinc-700 dark:text-zinc-300">Search</strong>, scroll down to Default Search Engine, and select <strong className="text-zinc-800 dark:text-zinc-100">Isaiah Search</strong>!</li>
                    </ol>
                  </div>
                )}

                {activeSetupTab === 'edge' && (
                  <div className="space-y-2">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">How to add in Microsoft Edge:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li>Open Edge Settings &gt; <strong className="text-zinc-700 dark:text-zinc-300">Privacy, search, and services</strong>.</li>
                      <li>Scroll to the absolute bottom and click <strong className="text-zinc-700 dark:text-zinc-300">Address bar and search</strong> &gt; <strong className="text-zinc-700 dark:text-zinc-300">Manage search engines</strong>.</li>
                      <li>Click <strong className="text-zinc-800 dark:text-zinc-200">Add</strong>. Set engine name to <strong className="text-zinc-700 dark:text-zinc-300">Isaiah Search</strong>, keyword to <strong className="text-zinc-700 dark:text-zinc-300">@isaiah</strong>, and paste the URL below.</li>
                      <li>Click the three dots next to Isaiah Search and click <strong className="text-zinc-800 dark:text-zinc-100">Make default</strong>.</li>
                    </ol>
                  </div>
                )}

                {activeSetupTab === 'safari' && (
                  <div className="space-y-2">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">How to use with Apple Safari:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li>Open Safari Settings &gt; <strong className="text-zinc-700 dark:text-zinc-300">General</strong>.</li>
                      <li>Set your <strong className="text-zinc-700 dark:text-zinc-300">Homepage</strong> to: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200 font-mono text-[10px]">{window.location.origin}</code></li>
                      <li>Alternatively, you can install the lightweight, free Mac/iOS extension <strong className="text-zinc-800 dark:text-zinc-200">Omnikey</strong> or <strong className="text-zinc-800 dark:text-zinc-200">Keyword Search</strong> from the App Store and paste the URL below to enable instant address bar queries!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* URL copying component */}
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Your Personal Integration URL:</span>
                  <button
                    onClick={handleCopyQueryUrl}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none ${
                      copySuccess 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400' 
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-750 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:border-zinc-700 dark:text-zinc-300 active:scale-95'
                    }`}
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div 
                  onClick={handleCopyQueryUrl}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-2xl font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all select-all select-text cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-colors leading-normal"
                >
                  {window.location.origin}/?q=%s
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end select-none">
              <button
                onClick={() => {
                  setShowMainBrowserModal(false);
                  setCopySuccess(false);
                }}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div style={{ display: 'none' }} className={`md:hidden absolute bottom-0 left-0 right-0 h-14 ${incognito ? 'bg-zinc-900 border-t border-zinc-800 text-zinc-400' : 'bg-[#f8f9fa] border-t border-zinc-200 text-zinc-500'} flex items-center justify-between px-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]`}>
        {!activeSearch ? (
          <>
            <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer" onClick={() => { setMenuOpen(true); setActivePanel('bookmarks'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </button>
            <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer" onClick={() => setIsAddingPass(true)}>
              <Key className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer" onClick={() => window.history.back()}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer" onClick={() => window.history.forward()}>
              <ArrowRight className="w-6 h-6 text-zinc-300" />
            </button>
          </>
        )}
        <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer group" onClick={() => setShowFireModal(true)}>
          <Flame className="w-6 h-6 group-hover:text-amber-500 transition-colors" />
        </button>
        <button 
          className="w-6 h-6 border-[2px] border-current rounded-md font-bold text-[12px] flex items-center justify-center hover:bg-zinc-200/50 transition-colors cursor-pointer"
          onClick={() => setShowTabsModal(true)}
        >
          {tabs.length}
        </button>
        <button className="p-2 hover:bg-zinc-200/50 rounded-full transition-colors cursor-pointer" onClick={() => setShowBottomMenu(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>
      </>
      )}

      {/* TABS MODAL (Full screen on mobile) */}
      {showTabsModal && (
        <div className={`fixed inset-0 z-[100] ${isLight ? 'bg-[#f4f4f4]' : 'bg-zinc-950'} flex flex-col animate-fade-in`}>
          {/* Header */}
          <div className={`h-14 flex items-center justify-between px-4 ${isLight ? 'bg-[#f4f4f4] text-zinc-900' : 'bg-zinc-950 text-white'}`}>
            <button className="p-2 cursor-pointer" onClick={() => setShowTabsModal(false)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-full p-1">
              <button className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${isLight ? 'bg-white shadow-sm' : 'bg-zinc-600 text-white'}`}>
                <Flame className="w-4 h-4 inline-block mr-1" /> {tabs.length}
              </button>
            </div>
            <button className="p-2 cursor-pointer" onClick={() => { setShowTabsModal(false); onGoToChat(); }}>
              <Sparkles className="w-6 h-6" />
            </button>
          </div>
          
          {/* Tabs Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
            {tabs.map((tab, i) => (
              <div 
                key={tab.id} 
                className={`rounded-[1.5rem] overflow-hidden flex flex-col h-48 shadow-sm cursor-pointer border-2 transition-colors ${activeTabId === tab.id ? 'border-indigo-500' : 'border-transparent'} ${isLight ? 'bg-white' : 'bg-zinc-900'}`}
                onClick={() => {
                  setActiveTabId(tab.id);
                  if (tab.url) {
                    // Preserves live webpage in LiveWebProxyViewer
                  } else if (tab.title === 'New Tab') {
                    setActiveSearch('');
                    setSearchQuery('');
                  } else {
                    setActiveSearch(tab.title);
                    setSearchQuery(tab.title);
                  }
                  setShowTabsModal(false);
                }}
              >
                <div className={`p-3 flex justify-between items-center ${isLight ? 'bg-white' : 'bg-zinc-900'}`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <BrandLogo size={24} />
                    <span className={`text-xs font-semibold truncate ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{tab.title}</span>
                  </div>
                  <button 
                    className="cursor-pointer p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTabs = tabs.filter(t => t.id !== tab.id);
                      if (newTabs.length === 0) {
                        const newTab = { id: Date.now().toString(), title: 'New Tab', url: '' };
                        setTabs([newTab]);
                        setActiveTabId(newTab.id);
                        setActiveSearch('');
                        setSearchQuery('');
                        setShowTabsModal(false);
                      } else {
                        setTabs(newTabs);
                        if (activeTabId === tab.id) {
                           setActiveTabId(newTabs[newTabs.length - 1].id);
                        }
                      }
                    }}
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <div className={`flex-1 ${isLight ? 'bg-zinc-50' : 'bg-zinc-800'} rounded-b-[1.5rem] p-4 flex flex-col items-center justify-center overflow-hidden relative`}>
                  {tab.title !== 'New Tab' ? (
                    <div className="w-full h-full flex flex-col pt-2">
                       {/* Mock webpage skeleton */}
                       <div className="w-full flex items-center gap-2 mb-4">
                         <div className="w-1/2 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                         <div className="w-1/4 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                       </div>
                       <div className="w-full h-12 bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-600 p-2 mb-2">
                          <div className="w-3/4 h-1.5 bg-zinc-200 dark:bg-zinc-500 rounded-full mb-2" />
                          <div className="w-1/2 h-1.5 bg-zinc-200 dark:bg-zinc-500 rounded-full" />
                       </div>
                       <div className="w-full h-12 bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-600 p-2">
                          <div className="w-3/4 h-1.5 bg-zinc-200 dark:bg-zinc-500 rounded-full mb-2" />
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-500 rounded-full mb-2" />
                          <div className="w-1/2 h-1.5 bg-zinc-200 dark:bg-zinc-500 rounded-full" />
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-zinc-50/80 dark:from-zinc-800/80 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <BrandLogo size={60} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Bar in Tabs View */}
          <div className={`h-14 flex items-center justify-between px-6 ${isLight ? 'bg-white' : 'bg-zinc-900'}`}>
            <button className="p-2 cursor-pointer">
              <Menu className="w-6 h-6 text-transparent" />
            </button>
            <button 
              className="p-2 cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors"
              onClick={() => {
                const newTab = { id: Date.now().toString(), title: 'New Tab', url: '' };
                setTabs([newTab]);
                setActiveTabId(newTab.id);
                setShowTabsModal(false);
                setActiveSearch('');
                setSearchQuery('');
                showToast("All tabs closed");
              }}
              title="Close all tabs"
            >
              <Flame className="w-7 h-7" />
            </button>
            <button 
              className="p-2 cursor-pointer" 
              onClick={() => {
                const newTab = { id: Date.now().toString(), title: 'New Tab', url: '' };
                setTabs([...tabs, newTab]);
                setActiveTabId(newTab.id);
                setShowTabsModal(false);
                setActiveSearch('');
                setSearchQuery('');
              }}
            >
              <Plus className="w-7 h-7 text-zinc-800 dark:text-zinc-200" />
            </button>
            <button className="p-2 cursor-pointer" onClick={() => setShowBottomMenu(true)}>
              <MoreVertical className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />
            </button>
          </div>
        </div>
      )}

      {/* FLAMING TABS SCREEN (Image 1 Style) */}
      {showFireModal && (
        <div className={`fixed inset-0 z-[100] ${isLight ? 'bg-[#f4f4f6]' : 'bg-zinc-950 text-white'} flex flex-col justify-between animate-fade-in`}>
          {/* Top Header */}
          <div className={`h-16 flex items-center justify-between px-4 border-b ${isLight ? 'bg-[#f4f4f6] border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}>
            <button className="p-2.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => setShowFireModal(false)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            {/* Segmented Toggle Control: [ 🔥 Flaming | 1 ] */}
            <div className="flex bg-zinc-200/80 dark:bg-zinc-800 p-1 rounded-full shadow-inner">
              <button className="px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900 text-orange-500 shadow-sm flex items-center gap-1.5 text-xs font-bold transition-all">
                <Flame className="w-4 h-4 fill-orange-500" />
                <span>Flaming</span>
              </button>
              <button 
                onClick={() => { setShowFireModal(false); setShowTabsModal(true); }}
                className="px-4 py-1.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 text-xs font-bold transition-all cursor-pointer"
              >
                {tabs.length}
              </button>
            </div>

            <button className="p-2.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => { setShowFireModal(false); onGoToChat(); }}>
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>

          {/* Center Main View Body */}
          <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center max-w-sm mx-auto w-full text-center space-y-6">
            {/* Flame Phone Badge Graphic */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-500 to-red-500 flex items-center justify-center shadow-xl shadow-orange-500/25 text-white">
                <Flame className="w-14 h-14 fill-white text-orange-200 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center border-2 border-white text-xs font-black">
                🔥
              </div>
            </div>

            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              Flaming Tabs
            </h1>

            {/* Feature Info Card */}
            <div className={`w-full rounded-[2rem] p-6 text-left space-y-4 border shadow-sm ${
              isLight ? 'bg-white border-zinc-200/80 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
            }`}>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <Clock className="w-5 h-5 text-zinc-400 shrink-0" />
                <span>Browse without saving local history</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <User className="w-5 h-5 text-zinc-400 shrink-0" />
                <span>Sign in to a site with a different account</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <Globe className="w-5 h-5 text-zinc-400 shrink-0" />
                <span>Troubleshoot websites</span>
              </div>

              <div className="border-t border-zinc-150 dark:border-zinc-800 my-2" />

              <div className="flex items-start gap-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>
                  Flaming Tabs are isolated from other browser data. Their data is burned when you close them all. They give you the same tracking protection as other tabs.
                </span>
              </div>
            </div>

            {/* New Flaming Tab Button */}
            <button
              onClick={() => {
                const newTab = { id: Date.now().toString(), title: 'Flaming Tab 🔥', url: '' };
                setTabs(prev => [...prev, newTab]);
                setActiveTabId(newTab.id);
                setIncognito(true);
                setShowFireModal(false);
                setActiveSearch('');
                setSearchQuery('');
                setSearchResults(null);
                showToast("New Flaming Tab active - session isolated!");
              }}
              className={`w-full py-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>New Flaming Tab</span>
            </button>
          </div>

          {/* Bottom Toolbar */}
          <div className={`h-16 border-t flex items-center justify-around px-4 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
            <button className="p-2 cursor-pointer text-zinc-500 hover:text-zinc-800" onClick={() => setShowBottomMenu(true)}>
              <LayoutGrid className="w-6 h-6" />
            </button>
            <button className="p-2 cursor-pointer text-orange-500">
              <Flame className="w-6 h-6 fill-orange-500" />
            </button>
            <button 
              className="p-2 cursor-pointer text-zinc-500 hover:text-zinc-800" 
              onClick={() => {
                const newTab = { id: Date.now().toString(), title: 'Flaming Tab 🔥', url: '' };
                setTabs(prev => [...prev, newTab]);
                setActiveTabId(newTab.id);
                setIncognito(true);
                setShowFireModal(false);
                setActiveSearch('');
                setSearchQuery('');
                setSearchResults(null);
                showToast("New Flaming Tab created!");
              }}
            >
              <Plus className="w-6 h-6" />
            </button>
            <button className="p-2 cursor-pointer text-zinc-500 hover:text-zinc-800" onClick={() => setShowBottomMenu(true)}>
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ADD PASSWORD MODAL (Image 2 Style) */}
      {showAddPasswordModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAddPasswordModal(false)}>
          <div className={`w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 transform animate-scale-up ${isLight ? 'bg-[#f4f4f6]' : 'bg-zinc-900 text-white'}`} onClick={e => e.stopPropagation()}>
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 mb-2">
              <button 
                onClick={() => setShowAddPasswordModal(false)}
                className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold">Add password</h3>
              <button 
                onClick={() => handleSaveNewPassword()}
                className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all cursor-pointer shadow-sm"
              >
                Save
              </button>
            </div>

            {/* Form Cards */}
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {/* Card 1: Title */}
              <div className={`p-4 rounded-2xl border text-left space-y-1 ${isLight ? 'bg-white border-zinc-200/80' : 'bg-zinc-800 border-zinc-700'}`}>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Title</label>
                <input 
                  type="text" 
                  value={newPassTitle} 
                  onChange={(e) => setNewPassTitle(e.target.value)} 
                  placeholder="Title" 
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 font-medium" 
                />
              </div>

              {/* Card 2: Account Details */}
              <div className={`p-4 rounded-2xl border text-left space-y-3 ${isLight ? 'bg-white border-zinc-200/80' : 'bg-zinc-800 border-zinc-700'}`}>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Username</label>
                  <input 
                    type="text" 
                    value={newUser} 
                    onChange={(e) => setNewUser(e.target.value)} 
                    placeholder="username@example.com" 
                    className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 font-medium border-b border-zinc-150 dark:border-zinc-700 pb-2" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Password</label>
                  <input 
                    type="password" 
                    value={newPass} 
                    onChange={(e) => setNewPass(e.target.value)} 
                    placeholder="Password" 
                    className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 font-medium" 
                  />
                </div>
              </div>

              {/* Card 3: Website URL */}
              <div className={`p-4 rounded-2xl border text-left space-y-1 ${isLight ? 'bg-white border-zinc-200/80' : 'bg-zinc-800 border-zinc-700'}`}>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Website URL</label>
                <input 
                  type="text" 
                  value={newSite} 
                  onChange={(e) => setNewSite(e.target.value)} 
                  placeholder="example.com" 
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 font-medium" 
                />
              </div>

              {/* Card 4: Notes */}
              <div className={`p-4 rounded-2xl border text-left space-y-1 ${isLight ? 'bg-white border-zinc-200/80' : 'bg-zinc-800 border-zinc-700'}`}>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Notes</label>
                <textarea 
                  value={newPassNotes} 
                  onChange={(e) => setNewPassNotes(e.target.value)} 
                  placeholder="Notes" 
                  rows={3} 
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 resize-none font-medium" 
                />
              </div>

              <p className="text-[11px] text-zinc-400 text-center pt-1 font-mono">
                🔒 Saved with Google account on Isaiah Search
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED RESULTS PAGE MODAL */}
      {showExpandedResultsPage && (
        <div className={`fixed inset-0 z-[100] ${isLight ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white'} flex flex-col animate-fade-in overflow-y-auto`}>
          {/* Top Bar */}
          <div className={`sticky top-0 z-20 border-b p-4 flex items-center justify-between ${isLight ? 'bg-white/90 border-zinc-200 backdrop-blur-md' : 'bg-zinc-900/90 border-zinc-800 backdrop-blur-md'}`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowExpandedResultsPage(false)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <BrandLogo size={24} />
              <div>
                <h3 className="text-sm font-bold truncate">Full Expanded Results: "{activeSearch}"</h3>
                <span className="text-[10px] text-zinc-400 font-mono">Live results · {expandedResultCount} links · Page {expandedResultsPage}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowExpandedResultsPage(false)}
              className="px-4 py-1.5 rounded-full bg-[#1a0dab] text-white text-xs font-bold hover:bg-[#150a8a] cursor-pointer shadow-sm"
            >
              Back to Search
            </button>
          </div>

          {/* Expanded Page Body */}
          <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Live web results for your search</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase">Deep Index</span>
            </div>

            {/* List of actual search results returned by the search API */}
            <div className="space-y-6">
              {expandedPageResults.map((res, idx) => {
                let domain = res.siteName || 'Web result';
                try { domain = new URL(res.url).hostname.replace(/^www\./, ''); } catch { /* keep result site name */ }
                return (
                  <div key={`${res.url}-${idx}`} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-left bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {domain.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">{res.siteName || domain}</span>
                        <span className="text-[11px] text-zinc-400 font-mono truncate">{res.url}</span>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-zinc-400 shrink-0" />
                    </div>
                    <button
                      onClick={() => openWebpage(res.url, res.title)}
                      className="text-left font-bold text-lg text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer block"
                    >
                      {res.title}
                    </button>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{res.snippet || `Open ${res.title} for more information.`}</p>
                    {res.subLinks && res.subLinks.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-hide">
                        {res.subLinks.map((sub, pIdx) => (
                          <button
                            key={`${sub.url}-${pIdx}`}
                            onClick={() => openWebpage(sub.url || res.url, sub.title)}
                            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1a0dab] dark:text-[#8ab4f8] font-bold text-xs rounded-xl border border-zinc-200/80 dark:border-zinc-700 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {!expandedPageResults.length && (
                <div className="p-8 text-center text-sm text-zinc-500">
                  {isLoadingMoreLinks ? 'Loading more live results…' : 'No more indexed results were returned. Try another search or use one of the search engines above.'}
                </div>
              )}
              {isLoadingMoreLinks && expandedPageResults.length > 0 && (
                <div className="py-3 flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading more live results…
                </div>
              )}
            </div>

            {/* Functional pagination controls for the real result list */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 pb-12">
              {Array.from({ length: expandedPageCount }, (_, index) => index + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setExpandedResultsPage(page)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-sm ${expandedResultsPage === page ? 'bg-[#1a0dab] text-white font-bold' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                >
                  Page {page}
                </button>
              ))}
              <button
                disabled={isLoadingMoreLinks}
                onClick={async () => {
                  if (expandedResultsPage < expandedPageCount) {
                    setExpandedResultsPage(page => page + 1);
                  } else if (!isLoadingMoreLinks) {
                    const loaded = await loadMoreLinks();
                    if (loaded) setExpandedResultsPage(page => page + 1);
                    else showToast('No additional results were returned. Try a different search or engine.');
                  }
                }}
                className="px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {isLoadingMoreLinks ? 'Loading…' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIND IN PAGE BAR */}
      {findInPageOpen && (
        <div className={`sticky top-0 z-[60] px-4 py-2.5 flex items-center justify-between shadow-md ${isLight ? 'bg-white border-b border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-b border-zinc-800 text-white'} animate-slide-down`}>
          <div className="flex items-center gap-2 flex-grow max-w-md">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Find in page..."
              className={`w-full text-xs h-8 px-2.5 rounded-lg border focus:outline-none ${isLight ? 'bg-zinc-100 border-zinc-200 focus:border-zinc-350 text-zinc-900' : 'bg-zinc-800 border-zinc-750 focus:border-zinc-700 text-white'}`}
              autoFocus
            />
            {findQuery && (
              <span className="text-[10px] font-mono text-zinc-400 shrink-0 select-none">
                {findMatches > 0 ? `${findCurrentIndex} of ${findMatches}` : 'No matches'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button 
              onClick={() => {
                if (findMatches > 0) {
                  setFindCurrentIndex(prev => prev === findMatches ? 1 : prev + 1);
                }
              }}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                if (findMatches > 0) {
                  setFindCurrentIndex(prev => prev === 1 ? findMatches : prev - 1);
                }
              }}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { setFindInPageOpen(false); setFindQuery(''); }}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOADS PANEL */}
      {showDownloadsPanel && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDownloadsPanel(false)}>
          <div 
            className={`w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center transform animate-scale-up ${isLight ? 'bg-[#f6f6f6] text-zinc-900' : 'bg-zinc-900 text-zinc-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'} pb-3 mb-4`}>
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-500 animate-pulse" />
                <span className="font-bold text-sm tracking-tight">Downloads History</span>
              </div>
              <button onClick={() => setShowDownloadsPanel(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
              <Download className="w-10 h-10 mb-3 text-zinc-400" />
              <p className="font-semibold text-sm">No recent downloads</p>
              <p className="text-xs mt-1 max-w-[200px]">Files you download securely will appear here.</p>
            </div>
            <div className="pt-4 flex justify-end">
              <button onClick={() => setShowDownloadsPanel(false)} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-xl shadow cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[150] px-4 py-2.5 bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 animate-scale-up border border-zinc-700/50 dark:border-zinc-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BOTTOM LONG MENU */}
      {showBottomMenu && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in" onClick={() => setShowBottomMenu(false)}>
          <div 
            className={`w-full max-w-md mx-auto rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col transform animate-slide-up ${isLight ? 'bg-[#f6f6f6]' : 'bg-zinc-900'}`} 
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 flex items-center justify-between border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-3 w-full">
                <button className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors cursor-pointer ${isLight ? 'bg-white shadow-sm hover:bg-zinc-50' : 'bg-zinc-800 hover:bg-zinc-750'}`}>
                  <Plus className={`w-6 h-6 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`} />
                  <span className={`text-[12px] font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>New Tab</span>
                </button>
                <button 
                  onClick={() => { setShowBottomMenu(false); onGoToChat(); }}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors cursor-pointer ${isLight ? 'bg-white shadow-sm hover:bg-zinc-50' : 'bg-zinc-800 hover:bg-zinc-750'}`}
                >
                  <Sparkles className={`w-6 h-6 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`} />
                  <span className={`text-[12px] font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>Isaiah.ai</span>
                </button>
                <button 
                  onClick={() => { setShowBottomMenu(false); setShowMainBrowserModal(true); }}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors cursor-pointer ${isLight ? 'bg-white shadow-sm hover:bg-zinc-50' : 'bg-zinc-800 hover:bg-zinc-750'}`}
                >
                  <Settings className={`w-6 h-6 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`} />
                  <span className={`text-[12px] font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>Settings</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 pb-8">
              {/* Block 1 */}
              <div className={`rounded-[1.5rem] overflow-hidden ${isLight ? 'bg-white' : 'bg-zinc-800/50'}`}>
                {[
                  { 
                    icon: Bookmark, 
                    label: 'Add Bookmark', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      handleAddBookmarkDirect(); 
                    } 
                  },
                  { 
                    icon: Star, 
                    label: 'Add Favorite', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      handleAddFavoriteDirect(); 
                    } 
                  },
                  { 
                    icon: Share, 
                    label: 'Share', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      handleShareDirect(); 
                    } 
                  },
                  { 
                    icon: Search, 
                    label: 'Find in Page', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      setFindInPageOpen(true); 
                    } 
                  },
                  { 
                    icon: ZoomIn, 
                    label: `Zoom (${zoomLevel}%)`, 
                    action: () => { 
                      handleZoomCycle(); 
                    } 
                  },
                  { 
                    icon: Monitor, 
                    label: desktopMode ? 'Mobile Site' : 'Desktop Site', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      setDesktopMode(!desktopMode); 
                      showToast(desktopMode ? 'Switched to mobile site view' : 'Switched to desktop site view'); 
                    } 
                  }
                ].map((item, i, arr) => (
                  <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${i !== arr.length - 1 ? (isLight ? 'border-b border-zinc-100' : 'border-b border-zinc-700/50') : ''}`}>
                    <item.icon className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`} />
                    <span className={`text-[15px] font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Block 2 */}
              <div className={`rounded-[1.5rem] overflow-hidden ${isLight ? 'bg-white' : 'bg-zinc-800/50'}`}>
                {[
                  { icon: Bookmark, label: 'Bookmarks', action: () => { setShowBottomMenu(false); setActivePanel('bookmarks'); setMenuOpen(true); } },
                  { icon: Key, label: 'Passwords', action: () => { setShowBottomMenu(false); setActivePanel('passwords'); setMenuOpen(true); } },
                  { 
                    icon: Download, 
                    label: 'Downloads', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      setShowDownloadsPanel(true); 
                    } 
                  }
                ].map((item, i, arr) => (
                  <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${i !== arr.length - 1 ? (isLight ? 'border-b border-zinc-100' : 'border-b border-zinc-700/50') : ''}`}>
                    <item.icon className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`} />
                    <span className={`text-[15px] font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Block 3 */}
              <div className={`rounded-[1.5rem] overflow-hidden ${isLight ? 'bg-white' : 'bg-zinc-800/50'}`}>
                {[
                  { icon: Sparkles, label: 'Assistant Chat', action: () => { setShowBottomMenu(false); onGoToMode?.('general'); } },
                  { icon: ImageIcon, label: 'Image Generation', action: () => { setShowBottomMenu(false); onGoToMode?.('image'); } },
                  { icon: Bot, label: 'Code PR Review', action: () => { setShowBottomMenu(false); onGoToMode?.('code'); } },
                  { icon: Headphones, label: 'Voice Conversation', action: () => { setShowBottomMenu(false); onGoToMode?.('voice'); } },
                  { icon: Gamepad2, label: 'Isaiah Games', action: () => { setShowBottomMenu(false); onGoToMode?.('games'); } },
                  { icon: Settings, label: 'Isaiah.ai Settings', action: () => { setShowBottomMenu(false); setMenuOpen(true); setActivePanel('none'); } }
                ].map((item, i, arr) => (
                  <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${i !== arr.length - 1 ? (isLight ? 'border-b border-zinc-100' : 'border-b border-zinc-700/50') : ''}`}>
                    <item.icon className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`} />
                    <span className={`text-[15px] font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Block 4 */}
              <div className={`rounded-[1.5rem] overflow-hidden ${isLight ? 'bg-white' : 'bg-zinc-800/50'}`}>
                {[
                  { 
                    icon: AlertTriangle, 
                    label: 'Report Broken Site', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      showToast('Site report submitted! Thank you for your feedback.'); 
                    } 
                  },
                  { 
                    icon: Shield, 
                    label: privacyProtectionEnabled ? 'Disable Privacy Protection' : 'Enable Privacy Protection', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      setPrivacyProtectionEnabled(!privacyProtectionEnabled); 
                      showToast(privacyProtectionEnabled ? 'Privacy Protection Disabled' : 'Privacy Protection Enabled'); 
                    } 
                  },
                  { 
                    icon: Printer, 
                    label: 'Print', 
                    action: () => { 
                      setShowBottomMenu(false); 
                      window.print(); 
                    } 
                  }
                ].map((item, i, arr) => (
                  <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${i !== arr.length - 1 ? (isLight ? 'border-b border-zinc-100' : 'border-b border-zinc-700/50') : ''}`}>
                    <item.icon className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`} />
                    <span className={`text-[15px] font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Close button at bottom */}
            <div className={`p-6 ${isLight ? 'bg-[#f6f6f6]' : 'bg-zinc-900'} text-center flex justify-center sticky bottom-0`}>
               <button onClick={() => setShowBottomMenu(false)} className={`w-12 h-12 rounded-full ${isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'} transition-colors flex items-center justify-center cursor-pointer`}>
                 <X className="w-6 h-6" />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
