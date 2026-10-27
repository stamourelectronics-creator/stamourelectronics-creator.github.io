import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

# Make the outer BrowserView container respect dark glass if theme is slate/matrix etc.
# Wait, we already have `isLight` and `incognito` in BrowserView.
content = re.sub(
    r'<div \n      onScroll=\{handleScroll\} \n      className={`flex-1 flex flex-col \$\{customBackgroundUrl \? \'bg-white/30 backdrop-blur-3xl\' : \'bg-\[#f8f9fa\]\'\} text-zinc-800 overflow-y-auto select-none animate-fade-in font-sans`}\n    >',
    r'<div \n      onScroll={handleScroll} \n      className={`flex-1 flex flex-col ${customBackgroundUrl ? (isLight ? "bg-white/30 backdrop-blur-3xl text-zinc-900" : "bg-black/40 backdrop-blur-3xl text-zinc-100") : "bg-[#f8f9fa] text-zinc-800"} overflow-y-auto select-none animate-fade-in font-sans`}\n    >',
    content,
    count=1
)

# Header Row
content = re.sub(
    r'className={`border-b py-3\.5 px-4 md:px-10 flex-shrink-0 z-20 \$\{incognito \? "bg-zinc-900/70 border-zinc-800/50 text-zinc-300 backdrop-blur-2xl" : customBackgroundUrl \? "bg-white/20 border-white/40 text-zinc-900 backdrop-blur-2xl shadow-sm" : "border-zinc-200/80 bg-white text-zinc-800"`\}',
    r'className={`border-b py-3.5 px-4 md:px-10 flex-shrink-0 z-20 ${incognito ? "bg-zinc-900/70 border-zinc-800/50 text-zinc-300 backdrop-blur-2xl" : customBackgroundUrl ? (isLight ? "bg-white/20 border-white/40 text-zinc-900 backdrop-blur-2xl shadow-sm" : "bg-black/30 border-white/10 text-zinc-100 backdrop-blur-2xl shadow-md") : "border-zinc-200/80 bg-white text-zinc-800"}`}',
    content,
    count=1
)

# Search cards
content = re.sub(
    r'className={`space-y-1\.5 p-4 rounded-2xl border shadow-sm transition-all select-text cursor-default text-left \$\{customBackgroundUrl \? "bg-white/30 border-white/40 hover:bg-white/40 backdrop-blur-md" : "bg-white border-zinc-200 hover:border-zinc-300"`\}',
    r'className={`space-y-1.5 p-4 rounded-2xl border shadow-sm transition-all select-text cursor-default text-left ${customBackgroundUrl ? (isLight ? "bg-white/30 border-white/40 hover:bg-white/40 backdrop-blur-md text-zinc-900" : "bg-black/40 border-white/10 hover:bg-black/50 backdrop-blur-md text-zinc-100") : "bg-white border-zinc-200 hover:border-zinc-300"}`}',
    content,
    count=1
)

# Search assist card
content = re.sub(
    r'className={`border rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-sm \$\{customBackgroundUrl \? "bg-white/40 border-white/50 backdrop-blur-xl" : "bg-indigo-50 border-indigo-100"`\}',
    r'className={`border rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-sm ${customBackgroundUrl ? (isLight ? "bg-white/40 border-white/50 backdrop-blur-xl text-zinc-900" : "bg-black/40 border-indigo-500/30 backdrop-blur-xl text-zinc-100") : "bg-indigo-50 border-indigo-100"}`}',
    content,
    count=1
)

# Search Input Header
content = re.sub(
    r'className={`flex-1 flex items-center rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:bg-white/80 transition-all shadow-inner \$\{incognito \? "bg-zinc-800 focus-within:bg-zinc-850 text-white" : customBackgroundUrl \? "bg-white/40 focus-within:bg-white/60 text-zinc-900 border-white/30" : "bg-zinc-100 focus-within:bg-white text-zinc-900"`\}',
    r'className={`flex-1 flex items-center rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-500 transition-all shadow-inner ${incognito ? "bg-zinc-800 focus-within:bg-zinc-850 text-white" : customBackgroundUrl ? (isLight ? "bg-white/40 focus-within:bg-white/60 text-zinc-900 border-white/30" : "bg-black/50 focus-within:bg-black/70 text-zinc-100 border-white/20") : "bg-zinc-100 focus-within:bg-white text-zinc-900"}`}',
    content,
    count=1
)

# Main Home Logo Card
content = re.sub(
    r'className={`w-full max-w-2xl mx-auto rounded-\[2rem\] p-1 shadow-2xl flex flex-col backdrop-blur-xl \$\{incognito \? "bg-zinc-900/80 border border-zinc-800/80" : customBackgroundUrl \? "bg-white/30 border border-white/40 shadow-\[0_8px_32px_rgba\(0,0,0,0\.1\)\]" : "bg-white/95 border border-zinc-200/60"`\}',
    r'className={`w-full max-w-2xl mx-auto rounded-[2rem] p-1 shadow-2xl flex flex-col backdrop-blur-xl ${incognito ? "bg-zinc-900/80 border border-zinc-800/80" : customBackgroundUrl ? (isLight ? "bg-white/30 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-black/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]") : "bg-white/95 border border-zinc-200/60"}`}',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)
