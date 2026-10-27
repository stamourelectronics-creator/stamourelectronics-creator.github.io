const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `                <div className={\`relative border \${isLight ? 'border-zinc-300 bg-white/75 shadow-md hover:bg-white/90' : 'border-zinc-805 bg-[#2f2f2f]/40'} rounded-3xl transition-colors flex items-center px-4 py-2 min-h-[52px]\`}>`;

const replaceStr = `                <div className="relative border rounded-3xl transition-colors flex items-center px-4 py-2 min-h-[52px] ios-liquid-glass">`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
