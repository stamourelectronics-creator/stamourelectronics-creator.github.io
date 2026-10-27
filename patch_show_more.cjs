const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `                    {/* Infinite Scroll loading indicator */}
                    {isLoadingMoreLinks && (
                      <div className="pt-6 pb-8 flex justify-center items-center gap-2 text-xs font-semibold text-indigo-650">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Crawling more results from web index...</span>
                      </div>
                    )}`;

const replaceStr = `                    {/* Infinite Scroll loading indicator */}
                    {isLoadingMoreLinks ? (
                      <div className="pt-6 pb-8 flex justify-center items-center gap-2 text-xs font-semibold text-indigo-650">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Crawling more results from web index...</span>
                      </div>
                    ) : searchResults.results.length > 0 && (
                      <div className="pt-8 pb-12 flex justify-center">
                        <button 
                          onClick={() => loadMoreLinks()} 
                          className={\`px-8 py-3 rounded-full text-sm font-semibold \${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'} transition-all\`}
                        >
                          More results
                        </button>
                      </div>
                    )}`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
