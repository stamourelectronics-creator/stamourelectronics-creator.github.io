const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /<div className="text-\[10px\] bg-emerald-500\/10 text-emerald-600 font-mono font-bold px-2\.5 py-0\.5 rounded border border-emerald-500\/15">\s*SECURE SSL CONNECTION\s*<\/div>/g;

code = code.replace(regex, '');

fs.writeFileSync('src/components/BrowserView.tsx', code);
