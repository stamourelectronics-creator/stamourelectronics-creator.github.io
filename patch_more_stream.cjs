const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const targetStr = `  const fetchMoreSummary = async (queryStr: string, resultsList: any[], currentBrief: string) => {
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
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          
          // Smooth simulated typing effect on the stream
          const words = chunk.split(' ');
          for (let i = 0; i < words.length; i++) {
            setTypedDetailed(prev => prev + (prev.length > 0 && i === 0 && !chunk.startsWith(' ') ? '' : (i > 0 || chunk.startsWith(' ') ? ' ' : '')) + words[i]);
            await new Promise(r => setTimeout(r, 12));
          }
          setAddonSummary(fullText);
        }
      }
    } catch (err) {
      const fallback = \`### Deep Dive Report\\n\\nFurther analysis confirms active integrations, specifications, and discussions around **\${queryStr}**.\`;
      setAddonSummary(fallback);
      setTypedDetailed(fallback);
    } finally {
      setIsLoadingMore(false);
      setIsTypingMore(false);
    }
  };`;

code = code.replace(targetStr, replaceStr);

const typewriterTarget = `  // Streaming sets addonSummary directly, typedDetailed will just follow it.
  useEffect(() => {
    setTypedDetailed(addonSummary);
  }, [addonSummary]);`;

const typewriterReplace = `  // typedDetailed is populated during the stream smoothly, no need to auto-copy it.`;

code = code.replace(typewriterTarget, typewriterReplace);

fs.writeFileSync('src/components/BrowserView.tsx', code);
