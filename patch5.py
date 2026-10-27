import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'\{\/\* View-only AI Studio Iframe \*\/}.*?Interactive modifications are disabled\.\s*</p>\s*</div>',
    re.DOTALL
)

replacement = """{/* Developer Overrides Sandbox */}
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-950/50 border border-violet-800/40 flex items-center justify-center text-violet-400">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-zinc-100 tracking-tight uppercase font-mono">Developer Features Sandbox</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Test simulated environments and restricted DB access</p>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Authorized Beta View
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Switch 1: Job Search */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                          <div>
                            <h4 className="text-zinc-200 font-bold text-sm">Simulate "Find Me A Job" Routine</h4>
                            <p className="text-zinc-500 text-xs mt-1 max-w-sm">Triggers the AI to execute the localized job search override without ID requirements.</p>
                          </div>
                          <button
                            onClick={() => {
                              handleSearchSubmit(undefined, 'find me a job');
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                          >
                            Execute Override
                          </button>
                        </div>
                        
                        {/* Switch 2: St.Amour Database */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                          <div>
                            <h4 className="text-zinc-200 font-bold text-sm">St.Amour Database Access</h4>
                            <p className="text-zinc-500 text-xs mt-1 max-w-sm">Requests access to the unrestricted AI database. (Requires authorized email).</p>
                          </div>
                          <button
                            onClick={() => {
                              handleSearchSubmit(undefined, 'Access St.Amour database');
                            }}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                          >
                            Request Access
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono text-center">
                        Overrides simulate direct user prompts to test the core logic matrix.
                      </p>
                    </div>"""

new_content = pattern.sub(replacement, content)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(new_content)
