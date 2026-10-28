(() => {
  'use strict';
  if (window.top !== window || document.getElementById('isaiahai-page-assistant-host')) return;
  if (!document.documentElement) return;

  const host = document.createElement('div');
  host.id = 'isaiahai-page-assistant-host';
  host.style.cssText = 'all:initial;position:fixed!important;top:12px!important;right:12px!important;z-index:2147483647!important;';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial;color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .launcher{border:1px solid rgba(251,191,36,.45);border-radius:999px;background:linear-gradient(135deg,#171717,#272012);color:#ffdf78;box-shadow:0 8px 26px rgba(0,0,0,.28);padding:9px 13px;font-weight:750;font-size:12px;letter-spacing:.02em;cursor:pointer;display:flex;align-items:center;gap:7px}
    .launcher:hover{filter:brightness(1.15);transform:translateY(-1px)}
    .dot{width:7px;height:7px;border-radius:50%;background:#fbbf24;box-shadow:0 0 10px #fbbf24}
    .panel{display:none;position:fixed;top:0;right:0;width:min(380px,calc(100vw - 24px));height:min(570px,calc(100vh - 24px));margin-top:48px;border-radius:18px;overflow:hidden;background:#101114;color:#f4f4f5;border:1px solid #35353a;box-shadow:0 20px 70px rgba(0,0,0,.5);}
    .panel.open{display:flex;flex-direction:column}
    .header{display:flex;align-items:center;gap:10px;padding:14px 15px;border-bottom:1px solid #2b2b31;background:linear-gradient(115deg,#1a1b20,#282111)}
    .brand{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.1);color:#ffd65e;font-size:14px;font-weight:900;flex-shrink:0}
    .heading{font-size:13px;font-weight:800;line-height:1.25}.sub{font-size:10px;color:#a1a1aa;margin-top:3px}
    .close{margin-left:auto;cursor:pointer;border:0;background:transparent;color:#a1a1aa;font-size:20px;padding:3px 6px;border-radius:6px}.close:hover{background:#303036;color:white}
    .conversation{flex:1;overflow:auto;padding:12px 12px 4px;display:flex;flex-direction:column;gap:10px;min-height:70px}
    .empty{margin:auto;max-width:260px;text-align:center;color:#a1a1aa;font-size:12px;line-height:1.65;padding:25px 8px}
    .bubble{white-space:pre-wrap;overflow-wrap:anywhere;border-radius:13px;padding:10px 11px;font-size:12px;line-height:1.55;max-width:100%}
    .user{align-self:flex-end;background:#473913;color:#fff4c7;border:1px solid #725a20;max-width:90%}
    .assistant{align-self:stretch;background:#191a1f;border:1px solid #2d2e34;color:#e4e4e7}
    .sources{display:flex;flex-direction:column;gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid #36363d}
    .sources a{color:#fcd34d;font-size:11px;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
    .form{padding:10px 12px 12px;border-top:1px solid #2b2b31;background:#131419}
    .question{display:block;width:100%;resize:vertical;min-height:66px;max-height:140px;border:1px solid #393a42;background:#090a0d;color:white;border-radius:11px;padding:10px;font:inherit;font-size:12px;outline:none}
    .question:focus{border-color:#d6a629;box-shadow:0 0 0 2px rgba(234,179,8,.12)}
    .controls{display:flex;align-items:center;gap:8px;margin-top:8px}
    .send{flex:1;border:0;border-radius:10px;padding:10px;background:#fbbf24;color:#171717;font-size:12px;font-weight:850;cursor:pointer}.send:disabled{opacity:.5;cursor:wait}
    .status{flex:1;min-width:0;color:#a1a1aa;font-size:10px;line-height:1.4}
    .privacy{margin-top:7px;color:#71717a;font-size:9px;line-height:1.4}
    @media(max-width:480px){.panel{width:calc(100vw - 24px);height:min(70vh,600px)}}
  `;
  shadow.appendChild(style);

  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Ask IsaiahAI about this website');
  launcher.innerHTML = '<span class="dot"></span><span>Ask IsaiahAI</span>';
  shadow.appendChild(launcher);

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'IsaiahAI page assistant');
  panel.innerHTML = `
    <div class="header"><div class="brand">IA</div><div><div class="heading">IsaiahAI</div><div class="sub">Ask about the page, links, or visible content</div></div><button class="close" type="button" aria-label="Close">×</button></div>
    <div class="conversation"><div class="empty">Ask about this webpage. IsaiahAI can use the page text, links, a screenshot of the visible page, and fresh web-search results.</div></div>
    <form class="form"><textarea class="question" placeholder="What is this page about? Summarize it, compare details, explain a section…" aria-label="Question" maxlength="6000"></textarea><div class="controls"><button class="send" type="submit">Ask IsaiahAI ↗</button><div class="status" aria-live="polite">IsaiahAI is ready</div></div><div class="privacy">Page text, links and a screenshot are sent to the IsaiahAI server only when you click Ask. Password/form values are not collected.</div></form>
  `;
  shadow.appendChild(panel);
  const closeButton = panel.querySelector('.close');
  const conversation = panel.querySelector('.conversation');
  const form = panel.querySelector('form');
  const questionInput = panel.querySelector('.question');
  const sendButton = panel.querySelector('.send');
  const status = panel.querySelector('.status');
  const history = [];

  launcher.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) questionInput.focus();
  });
  closeButton.addEventListener('click', () => panel.classList.remove('open'));

  function appendBubble(text, type, sources = []) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${type}`;
    bubble.textContent = text;
    if (type === 'assistant' && Array.isArray(sources) && sources.length) {
      const sourceList = document.createElement('div');
      sourceList.className = 'sources';
      const label = document.createElement('div');
      label.textContent = 'Web sources';
      label.style.cssText = 'font-size:10px;color:#a1a1aa;font-weight:800;margin-bottom:2px';
      sourceList.appendChild(label);
      sources.slice(0, 8).forEach(source => {
        if (!source || !/^https?:\/\//i.test(String(source.uri || ''))) return;
        const link = document.createElement('a');
        link.href = source.uri;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.title || source.uri;
        sourceList.appendChild(link);
      });
      bubble.appendChild(sourceList);
    }
    conversation.querySelector('.empty')?.remove();
    conversation.appendChild(bubble);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function readPageContext() {
    const clone = document.body ? document.body.cloneNode(true) : document.documentElement.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,canvas,iframe,form,input,textarea,select,button,nav,[role="navigation"],[aria-hidden="true"],[hidden]').forEach(node => node.remove());
    const pageText = String(clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26000);
    const links = [...document.querySelectorAll('a[href]')]
      .filter(a => {
        const style = window.getComputedStyle(a);
        return style.display !== 'none' && style.visibility !== 'hidden' && Boolean(a.href) && /^https?:$/.test(new URL(a.href).protocol);
      })
      .slice(0, 70)
      .map(a => ({ title: String(a.innerText || a.getAttribute('aria-label') || a.title || a.href).trim().slice(0, 180), url: a.href }))
      .filter(item => item.title && /^https?:\/\//i.test(item.url));
    return { pageText, links };
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = String(questionInput.value || '').trim();
    if (!question || sendButton.disabled) return;
    const priorQuestion = question;
    questionInput.value = '';
    appendBubble(priorQuestion, 'user');
    sendButton.disabled = true;
    sendButton.textContent = 'Thinking…';
    status.textContent = 'Reading page and searching…';
    const context = readPageContext();
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'ISAIAHAI_PAGE_ASSIST',
        question: priorQuestion,
        pageTitle: document.title,
        pageUrl: location.href,
        pageText: context.pageText,
        links: context.links,
        history: history.slice(-8)
      });
      if (!result || !result.ok || !result.data) throw new Error(result && result.error || 'The assistant could not answer.');
      const data = result.data;
      const answer = String(data.content || 'No answer was returned.');
      history.push({ role: 'user', content: priorQuestion }, { role: 'assistant', content: answer });
      appendBubble(answer, 'assistant', data.sources || []);
      status.textContent = data.screenshotUsed ? 'IsaiahAI · screenshot included' : 'IsaiahAI · page context included';
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      appendBubble('IsaiahAI could not complete that request. Check your website URL in extension Settings, then try again.', 'assistant');
      status.textContent = 'IsaiahAI connection failed';
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Ask IsaiahAI ↗';
      conversation.scrollTop = conversation.scrollHeight;
    }
  });
})();
