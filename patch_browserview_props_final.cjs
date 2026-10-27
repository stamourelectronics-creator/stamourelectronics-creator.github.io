const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /customBackgroundUrl\}: BrowserViewProps\)/;
code = code.replace(regex, "customBackgroundUrl, onUpdateTheme}: BrowserViewProps)");

fs.writeFileSync('src/components/BrowserView.tsx', code);
