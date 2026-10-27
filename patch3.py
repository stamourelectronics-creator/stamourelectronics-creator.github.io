import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'<div className="flex items-center gap-3">.*?<Sparkles className="w-5 h-5" />.*?</div>.*?<div>.*?<h3 className="font-extrabold text-sm text-zinc-100 tracking-tight uppercase font-mono">Google AI Studio</h3>.*?<p className="text-\[11px\] text-zinc-500 mt-0\.5">View-only Sandbox Tunnel</p>.*?</div>.*?</div>.*?<span className="text-\[9px\] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-2\.5 py-1 rounded-full uppercase tracking-wider">.*?Authorized Beta View.*?</span>.*?</div>.*?<div className="relative w-full h-\[650px\] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner">.*?<iframe.*?src="https://aistudio\.google\.com/".*?title="Google AI Studio Feed".*?className="absolute border-0 select-none pointer-events-none w-full".*?style={{.*?top: \'-70px\',.*?left: \'0\',.*?height: \'calc\(100% \+ 70px\)\'.*?}}.*?/>.*?{\/\* Shrunken cover overlay to prevent editing or interactions \*\/}.*?<div className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" title="View-only Beta Console Feed" />.*?</div>',
    re.DOTALL
)

replacement = """<div className="flex items-center gap-3">
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
                      </div>
                      
                      {showAiStudio ? (
                        <div className="relative w-full h-[650px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner">
                          <iframe 
                            src="https://aistudio.google.com/" 
                            title="Google AI Studio Feed"
                            className="absolute border-0 select-none pointer-events-none w-full"
                            style={{
                              top: '-70px',
                              left: '0',
                              height: 'calc(100% + 70px)'
                            }}
                          />
                          {/* Shrunken cover overlay to prevent editing or interactions */}
                          <div className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" title="View-only Beta Console Feed" />
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner flex items-center justify-center">
                          <p className="text-zinc-500 font-mono text-xs">AI Studio Feed is currently disabled.</p>
                        </div>
                      )}"""

new_content = pattern.sub(replacement, content)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(new_content)
