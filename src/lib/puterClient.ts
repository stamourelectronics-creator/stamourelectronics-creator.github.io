// Isaiahsi AI Image Generation Client
// Behind-the-scenes engine powered by Claude AI visual synthesis and high-fidelity image models
// Credited to Isaiahsi for naming the AI, with Claude AI & Puter engine credits

export interface PuterUser {
  username?: string;
  email?: string;
  uuid?: string;
  name?: string;
}

export interface ImageGenOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  enhanceWithClaude?: boolean;
}

export interface GeneratedIsaiahsiImage {
  id: string;
  imageUrl: string;
  prompt: string;
  enhancedPrompt?: string;
  model: string;
  namingCredit: string;
  engineCredit: string;
  timestamp: string;
}

declare global {
  interface Window {
    puter?: any;
  }
}

/** Check if Puter SDK is available in window */
export function isPuterLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.puter !== 'undefined';
}

/** Check if user is currently signed in to Puter */
export function isPuterSignedIn(): boolean {
  if (!isPuterLoaded()) return false;
  try {
    return Boolean(window.puter.auth?.isSignedIn?.());
  } catch (e) {
    return false;
  }
}

/** Trigger background sign in if needed */
export async function signInPuter(): Promise<PuterUser | null> {
  if (!isPuterLoaded()) {
    throw new Error('Image generation SDK is initializing. Please try again.');
  }
  try {
    await window.puter.auth.signIn();
    return await getPuterUser();
  } catch (error: any) {
    console.error('[Isaiahsi Auth] Sign in error:', error);
    throw error;
  }
}

/** Retrieve current Puter user profile */
export async function getPuterUser(): Promise<PuterUser | null> {
  if (!isPuterLoaded() || !isPuterSignedIn()) return null;
  try {
    const user = await window.puter.auth.getUser();
    return user || null;
  } catch (e) {
    return null;
  }
}

/**
 * Kept for compatibility with older UI imports. AI prompt generation is now handled
 * by the server-side image endpoint; the browser never calls Puter AI.
 */
export async function enhancePromptWithClaude(basePrompt: string): Promise<string> {
  return basePrompt;
}

/**
 * Generate high-fidelity image credited exclusively to Isaiahsi for naming the AI.
 * Uses the server-side IsaiahAI image engine; provider keys remain server-side.
 * with no separate Puter UI window.
 */
export async function generateIsaiahsiImage(
  prompt: string, 
  options: ImageGenOptions = {}
): Promise<GeneratedIsaiahsiImage> {
  let finalPrompt = prompt.trim();
  let enhancedPrompt: string | undefined = undefined;

  // Add aspect ratio suffix if specified
  if (options.aspectRatio && options.aspectRatio !== '1:1') {
    const arMap: Record<string, string> = {
      '16:9': 'widescreen 16:9 cinematic wallpaper',
      '9:16': 'vertical 9:16 mobile portrait wallpaper',
      '4:3': 'classic 4:3 photography format'
    };
    if (arMap[options.aspectRatio]) {
      finalPrompt = `${finalPrompt}, ${arMap[options.aspectRatio]}`;
    }
  }

  // Image generation always goes through the server-side provider integration.
  // No browser-side Puter AI calls or provider credentials are used.
  // 3. Robust High-Fidelity Server-side Fallback (Gemini / Imagen 3)
  try {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        imageSize: '1024x1024',
        isPro: true
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Image generation service offline');
    }

    const data = await res.json();
    const imageUrl = data.imageUrl || (data.fallbackUrls && data.fallbackUrls[0]);

    if (!imageUrl) {
      throw new Error('Image generator returned no visual output');
    }

    return {
      id: `isaiahsi-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      imageUrl,
      prompt,
      enhancedPrompt,
      model: 'Isaiahsi',
      namingCredit: 'Named by Isaiahsi',
      engineCredit: 'Powered by IsaiahAI server-side image engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (serverErr: any) {
    throw new Error(serverErr.message || 'Isaiahsi Image synthesis could not complete.');
  }
}
