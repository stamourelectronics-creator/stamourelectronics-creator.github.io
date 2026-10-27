import React from 'react';
import { X, Check, Settings, Palette, Type, History, Sparkles } from 'lucide-react';
import { UserSettings, ThemeType, BubbleStyleType } from '../types';

interface SettingsModalProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onSaveSettings, onClose }: SettingsModalProps) {
  const isLight = settings.theme === 'light_glass';
  
  const handleThemeChange = (theme: ThemeType) => {
    onSaveSettings({ ...settings, theme });
  };

  const handleFontSizeChange = (fontSize: 'sm' | 'md' | 'lg') => {
    onSaveSettings({ ...settings, fontSize });
  };

  const handleBubbleStyleChange = (bubbleStyle: BubbleStyleType) => {
    onSaveSettings({ ...settings, bubbleStyle });
  };

  const handleTextChange = (field: keyof UserSettings, value: string) => {
    onSaveSettings({ ...settings, [field]: value });
  };

  const themesList: { key: ThemeType; name: string; classes: string; previewColor: string }[] = [
    { key: 'light_glass', name: 'Liquid Glass (Light Mode)', classes: 'liquid-glass-bg-light', previewColor: 'bg-white border-sky-450 shadow-sm' },
    { key: 'slate', name: 'St.Amour Glass (Dark Mode)', classes: 'liquid-glass-bg-dark', previewColor: 'bg-slate-950 border-indigo-500' },
    { key: 'charcoal', name: 'Cosmic Charcoal', classes: 'from-slate-900 to-black', previewColor: 'bg-slate-900 border-slate-700' },
    { key: 'gold', name: 'Amour Gold', classes: 'from-yellow-950 to-neutral-950', previewColor: 'bg-yellow-600 border-yellow-400' },
    { key: 'matrix', name: 'Neon Matrix', classes: 'from-emerald-950 to-green-950', previewColor: 'bg-emerald-900 border-emerald-400' },
    { key: 'crimson', name: 'Crimson Flow', classes: 'from-red-950 to-stone-950', previewColor: 'bg-red-950 border-red-500' },
  ];

  const fonts: { key: 'sm' | 'md' | 'lg'; label: string; desc: string }[] = [
    { key: 'sm', label: 'Tech Compact', desc: 'Sleek, highly responsive layout scaling.' },
    { key: 'md', label: 'Balanced Default', desc: 'Standard comfortable viewing proportions.' },
    { key: 'lg', label: 'Editorial Spacious', desc: 'Amplified margins and high definition reading.' },
  ];

  const bubbleStyles: { key: BubbleStyleType; label: string; desc: string }[] = [
    { key: 'minimal', label: 'Borderless Flat', desc: 'No background color, clean dividing lines.' },
    { key: 'modern', label: 'Sleek Terminal', desc: 'Soft solid padding framing responses.' },
    { key: 'classic', label: 'Round Speech', desc: 'High-contrast curvature and classic talk logs.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in font-sans">
      <div className={`rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-350 ${
        isLight ? 'glass-pane-light text-zinc-800' : 'bg-slate-900 border border-slate-800 text-slate-100'
      }`}>
        
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-950 border-slate-850'
        }`}>
          <div className="flex items-center gap-2">
            <Settings className={`${isLight ? 'text-sky-600' : 'text-white'} w-5 h-5 animate-spin`} style={{ animationDuration: '6s' }} />
            <div>
              <h3 className={`font-display font-semibold text-base ${isLight ? 'text-zinc-900' : 'text-white'}`}>IsaiahAI Settings Panel</h3>
              <p className={`text-[10px] font-mono text-left ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ST.AMOUR PERSONALIZATION MODULE</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isLight ? 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-left">
          
          {/* User Nickname */}
          <div className="space-y-2">
            <label className={`text-[10px] font-mono uppercase tracking-widest block font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              User Nickname (Leaderboard & Chat Name)
            </label>
            <input 
              type="text" 
              value={settings.userNickname}
              onChange={(e) => handleTextChange('userNickname', e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 font-mono uppercase ${
                isLight 
                  ? 'bg-white/80 border border-zinc-300 text-zinc-850 focus:ring-sky-200 focus:border-sky-500' 
                  : 'bg-slate-950 border border-slate-800 text-white focus:ring-cyan-900 focus:border-cyan-500'
              }`}
              maxLength={15}
            />
          </div>

          {/* Theme custom options */}
          <div className="space-y-3">
            <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              <Palette className="w-4 h-4" />
              <span>Select Application Theme</span>
            </div>
            
            
            {/* Custom Background Image Upload */}
            <div className="pt-2 pb-1 space-y-3">
              <label className={`text-[10px] font-mono block mb-1.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Glass Background Image</label>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {/* None / Default */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', '')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${!settings.customBackgroundUrl ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}
                >
                  None
                </button>
                {/* Preset 1: Desk */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1533090161767') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=200)' }}
                  title="Wooden Desk"
                />
                {/* Preset 2: Abstract Flow */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1618005182384') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200)' }}
                  title="Abstract Flow"
                />
                {/* Preset 3: White Liquid Glass */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1490682143684') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=200)' }}
                  title="White Liquid Glass"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleTextChange('customBackgroundUrl', reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`w-full text-[10px] file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:cursor-pointer transition-colors ${
                    isLight 
                      ? 'file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 text-zinc-500' 
                      : 'file:bg-cyan-950 file:text-cyan-400 hover:file:bg-cyan-900 text-slate-400'
                  }`}
                />
                {settings.customBackgroundUrl && (
                  <button
                    onClick={() => handleTextChange('customBackgroundUrl', '')}
                    className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              {themesList.map((tm) => (
                <button
                  key={tm.key}
                  onClick={() => handleThemeChange(tm.key)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                    settings.theme === tm.key 
                      ? isLight
                        ? 'bg-white/80 border-sky-400 text-sky-950 shadow-sm font-semibold'
                        : 'bg-slate-800/80 border-cyan-500 text-white shadow-inner' 
                      : isLight
                        ? 'bg-white/20 border-zinc-200 text-zinc-650 hover:text-zinc-900 hover:bg-white/40'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-zinc-200 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border ${tm.previewColor} flex items-center justify-center text-xs`}>
                      🎨
                    </div>
                    <span className="text-xs font-semibold font-display">{tm.name}</span>
                  </div>
                  {settings.theme === tm.key && (
                    <div className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase flex items-center gap-1 ${
                      isLight ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Sizes */}
          <div className="space-y-3">
            <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              <Type className="w-4 h-4" />
              <span>Typography Size Settings</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {fonts.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFontSizeChange(f.key)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    settings.fontSize === f.key 
                      ? isLight ? 'bg-white/80 border-sky-450' : 'bg-slate-800/80 border-cyan-500 shadow-inner' 
                      : isLight ? 'bg-white/25 border-zinc-200 hover:bg-white/40' : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-semibold text-xs leading-none ${
                        settings.fontSize === f.key 
                          ? isLight ? 'text-sky-950 font-bold' : 'text-white' 
                          : isLight ? 'text-zinc-750' : 'text-slate-300'
                      }`}>{f.label}</h4>
                      <p className={`text-[10px] mt-1 ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{f.desc}</p>
                    </div>
                    {settings.fontSize === f.key && <Check className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat bubble styles */}
          <div className="space-y-3">
            <span className={`text-[10px] font-mono uppercase tracking-widest block font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>Message Layout Structure</span>
            <div className="grid grid-cols-1 gap-2">
              {bubbleStyles.map((b) => (
                <button
                  key={b.key}
                  onClick={() => handleBubbleStyleChange(b.key)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    settings.bubbleStyle === b.key 
                      ? isLight ? 'bg-white/80 border-sky-450' : 'bg-slate-800/80 border-cyan-500 shadow-inner' 
                      : isLight ? 'bg-white/25 border-zinc-200 hover:bg-white/40' : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-semibold text-xs leading-none ${
                        settings.bubbleStyle === b.key 
                          ? isLight ? 'text-sky-950 font-bold' : 'text-white' 
                          : isLight ? 'text-zinc-750' : 'text-slate-300'
                      }`}>{b.label}</h4>
                      <p className={`text-[10px] mt-1 ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{b.desc}</p>
                    </div>
                    {settings.bubbleStyle === b.key && <Check className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Symbols Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={`text-[10px] font-mono uppercase tracking-widest block font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>User Symbol</label>
              <input 
                type="text" 
                value={settings.userAvatarSymbol}
                onChange={(e) => handleTextChange('userAvatarSymbol', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center font-display focus:outline-none focus:ring-2 ${
                  isLight 
                    ? 'bg-white/80 border border-zinc-300 text-zinc-900 focus:ring-sky-200' 
                    : 'bg-slate-950 border border-slate-800 text-white focus:ring-cyan-900'
                }`}
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-mono uppercase tracking-widest block font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>IsaiahAI Symbol</label>
              <input 
                type="text" 
                value={settings.aiAvatarSymbol}
                onChange={(e) => handleTextChange('aiAvatarSymbol', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center font-display focus:outline-none focus:ring-2 ${
                  isLight 
                    ? 'bg-white/80 border border-zinc-300 text-zinc-900 focus:ring-sky-200' 
                    : 'bg-slate-950 border border-slate-800 text-white focus:ring-cyan-900'
                }`}
                maxLength={4}
              />
            </div>
          </div>

          {/* Drive Duplication Preferences */}
          <div className={`p-4 border rounded-xl space-y-3 ${
            isLight ? 'bg-white/50 border-zinc-200' : 'bg-slate-950 border border-slate-800'
          }`}>
            <span className={`text-[10px] font-mono block uppercase tracking-widest font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              📂 Google Drive optimization configs
            </span>
            
            <div className="space-y-2">
              <label className={`text-[10px] font-mono block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Duplicate Validation Match Basis:</label>
              <select
                value={settings.driveClearMatchingRule || 'name_size'}
                onChange={(e) => onSaveSettings({ ...settings, driveClearMatchingRule: e.target.value as any })}
                className={`w-full border text-xs rounded-lg px-2 py-1.5 focus:outline-none font-sans ${
                  isLight 
                    ? 'bg-white border-zinc-300 text-zinc-805 focus:border-sky-505' 
                    : 'bg-slate-950 border-zinc-800 text-zinc-200 focus:border-cyan-500'
                }`}
              >
                <option value="name_size">Matching Filename & Exact Size</option>
                <option value="name_checksum">Matching Filename & MD5 Checksum</option>
                <option value="name_only">Matching Filename Only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-mono block ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>Retention Target Priority:</label>
              <select
                value={settings.driveClearKeepPreference || 'oldest'}
                onChange={(e) => onSaveSettings({ ...settings, driveClearKeepPreference: e.target.value as any })}
                className={`w-full border text-xs rounded-lg px-2 py-1.5 focus:outline-none font-sans ${
                  isLight 
                    ? 'bg-white border-zinc-300 text-zinc-805 focus:border-sky-505' 
                    : 'bg-slate-950 border-zinc-800 text-zinc-200 focus:border-cyan-500'
                }`}
              >
                <option value="oldest">Keep the oldest file (Delete newer duplicates)</option>
                <option value="newest">Keep the newest file (Delete older duplicates)</option>
              </select>
            </div>
          </div>

          {/* System Update Log / Release History */}
          <div className={`p-4 border rounded-xl space-y-3 ${
            isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-950 border border-slate-800'
          }`}>
            <div className={`flex items-center justify-between text-[10px] font-mono uppercase tracking-widest font-bold ${
              isLight ? 'text-sky-600' : 'text-cyan-400'
            }`}>
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-500" />
                <span>System Update Log & Release History</span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                v8.0.0 Active
              </span>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1 text-xs">
              {/* Release v8.0.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white border-amber-200 shadow-xs' : 'bg-slate-900 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className={isLight ? 'text-zinc-900' : 'text-white'}>v8.0.0 — Isaiah AI 5.3 Fast Model, Smooth Typing Capsule Popovers & Dynamic Web Search Animation</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>September 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  <li>Added ultra-fast <strong>Isaiah AI 5.3</strong> model tailored for instantaneous general intelligence and concise, rapid responses.</li>
                  <li>Maintained <strong>Isaiah Max 6.0</strong> for deep cognitive reasoning, multi-modal analysis, and comprehensive explanations.</li>
                  <li>Rebuilt the model selector into a smooth, anchor-attached popover placed directly on the typing area capsule for intuitive switching.</li>
                  <li>Introduced the professional pulsing 3-dot wave generating response indicator and live rotating 3D web icon when search queries are actively crawling.</li>
                </ul>
              </div>

              {/* Release v7.5.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white border-sky-100' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className={isLight ? 'text-zinc-900' : 'text-white'}>v7.5.0 — Ultra-Smooth Voice Chime & Blank White Studio Canvas</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>September 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  <li>Synthesized a warm, harmonic lowpass opening chime tone upon launching the voice chat for a responsive, smooth feel.</li>
                  <li>Re-engineered the voice modal backdrop to a blank, pure white studio canvas with subtle outer breathing aura while preserving the animated smiley face.</li>
                  <li>Refined UI controls and transitions for seamless voice call initiation and termination.</li>
                </ul>
              </div>

              {/* Release v7.0.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className={isLight ? 'text-zinc-900' : 'text-white'}>v7.0.0 — Tab Persistence, History Auto-Save & Clean Startup</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>August 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  <li>Removed startup login disclaimer notice popup and browser setup survey/sign-in gates for a clean, uninterrupted launch.</li>
                  <li>Implemented full local tab persistence—open tabs, active queries, and session state are now automatically saved to the user's local device.</li>
                  <li>Automated website logging to the History panel so all opened webpages and visited sites can be viewed, searched, and re-launched.</li>
                  <li>Added an interactive desktop tab switcher bar with one-click tab creation, active state indicator, and quick-close controls.</li>
                </ul>
              </div>

              {/* Release v6.5.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold text-xs ${isLight ? 'text-zinc-800' : 'text-slate-200'}`}>v6.5.0 — System Release & Update Log Protocol</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>August 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  <li>Established v6.5.0 release protocol with +0.5 versioning increments for all future system updates.</li>
                  <li>Updated active version indicator badge in Settings to v6.5.0 Active.</li>
                  <li>Optimized AI response timeout threshold and multi-model fallback routines.</li>
                </ul>
              </div>

              {/* Release v6.0.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold text-xs ${isLight ? 'text-zinc-800' : 'text-slate-200'}`}>v6.0.0 — AI Runtime & Timeout Restoration</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>August 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  <li>Restored primary Gemini AI chat execution ceiling (up to 35s) to eliminate chat timeouts.</li>
                  <li>Configured multi-model fallback chain across gemini-2.5-flash and gemini-2.5-pro models.</li>
                  <li>Integrated Pollinations AI dynamic image synthesizer for zero-quota image generation.</li>
                </ul>
              </div>

              {/* Release v5.5.0 */}
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-white/40 border-zinc-200' : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold text-xs ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>v5.5.0 — Chatbot Lifecycle & Search Indexing</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>August 2026</span>
                </div>
                <ul className={`text-[11px] space-y-1 list-disc list-inside ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  <li>Isolated BotPenguin chat widget script instances during page transitions to prevent collisions.</li>
                  <li>Enhanced local Wikipedia and DuckDuckGo index caching for high-speed fallback queries.</li>
                  <li>Upgraded Google Drive duplicate cleaner with custom checksum and retention priority.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Device Sync Info box */}
          <div className={`border p-4 rounded-xl space-y-2 text-xs leading-relaxed ${
            isLight ? 'bg-white/40 border-zinc-205 text-zinc-600' : 'bg-slate-955 border-slate-850 text-slate-400'
          }`}>
            <span className={`text-[10px] font-mono block uppercase tracking-widest font-bold ${isLight ? 'text-sky-600' : 'text-cyan-500'}`}>
              🔄 Device Sync Capabilities
            </span>
            <p>Your settings and chat logs save instantly down to your local browser storage registry. To sync across alternative phones/devices, use the <b>Backup & Restore (JSON Export)</b> panel available in the sidebar!</p>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${
          isLight ? 'bg-white/60 border-zinc-200' : 'bg-slate-950 border-slate-850'
        }`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 font-display font-semibold text-xs tracking-tight rounded-xl transition-all shadow-md ${
              isLight 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-505 hover:from-sky-600 hover:to-indigo-600 text-white' 
                : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-slate-950'
            }`}
          >
            Apply Configurations
          </button>
        </div>

      </div>
    </div>
  );
}
