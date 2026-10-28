import { spawnSync } from 'node:child_process';

const pagesUrl = 'https://stamourelectronics-creator.github.io/isaiahsearch/';

async function isPagesReady() {
  try {
    const response = await fetch(pagesUrl, { signal: AbortSignal.timeout(5000), redirect: 'follow' });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('id="root"') && html.includes('assets/');
  } catch {
    return false;
  }
}

const pagesReady = await isPagesReady();
process.env.VITE_NETLIFY_IFRAME_WRAPPER = pagesReady ? 'true' : 'false';
if (pagesReady) {
  console.log('[IsaiahAI deploy] GitHub Pages is live; publishing the lightweight iframe wrapper.');
} else {
  console.log('[IsaiahAI deploy] GitHub Pages is not live yet; keeping the full Netlify frontend so the website stays usable.');
}
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error('[IsaiahAI deploy] Build process failed to start:', result.error.message);
  process.exit(1);
}
process.exit(typeof result.status === 'number' ? result.status : 1);
