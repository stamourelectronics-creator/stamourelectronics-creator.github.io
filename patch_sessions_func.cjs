const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `  const saveSessionsToCache = (updated: ChatSession[]) => {
    setSessions(updated);
    if (currentUser && db) {
      updated.forEach(session => {
        syncSessionToCloud(session);
      });
    } else {
      localStorage.setItem('isaiah_sessions', JSON.stringify(updated));
    }
  };`;
  
const replace1 = `  const saveSessionsToCache = (updated: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setSessions(prev => {
      const newSessions = typeof updated === 'function' ? updated(prev) : updated;
      if (currentUser && db) {
        newSessions.forEach(session => {
          syncSessionToCloud(session);
        });
      } else {
        localStorage.setItem('isaiah_sessions', JSON.stringify(newSessions));
      }
      return newSessions;
    });
  };`;

code = code.replace(target1, replace1);

fs.writeFileSync('src/App.tsx', code);
