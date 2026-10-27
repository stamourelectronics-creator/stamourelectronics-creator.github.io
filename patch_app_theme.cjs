const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            onShowAuthModal={() => setShowAuthModal(true)}
          />`;
const replaceStr = `            onShowAuthModal={() => setShowAuthModal(true)}
            onUpdateTheme={(newTheme) => handleSaveSettings({...settings, theme: newTheme})}
          />`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
