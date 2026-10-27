const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetListStr = `                    })}
                    {/* Infinite Scroll loading indicator */}`;

const replaceListStr = `                    })}
                    
                    {/* MORE RESULTS / RELATED SEARCHES GRID */}
                    <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                      <h3 className="text-xl font-normal text-zinc-900 dark:text-zinc-100 mb-6">
                        Searches related to <strong>{activeSearch}</strong>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {[
                          \`\${activeSearch} online\`,
                          \`test \${activeSearch}\`,
                          \`\${activeSearch} speed\`,
                          \`tester\`,
                          \`\${activeSearch} free\`,
                          \`google fiber \${activeSearch}\`,
                          \`test tester\`,
                          \`\${activeSearch} test\`
                        ].map((relatedItem, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setSearchQuery(relatedItem);
                              handleSearchSubmit(new Event('submit') as any);
                            }}
                            className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl cursor-pointer transition-colors"
                          >
                            <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{relatedItem}</span>
                          </div>
                        ))}
                      </div>
                      <button className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center">
                        More Results
                      </button>
                    </div>

                    {/* Infinite Scroll loading indicator */}`;

code = code.replace(targetListStr, replaceListStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
