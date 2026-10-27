const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `                          <div className="flex items-center gap-3 mb-1">
                            {/* Favicon & Name */}
                            {(() => {
                              const fav = getFaviconUrl(resItem.url);
                              const fallbackId = \`fav-fallback-\${idx}\`;
                              return (
                                <div className="w-7 h-7 rounded-full bg-zinc-200/50 flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
                                  {fav ? (
                                    <img 
                                      src={fav} 
                                      alt="" 
                                      referrerPolicy="no-referrer"
                                      className="w-4 h-4 object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                        const fallbackEl = document.getElementById(fallbackId);
                                        if (fallbackEl) fallbackEl.style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <span 
                                    id={fallbackId}
                                    className="text-[10px] text-zinc-600 font-mono font-bold uppercase"
                                    style={{ display: fav ? "none" : "flex" }}
                                  >
                                    {resItem.siteName.slice(0, 1)}
                                  </span>
                                </div>
                              );
                            })()}
                            <div className="flex flex-col text-left leading-snug">
                              <span className={\`font-medium \${isLight ? "text-zinc-900" : "text-zinc-100"}\`}>{resItem.siteName}</span>
                              <span className="text-[12px] opacity-70 truncate max-w-sm sm:max-w-md">{resItem.url}</span>
                            </div>
                          </div>
                          
                          {/* Clickable title that opens in new tab */}
                          <button
                            onClick={() => openWebpage(resItem.url)}
                            className="text-left font-sans text-xl font-medium text-indigo-500 hover:underline cursor-pointer leading-snug block w-full mt-1"
                          >
                            {resItem.title}
                          </button>`;

const replaceStr = `                          {/* Header block for URL Above Title */}
                          {urlPlacement === 'Above Title' && (
                            <div className="flex items-center gap-3 mb-1">
                              {/* Favicon & Name */}
                              {showSiteIcons && (() => {
                                const fav = getFaviconUrl(resItem.url);
                                const fallbackId = \`fav-fallback-\${idx}\`;
                                return (
                                  <div className="w-7 h-7 rounded-full bg-zinc-200/50 flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
                                    {fav ? (
                                      <img 
                                        src={fav} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        className="w-4 h-4 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = "none";
                                          const fallbackEl = document.getElementById(fallbackId);
                                          if (fallbackEl) fallbackEl.style.display = "flex";
                                        }}
                                      />
                                    ) : null}
                                    <span 
                                      id={fallbackId}
                                      className="text-[10px] text-zinc-600 font-mono font-bold uppercase"
                                      style={{ display: fav ? "none" : "flex" }}
                                    >
                                      {resItem.siteName.slice(0, 1)}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex flex-col text-left leading-snug">
                                {showSiteNames && <span className={\`font-medium \${isLight ? "text-zinc-900" : "text-zinc-100"}\`}>{resItem.siteName}</span>}
                                <span className="text-[12px] opacity-70 truncate max-w-sm sm:max-w-md">{resItem.url}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Clickable title that opens in new tab */}
                          <button
                            onClick={() => openWebpage(resItem.url)}
                            className={\`text-left \${searchFont === 'Roboto' ? 'font-sans' : searchFont === 'Arial' ? 'font-serif' : 'font-sans'} \${searchFontSize === 'Large' ? 'text-2xl' : searchFontSize === 'Small' ? 'text-lg' : 'text-xl'} font-medium text-indigo-500 hover:underline cursor-pointer leading-snug block w-full mt-1\`}
                          >
                            {resItem.title}
                          </button>

                          {/* Footer block for URL Below Title */}
                          {urlPlacement === 'Below Title' && (
                            <div className="flex items-center gap-3 mt-1 mb-1">
                              {/* Favicon & Name */}
                              {showSiteIcons && (() => {
                                const fav = getFaviconUrl(resItem.url);
                                const fallbackId = \`fav-fallback-below-\${idx}\`;
                                return (
                                  <div className="w-5 h-5 rounded-full bg-zinc-200/50 flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
                                    {fav ? (
                                      <img 
                                        src={fav} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        className="w-3 h-3 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = "none";
                                          const fallbackEl = document.getElementById(fallbackId);
                                          if (fallbackEl) fallbackEl.style.display = "flex";
                                        }}
                                      />
                                    ) : null}
                                    <span 
                                      id={fallbackId}
                                      className="text-[9px] text-zinc-600 font-mono font-bold uppercase"
                                      style={{ display: fav ? "none" : "flex" }}
                                    >
                                      {resItem.siteName.slice(0, 1)}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex flex-row items-center gap-2 text-left leading-snug">
                                {showSiteNames && <span className={\`text-[12px] font-medium \${isLight ? "text-zinc-700" : "text-zinc-300"}\`}>{resItem.siteName}</span>}
                                {showSiteNames && <span className="text-[12px] opacity-40">-</span>}
                                <span className="text-[12px] opacity-70 truncate max-w-[200px] sm:max-w-xs">{resItem.url}</span>
                              </div>
                            </div>
                          )}`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
