const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

// The code probably looks like:
//              ) : (
//                
//              )}
// Let's replace it with:
//              ) : null}

const regex = /\)\s*:\s*\(\s*\)\}/g;
code = code.replace(regex, ') : null}');

fs.writeFileSync('src/components/BrowserView.tsx', code);
