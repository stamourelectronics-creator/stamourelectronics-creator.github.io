const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `                          {/* Header: Favicon + Domain URL */}
                          <div className={\`flex items-center gap-3 text-[13px] \${customBackgroundUrl && !isLight ? "text-zinc-300" : "text-zinc-550"}\`}>
                            {(() => {
                              const fav = getFaviconUrl(resItem.url);
                              const fallbackId = \`fav-fallback-\${idx}\`;
                              return (
                                <img
                                  src={fav}
                                  alt=""
                                  className="w-4 h-4 rounded-full bg-zinc-100"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = document.getElementById(fallbackId);
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              );
                            })()}
                            <div
                              id={\`fav-fallback-\${idx}\`}
                              className="w-4 h-4 rounded-full bg-zinc-200 hidden items-center justify-center text-[8px] font-bold text-zinc-500"
                            >
                              {getDomain(resItem.url).charAt(0).toUpperCase()}
                            </div>
                            <a href={resItem.url} target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 cursor-pointer font-medium tracking-wide">
                              {getDomain(resItem.url)}
                            </a>
                            <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-500 font-bold uppercase tracking-wider font-mono shadow-sm">
                              {resItem.type}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-lg text-blue-700 hover:underline leading-tight mt-1.5">
                            <a href={resItem.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">{resItem.title}</a>
                          </h4>
                          
                          <p className={\`text-sm leading-relaxed max-w-3xl \${customBackgroundUrl && !isLight ? "text-zinc-200" : "text-zinc-650"}\`}>
                            {resItem.snippet}
                          </p>`;

const replacementStr = `                          {/* Header: Favicon + Domain URL + 3 Dots */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5 mb-1.5">
                              <div className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-100 font-semibold">
                                {(() => {
                                  const fav = getFaviconUrl(resItem.url);
                                  const fallbackId = \`fav-fallback-\${idx}\`;
                                  return (
                                    <>
                                      <img
                                        src={fav}
                                        alt=""
                                        className="w-4 h-4 rounded bg-zinc-100"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const fallback = document.getElementById(fallbackId);
                                          if (fallback) fallback.style.display = 'flex';
                                        }}
                                      />
                                      <div
                                        id={fallbackId}
                                        className="w-4 h-4 rounded bg-zinc-200 hidden items-center justify-center text-[8px] font-bold text-zinc-500"
                                      >
                                        {getDomain(resItem.url).charAt(0).toUpperCase()}
                                      </div>
                                    </>
                                  );
                                })()}
                                <span>{getDomain(resItem.url).replace('www.', '')}</span>
                              </div>
                              <span className="text-[13px] text-zinc-500 dark:text-zinc-400">{resItem.url}</span>
                            </div>
                            <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 p-1.5 rounded-full cursor-pointer transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <h4 className="font-medium text-xl text-indigo-700 dark:text-indigo-400 hover:underline leading-tight mb-1 font-serif">
                            <a href={resItem.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">{resItem.title}</a>
                          </h4>
                          
                          <p className={\`text-[15px] leading-snug max-w-3xl \${customBackgroundUrl && !isLight ? "text-zinc-200" : "text-zinc-700 dark:text-zinc-300"}\`}>
                            {resItem.snippet}
                          </p>`;

code = code.replace(targetStr, replacementStr);

const toggleTarget = `<div className="flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity">
                <Sparkles className="w-4 h-4" />
                <span>Isaiah.ai</span>
              </div>`;
const toggleReplacement = `<div onClick={onGoToChat} className="flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity">
                <Sparkles className="w-4 h-4" />
                <span>Isaiah.ai</span>
              </div>`;

code = code.replace(toggleTarget, toggleReplacement);

fs.writeFileSync('src/components/BrowserView.tsx', code);
