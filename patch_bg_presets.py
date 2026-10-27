import re
with open('src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

presets_html = """
            {/* Custom Background Image Upload */}
            <div className="pt-2 pb-1 space-y-3">
              <label className={`text-[10px] font-mono block mb-1.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Glass Background Image</label>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {/* None / Default */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', '')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${!settings.customBackgroundUrl ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}
                >
                  None
                </button>
                {/* Preset 1: Desk */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1533090161767') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=200)' }}
                  title="Wooden Desk"
                />
                {/* Preset 2: Abstract Flow */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1618005182384') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200)' }}
                  title="Abstract Flow"
                />
                {/* Preset 3: Soft Landscape */}
                <button
                  onClick={() => handleTextChange('customBackgroundUrl', 'https://images.unsplash.com/photo-1490682143684-14369e18dce8?auto=format&fit=crop&q=80&w=600')}
                  className={`w-12 h-12 rounded-lg border-2 flex-shrink-0 bg-cover bg-center ${settings.customBackgroundUrl?.includes('1490682143684') ? 'border-sky-500 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1490682143684-14369e18dce8?auto=format&fit=crop&q=80&w=200)' }}
                  title="Soft Landscape"
                />
              </div>

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
"""

pattern = re.compile(
    r'\{\/\* Custom Background Image Upload \*\/\}.*?className={`w-full text-\[10px\] file:mr-4 file:py-1\.5 file:px-3 file:rounded-full file:border-0 file:text-\[10px\] file:font-semibold file:cursor-pointer transition-colors \$\{.*?isLight.*?\}',
    re.DOTALL
)

content = pattern.sub(presets_html, content)

with open('src/components/SettingsModal.tsx', 'w') as f:
    f.write(content)
