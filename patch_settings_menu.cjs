const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const oldFunctionRegex = /  const renderDropdownMenu = \(\) => {[\s\S]*?  const fetchBriefSummary = async/;

const newFunction = `  const renderDropdownMenu = () => {
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
              <div className="flex-1 aspect-video bg-white rounded-lg border border-zinc-200 relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2">
                <div className="w-16 h-1.5 bg-blue-600 rounded-full"></div>
                <div className="w-20 h-1.5 bg-zinc-400 rounded-full"></div>
                <div className="w-14 h-1.5 bg-zinc-400 rounded-full"></div>
              </div>
              <div className="flex-1 aspect-video bg-[#282828] rounded-lg border-2 border-blue-500 relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2">
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-0.5 text-white">
                  <Check className="w-3 h-3" />
                </div>
                <div className="w-16 h-1.5 bg-blue-400 rounded-full"></div>
                <div className="w-20 h-1.5 bg-zinc-500 rounded-full"></div>
                <div className="w-14 h-1.5 bg-zinc-500 rounded-full"></div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">URL Placement</span>
                <span className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white">
                  Above Title <ChevronDown className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Site Names</span>
                <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors bg-blue-500 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform translate-x-3.5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Site Icons</span>
                <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors bg-blue-500 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform translate-x-3.5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Font Size</span>
                <span className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white">
                  Large <ChevronDown className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Font</span>
                <span className="text-[13px] text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-white">
                  Duck Sans (default) <ChevronDown className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Compact Results</span>
                <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors bg-zinc-600 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform translate-x-0" />
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
                <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors bg-zinc-600 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform translate-x-0" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-300">Open Links in a New Tab</span>
                <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors bg-zinc-600 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform translate-x-0" />
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

code = code.replace(oldFunctionRegex, newFunction);
fs.writeFileSync('src/components/BrowserView.tsx', code);
