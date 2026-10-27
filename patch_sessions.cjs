const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /    let targetSessionId = activeSessionId;\s*let targetSession = activeSession;\s*\/\/ Create session if none exists\s*if \(!targetSessionId \|\| !targetSession\) \{\s*const newId = \`session-\$\{Date\.now\(\)\}\`;\s*targetSession = \{\s*id: newId,\s*title: inputText\.trim\(\)\.slice\(0, 20\) \+ '\.\.\.',\s*messages: \[\],\s*updatedAt: new Date\(\)\.toISOString\(\),\s*\};\s*const updated = \[targetSession, \.\.\.sessions\];\s*setSessions\(updated\);\s*setActiveSessionId\(newId\);\s*targetSessionId = newId;\s*\}/m;

const replacement = `    let targetSessionId = activeSessionId;
    let targetSession = activeSession;
    let currentSessions = [...sessions];

    // Create session if none exists
    if (!targetSessionId || !targetSession) {
      const newId = \`session-\${Date.now()}\`;
      targetSession = {
        id: newId,
        title: inputText.trim().slice(0, 20) + '...',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      currentSessions = [targetSession, ...sessions];
      setSessions(currentSessions);
      setActiveSessionId(newId);
      targetSessionId = newId;
    }`;

code = code.replace(regex, replacement);

code = code.replace(/saveSessionsToCache\(sessions\.map\(s => s\.id === targetSessionId \? updatedSession : s\)\);/g, `saveSessionsToCache(currentSessions.map(s => s.id === targetSessionId ? updatedSession : s));`);

fs.writeFileSync('src/App.tsx', code);
