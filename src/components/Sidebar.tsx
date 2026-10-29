import React, { useState, useRef } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit3, Check, X, Gamepad2, 
  Settings, Download, Upload, Cpu, Award, Zap, ShieldCheck,
  Search, Compass, HelpCircle, Sparkles, LogIn, LogOut, ExternalLink, Paperclip,
  Layers, Volume2, Image as ImageIcon, Flame, Globe, Tag
} from 'lucide-react';
import { ChatSession, UserSettings } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeView: 'chat' | 'games' | 'versions' | 'browser';
  onSelectView: (view: 'chat' | 'games' | 'versions' | 'browser') => void;
  onSelectSession: (id: string | null) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, title: string) => void;
  onSetCategory?: (id: string, category: string) => void;
  onDeleteSession: (id: string) => void;
  onToggleSettings: () => void;
  settings: UserSettings;
  onImportSessions: (imported: ChatSession[], importedGames?: any[]) => void;
  onExportSessions: () => void;
  onCloseMobile?: () => void;
  currentUser?: any;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  onToggleVoiceMode?: () => void;
  onSelectImageMode?: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  activeView,
  onSelectView,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onSetCategory,
  onDeleteSession,
  onToggleSettings,
  settings,
  onImportSessions,
  onExportSessions,
  onCloseMobile,
  currentUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onToggleVoiceMode,
  onSelectImageMode,
}: SidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCategoryMenuFor, setShowCategoryMenuFor] = useState<string | null>(null);
  const [showPlanInfo, setShowPlanInfo] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startEditing = (e: React.MouseEvent, id: string, originTitle: string) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitleValue(originTitle);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const saveRename = (e: React.FormEvent | React.MouseEvent, id: string) => {
    if (e) {
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    if (editTitleValue.trim()) {
      onRenameSession(id, editTitleValue.trim());
    }
    setEditingSessionId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.type === 'isaiah_ai_combined_backup') {
          onImportSessions(parsed.sessions, parsed.savedGames);
          alert(`IsaiahAI Restore Successful: Loaded ${parsed.sessions.length} chat sessions.`);
        } else if (Array.isArray(parsed)) {
          const isValid = parsed.every(item => item.id && item.title && Array.isArray(item.messages));
          if (isValid) {
            onImportSessions(parsed);
            alert(`IsaiahAI Restore Successful: Loaded ${parsed.length} chat sessions.`);
          } else {
            alert('Restore failed: JSON format does not match IsaiahAI schema.');
          }
        } else {
          alert('Restore failed: JSON file must contain arrays of sessions.');
        }
      } catch (err) {
        alert('Restore failed: Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // Filter sessions by search query and category
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter || (categoryFilter === 'Uncategorized' && !s.category);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-64 bg-[#19191b] flex flex-col h-full text-[#ececec] font-sans border-r border-[#26262b] flex-shrink-0 select-none">
      
      {/* Top Header Selector & Branding (Matching IMG_1423.png) */}
      <div className="p-4 pb-3 flex-shrink-0 flex items-center justify-between border-b border-zinc-900/40">
        <div className="flex items-center gap-2.5">
          {/* Logo Icon */}
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="font-bold font-display text-base text-zinc-100 tracking-tight">Isaiah AI</span>
            <span className="text-[9px] text-amber-500 font-mono font-semibold mt-0.5">st.amour electronics</span>
          </div>
        </div>

        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="w-9 h-9 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Top Action Controls matching IMG_1423.png */}
      <div className="px-3 pt-3.5 pb-2 space-y-2.5 flex-shrink-0">
        
        {/* 1. New Chat Pill Button */}
        <button
          onClick={() => {
            onSelectView('chat');
            if (onSelectImageMode) {
              try { (window as any).setChatMode?.('general'); } catch(e){}
            }
            onCreateSession();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full h-11 flex items-center gap-3 px-4 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-100 font-medium text-sm transition-all cursor-pointer shadow-sm group text-left border border-zinc-800/60"
        >
          <Edit3 className="w-4 h-4 text-zinc-300 group-hover:text-white" />
          <span>New chat</span>
        </button>

        {/* 2. Search chats Pill Input */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-zinc-850 text-sm h-11 pl-10 pr-8 rounded-full border border-zinc-800/60 focus:border-amber-500/40 focus:outline-none placeholder-zinc-400 text-white transition-all"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-zinc-400 hover:text-white text-sm font-semibold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div className="px-3 py-1 space-y-1 block border-t border-zinc-900/40 pt-2 flex-shrink-0">
        <button
          onClick={() => {
            onSelectView('browser');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
            activeView === 'browser' 
              ? 'bg-zinc-800 text-white font-bold border-l-2 border-emerald-500 pl-2.5' 
              : 'hover:bg-zinc-850 text-zinc-300 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate flex-1">IsaiahSearch</span>
          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold font-mono">AI + WEB</span>
        </button>

        <a
          href={`${import.meta.env.BASE_URL}downloads/isaiahai-agent.html`}
          className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer hover:bg-zinc-850 text-zinc-300 hover:text-white"
          title="Download the Windows IsaiahAI Agent"
        >
          <Download className="w-3.5 h-3.5 text-violet-400" />
          <span className="truncate flex-1">Windows AI Agent</span>
          <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1 py-0.5 rounded font-bold font-mono">EXE</span>
        </a>

        <button
          onClick={() => {
            onSelectView('versions');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
            activeView === 'versions' 
              ? 'bg-zinc-800 text-white font-bold border-l-2 border-sky-500 pl-2.5' 
              : 'hover:bg-zinc-850 text-zinc-300 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="truncate flex-1">IsaiahAI Versions</span>
          <span className="text-[8px] bg-sky-500/20 text-sky-400 px-1 py-0.5 rounded font-bold font-mono">v5.0</span>
        </button>
      </div>
        
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', 'Work', 'Personal', 'Coding', 'Other', 'Uncategorized'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap px-2 py-1 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      {/* Scrollable Conversation History Index */}
      <div className="flex-grow overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2 py-1 mb-1.5 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Chats</span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 px-4 space-y-1">
            <MessageSquare className="w-5 h-5 mx-auto stroke-1 text-zinc-700" />
            <p className="text-[10px] font-mono leading-tight text-zinc-500">No active sessions found.</p>
          </div>
        ) : (
          filteredSessions.map((ses) => {
            const isActive = activeSessionId === ses.id && activeView === 'chat';
            const isEditing = editingSessionId === ses.id;

            return (
              <div
                key={ses.id}
                onClick={() => {
                  onSelectView('chat');
                  onSelectSession(ses.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all relative cursor-pointer ${
                  isActive 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:text-[#ececec] hover:bg-zinc-800/40'
                }`}
              >
                {isEditing ? (
                  <form 
                    onSubmit={(e) => saveRename(e, ses.id)}
                    className="flex-1 flex items-center gap-1 pr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      className="p-1 hover:text-emerald-400 text-zinc-500 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={cancelEditing}
                      className="p-1 hover:text-red-400 text-zinc-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex-1 truncate flex items-center gap-2 pr-3 pl-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                    <span className="truncate leading-none">{ses.title}</span>
                  </div>
                )}

                {/* Operations overlay */}
                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    {ses.category && (
                      <span className="mr-1 text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        {ses.category}
                      </span>
                    )}
                    <button
                      onClick={() => setShowCategoryMenuFor(showCategoryMenuFor === ses.id ? null : ses.id)}
                      className="w-5 h-5 rounded hover:bg-zinc-750 flex items-center justify-center text-zinc-500 hover:text-white transition-colors relative"
                      title="Set Category"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    {showCategoryMenuFor === ses.id && (
                      <div className="absolute right-0 top-6 w-28 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 flex flex-col">
                        {['Work', 'Personal', 'Coding', 'Other', 'None'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              if (onSetCategory) {
                                onSetCategory(ses.id, cat === 'None' ? '' : cat);
                              }
                              setShowCategoryMenuFor(null);
                            }}
                            className="text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={(e) => startEditing(e, ses.id, ses.title)}
                      className="w-5 h-5 rounded hover:bg-zinc-750 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                      title="Rename Log"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSession(ses.id)}
                      className="w-5 h-5 rounded hover:bg-zinc-750 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                      title="Purge Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Plan modal overlay if active */}
      {showPlanInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#19191b] border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 animate-fade-in text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>IsaiahAI Premium Sync</span>
              </h3>
              <button onClick={() => setShowPlanInfo(false)} className="text-zinc-400 hover:text-white text-lg">×</button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You are currently utilizing premium **IsaiahAI by St.Amour Electronics** specifications.
            </p>
            <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>LICENSE TYPE</span>
                <span className="text-emerald-500 font-bold">ACCELERATED</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>LOCAL STORAGE CACHE</span>
                <span className="text-white font-bold">100% UNLIMITED</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>PORT</span>
                <span className="text-zinc-500">3000 INGRESS</span>
              </div>
            </div>
            <button 
              onClick={() => setShowPlanInfo(false)}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-black font-semibold text-xs py-2.5 rounded-xl transition-all"
            >
              Close specifications
            </button>
          </div>
        </div>
      )}

      {/* Bottom Segment matching IMG_1423.png */}
      <div className="p-3.5 bg-zinc-950/60 border-t border-zinc-900/40 flex-shrink-0 text-left space-y-2.5">
        
        {/* User profile / Info & Settings Footer bar matching IMG_1423.png */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2.5 truncate flex-1">
            {/* Circular Info Button (i) */}
            <button
              onClick={() => setShowPlanInfo(true)}
              className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
              title="Isaiah AI Information & License"
            >
              i
            </button>
            <div className="truncate text-left leading-tight">
              <span className="text-zinc-100 text-sm font-semibold truncate block">
                {settings.userNickname || 'isaiah stamour'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                {currentUser ? 'cloud synced' : 'local node'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              onToggleSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-9 h-9 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm flex-shrink-0"
            title="Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Backup / Restore & Google Auth options */}
        <div className="flex justify-between items-center px-1 pt-1 text-[10px] text-zinc-500 font-mono">
          <button 
            type="button" 
            onClick={onExportSessions} 
            className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Download JSON backups"
          >
            <Download className="w-3 h-3 text-amber-500" /> Export
          </button>
          <span className="text-zinc-800">•</span>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Restore conversation sessions JSON"
          >
            <Upload className="w-3 h-3 text-amber-500" /> Import
          </button>
          <span className="text-zinc-800">•</span>
          {currentUser ? (
            <button
              onClick={() => {
                if (onGoogleSignOut) onGoogleSignOut();
                if (onCloseMobile) onCloseMobile();
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> Logout
            </button>
          ) : (
            <button
              onClick={() => {
                if (onGoogleSignIn) onGoogleSignIn();
                if (onCloseMobile) onCloseMobile();
              }}
              className="text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3 h-3" /> Login
            </button>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".json" 
          className="hidden" 
        />
      </div>

    </div>
  );
}
