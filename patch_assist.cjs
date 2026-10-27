const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /<div className="p-6 bg-white border border-zinc-200 shadow-lg rounded-2xl space-y-4 relative animate-slide-up select-text animate-fade-in">[\s\S]*?<span className="font-bold text-xs text-zinc-850 tracking-wide uppercase font-mono">IsaiahAI Search Assistant<\/span>/;

const newBlock = `<div className="p-6 bg-white shadow-xl rounded-[2rem] space-y-4 relative animate-slide-up select-text animate-fade-in rainbow-ring-active">
                {/* Header of assist box */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-850 tracking-wide uppercase font-mono">IsaiahAI Search Assistant</span>`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/components/BrowserView.tsx', code);
