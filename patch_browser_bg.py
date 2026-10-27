import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'<div onScroll=\{handleScroll\} className="flex-1 flex flex-col bg-\[#f8f9fa\] text-zinc-800 overflow-y-auto select-none animate-fade-in font-sans">',
    re.DOTALL
)

replacement = """<div 
      onScroll={handleScroll} 
      className={`flex-1 flex flex-col ${customBackgroundUrl ? 'bg-white/30 backdrop-blur-3xl' : 'bg-[#f8f9fa]'} text-zinc-800 overflow-y-auto select-none animate-fade-in font-sans`}
    >"""

new_content = pattern.sub(replacement, content)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(new_content)
