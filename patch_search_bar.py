import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

# The top header search bar
content = re.sub(
    r'className={`flex-1 flex items-center bg-zinc-100 rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-inner \$\{incognito \? \'bg-zinc-800 focus-within:bg-zinc-850 text-white\' : \'\'\}`}',
    r'className={`flex-1 flex items-center rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:bg-white/80 transition-all shadow-inner ${incognito ? "bg-zinc-800 focus-within:bg-zinc-850 text-white" : customBackgroundUrl ? "bg-white/40 focus-within:bg-white/60 text-zinc-900 border-white/30" : "bg-zinc-100 focus-within:bg-white text-zinc-900"}`}',
    content,
    count=1
)

# Main page search bar input (it might be in the large block we patched earlier or inside it)
# Let's find it.
content = re.sub(
    r'<input\s+type="text"\s+placeholder="Search the web or type a URL..."\s+value=\{searchQuery\}\s+onChange=\{\(e\) => setSearchQuery\(e\.target\.value\)\}\s+className={`flex-1 bg-transparent border-none focus:outline-none text-base md:text-lg pl-2 pb-1 \$\{incognito \? \'text-white placeholder-zinc-500\' : \'text-zinc-800 placeholder-zinc-400\'\}`}',
    r'<input\n                    type="text"\n                    placeholder="Search the web or type a URL..."\n                    value={searchQuery}\n                    onChange={(e) => setSearchQuery(e.target.value)}\n                    className={`flex-1 bg-transparent border-none focus:outline-none text-base md:text-lg pl-2 pb-1 ${incognito ? "text-white placeholder-zinc-500" : customBackgroundUrl ? "text-zinc-900 placeholder-zinc-600 font-medium" : "text-zinc-800 placeholder-zinc-400"}`}',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)
