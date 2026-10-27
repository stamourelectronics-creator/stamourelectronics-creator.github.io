const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `  onShowAuthModal,
}: BrowserViewProps) => {`;
const replaceStr = `  onShowAuthModal,
  onUpdateTheme,
}: BrowserViewProps) => {`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/components/BrowserView.tsx', code);
