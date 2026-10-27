const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `              <div 
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
              </div>`;

const replaceStr = `              <div 
                onClick={() => { setAppearanceLayout('standard'); if (onUpdateTheme) onUpdateTheme('light_glass'); }}
                className={\`flex-1 aspect-video rounded-lg border \${isLight ? 'border-blue-500 bg-white border-2' : 'border-zinc-700 bg-zinc-200'} relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2\`}
              >
                {isLight && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-0.5 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="w-16 h-1.5 rounded-full bg-blue-500"></div>
                <div className="w-20 h-1.5 rounded-full bg-zinc-400"></div>
                <div className="w-14 h-1.5 rounded-full bg-zinc-400"></div>
              </div>
              <div 
                onClick={() => { setAppearanceLayout('dense'); if (onUpdateTheme) onUpdateTheme('slate'); }}
                className={\`flex-1 aspect-video rounded-lg border \${!isLight ? 'border-blue-500 bg-[#282828] border-2' : 'border-zinc-200 bg-zinc-800'} relative cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2\`}
              >
                {!isLight && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-0.5 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="w-16 h-1 rounded-full bg-blue-400"></div>
                <div className="w-20 h-1 rounded-full bg-zinc-500"></div>
                <div className="w-14 h-1 rounded-full bg-zinc-500"></div>
              </div>`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/components/BrowserView.tsx', code);
