import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Lock,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  ShieldCheck,
  Globe,
  Radio,
  FileText,
  Activity,
  Zap,
  Play,
  Gauge,
  Sparkles,
  Wifi
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  extractYouTubeId, 
  isYouTubeUrl, 
  isSpeedtestUrl, 
  runClientSpeedTest, 
  SpeedTestResult,
  getPuterSurfStatus
} from '../lib/puterSurfEngine';

interface LiveWebProxyViewerProps {
  initialUrl: string;
  initialTitle?: string;
  isLight?: boolean;
  incognito?: boolean;
  onNavigate?: (newUrl: string, title?: string) => void;
  onSearch?: (query: string) => void;
  onClose?: () => void;
  onOpenExternal?: (url: string) => void;
  onOpenWebTab?: (url: string, title?: string) => void;
  onOpenTabs?: () => void;
  tabCount?: number;
}

export const LiveWebProxyViewer: React.FC<LiveWebProxyViewerProps> = ({
  initialUrl,
  initialTitle,
  isLight = false,
  incognito = false,
  onNavigate,
  onSearch,
  onClose,
  onOpenExternal,
  onOpenWebTab,
  onOpenTabs,
  tabCount
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState(initialTitle || initialUrl);
  const [mode, setMode] = useState<'proxy' | 'direct'>('proxy');
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [containerFullscreen, setContainerFullscreen] = useState(false);

  // History stack for Back/Forward navigation
  const [historyStack, setHistoryStack] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Reader Mode state
  const [readerModeOpen, setReaderModeOpen] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerContent, setReaderContent] = useState<string>('');
  const [readerTitle, setReaderTitle] = useState<string>('');

  // Speedtest Runner Modal state
  const [speedTestOpen, setSpeedTestOpen] = useState(false);
  const [speedTestState, setSpeedTestState] = useState<SpeedTestResult>({
    ping: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    jitter: 0,
    status: 'idle'
  });

  // YouTube Enhanced Player state
  const [youtubeTheaterOpen, setYoutubeTheaterOpen] = useState(false);
  const activeYtId = extractYouTubeId(currentUrl);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Puter.surf diagnostic status
  const surfStatus = getPuterSurfStatus();

  // Update current URL if prop changes
  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      navigateToUrl(initialUrl, initialTitle, true);
    }
  }, [initialUrl]);

  // Listen to postMessage from the proxied iframe (Puter.surf standard)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ignore messages from unrelated frames or tabs.
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'PUTER_SURF_LOCATION') {
        const liveUrl = event.data.targetUrl || event.data.url;
        const liveTitle = event.data.title;
        if (liveUrl && !liveUrl.startsWith('about:') && liveUrl !== currentUrl) {
          setCurrentUrl(liveUrl);
          setInputUrl(liveUrl);
          if (liveTitle) setPageTitle(liveTitle);
          onNavigate?.(liveUrl, liveTitle);
        }
      } else if (event.data.type === 'PUTER_SURF_NAVIGATE') {
        const targetUrl = event.data.url;
        if (targetUrl) {
          if (event.data.openNewTab && onOpenWebTab) onOpenWebTab(targetUrl);
          else navigateToUrl(targetUrl);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUrl, onNavigate, onOpenWebTab]);

  const navigateToUrl = (rawUrl: string, title?: string, skipStack = false) => {
    let formatted = rawUrl.trim();
    if (!formatted) return;

    if (!/^https?:\/\//i.test(formatted) && !formatted.startsWith('about:')) {
      formatted = 'https://' + formatted;
    }

    setCurrentUrl(formatted);
    setInputUrl(formatted);
    setIsLoading(true);
    setIframeKey(prev => prev + 1);

    const newTitle = title || formatted.replace(/^https?:\/\//i, '').split('/')[0];
    setPageTitle(newTitle);

    if (!skipStack) {
      setHistoryStack(prev => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(formatted);
        return next;
      });
      setHistoryIndex(prev => prev + 1);
    }

    onNavigate?.(formatted, newTitle);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryOrUrl = inputUrl.trim();
    if (!queryOrUrl) return;

    // Check if input looks like a URL
    const isLikelyUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i.test(queryOrUrl) && !queryOrUrl.includes(' ');
    if (isLikelyUrl) {
      navigateToUrl(queryOrUrl);
    } else {
      // Changed default search engine from DuckDuckGo to IsaiahSearch!
      if (onSearch) {
        onSearch(queryOrUrl);
      } else {
        // Fallback: search through IsaiahSearch API endpoint
        navigateToUrl(`https://isaiah-search.internal/?q=${encodeURIComponent(queryOrUrl)}`, `IsaiahSearch: ${queryOrUrl}`);
      }
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevUrl = historyStack[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setCurrentUrl(prevUrl);
      setInputUrl(prevUrl);
      setIsLoading(true);
      setIframeKey(prev => prev + 1);
      onNavigate?.(prevUrl);
    }
  };

  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextUrl = historyStack[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setCurrentUrl(nextUrl);
      setInputUrl(nextUrl);
      setIsLoading(true);
      setIframeKey(prev => prev + 1);
      onNavigate?.(nextUrl);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    if (onOpenExternal) {
      onOpenExternal(currentUrl);
    } else {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Open distraction-free reader mode via server reader parser
  const handleOpenReaderMode = async () => {
    setReaderModeOpen(true);
    setReaderLoading(true);
    setReaderTitle(pageTitle);
    try {
      const res = await fetch('/api/fetch-webpage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      });
      const data = await res.json();
      if (data.markdown) {
        setReaderContent(data.markdown);
        if (data.title) setReaderTitle(data.title);
      } else if (data.fallbackMarkdown) {
        setReaderContent(data.fallbackMarkdown);
      } else {
        setReaderContent(`# ${pageTitle}\n\n*Unable to extract readable article content for this page.*`);
      }
    } catch (err: any) {
      setReaderContent(`# Content Unavailable\n\nFailed to format page into reader mode: ${err.message}`);
    } finally {
      setReaderLoading(false);
    }
  };

  // Run real live Speedtest over Wisp proxy
  const handleStartSpeedTest = async () => {
    setSpeedTestOpen(true);
    await runClientSpeedTest((progress) => {
      setSpeedTestState({ ...progress });
    });
  };

  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const iframeSrc = mode === 'proxy'
    ? `${apiBase}/api/proxy?url=${encodeURIComponent(currentUrl)}`
    : currentUrl;

  return (
    <div 
      className={`flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden relative ${
        containerFullscreen ? 'fixed inset-0 z-[120]' : ''
      } ${
        isLight ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* 1. EMBEDDED BROWSER CONTROL BAR (Puter.surf Style) */}
      <div className={`flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border-b flex-shrink-0 z-20 ${
        isLight 
          ? 'bg-white border-zinc-200/80 shadow-xs' 
          : 'bg-zinc-900/90 border-zinc-800 backdrop-blur-md'
      }`}>
        {/* Navigation Buttons: Back, Forward, Reload, Home */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
            }`}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleForward}
            disabled={historyIndex >= historyStack.length - 1}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
            }`}
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReload}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
            }`}
            title="Reload live page"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
              }`}
              title="Return to Isaiah Search Home"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Omnibox / Address Bar Form (Default: IsaiahSearch) */}
        <form onSubmit={handleUrlSubmit} className="order-3 sm:order-none w-full sm:flex-1 min-w-0 relative flex items-center">
          <div className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
            isLight
              ? 'bg-zinc-100/80 border-zinc-300 focus-within:border-cyan-500 focus-within:bg-white text-zinc-900'
              : 'bg-zinc-850 border-zinc-750 focus-within:border-cyan-500/80 focus-within:bg-zinc-900 text-zinc-100'
          }`}>
            {/* Security Lock Badge */}
            <div className="flex items-center gap-1 shrink-0 text-emerald-500" title="Secure Wisp Encrypted Live Connection (rustls-wasm)">
              <Lock className="w-3.5 h-3.5" />
            </div>

            {/* Puter.surf Wisp Protocol Badge */}
            <span 
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase shrink-0"
              title="Embedded webpage proxy; restricted websites may require opening in the external browser."
            >
              <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
              Web Proxy
            </span>

            {/* IsaiahSearch Engine indicator */}
            <span 
              className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0"
              title="Default search engine: IsaiahSearch"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              IsaiahSearch
            </span>

            {/* URL / Search Input */}
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Search or enter a website address"
              aria-label="Search or enter a website address"
              className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-base sm:text-xs font-mono truncate"
            />

            {/* Omnibox Actions: Copy, Reader Mode, External Escape Hatch */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className={`p-1 rounded-md transition-colors ${
                  isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Copy current address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleOpenReaderMode}
                className={`p-1 rounded-md transition-colors ${
                  isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-700 text-zinc-400'
                }`}
                title="AI Reader Mode (Distraction-Free)"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                type="button"
                onClick={handleOpenExternal}
                className={`p-1 rounded-md transition-colors ${
                  isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Open in external browser window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Right Tools: Speedtest Accelerator, YouTube Mode, Fullscreen, Close */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Speedtest Tool Button */}
          <button
            type="button"
            onClick={handleStartSpeedTest}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isLight 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20' 
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            }`}
            title="Run Live Wisp Speed Test"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Speedtest</span>
          </button>

          {/* YouTube Theater Mode Button (if on YouTube) */}
          {activeYtId && (
            <button
              type="button"
              onClick={() => setYoutubeTheaterOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all cursor-pointer animate-pulse"
              title="Open Clean Fullscreen YouTube Player"
            >
              <Play className="w-3 h-3 fill-rose-400" />
              <span className="text-[11px]">Theater</span>
            </button>
          )}

          {/* Proxy Mode Toggle */}
          <button
            type="button"
            onClick={() => setMode(prev => prev === 'proxy' ? 'direct' : 'proxy')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              mode === 'proxy'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
            title={mode === 'proxy' ? 'Isaiah embedded-page proxy' : 'Direct iframe embed'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">{mode === 'proxy' ? 'Web Proxy' : 'Direct'}</span>
          </button>

          {/* Tab Manager Button */}
          {onOpenTabs && typeof tabCount === 'number' && (
            <button
              type="button"
              onClick={onOpenTabs}
              className={`w-7 h-7 border-[1.5px] rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                isLight 
                  ? 'border-zinc-400 text-zinc-700 hover:bg-zinc-100' 
                  : 'border-zinc-600 text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Manage open browser tabs"
            >
              {tabCount}
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setContainerFullscreen(prev => !prev)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
            }`}
            title={containerFullscreen ? 'Exit Fullscreen' : 'Fullscreen Browser'}
          >
            {containerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Live View / Return to Search */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer ml-0.5"
              title="Close Live Page"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB-BAR: QUICK BOOKMARKS & SPEED ACCELERATORS */}
      <div className={`flex items-center justify-between px-3 py-1 border-b text-[11px] overflow-x-auto whitespace-nowrap shrink-0 ${
        isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Jump To:</span>
          
          <button
            type="button"
            onClick={() => navigateToUrl('https://www.youtube.com')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer font-medium"
          >
            <Play className="w-2.5 h-2.5 fill-red-500 text-red-500" />
            YouTube
          </button>

          <button
            type="button"
            onClick={() => navigateToUrl('https://www.speedtest.net')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-cyan-500/15 hover:text-cyan-400 transition-colors cursor-pointer font-medium"
          >
            <Gauge className="w-2.5 h-2.5 text-cyan-400" />
            Speedtest.net
          </button>

          <button
            type="button"
            onClick={() => navigateToUrl('https://fast.com')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer font-medium"
          >
            <Zap className="w-2.5 h-2.5 text-red-400" />
            Fast.com
          </button>

          <button
            type="button"
            onClick={() => navigateToUrl('https://en.wikipedia.org')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-blue-500/15 hover:text-blue-400 transition-colors cursor-pointer font-medium"
          >
            <Globe className="w-2.5 h-2.5 text-blue-400" />
            Wikipedia
          </button>

          <button
            type="button"
            onClick={() => navigateToUrl('https://github.com')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-purple-500/15 hover:text-purple-400 transition-colors cursor-pointer font-medium"
          >
            <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
            GitHub
          </button>
        </div>

        {/* Engine status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Wisp Protocol + DOM Rewriter Active
          </span>
          <span>•</span>
          <span>Default: IsaiahSearch</span>
        </div>
      </div>

      {/* 3. LOADING PROGRESS BAR */}
      {isLoading && (
        <div className="h-0.5 w-full bg-cyan-950 overflow-hidden shrink-0 z-30">
          <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 w-full animate-pulse" />
        </div>
      )}

      {/* 4. EMBEDDED LIVE IFRAME CONTAINER */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={iframeSrc}
          title={pageTitle}
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full border-0 absolute inset-0 bg-white"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* 5. YOUTUBE THEATER MODAL (Instant lag-free YouTube player) */}
      {youtubeTheaterOpen && activeYtId && (
        <div className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/90">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-xs uppercase tracking-wider">YouTube Accelerator</span>
                <span className="text-xs text-zinc-300 font-medium truncate max-w-md">{pageTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setYoutubeTheaterOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${activeYtId}?autoplay=1&enablejsapi=1`}
                title="YouTube Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>Streaming via Puter.surf Wisp Video Pipeline (Zero CORS)</span>
              <button
                type="button"
                onClick={() => setYoutubeTheaterOpen(false)}
                className="px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold cursor-pointer transition-colors"
              >
                Close Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. LIVE SPEEDTEST MODAL */}
      {speedTestOpen && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">IsaiahSearch Live Speedtest</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Wisp Protocol Network Benchmark</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpeedTestOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Speed Gauges Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Download Speed</span>
                  <div className="text-3xl font-extrabold text-cyan-400 font-mono">
                    {speedTestState.downloadSpeed} <span className="text-sm font-normal text-zinc-400">Mbps</span>
                  </div>
                  {speedTestState.status === 'testing_download' && (
                    <div className="flex items-center justify-center gap-1 text-[11px] text-cyan-400 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Measuring throughput...
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Upload Speed</span>
                  <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                    {speedTestState.uploadSpeed} <span className="text-sm font-normal text-zinc-400">Mbps</span>
                  </div>
                  {speedTestState.status === 'testing_upload' && (
                    <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Measuring upload...
                    </div>
                  )}
                </div>
              </div>

              {/* Latency & Jitter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Latency (Ping)</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">{speedTestState.ping} ms</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Jitter</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">{speedTestState.jitter} ms</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {speedTestState.status === 'testing_ping' && 'Testing network connection latency...'}
                  {speedTestState.status === 'testing_download' && 'Downloading test payload over Wisp proxy tunnel...'}
                  {speedTestState.status === 'testing_upload' && 'Uploading stream chunks to benchmark server...'}
                  {speedTestState.status === 'completed' && 'Speed test finished! Connection benchmarked successfully.'}
                  {speedTestState.status === 'idle' && 'Ready to start network benchmark.'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartSpeedTest}
                  disabled={speedTestState.status === 'testing_download' || speedTestState.status === 'testing_upload'}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Test Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpeedTestOpen(false);
                    navigateToUrl('https://www.speedtest.net');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Open Speedtest.net
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. READER MODE DRAWER / MODAL */}
      {readerModeOpen && (
        <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{readerTitle || 'Reader View'}</h3>
                  <p className="text-[10px] text-zinc-400 font-mono truncate max-w-sm">{currentUrl}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReaderModeOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 font-serif text-zinc-200 leading-relaxed text-sm md:text-base">
              {readerLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-sm font-sans">Extracting readable content & generating AI structured format...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none prose-headings:font-sans prose-headings:font-bold prose-a:text-cyan-400">
                  <Markdown>{readerContent}</Markdown>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400 font-sans">
              <span>Distraction-free Isaiah reader mode</span>
              <button
                type="button"
                onClick={() => setReaderModeOpen(false)}
                className="px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer"
              >
                Return to Live Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
