import re
with open('src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'\{\/\* Theme custom options \*\/\}.*?<div className="space-y-3">.*?<div className={`flex items-center gap-1 text-\[10px\] font-mono uppercase tracking-widest font-bold \$\{isLight \? \'text-sky-600\' : \'text-cyan-400\'\}`\}>.*?<Palette className="w-4 h-4" />.*?<span>Select Application Theme</span>.*?</div>',
    re.DOTALL
)

replacement = """{/* Theme custom options */}
          <div className="space-y-3">
            <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-bold ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              <Palette className="w-4 h-4" />
              <span>Select Application Theme</span>
            </div>
            
            {/* Custom Background Image Upload */}
            <div className="pt-2 pb-1">
              <label className={`text-[10px] font-mono block mb-1.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Custom Glass Background (Upload Photo)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleTextChange('customBackgroundUrl', reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`w-full text-[10px] file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:cursor-pointer transition-colors ${
                    isLight 
                      ? 'file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 text-zinc-500' 
                      : 'file:bg-cyan-950 file:text-cyan-400 hover:file:bg-cyan-900 text-slate-400'
                  }`}
                />
                {settings.customBackgroundUrl && (
                  <button
                    onClick={() => handleTextChange('customBackgroundUrl', '')}
                    className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>"""

new_content = pattern.sub(replacement, content)

with open('src/components/SettingsModal.tsx', 'w') as f:
    f.write(new_content)
