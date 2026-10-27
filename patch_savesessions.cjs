const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /saveSessionsToCache\(currentSessions\.map\(s => s\.id === targetSessionId \? updatedSession : s\)\);/g;
code = code.replace(regex, `saveSessionsToCache(prev => prev.map(s => s.id === targetSessionId ? updatedSession : s));`);

fs.writeFileSync('src/App.tsx', code);
