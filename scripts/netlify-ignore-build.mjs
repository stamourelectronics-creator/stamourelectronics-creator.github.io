import { execFileSync } from 'node:child_process';

const currentRef = process.env.COMMIT_REF || '';
const cachedRef = process.env.CACHED_COMMIT_REF || '';
const productionUrl = process.env.URL || 'https://isaiahsearch.netlify.app';

async function hasLivePagesWrapper() {
  try {
    const response = await fetch(productionUrl, { signal: AbortSignal.timeout(4000), redirect: 'follow' });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('<iframe') && html.includes('stamourelectronics-creator.github.io/');
  } catch {
    return false;
  }
}

async function main() {
  // Never skip the first build, a deploy before the Pages wrapper is live, or
  // a backend/config/dependency change. This keeps Netlify functions current.
  if (!currentRef || !cachedRef) {
    console.log('[IsaiahAI deploy] No prior commit reference; continuing with a full deploy.');
    process.exit(1);
  }
  if (!(await hasLivePagesWrapper())) {
    console.log('[IsaiahAI deploy] The live site is not using the Pages iframe yet; continuing so the wrapper can be installed safely.');
    process.exit(1);
  }

  let changed;
  try {
    changed = execFileSync('git', ['diff', '--name-only', cachedRef, currentRef], { encoding: 'utf8' })
      .split(/\r?\n/).map(path => path.trim()).filter(Boolean);
  } catch (error) {
    console.warn('[IsaiahAI deploy] Could not inspect changed files; choosing a safe full build.', error.message);
    process.exit(1);
  }

  if (!changed.length) {
    console.log('[IsaiahAI deploy] No changed files were detected; skipping this duplicate frontend build.');
    process.exit(0);
  }
  const backendPaths = [
    /^netlify\/functions\//,
    /^netlify\.toml$/,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^vite\.config\.ts$/,
    /^scripts\/(build-netlify-site|netlify-ignore-build)\.mjs$/,
    /^server\.ts$/,
  ];
  const backendChanged = changed.filter(file => backendPaths.some(pattern => pattern.test(file)));
  if (backendChanged.length) {
    console.log('[IsaiahAI deploy] Backend/build files changed; keeping the Netlify deployment:', backendChanged.join(', '));
    process.exit(1);
  }
  console.log('[IsaiahAI deploy] The Netlify homepage already embeds GitHub Pages, and only frontend files changed. GitHub Pages handles this update; skipping the Netlify build to save usage.');
  process.exit(0);
}

main().catch(error => {
  console.warn('[IsaiahAI deploy] Guard failed safely; continuing with a full build.', error.message);
  process.exit(1);
});
