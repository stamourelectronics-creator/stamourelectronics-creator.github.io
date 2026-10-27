import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

# Update Top Header Row (line ~1633)
content = re.sub(
    r'<div className={`border-b border-zinc-200/80 py-3\.5 px-4 md:px-10 \$\{incognito \? \'bg-zinc-900 border-zinc-800 text-zinc-300\' : \'bg-white text-zinc-800\'\} flex-shrink-0 z-20`}>',
    r'<div className={`border-b py-3.5 px-4 md:px-10 flex-shrink-0 z-20 ${incognito ? "bg-zinc-900/70 border-zinc-800/50 text-zinc-300 backdrop-blur-2xl" : customBackgroundUrl ? "bg-white/20 border-white/40 text-zinc-900 backdrop-blur-2xl shadow-sm" : "border-zinc-200/80 bg-white text-zinc-800"}`}>',
    content,
    count=1
)

# Update Search Result Cards (line ~2402)
content = re.sub(
    r'className="space-y-1\.5 p-4 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm transition-all select-text cursor-default text-left"',
    r'className={`space-y-1.5 p-4 rounded-2xl border shadow-sm transition-all select-text cursor-default text-left ${customBackgroundUrl ? "bg-white/30 border-white/40 hover:bg-white/40 backdrop-blur-md" : "bg-white border-zinc-200 hover:border-zinc-300"}`}',
    content,
    count=1
)

# Update the main search input container (line ~2882)
# Wait, let's just do the search assist card first.
content = re.sub(
    r'<div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-sm">',
    r'<div className={`border rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-sm ${customBackgroundUrl ? "bg-white/40 border-white/50 backdrop-blur-xl" : "bg-indigo-50 border-indigo-100"}`}>',
    content,
    count=1
)

# Main Home Page logo/search container
content = re.sub(
    r'<div className={`w-full max-w-2xl mx-auto rounded-[2rem] p-1 shadow-2xl flex flex-col \$\{incognito \? \'bg-zinc-900/80 border border-zinc-800/80\' : \'bg-white/95 border border-zinc-200/60\'\} backdrop-blur-xl`}>',
    r'<div className={`w-full max-w-2xl mx-auto rounded-[2rem] p-1 shadow-2xl flex flex-col backdrop-blur-xl ${incognito ? "bg-zinc-900/80 border border-zinc-800/80" : customBackgroundUrl ? "bg-white/30 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white/95 border border-zinc-200/60"}`}>',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)
