const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `  const fetchMoreSummary = async (queryStr: string, resultsList: any[], currentBrief: string) => {
    if (!queryStr || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch('/api/search-summary-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, results: resultsList, previousSummary: currentBrief })
      });
      if (response.ok) {
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('HTML received');
        const data = await response.json();
        setAddonSummary(data.moreSummary || '');
      } else {
        throw new Error('More summary failed');
      }
    } catch (err) {
      setAddonSummary(\`### Deep Dive Report\\n\\nFurther analysis confirms active integrations, specifications, and discussions around **\${queryStr}**.\`);
    } finally {
      setIsLoadingMore(false);
    }
  };`;

const replaceStr = `  const fetchMoreSummary = async (queryStr: string, resultsList: any[], currentBrief: string) => {
    if (!queryStr || isLoadingMore) return;
    setIsLoadingMore(true);
    setAddonSummary('');
    setTypedDetailed('');
    setIsTypingMore(true);
    try {
      const response = await fetch('/api/search-summary-more-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, results: resultsList, previousSummary: currentBrief })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let streamText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          streamText += chunk;
          setAddonSummary(streamText);
        }
      }
    } catch (err) {
      setAddonSummary(\`### Deep Dive Report\\n\\nFurther analysis confirms active integrations, specifications, and discussions around **\${queryStr}**.\`);
    } finally {
      setIsLoadingMore(false);
      setIsTypingMore(false);
    }
  };`;

// We also need to disable the typewriter effect for Addon Summary since it will stream
const typewriterTarget = `  // Typewriter effect for Addon Summary
  useEffect(() => {
    if (!addonSummary) {
      setTypedDetailed('');
      return;
    }
    setIsTypingMore(true);
    setTypedDetailed('');
    const words = addonSummary.split(' ');
    let index = 0;
    let current = '';
    const timer = setInterval(() => {
      if (index < words.length) {
        current += (index === 0 ? '' : ' ') + words[index];
        setTypedDetailed(current);
        index++;
      } else {
        clearInterval(timer);
        setIsTypingMore(false);
      }
    }, 12);
    return () => clearInterval(timer);
  }, [addonSummary]);`;

const typewriterReplace = `  // Streaming sets addonSummary directly, typedDetailed will just follow it.
  useEffect(() => {
    setTypedDetailed(addonSummary);
  }, [addonSummary]);`;

code = code.replace(targetStr, replaceStr);
code = code.replace(typewriterTarget, typewriterReplace);

fs.writeFileSync('src/components/BrowserView.tsx', code);
