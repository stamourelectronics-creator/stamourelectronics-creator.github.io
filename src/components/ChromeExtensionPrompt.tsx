import React, { useEffect, useState } from 'react';
import { Bot, Download, ExternalLink, ShieldCheck, X } from 'lucide-react';

/** Install prompt for IsaiahAI's optional Chrome page assistant. */
export function ChromeExtensionPrompt() {
  const [open, setOpen] = useState(false);
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('isaiahai-chrome-prompt-dismissed') !== 'true') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = (permanently = false) => {
    if (permanently || neverShow) {
      try { localStorage.setItem('isaiahai-chrome-prompt-dismissed', 'true'); } catch { /* local storage may be blocked */ }
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="isaiahai-chrome-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/25 bg-zinc-950 text-white shadow-2xl">
        <button type="button" onClick={() => close()} aria-label="Close" className="absolute right-4 top-4 rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 sm:p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <Bot className="h-6 w-6" />
          </div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">New browser companion</p>
          <h2 id="isaiahai-chrome-title" className="mb-2 pr-8 text-xl font-bold tracking-tight">Ask IsaiahAI about any webpage</h2>
          <p className="mb-5 text-sm leading-6 text-zinc-300">Add a small IsaiahAI button to the top-right of regular Chrome webpages. Ask questions about the current page, get explanations, and search the web using free OpenRouter models. Chrome-protected pages such as chrome:// settings cannot display extensions.</p>
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-zinc-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>The extension does not contain your API key. Only when you click Ask, it sends readable page text, links, and a screenshot of the visible page to your IsaiahAI server. Password and form-field values are not intentionally collected.</span>
          </div>
          <a href="/downloads/isaiahai-chrome-extension.zip" download className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-200">
            <Download className="h-4 w-4" /> Download Chrome Extension
          </a>
          <a href="/downloads/ISAIAHAI_CHROME_EXTENSION_INSTALL.txt" target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">
            Installation instructions <ExternalLink className="h-3 w-3" />
          </a>
          <label className="mt-5 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={neverShow} onChange={(event) => setNeverShow(event.target.checked)} className="accent-amber-300" />
            Don’t show this popup again
          </label>
          <button type="button" onClick={() => close()} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
