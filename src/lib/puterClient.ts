// IsaiahAI Imagery 26 — Puter-authenticated image studio.
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
  timestamp: string;
}

declare global {
  interface Window {
    puter?: any;
  }
}

const IMAGERY_26_SYSTEM_PROMPT = `You are IsaiahAI Imagery 26, a professional visual art director and image-prompt architect.
Transform the user's idea into a precise, visually rich image-generation prompt. Preserve the requested subject and intent. Specify composition, camera position, lighting, materials, color harmony, depth, atmosphere, texture, and visual style where useful. Make the result coherent and production-ready. Avoid contradictory instructions and unnecessary filler. Do not add text, logos, signatures, watermarks, captions, or UI elements unless the user explicitly requests them. Respect the user's requested aspect ratio. Return only the final image prompt, with no preamble or explanation.`;

export function isPuterLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.puter !== 'undefined';
}

export function isPuterSignedIn(): boolean {
  if (!isPuterLoaded()) return false;
  try {
    return Boolean(window.puter.auth?.isSignedIn?.());
  } catch {
    return false;
  }
}

export async function signInPuter(): Promise<PuterUser | null> {
  if (!isPuterLoaded()) throw new Error('Puter is still loading. Refresh the page and try again.');
  try {
    if (!isPuterSignedIn()) await window.puter.auth.signIn();
    return await getPuterUser();
  } catch (error: any) {
    console.error('[IsaiahAI Imagery 26] Puter sign-in failed:', error);
    throw new Error(error?.message || 'Puter sign-in was not completed.');
  }
}

export async function getPuterUser(): Promise<PuterUser | null> {
  if (!isPuterLoaded() || !isPuterSignedIn()) return null;
  try {
    return await window.puter.auth.getUser() || null;
  } catch {
    return null;
  }
}

async function extractText(response: any): Promise<string> {
  const content = response?.message?.content ?? response?.content ?? response?.text ?? '';
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((part: any) => typeof part === 'string' ? part : String(part?.text || '')).join('').trim();
  }
  return '';
}

export async function enhancePromptWithClaude(basePrompt: string): Promise<string> {
  const cleanPrompt = String(basePrompt || '').trim();
  if (!cleanPrompt) throw new Error('Describe the image you want to create.');
  if (!isPuterLoaded()) throw new Error('Puter is still loading. Try again in a moment.');
  if (!isPuterSignedIn()) throw new Error('Sign in with Puter to unlock IsaiahAI Imagery 26.');

  const response = await window.puter.ai.chat(
    [
      { role: 'system', content: IMAGERY_26_SYSTEM_PROMPT },
      { role: 'user', content: 'Create a high-quality image prompt for this idea:\n\n' + cleanPrompt }
    ],
    { model: 'claude-sonnet-4-6', normalize: true }
  );
  const enhanced = await extractText(response);
  if (!enhanced) throw new Error('Claude could not prepare the image prompt. Please retry.');
  return enhanced;
}

export async function generateIsaiahsiImage(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<GeneratedIsaiahsiImage> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Describe the image you want to create.');
  if (!isPuterLoaded()) throw new Error('Puter is still loading. Try again in a moment.');
  if (!isPuterSignedIn()) throw new Error('Sign in with Puter to unlock IsaiahAI Imagery 26.');

  const enhancedPrompt = options.enhanceWithClaude === false
    ? cleanPrompt
    : await enhancePromptWithClaude(cleanPrompt);
  const result = await window.puter.ai.txt2img(enhancedPrompt, {
    model: 'gpt-image-2.6-flare',
    quality: 'max',
    aspect_ratio: options.aspectRatio || '1:1'
  });
  const imageUrl = String(result?.src || result?.toString?.() || '').trim();
  if (!imageUrl || imageUrl === '[object HTMLImageElement]') {
    throw new Error('The image service returned no usable image.');
  }

  return {
    id: 'imagery-26-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    imageUrl,
    prompt: cleanPrompt,
    enhancedPrompt,
    model: 'IsaiahAI Imagery 26',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
