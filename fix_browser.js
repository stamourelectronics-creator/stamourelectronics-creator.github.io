import fs from 'fs';
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const searchStr = "        )};\n                              setNewAuthorizeEmailInput('');";
const replacementStr = `        )}
        
        {/* 4B. POPULATED SEARCH RESULTS VIEW */}
        {activeSearch && searchResults && (
          <div className="space-y-6 text-left animate-fade-in">
            {activeSearch.toLowerCase().trim() === 'access tester beta' ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                {hasDevBetaAccess ? (
                  <div className="space-y-6">
                    {/* Developer Overrides Sandbox */}
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs text-zinc-400 uppercase tracking-wider font-mono">Grant Beta Access</h4>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                              const target = newAuthorizeEmailInput;
                              if (!target) return;
                              setNewAuthorizeEmailInput('');`;

code = code.replace(searchStr, replacementStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
