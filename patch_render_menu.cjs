const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = /  const renderDropdownMenu = \(\) => {[\s\S]*?  const fetchBriefSummary = async/;

const replacementStr = `  const renderDropdownMenu = () => {
    if (!menuOpen) return null;
    return (
      <div className="absolute right-0 top-11 w-[340px] rounded-2xl bg-[#1e1e1e] border border-zinc-800 z-50 shadow-2xl text-left animate-fade-in text-zinc-100 flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-zinc-800">
          <h3 className="font-bold text-sm tracking-wide">Search Settings</h3>
          <button 
            onClick={() => setMenuOpen(false)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] p-4 space-y-6 custom-scrollbar">
          
          {/* Appearance Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-[13px] text-zinc-100 tracking-wide">Appearance</h4>
            
            <div className="flex gap-4">
              <div 
                onClick={() => setAppearanceLayout('standard')}
                className={\`flex-1 aspect-video rounded-lg border \${appearanceLayout === 'standard' ? 'border-blue-500 bg-[#282828] border-2' : 'border-zinc-200 bg-white'} relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2\`}
              >
                {appearanceLayout === 'standard' && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-0.5 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className={\`w-16 h-1.5 rounded-full \${appearanceLayout === 'standard' ? 'bg-blue-400' : 'bg-blue-600'}\`}></div>
                <div className={\`w-20 h-1.5 rounded-full \${appearanceLayout === 'standard' ? 'bg-zinc-500' : 'bg-zinc-400'}\`}></div>
                <div className={\`w-14 h-1.5 rounded-full \${appearanceLayout === 'standard' ? 'bg-zinc-500' : 'bg-zinc-400'}\`}></div>
              </div>
              <div 
                onClick={() => setAppearanceLayout('dense')}
                className={\`flex-1 aspect-video rounded-lg border \${appearanceLayout === 'dense' ? 'border-blue-500 bg-[#282828] border-2' : 'border-zinc-200 bg-white'} relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2\`}
              >
                {appearanceLayout === 'dense' && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-0.5 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className={\`w-16 h-1 rounded-full \${appearanceLayout === 'dense' ? 'bg-blue-400' : 'bg-blue-600'}\`}></div>
                <div className={\`w-20 h-1 rounded-full \${appearanceLayout === 'dense' ? 'bg-zinc-500' : 'bg-zinc-400'}\`}></div>
                <div className={\`w-14 h-1 rounded-full \${appearanceLayout === 'dense' ? 'bg-zinc-500' : 'bg-zinc-400'}\`}></div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between relative">
                <span className="text-[13px] text-zinc-300">URL Placement</span>
                <span 
                  onClick={() => setSettingsDropdown(settingsDropdown === 'url' ? 'none' : 'url')}
                  className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white select-none"
                >
                  {urlPlacement} <ChevronDown className="w-4 h-4" />
                </span>
                {settingsDropdown === 'url' && (
                  <div className="absolute top-full right-0 mt-1 bg-[#282828] border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
                    <div onClick={() => { setUrlPlacement('Above Title'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Above Title</div>
                    <div onClick={() => { setUrlPlacement('Below Title'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Below Title</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Site Names</span>
                <div 
                  onClick={() => setShowSiteNames(!showSiteNames)}
                  className={\`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer \${showSiteNames ? 'bg-blue-500' : 'bg-zinc-600'}\`}
                >
                  <div className={\`w-3.5 h-3.5 rounded-full bg-white transition-transform \${showSiteNames ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Site Icons</span>
                <div 
                  onClick={() => setShowSiteIcons(!showSiteIcons)}
                  className={\`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer \${showSiteIcons ? 'bg-blue-500' : 'bg-zinc-600'}\`}
                >
                  <div className={\`w-3.5 h-3.5 rounded-full bg-white transition-transform \${showSiteIcons ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                </div>
              </div>
              <div className="flex items-center justify-between relative">
                <span className="text-[13px] text-zinc-300">Font Size</span>
                <span 
                  onClick={() => setSettingsDropdown(settingsDropdown === 'font_size' ? 'none' : 'font_size')}
                  className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white select-none"
                >
                  {searchFontSize} <ChevronDown className="w-4 h-4" />
                </span>
                {settingsDropdown === 'font_size' && (
                  <div className="absolute top-full right-0 mt-1 bg-[#282828] border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
                    <div onClick={() => { setSearchFontSize('Small'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Small</div>
                    <div onClick={() => { setSearchFontSize('Medium'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Medium</div>
                    <div onClick={() => { setSearchFontSize('Large'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Large</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between relative">
                <span className="text-[13px] text-zinc-300">Font</span>
                <span 
                  onClick={() => setSettingsDropdown(settingsDropdown === 'font' ? 'none' : 'font')}
                  className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white select-none"
                >
                  {searchFont} <ChevronDown className="w-4 h-4" />
                </span>
                {settingsDropdown === 'font' && (
                  <div className="absolute top-full right-0 mt-1 bg-[#282828] border border-zinc-700 rounded-lg shadow-xl z-20 py-1 whitespace-nowrap">
                    <div onClick={() => { setSearchFont('Duck Sans (default)'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Duck Sans (default)</div>
                    <div onClick={() => { setSearchFont('Inter'); setSettingsDropdown('none'); }} className="px-3 py-1.5 text-[12px] hover:bg-zinc-700 cursor-pointer text-white">Inter</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Compact Results</span>
                <div 
                  onClick={() => setCompactResults(!compactResults)}
                  className={\`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer \${compactResults ? 'bg-blue-500' : 'bg-zinc-600'}\`}
                >
                  <div className={\`w-3.5 h-3.5 rounded-full bg-white transition-transform \${compactResults ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-zinc-800"></div>

          {/* General Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-[13px] text-zinc-100 tracking-wide">General</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Display Language</span>
                <span className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white">
                  Browser preferre... <ChevronDown className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Infinite Scroll</span>
                <div 
                  onClick={() => setInfiniteScroll(!infiniteScroll)}
                  className={\`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer \${infiniteScroll ? 'bg-blue-500' : 'bg-zinc-600'}\`}
                >
                  <div className={\`w-3.5 h-3.5 rounded-full bg-white transition-transform \${infiniteScroll ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Open Links in a New Tab</span>
                <div 
                  onClick={() => setOpenLinksInNewTab(!openLinksInNewTab)}
                  className={\`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer \${openLinksInNewTab ? 'bg-blue-500' : 'bg-zinc-600'}\`}
                >
                  <div className={\`w-3.5 h-3.5 rounded-full bg-white transition-transform \${openLinksInNewTab ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">AI Features</span>
                <span className="text-[13px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">
                  Manage
                </span>
              </div>
            </div>
          </div>
          
        </div>
        
        <div className="border-t border-zinc-800 p-4 pb-2">
          <span className="text-[13px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer block mb-4">
            All Search Settings
          </span>
          <div className="flex items-start gap-3 bg-transparent rounded">
            <span className="text-xl shrink-0">🍪</span>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Deleting cookies will reset these settings. <span className="text-blue-400 cursor-pointer hover:underline">Try our browser</span> to never lose your settings.
            </p>
          </div>
        </div>

      </div>
    );
  };

  const fetchBriefSummary = async`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
