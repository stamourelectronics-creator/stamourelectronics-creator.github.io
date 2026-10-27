const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

code = code.replace(/fetch\('\/api\/local-places'[\s\S]*?\.catch\(err => \{[\s\S]*?\}\);/, `fetch('/api/local-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then(async res => {
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
           const text = await res.text();
           throw new Error('API Error: ' + text.slice(0, 100));
        }
        return res.json();
      })
      .then(data => {
        setLocalPlacesData(data);
        setLocalPlacesLoading(false);
      })
      .catch(err => {
        console.error('[Maps API] Failed to fetch local places:', err);
        setLocalPlacesLoading(false);
      });`);

fs.writeFileSync('src/components/BrowserView.tsx', code);
