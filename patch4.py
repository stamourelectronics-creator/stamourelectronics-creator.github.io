import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'\{incognito && \(\s*<div className="flex items-center gap-1\.5 px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full text-\[10\.5px\] font-mono font-bold uppercase tracking-wider animate-pulse shadow-sm animate-scale-up">\s*<Shield className="w-3\.5 h-3\.5 text-purple-400" />\s*<span>Incognito Active</span>\s*</div>\s*\)\}\s*</div>\s*<div className="flex items-center gap-3">.*?Authorized Beta View\s*</span>\s*</div>',
    re.DOTALL
)

replacement = """{incognito && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-wider animate-pulse shadow-sm animate-scale-up">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Incognito Active</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-grow overflow-y-auto px-4 md:px-10 pb-20 ${incognito ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'} relative transition-colors`}>
        
        {/* 3. CENTER SEARCH BOX (Only if no active search) */}
        {!activeSearch && (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto space-y-10 animate-fade-in">
            <div className="space-y-5">
              <div className="w-28 h-28 mx-auto hover:scale-105 transition-transform duration-350 cursor-pointer">
                <BrandLogo size={112} includeBackground={true} />
              </div>
              <div>
                <h2 className="text-5xl font-black text-zinc-950 tracking-tight font-display flex items-center justify-center gap-2 leading-none">
                  <span>Isaiah</span>
                  <span className="text-orange-500 font-extrabold">Search</span>
                </h2>
                <p className="text-[11px] text-zinc-450 font-mono mt-3 font-bold uppercase tracking-wider">The Private, Secure Cyber-Navigator by St.Amour Electronics</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="w-full relative shadow-2xl rounded-full transform hover:scale-[1.01] transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything anonymously..."
                className="w-full bg-white hover:bg-zinc-50 focus:bg-white text-base h-15 pl-6 pr-18 rounded-full border border-zinc-200 focus:border-zinc-350 focus:outline-none placeholder-zinc-400 text-zinc-950 shadow-lg transition-all font-sans font-semibold"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-3 top-2.5 px-6 bg-zinc-950 hover:bg-zinc-900 text-white rounded-full transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer h-10 shadow"
                title="Execute anonymous inquiry"
              >
                <Search className="w-4 h-4 text-white" />
                <span>Search</span>
              </button>
            </form>
          </div>
        )}

        {/* 4B. POPULATED SEARCH RESULTS VIEW */}
        {activeSearch && searchResults && (
          <div className="space-y-6 text-left animate-fade-in">
            {activeSearch.toLowerCase().trim() === 'access tester beta' ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="p-6 bg-white border border-zinc-200 shadow-xl rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow">
                      <Shield className="w-5.5 h-5.5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-sans text-xl font-extrabold text-zinc-900 tracking-tight">Developer Beta Access Portal</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Secure gateway for authorized engineers and beta testing inquiries</p>
                    </div>
                  </div>
                </div>
                {hasDevBetaAccess ? (
                  <div className="space-y-6">
                    {/* View-only AI Studio Iframe */}
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-950/50 border border-violet-800/40 flex items-center justify-center text-violet-400">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-zinc-100 tracking-tight uppercase font-mono">Google AI Studio</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">View-only Sandbox Tunnel</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setShowAiStudio(!showAiStudio)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                          >
                            {showAiStudio ? 'Disable Studio Feed' : 'Enable Studio Feed'}
                          </button>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Authorized Beta View
                          </span>
                        </div>
                      </div>"""

new_content = pattern.sub(replacement, content)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(new_content)
