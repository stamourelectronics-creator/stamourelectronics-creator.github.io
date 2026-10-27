const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            onUpdateTheme={(newTheme) => handleSaveSettings({...settings, theme: newTheme})}
          />`;
const replaceStr = `            onUpdateTheme={(newTheme) => handleSaveSettings({...settings, theme: newTheme as any})}
          />`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
