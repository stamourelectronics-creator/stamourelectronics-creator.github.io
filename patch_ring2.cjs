const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const classTarget = /\$\{showRainbowRing \? 'rainbow-ring-active' : ''\}/g;
code = code.replace(classTarget, 'rainbow-ring-active');

fs.writeFileSync('src/components/BrowserView.tsx', code);
