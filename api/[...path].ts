import apiHandler from '../netlify/functions/api.mts';

// Vercel-hosted shared IsaiahAI API. The original handler remains the single
// source of truth for chat, model routing, search, browser proxy and health.
// Secrets are read only from server-side process.env inside the handler.
export const maxDuration = 300;

export default {
  async fetch(request: Request): Promise<Response> {
    return apiHandler(request);
  },
};
