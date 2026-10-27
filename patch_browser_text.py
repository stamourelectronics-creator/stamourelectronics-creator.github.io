import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

# Make search result card text dynamic
content = re.sub(
    r'<div className="flex items-center gap-2\.5 text-xs text-zinc-550">',
    r'<div className={`flex items-center gap-2.5 text-xs ${customBackgroundUrl && !isLight ? "text-zinc-300" : "text-zinc-550"}`}>',
    content,
    count=1
)

content = re.sub(
    r'<p className="text-\[13px\] leading-relaxed text-zinc-650',
    r'<p className={`text-[13px] leading-relaxed ${customBackgroundUrl && !isLight ? "text-zinc-300" : "text-zinc-650"}',
    content,
    count=1
)

content = re.sub(
    r'<span className="text-\[11px\] text-zinc-500 truncate">',
    r'<span className={`text-[11px] truncate ${customBackgroundUrl && !isLight ? "text-zinc-400" : "text-zinc-500"}`}>',
    content,
    count=1
)

content = re.sub(
    r'<a href="\{resItem\.url\}" target="_blank" rel="noreferrer" className="font-semibold text-base md:text-lg text-indigo-600 hover:underline leading-tight block">',
    r'<a href={resItem.url} target="_blank" rel="noreferrer" className={`font-semibold text-base md:text-lg hover:underline leading-tight block ${customBackgroundUrl && !isLight ? "text-indigo-400" : "text-indigo-600"}`}>',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)
