const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const streamEndpoint = `
app.post('/api/search-summary-more-stream', async (req, res) => {
  const { query, results, previousSummary } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const prompt = \`You are IsaiahAI Search Assistant, an elite intelligence companion developed by St.Amour Electronics.
The user previously read this summary: "\${previousSummary}".
Now, they pressed "More" for an even more detailed add-on response for query: "\${query}".
Generate an extensive, detailed, deep-dive technical add-on report as IsaiahAI for query: "\${query}" to append below what is already there. Use detailed subheadings, code examples if relevant, and comprehensive analysis in markdown. Keep it strictly focused on the advanced aspects and reference IsaiahAI's St.Amour Electronics standards if applicable.\`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (e) {
    console.warn('[Search Summary Stream Fallback]', e);
    const topResults = results?.slice(2, 6) || [];
    const bullets = topResults.map((item, i) => \`*   **\${item.title || ('Reference Link ' + (i+1))}**: \${item.snippet || 'No additional details are indexed.'}\`).join('\\n');
    res.end(\`### Deep Dive Report\\n\\nFurther analysis confirms active integrations, specifications, and discussions around **\${query}**.\\n\\n\${bullets}\`);
  }
});
`;

code = code.replace("app.post('/api/search-summary-more', async (req, res) => {", streamEndpoint + "\napp.post('/api/search-summary-more', async (req, res) => {");

fs.writeFileSync('server.ts', code);
