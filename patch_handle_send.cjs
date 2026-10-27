const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `    let targetSessionId = activeSessionId;
    let targetSession = activeSession;
    let currentSessions = [...sessions];

    // Create session if none exists
    if (!targetSessionId || !targetSession) {
      const newId = \`session-\${Date.now()}\`;
      targetSession = {
        id: newId,
        title: inputText.trim().slice(0, 20) + '...',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      currentSessions = [targetSession, ...sessions];
      setSessions(currentSessions);
      setActiveSessionId(newId);
      targetSessionId = newId;
    }

    const rawPrompt = inputText.trim();
    const currentUploaded = [...uploadedImages];
    
    // Stop listening on message send
    if (isListening) {
      recognitionRef.current?.stop();
    }
    setInputText('');
    setUploadedImages([]); // Clear preview list
    setIsGenerating(true);

    const userMsg: Message = {
      id: \`msg-\${Date.now()}-user\`,
      role: 'user',
      content: rawPrompt,
      attachments: currentUploaded.map(file => ({
        name: file.name,
        data: file.data,
        mimeType: file.mimeType,
      })),
      images: currentUploaded.filter(file => file.mimeType.startsWith('image/')).map(img => img.data), // Pass base64 data URIs
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update session state with user message
    let workingMessages = [...targetSession.messages, userMsg];
    let updatedSession = {
      ...targetSession,
      messages: workingMessages,
      title: targetSession.messages.length === 0 ? rawPrompt.slice(0, 30) : targetSession.title,
      updatedAt: new Date().toISOString(),
    };

    saveSessionsToCache(currentSessions.map(s => s.id === targetSessionId ? updatedSession : s));`;

const replaceStr = `    let targetSessionId = activeSessionId;
    let targetSession = activeSession;
    const isNewSession = !targetSessionId || !targetSession;

    const rawPrompt = inputText.trim();

    if (isNewSession) {
      targetSessionId = \`session-\${Date.now()}\`;
      targetSession = {
        id: targetSessionId as string,
        title: rawPrompt.slice(0, 20) + '...',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setActiveSessionId(targetSessionId);
    }

    const currentUploaded = [...uploadedImages];
    
    // Stop listening on message send
    if (isListening) {
      recognitionRef.current?.stop();
    }
    setInputText('');
    setUploadedImages([]); // Clear preview list
    setIsGenerating(true);

    const userMsg: Message = {
      id: \`msg-\${Date.now()}-user\`,
      role: 'user',
      content: rawPrompt,
      attachments: currentUploaded.map(file => ({
        name: file.name,
        data: file.data,
        mimeType: file.mimeType,
      })),
      images: currentUploaded.filter(file => file.mimeType.startsWith('image/')).map(img => img.data), // Pass base64 data URIs
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update session state with user message
    let workingMessages = [...(targetSession as any).messages, userMsg];
    let updatedSession = {
      ...(targetSession as any),
      messages: workingMessages,
      title: (targetSession as any).messages.length === 0 ? rawPrompt.slice(0, 30) : (targetSession as any).title,
      updatedAt: new Date().toISOString(),
    };

    saveSessionsToCache(prev => {
      if (isNewSession) {
        return [updatedSession, ...prev];
      }
      return prev.map(s => s.id === targetSessionId ? updatedSession : s);
    });`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
