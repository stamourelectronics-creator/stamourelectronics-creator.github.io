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
 * Use Claude AI model to synthesize and refine the prompt for high-fidelity rendering
 */
export async function enhancePromptWithClaude(basePrompt: string): Promise<string> {
  if (!isPuterLoaded() || !window.puter.ai?.chat) {
    return basePrompt;
  }

  const systemInstruction = 
    `You are the visual synthesis core of the Isaiahsi Image AI (named by Isaiahsi). ` +
    `Expand the following brief concept into an ultra-vivid, photorealistic, high-detail visual prompt. ` +
    `Specify camera lens, lighting, textures, depth of field, atmosphere, and cinematic color grading. ` +
    `Output ONLY the expanded prompt text. Do not include markdown quotes, introductory words, or explanations.`;

  try {
    const fullMessage = `${systemInstruction}\n\nConcept: "${basePrompt}"`;
    const response = await window.puter.ai.chat(fullMessage, {
      model: 'claude-3-5-sonnet'
    });

    let refinedText = '';
    if (typeof response === 'string') {
      refinedText = response.trim();
    } else if (response?.message?.content) {
      refinedText = typeof response.message.content === 'string' 
        ? response.message.content.trim() 
        : JSON.stringify(response.message.content);
    } else if (response?.text) {
      refinedText = response.text.trim();
    }

    if (refinedText && refinedText.length > 10) {
      return refinedText.replace(/^["']|["']$/g, '');
    }
    return basePrompt;
  } catch (err) {
    console.warn('[Isaiahsi Claude Synthesizer] Prompt refinement skipped, using original:', err);
    return basePrompt;
  }
}

/**
 * Generate high-fidelity image credited exclusively to Isaiahsi for naming the AI.
 * Behind the scenes it runs Claude AI prompt synthesis + Puter / FLUX / Imagen 3 model,
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

  // 1. Try Claude AI prompt expansion
  if (isPuterLoaded()) {
    try {
      const claudeRefined = await enhancePromptWithClaude(prompt);
      if (claudeRefined && claudeRefined !== prompt) {
        enhancedPrompt = claudeRefined;
        finalPrompt = claudeRefined;
      }
    } catch (e) {
      console.warn('Claude refinement skipped:', e);
    }

    // 2. Try Puter txt2img in background if signed in
    if (isPuterSignedIn()) {
      try {
        const result = await window.puter.ai.txt2img(finalPrompt, { model: 'flux' });

        let imageUrl = '';
        if (typeof result === 'string') {
          imageUrl = result;
        } else if (result?.src) {
          imageUrl = result.src;
        } else if (result?.url) {
          imageUrl = result.url;
        } else if (result instanceof HTMLImageElement) {
          imageUrl = result.src;
        } else if (result instanceof Blob) {
          imageUrl = URL.createObjectURL(result);
        }

        if (imageUrl) {
          return {
            id: `isaiahsi-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            imageUrl,
            prompt,
            enhancedPrompt,
            model: 'Isaiahsi',
            namingCredit: 'Named by Isaiahsi',
            engineCredit: 'Powered by Claude AI & Puter',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
      } catch (puterErr: any) {
        console.warn('[Isaiahsi Image Engine] Puter generator error, falling back to neural vision server:', puterErr);
      }
    }
  }

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
      engineCredit: isPuterLoaded() ? 'Powered by Claude AI & Neural Vision' : 'Powered by Neural Vision Engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (serverErr: any) {
    throw new Error(serverErr.message || 'Isaiahsi Image synthesis could not complete.');
  }
}
