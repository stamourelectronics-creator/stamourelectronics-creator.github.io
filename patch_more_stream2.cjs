const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `          const words = chunk.split(' ');
          for (let i = 0; i < words.length; i++) {
            setTypedDetailed(prev => prev + (prev.length > 0 && i === 0 && !chunk.startsWith(' ') ? '' : (i > 0 || chunk.startsWith(' ') ? ' ' : '')) + words[i]);
            await new Promise(r => setTimeout(r, 12));
          }`;

const replaceStr = `          for (let i = 0; i < chunk.length; i++) {
            setTypedDetailed(prev => prev + chunk[i]);
            await new Promise(r => setTimeout(r, 5)); // 5ms per char
          }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BrowserView.tsx', code);
