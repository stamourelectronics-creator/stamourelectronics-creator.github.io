const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `  onShowAuthModal: () => void;`;
const replaceStr = `  onShowAuthModal: () => void;
  onUpdateTheme?: (theme: string) => void;`;

code = code.replace(targetStr, replaceStr);

const targetProps = `  onShowAuthModal,`;
const replaceProps = `  onShowAuthModal,
  onUpdateTheme,`;

code = code.replace(targetProps, replaceProps);

fs.writeFileSync('src/components/BrowserView.tsx', code);
